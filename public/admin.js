const $=s=>document.querySelector(s);let ME=null,TAB='applications';
const el=(t,a={},...c)=>{const e=document.createElement(t);for(const[k,v]of Object.entries(a))k==='class'?e.className=v:k.startsWith('on')?e[k]=v:e.setAttribute(k,v);c.flat().forEach(x=>e.append(x));return e};
const toast=(m,ok)=>{const x=el('div',{class:'toast'+(ok?' ok':'')},m);$('#toasts').append(x);setTimeout(()=>x.remove(),4000)};
async function api(url,method='GET',body){
  const o={method,headers:{}};if(body instanceof FormData)o.body=body;else if(body){o.headers['Content-Type']='application/json';o.body=JSON.stringify(body)}
  const r=await fetch('/api/'+url,o),j=await r.json().catch(()=>({}));
  if(r.status===401&&url!=='login'){showLogin();throw new Error('Session expired')}
  if(!r.ok){toast(j.error||'Error');throw new Error(j.error)}return j;
}
const RANKS=['Creator','Owner','Co-Owner','High Manager','Manager','Supervisor','Member'];
const ENT={
 members:{min:'admin',f:[['name','text'],['rank','select',RANKS],['member_id','text'],['join_date','date'],['description','textarea'],['telegram','text'],['img','file','Profile picture']],line:m=>`${m.name} — ${m.rank} (${m.member_id})`},
 rules:{min:'admin',f:[['title_fa','text'],['title_en','text'],['body_fa','textarea'],['body_en','textarea'],['sort','number']],line:r=>`${r.title_en} / ${r.title_fa}`},
 announcements:{min:'moderator',f:[['title_fa','text'],['title_en','text'],['body_fa','textarea'],['body_en','textarea'],['author','text'],['important','checkbox','Important'],['img','file','Image']],line:a=>`${a.important?'★ ':''}${a.title_en} — ${a.author}`}};
const LV={moderator:1,admin:2,super:3},can=m=>LV[ME.role]>=LV[m];
function showLogin(){ME=null;$('#login').hidden=false;$('#app').hidden=true;$('#who').replaceChildren()}
async function boot(){try{ME=await api('me');$('#login').hidden=true;$('#app').hidden=false;
  $('#who').replaceChildren(`${ME.username} (${ME.role}) `,el('button',{class:'btn sm',onclick:async()=>{await api('logout','POST');showLogin()}},'Sign out'));tabs()}catch{showLogin()}}
$('#go').onclick=async()=>{$('#le').textContent='';try{await api('login','POST',{username:$('#u').value,password:$('#p').value});$('#p').value='';boot()}catch(e){$('#le').textContent=e.message}};
$('#p').onkeydown=e=>{if(e.key==='Enter')$('#go').click()};
function tabs(){const L=['applications','members','rules','announcements',...(can('admin')?['settings']:[]),...(can('super')?['admins']:[])].filter(k=>!ENT[k]||can(ENT[k].min));
  if(!L.includes(TAB))TAB=L[0];
  $('#tabs').replaceChildren(...L.map(k=>el('button',{class:'btn sm'+(k===TAB?' on':''),onclick:()=>{TAB=k;tabs()}},k[0].toUpperCase()+k.slice(1))));
  ({applications:apps,settings:settings,admins:admins})[TAB]?.()||crud(TAB)}
async function crud(k){
  const E=ENT[k],L=await api('admin/'+k);
  $('#view').replaceChildren(el('button',{class:'btn p sm',onclick:()=>form(k)},'+ Add'),...L.map(x=>el('div',{class:'card row2'},E.line(x),el('div',{},el('button',{class:'btn sm',onclick:()=>form(k,x)},'Edit'),' ',
    can('admin')?el('button',{class:'btn sm',onclick:async()=>{if(confirm('Delete permanently?')){await api(`admin/${k}/${x.id}`,'DELETE');toast('Deleted',1);crud(k)}}},'Delete'):''))));
}
function form(k,x){
  const E=ENT[k],f=$('#df');
  f.replaceChildren(el('h3',{},(x?'Edit ':'Add ')+k),...E.f.flatMap(([n,t,o])=>{
    let i;if(t==='select')i=el('select',{name:n},...o.map(v=>el('option',{value:v},v)));else if(t==='textarea')i=el('textarea',{name:n,rows:3});
    else if(t==='file')i=el('input',{name:n,type:'file',accept:'image/png,image/jpeg,image/webp'});else if(t==='checkbox')i=el('input',{name:n,type:'checkbox',style:'width:auto'});else i=el('input',{name:n,type:t});
    if(x&&t!=='file'){if(t==='checkbox')i.checked=!!x[n];else i.value=x[n]??''}
    return[el('label',{},typeof o==='string'?o:n),i]}),
    el('div',{class:'row2',style:'margin-top:16px'},el('button',{class:'btn p',type:'button',id:'sv'},'Save'),el('button',{class:'btn',type:'button',onclick:()=>$('#dlg').close()},'Cancel')));
  f.querySelector('#sv').onclick=async()=>{const fd=new FormData();for(const[n,t]of E.f){const i=f.elements[n];if(t==='file'){if(i.files[0])fd.append('img',i.files[0])}else fd.append(n,t==='checkbox'?(i.checked?'1':'0'):i.value)}
    try{await api(`admin/${k}${x?'/'+x.id:''}`,x?'PUT':'POST',fd);$('#dlg').close();toast('Saved',1);crud(k)}catch{}};
  $('#dlg').showModal();
}
async function apps(){
  const L=await api('admin/applications');
  $('#view').replaceChildren(...(L.length?L.map(a=>{const r=el('textarea',{rows:2,placeholder:'Optional response to applicant'});r.value=a.response||'';
    const set=async s=>{await api('admin/applications/'+a.id,'PUT',{status:s,response:r.value});toast('Updated',1);apps()};
    return el('div',{class:'card'},el('div',{class:'row2'},el('b',{},`${a.app_id} · ${a.ic_name} · @${a.telegram} · Lv ${a.level}`),el('span',{class:'pill'},a.status)),
      el('p',{style:'color:var(--mu)'},'Experience: '+(a.experience||'—')),el('p',{},a.reason),
      el('a',{href:`/api/admin/applications/${a.id}/screenshot`,target:'_blank',rel:'noopener',style:'color:var(--red)'},'View screenshot'),r,
      el('div',{class:'row2',style:'margin-top:8px'},el('div',{},el('button',{class:'btn p sm',onclick:()=>set('approved')},'Approve'),' ',el('button',{class:'btn sm',onclick:()=>set('rejected')},'Reject')),
        can('admin')?el('button',{class:'btn sm',onclick:async()=>{if(confirm('Delete this application and its screenshot?')){await api('admin/applications/'+a.id,'DELETE');apps()}}},'Delete'):''))}):[el('p',{},'No applications yet.')]));
}
async function settings(){
  const S=await api('admin/settings');const F=[['faction','text','Current faction'],['status','select',['active','inactive','recruiting','closed']],['recruitment','select',['open','closed'],'Recruitment form'],['family_rank','text','Family rank'],['established','text','Established'],['online','text','Online members (leave empty to hide)'],['tg_support','text','Telegram support link'],['tg_channel','text','Telegram channel link']];
  const f=el('div',{class:'card'},...F.flatMap(([n,t,o,l])=>[el('label',{},l||n),t==='select'?el('select',{id:'s_'+n},...o.map(v=>el('option',{value:v},v))):el('input',{id:'s_'+n})]),
    el('button',{class:'btn p',style:'margin-top:16px',onclick:async()=>{const b={};F.forEach(([n])=>b[n]=$('#s_'+n).value);await api('admin/settings','PUT',b);toast('Saved',1)}},'Save settings'));
  $('#view').replaceChildren(f);F.forEach(([n])=>$('#s_'+n).value=S[n]??'');
}
async function admins(){
  const L=await api('admin/users');const u=el('input',{placeholder:'username'}),p=el('input',{type:'password',placeholder:'password (10+ chars)'}),r=el('select',{},...['moderator','admin','super'].map(v=>el('option',{value:v},v)));
  $('#view').replaceChildren(el('div',{class:'card'},el('div',{class:'row2'},u,p,r,el('button',{class:'btn p sm',onclick:async()=>{await api('admin/users','POST',{username:u.value,password:p.value,role:r.value});toast('Created',1);admins()}},'Add admin'))),
    ...L.map(a=>el('div',{class:'card row2'},`${a.username} — ${a.role}`,a.id!==ME.id?el('button',{class:'btn sm',onclick:async()=>{if(confirm('Delete this admin?')){await api('admin/users/'+a.id,'DELETE');admins()}}},'Delete'):'')));
}
boot();
