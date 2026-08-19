/* ChatShop - garante edicao dos campos de enderecos de origem da SuperFrete. */
(function(){
'use strict';

function unlockOriginInputs(){
  const root=document.querySelector('#sfOrigins');
  if(!root)return;
  root.style.pointerEvents='auto';
  root.style.opacity='1';
  root.querySelectorAll('input,select,textarea,button').forEach(el=>{
    if(el.matches('[data-origin-label],[data-origin-cep]')){
      el.disabled=false;
      el.readOnly=false;
      el.removeAttribute('disabled');
      el.removeAttribute('readonly');
      el.style.pointerEvents='auto';
      el.style.userSelect='text';
      el.style.webkitUserSelect='text';
      el.style.opacity='1';
      el.tabIndex=0;
    }
  });
  root.querySelectorAll('.sf-origin-row,.field,.grid2').forEach(el=>{
    el.style.pointerEvents='auto';
  });
}

function boot(){
  unlockOriginInputs();
  const obs=new MutationObserver(()=>unlockOriginInputs());
  obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','readonly','style','class']});
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#superfreteSettings,#sfOrigins'))setTimeout(unlockOriginInputs,0);
  },true);
  document.addEventListener('focusin',e=>{
    if(e.target.matches?.('[data-origin-label],[data-origin-cep]'))unlockOriginInputs();
  },true);
  setInterval(unlockOriginInputs,1200);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
