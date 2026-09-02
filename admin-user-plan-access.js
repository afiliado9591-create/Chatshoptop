/* ChatShop Admin — liberação manual COMPLETA de planos por usuário. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const adminOk=()=>{try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}};
const dbRef=()=>{try{return typeof db!=='undefined'&&db?db:null}catch(e){return null}};
const notify=msg=>{try{if(typeof toast==='function')return toast(msg)}catch(e){}alert(msg)};
function adminUser(){try{return typeof currentUser!=='undefined'&&currentUser?currentUser:(firebase?.auth?.()?.currentUser||null)}catch(e){return null}}
const PLAN={
  basico:{label:'Básico gratuito',productLimit:30,chatLimit:1,features:{catalog:true,whatsapp:true,virtual:false,chat:true,shipping:false,coupons:false,customDomain:false,mercadoPago:false}},
  profissional:{label:'Profissional',productLimit:1000000,chatLimit:2,features:{catalog:true,whatsapp:true,virtual:true,chat:true,shipping:true,coupons:true,customDomain:true,mercadoPago:true}}
};
let users=[];
function planKey(v){const s=String(v||'basico').toLowerCase();if(s.includes('prof')||s==='pro'||s.includes('premium'))return'profissional';return'basico'}
async function load(){
  if(!adminOk())return;
  const box=$('#adminConteudo');if(!box)return;
  box.innerHTML='<p class="empty-hint">Carregando usuários...</p>';
  try{
    const d=dbRef();if(!d)throw new Error('Banco indisponível');
    const snap=await d.collection('users').orderBy('createdAt','desc').limit(500).get();
    users=snap.docs.map(doc=>({uid:doc.id,...(doc.data()||{})}));
    render();
  }catch(e){console.error(e);box.innerHTML='<p class="empty-hint">Não foi possível carregar os usuários.</p>'}
}
function render(){
  const box=$('#adminConteudo');if(!box)return;
  box.innerHTML=`<div style="margin-bottom:12px"><h3 style="margin:0 0 4px">💳 Gerenciar planos</h3><small style="color:var(--muted)">Básico é gratuito com até 30 produtos. Profissional libera produtos ilimitados e Loja Virtual.</small></div><div class="field"><input id="adminPlanSearch" placeholder="Buscar por e-mail" style="width:100%"></div><div id="adminPlanList"></div>`;
  $('#adminPlanSearch')?.addEventListener('input',draw);draw();
}
function draw(){
  const list=$('#adminPlanList');if(!list)return;
  const q=String($('#adminPlanSearch')?.value||'').trim().toLowerCase();
  const items=users.filter(u=>!q||String(u.email||u.uid).toLowerCase().includes(q));
  if(!items.length){list.innerHTML='<p class="empty-hint">Nenhum usuário encontrado.</p>';return}
  list.innerHTML=items.map(u=>{
    const current=planKey(u.plan||u.plano),complete=u.adminPlanActive===true;
    return `<div style="padding:12px 0;border-bottom:1px solid #eee"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap"><div style="min-width:0;flex:1"><b style="word-break:break-all">${esc(u.email||u.uid)}</b><br><span style="font-size:12px;color:var(--muted)">Plano atual: <b>${esc(PLAN[current].label)}</b>${complete?' · ✅ acesso definido pelo admin':''}</span></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn success" data-plan-uid="${esc(u.uid)}" data-plan="basico" type="button">✅ Básico gratuito</button><button class="btn primary" data-plan-uid="${esc(u.uid)}" data-plan="profissional" type="button">⭐ Profissional</button></div></div></div>`;
  }).join('');
  $$('[data-plan-uid]',list).forEach(btn=>btn.onclick=()=>setPlan(btn.dataset.planUid,btn.dataset.plan));
}
async function setPlan(uid,key){
  if(!adminOk()||!uid||!PLAN[key])return;
  const p=PLAN[key],button=$(`[data-plan-uid="${CSS.escape(uid)}"][data-plan="${key}"]`);
  if(button){button.disabled=true;button.textContent='Salvando...'}
  try{
    const d=dbRef(),admin=adminUser()||{},manual=key==='profissional';
    const update={
      plan:key,plano:key,
      productLimit:p.productLimit,chatLimit:p.chatLimit,
      planFeatures:{...p.features},
      adminGrantedPlan:manual,planBrinde:manual,adminPlanActive:manual,
      adminPlanSource:manual?'admin':'default',
      basicAccess:true,basicPlanAccess:true,
      professionalAccess:key==='profissional',professionalPlanAccess:key==='profissional',
      virtualStoreAccess:key==='profissional',
      adminPlanUpdatedAt:firebase.firestore.FieldValue.serverTimestamp(),
      adminPlanUpdatedBy:String(admin.email||admin.uid||'admin')
    };
    await d.collection('users').doc(uid).set(update,{merge:true});
    let storeCount=0;
    try{
      const stores=await d.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').where('ownerUid','==',uid).get();
      storeCount=stores.size;
      await Promise.all(stores.docs.map(doc=>doc.ref.set({
        planTier:key,plan:key,plano:key,
        productLimit:p.productLimit,chatLimit:p.chatLimit,
        planFeatures:{...p.features},
        virtualStoreAccess:key==='profissional'
      },{merge:true})));
    }catch(e){console.warn('Plano salvo no usuário, mas houve falha ao sincronizar lojas',e)}
    const fresh=await d.collection('users').doc(uid).get();
    if(!fresh.exists||planKey(fresh.data()?.plan)!==key)throw new Error('O plano não ficou salvo no usuário.');
    const item=users.find(u=>u.uid===uid);if(item)Object.assign(item,update);
    notify(`Plano ${p.label} salvo. ${storeCount} loja(s) sincronizada(s).`);
    draw();
  }catch(e){console.error(e);notify('Não foi possível atualizar o plano. Verifique as regras do Firestore.');if(button)button.disabled=false}
}
function installTab(){
  if(!adminOk())return false;
  if($('#adminTabPlanAccess'))return true;
  const anchor=$('#adminTabVirtualAccess')||$('#adminTabUsuarios');if(!anchor)return false;
  const b=document.createElement('button');b.className='btn';b.id='adminTabPlanAccess';b.type='button';b.textContent='💳 Gerenciar Planos';anchor.insertAdjacentElement('afterend',b);b.onclick=load;return true;
}
function boot(){let tries=0;const t=setInterval(()=>{tries++;if(installTab()||tries>120)clearInterval(t)},100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
