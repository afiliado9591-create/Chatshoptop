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
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
