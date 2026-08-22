/* ChatShop — controle leve de acesso aos planos.
   IMPORTANTE: este arquivo NAO altera collect(), frete, checkout ou layout da Loja Virtual.
   Ele apenas controla permissao/visibilidade e deixa os modulos originais trabalharem normalmente.
*/
(function(){
'use strict';

const POLICY={
  aprendiz:{products:10,chats:1,virtual:false},
  basico:{products:30,chats:1,virtual:false},
  profissional:{products:1000000,chats:2,virtual:true}
};

function adminMode(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function normalizePlan(v){const s=String(v||'aprendiz').toLowerCase();if(s.includes('prof')||s==='pro'||s.includes('premium'))return'profissional';if(s.includes('bas'))return'basico';return'aprendiz'}
function currentPlan(){try{return adminMode()?'profissional':normalizePlan((typeof myPlan!=='undefined'&&myPlan)||'aprendiz')}catch(e){return'aprendiz'}}
function manualVirtualAccess(){try{return window.__CHATSHOP_VIRTUAL_STORE_ACCESS===true}catch(e){return false}}
function canUseVirtual(){return adminMode()||POLICY[currentPlan()].virtual||manualVirtualAccess()}

function loadScriptOnce(src,id){
  if(document.getElementById(id))return;
  const s=document.createElement('script');s.id=id;s.src=src;s.defer=true;document.head.appendChild(s);
}

function ensureOriginalVirtualModules(){
  if(!canUseVirtual())return;
  /* Restaura os modulos originais que existiam antes da ocultacao da Loja Virtual. */
  loadScriptOnce('/virtual-shipping-upgrade.js?v=20260821-original-restore','chatshop-original-virtual-shipping');
  loadScriptOnce('/superfrete-upgrade.js?v=20260821-original-restore','chatshop-original-superfrete');
  loadScriptOnce('/store-layout-upgrade.js?v=20260821-original-restore','chatshop-original-store-layout');
  loadScriptOnce('/virtual-single-product-mode.js?v=20260821-original-restore','chatshop-original-single-product');
}

function applyAccess(){
  const plan=currentPlan(),cap=POLICY[plan]||POLICY.aprendiz;
  try{myProductLimit=cap.products;myChatLimit=cap.chats}catch(e){}
  const type=document.getElementById('storeType');
  const allow=canUseVirtual();
  if(type){
    const opt=[...type.options].find(o=>o.value==='virtual');
    if(opt){opt.hidden=!allow;opt.disabled=!allow}
    /* Nao troca Loja Virtual por afiliado se o usuario tiver permissao. */
    if(!allow&&type.value==='virtual'){
      type.value='affiliate';
      try{type.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}
    }
  }
  if(allow)ensureOriginalVirtualModules();
}

async function syncLoggedUser(){
  try{
    if(typeof db==='undefined'||!db||typeof myUid==='undefined'||!myUid)return;
    const ref=db.collection('users').doc(myUid);
    const snap=await ref.get();
    const u=snap.exists?(snap.data()||{}):{};
    const plan=adminMode()?'profissional':normalizePlan(u.plan||u.plano||currentPlan());
    try{myPlan=plan;myProductLimit=POLICY[plan].products;myChatLimit=POLICY[plan].chats}catch(e){}
    window.__CHATSHOP_VIRTUAL_STORE_ACCESS=adminMode()||u.virtualStoreAccess===true||POLICY[plan].virtual;
    setTimeout(applyAccess,80);
  }catch(e){console.warn('Falha ao sincronizar acesso da Loja Virtual',e)}
}

function install(){
  applyAccess();
  document.addEventListener('change',e=>{
    if(e.target?.id==='storeType')setTimeout(()=>{applyAccess();ensureOriginalVirtualModules()},20);
  },true);
  try{if(window.auth&&typeof auth.onAuthStateChanged==='function')auth.onAuthStateChanged(user=>{if(user)setTimeout(syncLoggedUser,120)})}catch(e){}
  const root=document.body;
  if(root&&!root.dataset.planAccessLightObserved){
    root.dataset.planAccessLightObserved='1';
    let timer;
    new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(applyAccess,150)}).observe(root,{childList:true,subtree:true});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
