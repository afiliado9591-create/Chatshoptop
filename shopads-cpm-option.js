/* Acrescenta CPM e informa a divisão financeira do ShopAds. */
(function(){
'use strict';
const RATE=.30;
function money(v){return Number(String(v||'0').replace(',','.'))||0}
function brl(v){return 'R$ '+Number(v||0).toFixed(3).replace('.',',').replace(/0+$/,'').replace(/,$/,',00')}
function enhance(){
  document.querySelectorAll('select[name="resultType"]').forEach(select=>{
    if(!select.querySelector('option[value="cpm"]')){const option=document.createElement('option');option.value='cpm';option.textContent='CPM — 1.000 visualizações';select.appendChild(option)}
    const form=select.closest('form');if(!form)return;
    const reward=form.querySelector('input[name="reward"]');if(!reward)return;
    let note=form.querySelector('[data-shopads-split-note]');
    if(!note){note=document.createElement('small');note.dataset.shopadsSplitNote='1';note.style.cssText='display:block;margin-top:6px;color:#6b7280;line-height:1.35';reward.parentElement.appendChild(note)}
    const update=()=>{const gross=money(reward.value),fee=gross*RATE,affiliate=gross-fee;note.textContent=gross>0?`Do valor por resultado: divulgador recebe ${brl(affiliate)} (70%) e ShopAds recebe ${brl(fee)} (30%).`:'O valor por resultado será dividido: 70% para o divulgador e 30% para o ShopAds.'};
    if(!reward.dataset.shopadsSplitBound){reward.dataset.shopadsSplitBound='1';reward.addEventListener('input',update)}update();
  });
}
function boot(){enhance();const observer=new MutationObserver(enhance);observer.observe(document.body||document.documentElement,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
