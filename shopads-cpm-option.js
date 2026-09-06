/* Acrescenta CPM às opções de resultado do ShopAds sem remover as existentes. */
(function(){
'use strict';
function addCPM(){
  document.querySelectorAll('select[name="resultType"]').forEach(select=>{
    if(select.querySelector('option[value="cpm"]'))return;
    const option=document.createElement('option');
    option.value='cpm';
    option.textContent='CPM — 1.000 visualizações';
    select.appendChild(option);
  });
}
function boot(){
  addCPM();
  const observer=new MutationObserver(addCPM);
  observer.observe(document.body||document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
