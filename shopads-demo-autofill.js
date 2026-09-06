/* ShopAds — corrige o simulador: ao escolher campanha, preenche comissão e valor por resultado reais da campanha para a demonstração. */
(function(){'use strict';
if(window.__SHOPADS_DEMO_AUTOFILL__)return;window.__SHOPADS_DEMO_AUTOFILL__=true;
function dbRef(){try{return typeof db!=='undefined'&&db?db:null}catch(e){return null}}
function clamp(v,f=70){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):f}
async function defaultPercent(){const d=dbRef();if(!d)return 70;try{const s=await d.collection('config').doc('shopadsCommission').get();return s.exists?clamp(s.data()?.promoterPercent,70):70}catch(e){return 70}}
async function fill(force){const sel=document.getElementById('sademoCampaign'),percent=document.getElementById('sademoPercent'),reward=document.getElementById('sademoReward');if(!sel||!percent||!reward||!sel.value)return;const d=dbRef();if(!d)return;try{const [snap,def]=await Promise.all([d.collection('shopadsCampaigns').doc(sel.value).get(),defaultPercent()]);if(!snap.exists)return;const c=snap.data()||{},p=clamp(c.promoterPercent,def),r=Number(c.reward||0);if(force||percent.value===''||Number(percent.value)===0)percent.value=String(p);if(force||reward.value===''||Number(String(reward.value).replace(',','.'))===0)reward.value=r>0?String(r).replace('.',','):'';percent.dispatchEvent(new Event('input',{bubbles:true}));reward.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){console.warn('ShopAds demo autofill',e)}}
function install(){const sel=document.getElementById('sademoCampaign');if(!sel||sel.dataset.demoAutofill==='1')return;sel.dataset.demoAutofill='1';sel.addEventListener('change',()=>fill(true));setTimeout(()=>fill(false),250)}
function boot(){install();new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});setInterval(install,1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
