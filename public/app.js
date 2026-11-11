const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const T={fa:{home:'خانه',status:'وضعیت فمیلی',members:'اعضا',rules:'قوانین',news:'اطلاعیه‌ها',join:'عضویت',settings:'تنظیمات',support:'پشتیبانی تلگرام',channel:'کانال تلگرام فمیلی',
statsT:'آمار فمیلی',statusT:'وضعیت فمیلی',membersT:'اعضای فمیلی',rulesT:'قوانین فمیلی',newsT:'اطلاعیه‌ها',joinT:'درخواست عضویت',
sMem:'کل اعضا',sOn:'اعضای آنلاین',sRank:'رتبه فمیلی',sFac:'فکشن فعلی',sApp:'درخواست‌های تأییدشده',sEst:'تاریخ تأسیس',facL:'فکشن',none:'—',
st_active:'فعال',st_inactive:'غیرفعال',st_recruiting:'در حال جذب عضو',st_closed:'جذب عضو بسته است',updL:'آخرین بروزرسانی',upd:'آخرین بروزرسانی',
search:'جستجوی نام...',allR:'همه رتبه‌ها',byRank:'مرتب‌سازی: رتبه',byName:'مرتب‌سازی: نام',byDate:'مرتب‌سازی: تاریخ عضویت',noM:'عضوی یافت نشد.',noN:'اطلاعیه‌ای وجود ندارد.',imp:'مهم',by:'نویسنده',
closedT:'جذب عضو بسته است',closedD:'در حال حاضر درخواست جدید پذیرفته نمی‌شود. کانال تلگرام را دنبال کنید.',
fName:'نام و نام خانوادگی IC',fTg:'آیدی تلگرام',fLvl:'لول SA-MP',fShot:'اسکرین‌شات لول',fExp:'سابقه فمیلی قبلی',fWhy:'دلیل عضویت',send:'ارسال درخواست',sending:'در حال ارسال...',
vErr:'لطفاً همه فیلدهای الزامی را درست پر کنید.',okMsg:'درخواست ثبت شد. کد پیگیری:',netErr:'ارتباط با سرور برقرار نشد.',
lang:'زبان',theme:'تم',anim:'انیمیشن‌ها',snd:'صدا (پیش‌فرض خاموش)',close:'بستن',join_l:'عضویت',id:'شناسه',jd:'تاریخ عضویت',title:'فمیلی اسمیت برادرز | آلفا رول‌پلی'},
en:{home:'Home',status:'Family Status',members:'Members',rules:'Rules',news:'Announcements',join:'Join Family',settings:'Settings',support:'Telegram Support',channel:'Family Telegram Channel',
statsT:'Family Statistics',statusT:'Family Status',membersT:'Members',rulesT:'Family Rules',newsT:'Announcements',joinT:'Join the Family',
sMem:'Total Members',sOn:'Online Members',sRank:'Family Rank',sFac:'Current Faction',sApp:'Approved Applications',sEst:'Established',facL:'Faction',none:'—',
st_active:'Active',st_inactive:'Inactive',st_recruiting:'Recruiting',st_closed:'Recruitment Closed',updL:'Last updated',upd:'Last updated',
search:'Search by name...',allR:'All ranks',byRank:'Sort: Rank',byName:'Sort: Name',byDate:'Sort: Join date',noM:'No members found.',noN:'No announcements yet.',imp:'Important',by:'By',
closedT:'Recruitment is closed',closedD:'We are not accepting applications right now. Follow our Telegram channel for updates.',
fName:'IC Full Name',fTg:'Telegram Username',fLvl:'SA-MP Level',fShot:'Level Screenshot',fExp:'Previous Family Experience',fWhy:'Reason for Joining',send:'Submit Application',sending:'Sending...',
vErr:'Please fill all required fields correctly.',okMsg:'Application submitted. Your ID:',netErr:'Could not reach the server.',
lang:'Language',theme:'Theme',anim:'Animations',snd:'Sound (off by default)',close:'Close',join_l:'Joined',id:'ID',jd:'Joined',title:'Smith Brothers | Alpha Roleplay'}};
const RANKS=['Creator','Owner','Co-Owner','High Manager','Manager','Supervisor','Member'],ICON=['crown','chess-king','shield-halved','gem','user-tie','user-shield','user'];
const P=JSON.parse(localStorage.getItem('sb_prefs')||'{}'),pref={lang:'fa',theme:'red',anim:true,sound:false,...P};
const save=()=>localStorage.setItem('sb_prefs',JSON.stringify(pref));
let D=null;const t=k=>T[pref.lang][k]??k;
const el=(tag,a={},...c)=>{const e=document.createElement(tag);for(const[k,v]of Object.entries(a))k==='class'?e.className=v:e.setAttribute(k,v);c.flat().forEach(x=>e.append(x));return e};
const fmt=d=>d?new Date(d).toLocaleDateString(pref.lang==='fa'?'fa-IR':'en-US',{year:'numeric',month:'short',day:'numeric'}):t('none');
const num=n=>pref.lang==='fa'?Number(n).toLocaleString('fa-IR'):Number(n).toLocaleString('en-US');
function toast(m,ok){const x=el('div',{class:'toast'+(ok?' ok':'')},m);$('#toasts').append(x);setTimeout(()=>x.remove(),5000)}
function applyPrefs(){
  document.documentElement.lang=pref.lang;document.documentElement.dir=pref.lang==='fa'?'rtl':'ltr';document.documentElement.dataset.theme=pref.theme;
  document.body.classList.toggle('noanim',!pref.anim);document.title=t('title');
  $$('[data-i]').forEach(e=>e.textContent=t(e.dataset.i));$$('[data-ph]').forEach(e=>e.placeholder=t(e.dataset.ph));
  $('#sLang').value=pref.lang;$('#sTheme').value=pref.theme;$('#sAnim').checked=pref.anim;$('#sSnd').checked=pref.sound;
  const o=$('#rf');const cur=o.value;o.replaceChildren(el('option',{value:''},t('allR')),...RANKS.map(r=>el('option',{value:r},r)));o.value=cur;
  if(D)render();
}
function render(){
  const S=D.settings,ST=S.status;
  const cards=[[t('sMem'),D.stats.members,1],S.online!==''?[t('sOn'),S.online,1]:null,[t('sRank'),S.family_rank||t('none')],[t('sFac'),S.faction||t('none')],[t('sApp'),D.stats.approved,1],[t('sEst'),S.established||t('none')]].filter(Boolean);
  $('#stats').replaceChildren(...cards.map(([l,v,n])=>{const b=el('b',{},n?'0':String(v));if(n)b.dataset.to=v;return el('div',{class:'card stat'},b,el('span',{},l))}));
  $$('#stats b[data-to]').forEach(b=>{const to=+b.dataset.to;let i=0;const id=setInterval(()=>{i++;b.textContent=num(Math.round(to*i/25));if(i>=25)clearInterval(id)},pref.anim?30:0)});
  $('#stLine').replaceChildren(el('span',{class:'dot s-'+ST}),el('span',{class:'s-'+ST},t('st_'+ST)));
  $('#stFac').textContent=S.faction?t('facL')+': '+S.faction:'';$('#stUpd').textContent=t('updL')+': '+fmt(S.updated_at);$('#fUpd').textContent=fmt(S.updated_at);
  $('#tgSup').href=S.tg_support;$('#tgCh').href=S.tg_channel;
  $('#soc').replaceChildren(el('a',{href:S.tg_channel,target:'_blank',rel:'noopener','aria-label':'Telegram'},el('i',{class:'fab fa-telegram'})));
  const closed=S.recruitment!=='open';$('#closed').hidden=!closed;$('#f').hidden=closed;
  members();
  $('#rg').replaceChildren(...D.rules.map(r=>el('div',{class:'card rule'},el('h4',{},r['title_'+pref.lang]),el('p',{},r['body_'+pref.lang]))));
  $('#ng').replaceChildren(...(D.announcements.length?D.announcements.map(a=>el('div',{class:'card an'},a.image?el('img',{src:'/uploads/'+a.image,alt:'',loading:'lazy'}):'',
    el('div',{},el('h4',{},a['title_'+pref.lang],a.important?el('span',{class:'imp'},t('imp')):''),el('small',{},fmt(a.created_at)+' · '+t('by')+': '+a.author),el('p',{},a['body_'+pref.lang])))):[el('p',{style:'text-align:center;color:var(--mu)'},t('noN'))]));
}
function members(){
  const q=$('#q').value.trim().toLowerCase(),rf=$('#rf').value,so=$('#so').value;
  let L=D.members.filter(m=>(!q||m.name.toLowerCase().includes(q))&&(!rf||m.rank===rf));
  if(so==='name')L.sort((a,b)=>a.name.localeCompare(b.name));else if(so==='date')L.sort((a,b)=>(a.join_date||'9').localeCompare(b.join_date||'9'));
  $('#mg').replaceChildren(...(L.length?L.map(m=>{const i=RANKS.indexOf(m.rank),rc='r-'+m.rank.replace(' ','-');
    const av=el('div',{class:'av '+rc});if(m.avatar)av.style.backgroundImage=`url(/uploads/${encodeURIComponent(m.avatar)})`;else av.append(el('i',{class:'fas fa-'+ICON[i]}));
    return el('div',{class:'card mc'},av,el('h3',{class:'en'},m.name),el('div',{class:'rk '+rc},el('i',{class:'fas fa-'+ICON[i]}),' '+m.rank),
      el('small',{},t('id')+': '+m.member_id),el('small',{},t('jd')+': '+fmt(m.join_date)),m.telegram?el('small',{dir:'ltr'},'@'+m.telegram):'',m.description?el('p',{},m.description):'')}):[el('p',{style:'grid-column:1/-1;text-align:center;color:var(--mu)'},t('noM'))]));
}
// events
['#q','#rf','#so'].forEach(s=>$(s).addEventListener('input',()=>D&&members()));
$('#openSet').onclick=e=>{e.preventDefault();$('#dlg').showModal()};$('#sClose').onclick=()=>$('#dlg').close();
$('#sLang').onchange=e=>{pref.lang=e.target.value;save();applyPrefs()};$('#sTheme').onchange=e=>{pref.theme=e.target.value;save();applyPrefs()};
$('#sAnim').onchange=e=>{pref.anim=e.target.checked;save();applyPrefs()};$('#sSnd').onchange=e=>{pref.sound=e.target.checked;save()};
$('#burger').onclick=()=>$('#nav').classList.toggle('open');$$('#nav a').forEach(a=>a.addEventListener('click',()=>$('#nav').classList.remove('open')));
$('#top').onclick=()=>scrollTo({top:0});addEventListener('scroll',()=>$('#top').style.display=scrollY>600?'block':'none');
const revObs=new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");o.unobserve(e.target)}}),{threshold:.08});$$(".rv").forEach(e=>revObs.observe(e));
$('#f').addEventListener('submit',async e=>{
  e.preventDefault();const f=e.target,b=f.querySelector('button'),err=$('#ferr');err.textContent='';
  if(!f.checkValidity()||!/^@?[A-Za-z0-9_]{4,32}$/.test(f.telegram.value.trim())){err.textContent=t('vErr');return}
  b.disabled=true;b.textContent=t('sending');
  try{const r=await fetch('/api/apply',{method:'POST',body:new FormData(f)}),j=await r.json();
    if(r.ok){toast(t('okMsg')+' '+j.app_id,1);f.reset()}else err.textContent=j.error||t('vErr');
  }catch{err.textContent=t('netErr')}
  b.disabled=false;b.textContent=t('send');
});
// particles
(()=>{const c=$('#fx'),x=c.getContext('2d');let P=[];const rs=()=>{c.width=innerWidth;c.height=innerHeight};rs();addEventListener('resize',rs);
for(let i=0;i<70;i++)P.push({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.8+.3,dx:Math.random()-.5,dy:-Math.random()*.6-.1,o:Math.random()*.5+.1});
(function f(){x.clearRect(0,0,c.width,c.height);if(pref.anim)for(const p of P){p.x+=p.dx;p.y+=p.dy;if(p.y<0)p.y=c.height;if(p.x<0||p.x>c.width)p.x=Math.random()*c.width;x.fillStyle=`rgba(255,0,0,${p.o})`;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()}requestAnimationFrame(f)})()})();
applyPrefs();
fetch('/api/public').then(r=>r.json()).then(d=>{D=d;applyPrefs()}).catch(()=>toast(t('netErr')))
.finally(()=>setTimeout(()=>{$('#loader').style.opacity=0;setTimeout(()=>$('#loader').remove(),800)},600));
