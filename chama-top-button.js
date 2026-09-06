/* ChatShop — atalho oficial para o Chama no topo do painel. */
(function(){'use strict';
if(window.__CHATSHOP_CHAMA_TOP_BUTTON__)return;window.__CHATSHOP_CHAMA_TOP_BUTTON__=true;
const ID='chatshopChamaTopButton';
function style(){if(document.getElementById(ID+'Style'))return;const s=document.createElement('style');s.id=ID+'Style';s.textContent=`#${ID}{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#16a34a!important;color:#fff!important;text-decoration:none!important;border:0;border-radius:10px;padding:9px 14px;font-weight:800;font-size:14px;line-height:1.2;box-shadow:0 2px 8px rgba(22,163,74,.22);white-space:nowrap;margin:4px 6px}#${ID}:hover{background:#15803d!important}@media(max-width:600px){#${ID}{padding:8px 10px;font-size:12px;margin:3px 4px}}`;document.head.appendChild(s)}
function install(){if(document.getElementById(ID))return;style();const a=document.createElement('a');a.id=ID;a.href='https://chama.alibr.com.br/';a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','Converse no Chama');a.innerHTML='💬 Converse no Chama';const candidates=['header','.topbar','.top-bar','.navbar','nav','.header','.app-header','.dashboard-header'];let host=null;for(const q of candidates){const el=document.querySelector(q);if(el&&el.offsetParent!==null){host=el;break}}if(!host){host=document.body;Object.assign(a.style,{position:'fixed',top:'8px',right:'10px',zIndex:'2147483000'})}host.appendChild(a)}
function boot(){install();new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});setInterval(install,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
