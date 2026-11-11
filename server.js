require('dotenv').config();
const express=require('express'),helmet=require('helmet'),rateLimit=require('express-rate-limit'),cookieParser=require('cookie-parser'),
bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),multer=require('multer'),Database=require('better-sqlite3'),path=require('path'),fs=require('fs'),crypto=require('crypto');
const ROOT=process.env.DATA_DIR||__dirname;
const SECRET=process.env.JWT_SECRET;
if(!SECRET||SECRET.length<32){console.error('Set JWT_SECRET (32+ chars) in .env');process.exit(1)}
['data','uploads','private_uploads'].forEach(d=>fs.mkdirSync(path.join(ROOT,d),{recursive:true}));
const db=new Database(path.join(ROOT,'data/site.db'));db.pragma('journal_mode=WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY,username TEXT UNIQUE,pass_hash TEXT,role TEXT);
CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY,v TEXT);
CREATE TABLE IF NOT EXISTS members(id INTEGER PRIMARY KEY,name TEXT,rank TEXT,member_id TEXT,join_date TEXT,description TEXT,telegram TEXT,avatar TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS rules(id INTEGER PRIMARY KEY,title_fa TEXT,title_en TEXT,body_fa TEXT,body_en TEXT,sort INTEGER DEFAULT 0,created_at TEXT);
CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY,title_fa TEXT,title_en TEXT,body_fa TEXT,body_en TEXT,author TEXT,important INTEGER DEFAULT 0,image TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS applications(id INTEGER PRIMARY KEY,app_id TEXT UNIQUE,ic_name TEXT,telegram TEXT,level INTEGER,experience TEXT,reason TEXT,screenshot TEXT,status TEXT DEFAULT 'pending',response TEXT,reviewed_by TEXT,created_at TEXT);`);
const DEF={faction:'',status:'active',recruitment:'open',family_rank:'',established:'2024',online:'',tg_support:'https://t.me/Im_Masoud_18',tg_channel:'https://t.me/Smith_Brothers',updated_at:new Date().toISOString()};
for(const[k,v]of Object.entries(DEF))db.prepare('INSERT OR IGNORE INTO settings VALUES(?,?)').run(k,v);
if(!db.prepare('SELECT 1 FROM admins').get()){
  if(process.env.ADMIN_USER&&(process.env.ADMIN_PASS||'').length>=10){
    db.prepare('INSERT INTO admins(username,pass_hash,role)VALUES(?,?,?)').run(process.env.ADMIN_USER,bcrypt.hashSync(process.env.ADMIN_PASS,12),'super');console.log('First Super Admin created. Remove ADMIN_PASS from .env now.');
  }else console.warn('No admin exists. Set ADMIN_USER and ADMIN_PASS (10+ chars) in .env and restart.');
}
const RANKS=['Creator','Owner','Co-Owner','High Manager','Manager','Supervisor','Member'];
const LV={moderator:1,admin:2,super:3},now=()=>new Date().toISOString();
const s=(v,max)=>String(v??'').trim().slice(0,max);
const bad=(m,st=400)=>Object.assign(new Error(m),{status:st});
const H=fn=>(q,r,n)=>{try{fn(q,r,n)}catch(e){n(e)}};
const up=multer({storage:multer.memoryStorage(),limits:{fileSize:4*1024*1024,files:1}});
function saveImg(f,dir){
  if(!f)return null;const b=f.buffer;let ext=null;
  if(b.subarray(0,4).equals(Buffer.from([0x89,0x50,0x4e,0x47])))ext='png';
  else if(b.subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff])))ext='jpg';
  else if(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP')ext='webp';
  if(!ext)throw bad('Only PNG, JPG or WEBP images are allowed');
  const name=crypto.randomBytes(16).toString('hex')+'.'+ext;fs.writeFileSync(path.join(ROOT,dir,name),b);return name;
}
const rm=(dir,f)=>{if(f)fs.unlink(path.join(ROOT,dir,path.basename(f)),()=>{})};
const DUMMY=bcrypt.hashSync('x',12);
const auth=min=>(req,res,next)=>{
  try{const p=jwt.verify(req.cookies.sb_token,SECRET);const a=db.prepare('SELECT id,username,role FROM admins WHERE id=?').get(p.id);
    if(!a)return res.status(401).json({error:'unauthorized'});
    if(LV[a.role]<LV[min])return res.status(403).json({error:'forbidden'});req.admin=a;next();
  }catch{res.status(401).json({error:'unauthorized'})}
};
const app=express();app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'","https://fonts.googleapis.com","https://cdnjs.cloudflare.com"],fontSrc:["'self'","https://fonts.gstatic.com","https://cdnjs.cloudflare.com"],imgSrc:["'self'","data:"],connectSrc:["'self'"],frameAncestors:["'none'"]}}}));
app.use(express.json({limit:'50kb'}),cookieParser());
app.use('/uploads',express.static(path.join(ROOT,'uploads'),{index:false,setHeaders:r=>r.setHeader('X-Content-Type-Options','nosniff')}));
app.use(express.static(path.join(__dirname,'public')));

// ---------- public ----------
app.get('/api/public',H((q,r)=>{
  const st=Object.fromEntries(db.prepare('SELECT k,v FROM settings').all().map(x=>[x.k,x.v]));
  const order=RANKS.map((k,i)=>`WHEN '${k}' THEN ${i}`).join(' ');
  r.json({settings:st,
    members:db.prepare(`SELECT id,name,rank,member_id,join_date,description,telegram,avatar FROM members ORDER BY CASE rank ${order} ELSE 99 END,name`).all(),
    rules:db.prepare('SELECT * FROM rules ORDER BY sort,id').all(),
    announcements:db.prepare('SELECT * FROM announcements ORDER BY datetime(created_at) DESC LIMIT 50').all(),
    stats:{members:db.prepare('SELECT COUNT(*) c FROM members').get().c,approved:db.prepare("SELECT COUNT(*) c FROM applications WHERE status='approved'").get().c}});
}));
app.post('/api/apply',rateLimit({windowMs:3600e3,limit:5,message:{error:'Too many submissions, try later'}}),up.single('screenshot'),H((q,r)=>{
  const rec=db.prepare("SELECT v FROM settings WHERE k='recruitment'").get().v;
  if(rec!=='open')throw bad('Recruitment is closed',403);
  const b=q.body,ic=s(b.ic_name,80),tg=s(b.telegram,40).replace(/^@/,''),lvl=parseInt(b.level,10),exp=s(b.experience,1000),why=s(b.reason,2000);
  if(ic.length<3||!/^[A-Za-z0-9_]{4,32}$/.test(tg)||!(lvl>=1&&lvl<=9999)||why.length<10||!q.file)throw bad('Please fill all required fields correctly');
  if(db.prepare("SELECT 1 FROM applications WHERE lower(telegram)=lower(?) AND status IN('pending','approved')").get(tg))throw bad('An application from this Telegram username already exists',409);
  const file=saveImg(q.file,'private_uploads'),app_id='SB-'+crypto.randomBytes(4).toString('hex').toUpperCase();
  db.prepare('INSERT INTO applications(app_id,ic_name,telegram,level,experience,reason,screenshot,created_at)VALUES(?,?,?,?,?,?,?,?)').run(app_id,ic,tg,lvl,exp,why,file,now());
  r.status(201).json({ok:true,app_id});
}));
// ---------- auth ----------
app.post('/api/login',rateLimit({windowMs:15*60e3,limit:10,message:{error:'Too many attempts, try later'}}),H((q,r)=>{
  const a=db.prepare('SELECT * FROM admins WHERE username=?').get(s(q.body.username,60));
  const ok=bcrypt.compareSync(String(q.body.password||''),a?a.pass_hash:DUMMY);
  if(!a||!ok)throw bad('Invalid credentials',401);
  r.cookie('sb_token',jwt.sign({id:a.id},SECRET,{expiresIn:'8h'}),{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='1',maxAge:8*3600e3});
  r.json({username:a.username,role:a.role});
}));
app.post('/api/logout',(q,r)=>{r.clearCookie('sb_token');r.json({ok:true})});
app.get('/api/me',auth('moderator'),(q,r)=>r.json(q.admin));
// ---------- admin CRUD ----------
function crud(route,table,cols,min,delMin,imgCol,dir,order,extra){
  const R=express.Router();R.use(auth(min));
  R.get('/',(q,r)=>r.json(db.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).all()));
  const read=(q)=>{const o={};for(const[c,max,req]of cols){o[c]=s(q.body[c],max);if(req&&!o[c])throw bad(`${c} is required`)}if(extra)extra(o,q);return o};
  R.post('/',up.single('img'),H((q,r)=>{
    const o=read(q);if(imgCol)o[imgCol]=saveImg(q.file,dir);o.created_at=now();
    const k=Object.keys(o);const i=db.prepare(`INSERT INTO ${table}(${k})VALUES(${k.map(x=>'@'+x)})`).run(o);r.status(201).json({id:i.lastInsertRowid});
  }));
  R.put('/:id',up.single('img'),H((q,r)=>{
    const cur=db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(q.params.id);if(!cur)throw bad('Not found',404);
    const o=read(q);if(imgCol&&q.file){o[imgCol]=saveImg(q.file,dir);rm(dir,cur[imgCol])}
    db.prepare(`UPDATE ${table} SET ${Object.keys(o).map(x=>x+'=@'+x)} WHERE id=@id`).run({...o,id:cur.id});r.json({ok:true});
  }));
  R.delete('/:id',auth(delMin),H((q,r)=>{
    const cur=db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(q.params.id);if(!cur)throw bad('Not found',404);
    db.prepare(`DELETE FROM ${table} WHERE id=?`).run(cur.id);if(imgCol)rm(dir,cur[imgCol]);r.json({ok:true});
  }));
  app.use('/api/admin/'+route,R);
}
crud('members','members',[['name',60,1],['rank',20,1],['member_id',20],['join_date',10],['description',300],['telegram',40]],'admin','admin','avatar','uploads','id',(o)=>{
  if(!RANKS.includes(o.rank))throw bad('Invalid rank');o.telegram=o.telegram.replace(/^@/,'');if(!o.member_id)o.member_id='SB-'+crypto.randomInt(1000,9999)});
crud('rules','rules',[['title_fa',120,1],['title_en',120,1],['body_fa',800,1],['body_en',800,1],['sort',5]],'admin','admin',null,null,'sort,id',o=>{o.sort=parseInt(o.sort)||0});
crud('announcements','announcements',[['title_fa',150,1],['title_en',150,1],['body_fa',3000,1],['body_en',3000,1],['author',60,1],['important',1]],'moderator','admin','image','uploads','datetime(created_at) DESC',o=>{o.important=o.important==='1'?1:0});
// applications
const A=express.Router();A.use(auth('moderator'));
A.get('/',(q,r)=>r.json(db.prepare('SELECT * FROM applications ORDER BY id DESC').all()));
A.put('/:id',H((q,r)=>{
  const st=q.body.status;if(!['pending','approved','rejected'].includes(st))throw bad('Invalid status');
  const i=db.prepare('UPDATE applications SET status=?,response=?,reviewed_by=? WHERE id=?').run(st,s(q.body.response,1000),q.admin.username,q.params.id);
  if(!i.changes)throw bad('Not found',404);r.json({ok:true});
}));
A.get('/:id/screenshot',H((q,r)=>{
  const a=db.prepare('SELECT screenshot FROM applications WHERE id=?').get(q.params.id);if(!a)throw bad('Not found',404);
  r.setHeader('X-Content-Type-Options','nosniff');r.setHeader('Cache-Control','private, no-store');r.sendFile(path.basename(a.screenshot),{root:path.join(ROOT,'private_uploads')});
}));
A.delete('/:id',auth('admin'),H((q,r)=>{
  const a=db.prepare('SELECT * FROM applications WHERE id=?').get(q.params.id);if(!a)throw bad('Not found',404);
  db.prepare('DELETE FROM applications WHERE id=?').run(a.id);rm('private_uploads',a.screenshot);r.json({ok:true});
}));
app.use('/api/admin/applications',A);
// settings
const SK={faction:100,status:20,recruitment:10,family_rank:60,established:10,online:6,tg_support:200,tg_channel:200};
app.get('/api/admin/settings',auth('admin'),(q,r)=>r.json(Object.fromEntries(db.prepare('SELECT k,v FROM settings').all().map(x=>[x.k,x.v]))));
app.put('/api/admin/settings',auth('admin'),H((q,r)=>{
  const b=q.body;
  if(b.status!==undefined&&!['active','inactive','recruiting','closed'].includes(b.status))throw bad('Invalid status');
  if(b.recruitment!==undefined&&!['open','closed'].includes(b.recruitment))throw bad('Invalid recruitment value');
  for(const k of['tg_support','tg_channel'])if(b[k]&&!/^https:\/\//.test(b[k]))throw bad('Links must start with https://');
  const up=db.prepare('INSERT INTO settings VALUES(?,?)ON CONFLICT(k)DO UPDATE SET v=excluded.v');
  for(const k of Object.keys(SK))if(b[k]!==undefined)up.run(k,s(b[k],SK[k]));
  up.run('updated_at',now());r.json({ok:true});
}));
// admin accounts (super only)
const U=express.Router();U.use(auth('super'));
U.get('/',(q,r)=>r.json(db.prepare('SELECT id,username,role FROM admins').all()));
U.post('/',H((q,r)=>{
  const u=s(q.body.username,40),p=String(q.body.password||''),ro=q.body.role;
  if(!/^[A-Za-z0-9_.-]{3,40}$/.test(u)||p.length<10||!LV[ro])throw bad('Username 3+ chars, password 10+ chars, valid role');
  try{db.prepare('INSERT INTO admins(username,pass_hash,role)VALUES(?,?,?)').run(u,bcrypt.hashSync(p,12),ro)}catch{throw bad('Username taken',409)}r.status(201).json({ok:true});
}));
U.delete('/:id',H((q,r)=>{if(+q.params.id===q.admin.id)throw bad('You cannot delete yourself');db.prepare('DELETE FROM admins WHERE id=?').run(q.params.id);r.json({ok:true})}));
app.use('/api/admin/users',U);
// errors / 404
app.use('/api',(q,r)=>r.status(404).json({error:'Not found'}));
app.use((q,r)=>r.status(404).sendFile(path.join(__dirname,'public/404.html')));
app.use((e,q,r,n)=>{const st=e.code==='LIMIT_FILE_SIZE'?413:(e.status||500);if(st===500)console.error(e);
  r.status(st).json({error:st===500?'Server error':(e.code==='LIMIT_FILE_SIZE'?'Image must be under 4 MB':e.message)})});
app.listen(process.env.PORT||3000,()=>console.log('Smith Brothers running on port '+(process.env.PORT||3000)));
