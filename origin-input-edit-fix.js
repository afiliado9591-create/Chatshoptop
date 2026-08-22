/* ChatShop - garante edicao real dos 4 enderecos de origem da SuperFrete.
   Mantem o valor digitado enquanto o campo esta em foco para impedir que
   outros modulos repovoem o formulario e apaguem a digitacao. */
(function(){
'use strict';

const drafts=new Map();
function keyOf(el){
  if(el?.hasAttribute('data-origin-label'))return 'label-'+el.getAttribute('data-origin-label');
  if(el?.hasAttribute('data-origin-cep'))return 'cep-'+el.getAttribute('data-origin-cep');
  return '';
}
function isOriginInput(el){return !!el?.matches?.('[data-origin-label],[data-origin-cep]')}
function unlockAncestors(el){
  let p=el;
  while(p&&p!==document.body){
    p.removeAttribute?.('inert');
    if(p.style){p.style.pointerEvents='auto';p.style.opacity='1'}
    p=p.parentElement;
  }
}
function unlockOriginInputs(){
  const root=document.querySelector('#sfOrigins');
  if(!root)return;
  root.removeAttribute('inert');
  root.style.pointerEvents='auto';root.style.opacity='1';root.style.position='relative';root.style.zIndex='3';
  root.querySelectorAll('[data-origin-label],[data-origin-cep]').forEach(el=>{
    el.disabled=false;el.readOnly=false;el.removeAttribute('disabled');el.removeAttribute('readonly');el.removeAttribute('inert');
    el.style.pointerEvents='auto';el.style.userSelect='text';el.style.webkitUserSelect='text';el.style.opacity='1';el.style.position='relative';el.style.zIndex='4';
    el.tabIndex=0;unlockAncestors(el);
    const k=keyOf(el);
    if(document.activeElement===el&&k&&drafts.has(k)&&el.value!==drafts.get(k))el.value=drafts.get(k);
  });
  root.querySelectorAll('.sf-origin-row,.field,.grid2').forEach(el=>{el.removeAttribute('inert');el.style.pointerEvents='auto'});
}
function remember(el){const k=keyOf(el);if(k)drafts.set(k,el.value)}

function boot(){
  unlockOriginInputs();
  document.addEventListener('pointerdown',e=>{if(isOriginInput(e.target)){unlockOriginInputs();e.target.focus?.()}},true);
  document.addEventListener('focusin',e=>{if(isOriginInput(e.target)){unlockOriginInputs();remember(e.target)}},true);
  document.addEventListener('input',e=>{if(isOriginInput(e.target)){remember(e.target);setTimeout(()=>{if(document.activeElement===e.target){const k=keyOf(e.target);if(k&&drafts.has(k)&&e.target.value!==drafts.get(k))e.target.value=drafts.get(k)}},0)}},true);
  document.addEventListener('change',e=>{if(isOriginInput(e.target))remember(e.target)},true);
  document.addEventListener('blur',e=>{if(isOriginInput(e.target)){remember(e.target);setTimeout(()=>drafts.delete(keyOf(e.target)),250)}},true);
  const obs=new MutationObserver(()=>unlockOriginInputs());
  obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','readonly','inert','style','class']});
  setInterval(unlockOriginInputs,700);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
