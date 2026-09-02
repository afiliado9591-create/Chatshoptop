(function(){
'use strict';
if(window.__SHOPADS_TRACKER_LOADED)return;
window.__SHOPADS_TRACKER_LOADED=true;
const ENDPOINT='https://adsalibr.netlify.app/action';
const KEY='shopads_attribution_v1';
const TTL=30*24*60*60*1000;
function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(!x||!x.clickId||Date.now()-Number(x.savedAt||0)>TTL)return null;return x}catch{return null}}
function save(x){try{localStorage.setItem(KEY,JSON.stringify({...x,savedAt:Date.now()}))}catch{}}
function capture(){const q=new URLSearchParams(location.search);const clickId=q.get('shopads_click');if(!clickId)return read();const x={clickId,campaignId:q.get('shopads_campaign')||'',affiliateId:q.get('shopads_affiliate')||''};save(x);return x}
async function track(action,extra){const a=read()||capture();if(!a?.clickId)return false;try{await fetch(ENDPOINT,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({clickId:a.clickId,action,page:location.href,...(extra||{})}),keepalive:true});return true}catch{return false}}
window.ShopAdsTrack=track;
const attribution=capture();
if(attribution){const once='shopads_page_'+attribution.clickId;try{if(!sessionStorage.getItem(once)){sessionStorage.setItem(once,'1');track('page_view')}}catch{track('page_view')}}
function wire(){document.addEventListener('click',e=>{const el=e.target.closest('button,a');if(!el)return;const id=(el.id||'').toLowerCase(),txt=(el.textContent||'').toLowerCase();if(id==='chatshopdownloadbutton'||txt.includes('baixar chatshop'))track('download_chatshop');else if(txt.includes('assinar')||txt.includes('plano básico')||txt.includes('plano profissional'))track('upgrade_intent');else if(txt.includes('criar conta')||txt.includes('cadastre')||txt.includes('cadastro'))track('signup_intent')},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
