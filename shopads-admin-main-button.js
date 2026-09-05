/* Botão permanente do ShopAds no painel admin principal do ChatShop. */
(function(){
'use strict';
const ADMIN_EMAILS=['jeanaguiar636@gmail.com','afiliado9591@gmail.com'];
function user(){try{return (typeof currentUser!=='undefined'&&currentUser)||firebase?.auth?.().currentUser||null}catch(e){return null}}
function admin(){
  try{if(typeof isAdmin!=='undefined'&&isAdmin===true)return true}catch(e){}
  try{if(window.isAdmin===true)return true}catch(e){}
  const email=String(user()?.email||'').trim().toLowerCase();
  return ADMIN_EMAILS.includes(email);
}
function ensureCampaignControls(){
  if(document.getElementById('shopAdsCampaignControlsScript'))return;
  const s=document.createElement('script');s.id='shopAdsCampaignControlsScript';s.src='/shopads-campaign-controls.js';s.async=true;document.head.appendChild(s);
}
function ensureAdminScript(){
  if(typeof window.openShopAdsAdmin==='function'||document.getElementById('shopAdsAdminScriptMain'))return;
  const s=document.createElement('script');s.id='shopAdsAdminScriptMain';s.src='/shopads-admin.js';s.async=true;document.head.appendChild(s);
}
function install(){
  ensureCampaignControls();
  const anchor=document.getElementById('adminBtn');
  let b=document.getElementById('shopAdsAdminMainBtn');
  if(!admin()){
    if(b)b.remove();
    return false;
  }
  ensureAdminScript();
  if(!anchor||!anchor.parentElement)return false;
  if(!b){
    b=document.createElement('button');
    b.id='shopAdsAdminMainBtn';
    b.type='button';
    b.className='btn dark';
    b.textContent='🛡️ ShopAds';
    b.style.display='inline-block';
    b.onclick=()=>{
      if(typeof window.openShopAdsAdmin==='function')window.openShopAdsAdmin();
      else { ensureAdminScript(); setTimeout(()=>window.openShopAdsAdmin?.(),500); }
    };
    anchor.insertAdjacentElement('afterend',b);
  }else b.style.display='inline-block';
  return true;
}
function boot(){
  install();
  let n=0;const t=setInterval(()=>{install();if(++n>240)clearInterval(t)},250);
  try{if(typeof firebase!=='undefined'&&firebase.auth)firebase.auth().onAuthStateChanged(()=>setTimeout(install,50))}catch(e){}
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
