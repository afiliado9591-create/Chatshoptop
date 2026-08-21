/* ChatShop — impede que módulos voltem a embrulhar collect() indefinidamente. */
(function(){
'use strict';
const markers=[
  '__storePagesWrapped',
  '__mpOauthWrapped',
  '__sellerAudioWrapped',
  '__catalogSellerModelWrapped',
  '__singleProductVideoWrapped',
  '__singleProductMenuWrapped',
  '__superfreteWrapped',
  '__productSellerButtonWrapped',
  '__sellerButtonProductWrapped',
  '__planAccessWrapped',
  '__affiliateCatalogQnaWrapped'
];
let lastCollect=null;
function markCurrent(){
  const fn=window.collect;
  if(typeof fn!=='function')return false;
  markers.forEach(k=>{try{fn[k]=true}catch(e){}});
  lastCollect=fn;
  return true;
}
function ensureAdminCsvAfterAuth(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    let admin=false;
    try{admin=typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){}
    if(admin){
      clearInterval(timer);
      if(window.__chatshopAdminCsvReloaded)return;
      window.__chatshopAdminCsvReloaded=true;
      const s=document.createElement('script');
      s.src='/admin-public-pages.js?v=20260820-1055-after-auth';
      s.async=true;
      document.body.appendChild(s);
      return;
    }
    if(tries>120)clearInterval(timer);
  },250);
}
function boot(){
  /*
   * Não paramos de vigiar depois do primeiro collect(). Vários módulos do ChatShop
   * são reinjetados ou executam refresh periódico. Quando um deles cria um novo
   * wrapper, as flags que estavam no wrapper anterior deixam de estar na função
   * externa. Reaplicar todas as flags na função corrente impede a formação de uma
   * cadeia infinita de wrappers e preserva os wrappers já instalados.
   */
  markCurrent();
  setInterval(()=>{
    const fn=window.collect;
    if(typeof fn!=='function')return;
    if(fn!==lastCollect)markCurrent();
    else markers.forEach(k=>{try{fn[k]=true}catch(e){}});
  },100);

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#publishBtn')){
      markCurrent();
      setTimeout(markCurrent,0);
    }
  },true);

  /* Se scripts forem adicionados dinamicamente, marque novamente o collect atual. */
  if(document.documentElement&&!document.documentElement.dataset.collectGuardObserved){
    document.documentElement.dataset.collectGuardObserved='1';
    new MutationObserver(mutations=>{
      if(mutations.some(m=>[...m.addedNodes].some(n=>n?.tagName==='SCRIPT')))setTimeout(markCurrent,0);
    }).observe(document.documentElement,{childList:true,subtree:true});
  }
  ensureAdminCsvAfterAuth();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
