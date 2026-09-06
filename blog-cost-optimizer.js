/* AliBR Blog — otimiza leituras do Firestore sem remover métricas. */
(function(){
'use strict';
if(window.__ALIBR_BLOG_COST_OPTIMIZER__)return;
window.__ALIBR_BLOG_COST_OPTIMIZER__=true;
const $=s=>document.querySelector(s);
const CACHE_MS=5*60*1000;
let adminCache=null,adminCacheAt=0,usersCache=null,usersCacheAt=0;
function blogDb(){try{return typeof db!=='undefined'&&db?db:null}catch(e){return null}}
function adminOk(){try{return typeof isAdmin==='function'?isAdmin():false}catch(e){return false}}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
function dateTextSafe(ts){try{return typeof dateText==='function'?dateText(ts):''}catch(e){return''}}
function initialsSafe(name){return String(name||'A').trim().split(/\s+/).slice(0,2).map(x=>x.charAt(0)).join('').toUpperCase()||'A'}
function safeUrlSafe(v){try{return typeof safeUrl==='function'?safeUrl(v):''}catch(e){return''}}
function postCardSafe(p){try{return typeof postCard==='function'?postCard(p,true,true):'<div class="card"><b>'+esc(p.title||'Publicação')+'</b></div>'}catch(e){return'<div class="card"><b>'+esc(p.title||'Publicação')+'</b></div>'}}

async function ensureSummaryClickMigration(rows){
  const d=blogDb();if(!d)return{};
  const ref=d.collection('blogMetrics').doc('summary');
  let snap=await ref.get(),m=snap.exists?(snap.data()||{}):{};
  if(m.postClicksMigrated===true)return m;
  try{
    const events=await d.collection('blogEvents').where('type','==','click').limit(1000).get();
    const counts={};events.docs.forEach(x=>{const id=String(x.data()?.postId||'').trim();if(id)counts[id]=(counts[id]||0)+1});
    await ref.set({postClicks:counts,postClicksMigrated:true,postClicksMigratedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    m={...m,postClicks:counts,postClicksMigrated:true};
  }catch(e){console.warn('Migração de cliques do blog adiada',e)}
  return m;
}

async function optimizedLoadAdmin(force=false){
  if(!adminOk())return;
  if(!force&&adminCache&&Date.now()-adminCacheAt<CACHE_MS){renderAdminCached(adminCache);return}
  const d=blogDb();if(!d)return;
  const adminList=$('#adminList');if(adminList)adminList.innerHTML='<div class="skeleton"></div>';
  try{
    const postsSnap=await d.collection('blogPosts').limit(500).get();
    const rows=postsSnap.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    const pending=rows.filter(p=>p.status==='pending'),approved=rows.filter(p=>p.status==='approved').length,rejected=rows.filter(p=>p.status==='rejected').length;
    const result=await Promise.allSettled([d.collection('blogMetrics').doc('summary').get(),d.collection('blogConfig').doc('settings').get()]);
    let metricsDoc=result[0].status==='fulfilled'?result[0].value:null;
    const configDoc=result[1].status==='fulfilled'?result[1].value:null;
    let m=metricsDoc&&metricsDoc.exists?metricsDoc.data()||{}:{};
    if(m.postClicksMigrated!==true)m=await ensureSummaryClickMigration(rows);
    adminCache={rows,pending,approved,rejected,m,config:configDoc&&configDoc.exists?(configDoc.data()||{}):null};adminCacheAt=Date.now();
    renderAdminCached(adminCache);
    await optimizedLoadAdminUsers(rows,false);
  }catch(e){console.error('Painel otimizado do blog indisponível',e);if(adminList)adminList.innerHTML='<div class="empty">Não foi possível carregar o painel do blog.</div>'}
}
function renderAdminCached(data){
  const {rows,pending,approved,rejected,m,config}=data;
  if($('#metricPosts'))$('#metricPosts').textContent=rows.length;
  if($('#metricBreakdown'))$('#metricBreakdown').innerHTML='<div class="metricRow"><span>Aguardando aprovação</span><b>'+pending.length+'</b></div><div class="metricRow"><span>Aprovadas</span><b>'+approved+'</b></div><div class="metricRow"><span>Rejeitadas</span><b>'+rejected+'</b></div>';
  if($('#adminList'))$('#adminList').innerHTML=pending.length?'<div class="feed">'+pending.map(postCardSafe).join('')+'</div>':'<div class="empty">Não há publicações aguardando aprovação.</div>';
  if($('#metricUsers'))$('#metricUsers').textContent=Number(m?.users)||0;
  if($('#metricViews'))$('#metricViews').textContent=Number(m?.views)||0;
  if($('#metricClicks'))$('#metricClicks').textContent=Number(m?.clicks)||0;
  const titles=Object.fromEntries(rows.map(p=>[p.id,p.title||'Sem título'])),counts=m?.postClicks||{};
  const top=Object.entries(counts).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0)).slice(0,10);
  if($('#topClicks'))$('#topClicks').innerHTML=top.length?top.map(([id,n])=>'<div class="metricRow"><span>'+esc(titles[id]||'Publicação')+'</span><b>'+Number(n||0)+'</b></div>').join(''):'<span class="hint">Ainda não há cliques registrados.</span>';
  if(config){
    if($('#gaMeasurementId'))$('#gaMeasurementId').value=config.gaMeasurementId||'';
    if($('#searchConsoleVerification'))$('#searchConsoleVerification').value=config.searchConsoleVerification||'';
    if($('#topAdImage'))$('#topAdImage').value=config.topAdImage||'';
    if($('#topAdLink'))$('#topAdLink').value=config.topAdLink||'';
    if($('#topAdEnabled'))$('#topAdEnabled').checked=config.topAdEnabled===true;
    try{if(typeof applyBlogConfig==='function')applyBlogConfig(config)}catch(e){}
  }
}

async function optimizedLoadAdminUsers(postsRows,force=false){
  const box=$('#adminUsersSummary');if(!box||!adminOk())return;
  if(!force&&usersCache&&Date.now()-usersCacheAt<CACHE_MS){window.adminUsersCache=usersCache;try{if(typeof renderAdminUsers==='function')renderAdminUsers()}catch(e){}return}
  const d=blogDb();if(!d)return;box.innerHTML='<div class="skeleton"></div>';
  try{
    /* Carrega no máximo 100 contas/perfis por vez. Pontos usam o saldo agregado no usuário/perfil quando existir. */
    const result=await Promise.allSettled([d.collection('users').orderBy('createdAt','desc').limit(100).get(),d.collection('profiles').limit(100).get()]);
    const usersSnap=result[0].status==='fulfilled'?result[0].value:null,profilesSnap=result[1].status==='fulfilled'?result[1].value:null,m={};
    (usersSnap?.docs||[]).forEach(x=>m[x.id]={uid:x.id,user:x.data()||{}});
    (profilesSnap?.docs||[]).forEach(x=>{m[x.id]=m[x.id]||{uid:x.id,user:{}};m[x.id].profile=x.data()||{}});
    (postsRows||[]).forEach(p=>{if(!p.authorUid)return;m[p.authorUid]=m[p.authorUid]||{uid:p.authorUid,user:{}};const x=m[p.authorUid];x.posts=x.posts||[];x.posts.push(p);if(!x.email&&p.authorEmail)x.email=p.authorEmail});
    const list=Object.values(m).map(x=>{const u=x.user||{},p=x.profile||{},posts=x.posts||[],name=p.name||u.name||u.displayName||String(u.email||x.email||'Usuário').split('@')[0],email=u.email||x.email||'',slug=p.slug||'',plan=String(u.plan||u.plano||'aprendiz');const points=Number(u.pointsBalance??u.points??p.pointsBalance??p.points??0)||0;return{uid:x.uid,name,email,photo:p.photo||'',whatsapp:p.whatsapp||u.whatsapp||'',location:p.location||'',plan:plan==='profissional'?'Profissional':plan==='basico'?'Básico':'Grátis',created:dateTextSafe(u.createdAt)||'não informado',posts:posts.length,approved:posts.filter(y=>y.status==='approved').length,pending:posts.filter(y=>y.status==='pending').length,points,profileUrl:p.public!==false&&Object.keys(p).length?'/perfil/'+encodeURIComponent(slug||x.uid):'',search:(name+' '+email+' '+(p.whatsapp||'')+' '+(p.location||'')).toLowerCase()}}).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    usersCache=list;usersCacheAt=Date.now();window.adminUsersCache=list;try{adminUsersCache=list}catch(e){};try{if(typeof renderAdminUsers==='function')renderAdminUsers()}catch(e){box.innerHTML='<div class="empty">Usuários carregados.</div>'}
  }catch(e){console.error(e);box.innerHTML='<div class="empty">Não foi possível carregar o resumo dos usuários.</div>'}
}

/* Visitante único: grava somente na primeira visita deste navegador. Antes havia escrita em toda abertura. */
async function optimizedRegisterVisitor(){
  try{
    const d=blogDb();if(!d)return;
    let id=localStorage.getItem('blogAlibrVisitor');if(id)return;
    id=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2));localStorage.setItem('blogAlibrVisitor',id);
    await d.collection('blogVisitors').doc(id).set({createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    await d.collection('blogMetrics').doc('summary').set({users:firebase.firestore.FieldValue.increment(1),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  }catch(e){console.warn('Visitante não registrado',e)}
}

/* Mantém total de cliques e ranking por postagem no mesmo documento-resumo; não precisa criar evento a cada clique. */
async function optimizedRecordMetric(type,postId=''){
  try{
    if(typeof ensureBlogAuth==='function')await ensureBlogAuth();
    const d=blogDb();if(!d)return;const ref=d.collection('blogMetrics').doc('summary');
    if(type==='click'&&postId){
      const id=String(postId).replace(/[.]/g,'_').slice(0,120),inc=firebase.firestore.FieldValue.increment(1),ts=firebase.firestore.FieldValue.serverTimestamp();
      try{await ref.update({clicks:inc,['postClicks.'+id]:inc,updatedAt:ts})}catch(e){await ref.set({clicks:inc,postClicks:{[id]:inc},updatedAt:ts},{merge:true})}
      adminCache=null;return;
    }
    await ref.set({[type+'s']:firebase.firestore.FieldValue.increment(1),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  }catch(e){console.warn('Métrica não registrada',e)}
}

function install(){
  try{window.loadAdmin=optimizedLoadAdmin;loadAdmin=optimizedLoadAdmin}catch(e){}
  try{window.loadAdminUsers=optimizedLoadAdminUsers;loadAdminUsers=optimizedLoadAdminUsers}catch(e){}
  try{window.registerVisitor=optimizedRegisterVisitor;registerVisitor=optimizedRegisterVisitor}catch(e){}
  try{window.recordMetric=optimizedRecordMetric;recordMetric=optimizedRecordMetric}catch(e){}
  document.addEventListener('click',e=>{const b=e.target.closest?.('#adminTab');if(b)setTimeout(()=>optimizedLoadAdmin(false),0)},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
