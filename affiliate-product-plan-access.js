/* ChatShop: catálogo em todos os planos; produto próprio a partir do Básico. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s), $$=(s,r)=>[...(r||document).querySelectorAll(s)];

/* Evita que scripts antigos entrem em loop quando os cartões de Planos são alterados. */
(function guardPlanMutations(){
  if(window.__chatshopPlanMutationGuard)return;
  window.__chatshopPlanMutationGuard=true;
  const NativeMutationObserver=window.MutationObserver;
  if(!NativeMutationObserver)return;
  window.MutationObserver=function(callback){
    return new NativeMutationObserver((mutations,observer)=>{
      const relevantes=mutations.filter(m=>{
        const target=m.target&&m.target.nodeType===1?m.target:m.target?.parentElement;
        return !(target&&target.closest&&target.closest('#plansCols'));
      });
      if(relevantes.length)callback(relevantes,observer);
    });
  };
  window.MutationObserver.prototype=NativeMutationObserver.prototype;
})();

function isAdminUser(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function currentPlan(){try{return isAdminUser()?'profissional':((typeof myPlan!=='undefined'&&myPlan)||'aprendiz')}catch(e){return'aprendiz'}}
function canOwnProducts(){return isAdminUser()||currentPlan()==='basico'||currentPlan()==='profissional'}
function limitFor(p){return p==='aprendiz'?10:(p==='basico'?50:1000000)}
function upgrade(){try{if(typeof abrirPlanos==='function')return abrirPlanos()}catch(e){};try{window.abrirPlanos?.()}catch(e){}}
function notify(msg){try{if(typeof toast==='function')return toast(msg)}catch(e){};alert(msg)}
function applyLimits(){
  try{
    if(typeof PLANOS!=='undefined'){
      if(PLANOS.aprendiz)PLANOS.aprendiz.limiteProdutos=10;
      if(PLANOS.basico)PLANOS.basico.limiteProdutos=50;
      if(PLANOS.profissional)PLANOS.profissional.limiteProdutos=1000000;
    }
    if(typeof myProductLimit!=='undefined')myProductLimit=limitFor(currentPlan());
  }catch(e){}
}
function revealOwnProductEditor(){
  if(!canOwnProducts())return;
  const add=$('#addProduct');
  if(add){
    add.style.removeProperty('display');
    add.disabled=false;
    if(add.textContent!=='+ Produto próprio')add.textContent='+ Produto próprio';
  }
  $$('#products .product').forEach(card=>{
    if(card.dataset.catalogProductId||card.dataset.catalogId)return;
    card.classList.remove('affiliate-compact-card');
  });
}
function protectFreeOwnProducts(){
  document.addEventListener('click',e=>{
    const add=e.target.closest?.('#addProduct');
    if(!add||canOwnProducts())return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    notify('Produto próprio, upload e link de imagem são liberados a partir do plano Básico. O catálogo continua disponível no Aprendiz.');
    upgrade();
  },true);
}
function updatePlanText(){
  const cols=$('#plansCols');if(!cols)return;
  $$('.plan-card',cols).forEach(card=>{
    const title=card.querySelector('h3')?.textContent||'';
    const lim=card.querySelector('.lim,.plan-benefits');
    if(!lim)return;
    let wanted='';
    if(/aprendiz|grátis/i.test(title))wanted='✅ Até 10 produtos<br>✅ Catálogo pronto<br>✅ Chat Vendedor ativo<br>✅ Troca dos links de afiliado';
    else if(/básico/i.test(title))wanted='✅ Até 50 produtos<br>✅ Catálogo pronto<br>✅ Produtos próprios<br>✅ Upload de imagem<br>✅ Link de imagem<br>✅ Chat Vendedor ativo';
    else if(/profissional/i.test(title))wanted='✅ Produtos ilimitados<br>✅ Catálogo pronto<br>✅ Produtos próprios<br>✅ Upload e link de imagem<br>✅ Loja Virtual completa<br>✅ Recursos avançados';
    if(wanted&&lim.innerHTML!==wanted)lim.innerHTML=wanted;
    if(wanted){
      lim.classList.remove('lim');
      lim.classList.add('plan-benefits');
    }
  });
}
function refresh(){applyLimits();if(canOwnProducts())revealOwnProductEditor()}
function boot(){
  protectFreeOwnProducts();
  refresh();
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#verPlanosBtn,#verPlanosLink,[onclick*="abrirPlanos"],#addProduct'))setTimeout(()=>{updatePlanText();refresh()},0);
  },true);
  const modal=$('#plansModal');
  if(modal){
    const obs=new MutationObserver(()=>{});
    obs.observe(modal,{childList:false,subtree:false});
  }
  setInterval(refresh,3000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
