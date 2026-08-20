/* ChatShop — impede que módulos voltem a embrulhar collect() indefinidamente. */
(function(){
'use strict';
const markers=[
  '__storePagesWrapped',
  '__mpOauthWrapped',
  '__sellerAudioWrapped',
  '__catalogSellerModelWrapped',
  '__singleProductVideoWrapped',
  '__superfreteWrapped',
  '__productSellerButtonWrapped',
  '__planAccessWrapped'
];
function markCurrent(){
  const fn=window.collect;
  if(typeof fn!=='function')return false;
  markers.forEach(k=>{try{fn[k]=true}catch(e){}});
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
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(markCurrent()||tries>40)clearInterval(timer);
  },100);
  setTimeout(markCurrent,700);
  setTimeout(markCurrent,1500);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#publishBtn'))markCurrent();
  },true);
  ensureAdminCsvAfterAuth();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
