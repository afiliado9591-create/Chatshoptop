/* ChatShop: paleta de cores disponível e estável para afiliado e lojista. */
(function(){
'use strict';

function installStablePaletteCss(){
  if(document.getElementById('chatshopStablePaletteCss'))return;
  const style=document.createElement('style');
  style.id='chatshopStablePaletteCss';
  style.textContent=`
    #editorView .section:has(#paletaPresets),
    #editorView .section:has(#mainColor){display:block!important;visibility:visible!important;opacity:1!important}

    #editorView .section:has(#paletaPresets) .field,
    #editorView .section:has(#paletaPresets) .grid2,
    #editorView .section:has(#mainColor) .field,
    #editorView .section:has(#mainColor) .grid2{display:block!important;visibility:visible!important;opacity:1!important}

    #editorView #paletaPresets,
    #editorView #mainColor,
    #editorView #darkColor,
    #editorView #accentColor,
    #editorView #chatBg,
    #editorView #buyColor,
    #editorView #priceColor,
    #editorView #cardColor,
    #editorView #cardOpacity,
    #editorView #cardTextColor,
    #editorView #categoryColor,
    #editorView #categoryTextColor,
    #editorView #showCategoryMenu{visibility:visible!important;opacity:1!important;pointer-events:auto!important}

    #editorView .section:has(#paletaPresets) .grid2,
    #editorView .section:has(#mainColor) .grid2{display:grid!important}
  `;
  document.head.appendChild(style);
}

function clearOldAffiliateHide(){
  const editor=document.getElementById('editorView');
  if(!editor)return;
  const section=editor.querySelector('.section:has(#paletaPresets),.section:has(#mainColor)');
  if(!section)return;
  section.removeAttribute('data-affiliate-hidden');
  section.querySelectorAll('[data-affiliate-hidden]').forEach(el=>el.removeAttribute('data-affiliate-hidden'));
}

function boot(){
  installStablePaletteCss();
  clearOldAffiliateHide();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* ChatShop: restaura os campos Google Analytics e Google Search Console da Loja Virtual. */
(function(){
'use strict';

const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function isVirtual(){const t=$('#storeType');return !t||String(t.value||'').toLowerCase()==='virtual'}
function show(el,display){
  if(!el)return;
  el.removeAttribute('hidden');
  el.removeAttribute('inert');
  el.removeAttribute('data-affiliate-hidden');
  el.style.setProperty('visibility','visible','important');
  el.style.setProperty('opacity','1','important');
  el.style.setProperty('pointer-events','auto','important');
  if(display)el.style.setProperty('display',display,'important');
  else el.style.removeProperty('display');
}
function unlockInput(el){
  if(!el)return;
  el.disabled=false;el.readOnly=false;
  el.removeAttribute('disabled');el.removeAttribute('readonly');el.removeAttribute('hidden');el.removeAttribute('inert');
  el.style.setProperty('display','block','important');
  el.style.setProperty('visibility','visible','important');
  el.style.setProperty('opacity','1','important');
  el.style.setProperty('pointer-events','auto','important');
  el.style.setProperty('width','100%','important');
  show(el.closest('.field'),'block');
  show(el.closest('.grid2'),'grid');
  show(el.closest('.section'),'block');
}
function restoreAnalyticsFields(){
  if(!isVirtual())return;
  const editor=$('#editorView');if(!editor)return;

  const ids=['googleAnalyticsId','googleAnalytics','gaId','analyticsId','googleSearchConsoleVerification','googleSearchConsole','searchConsole','searchConsoleCode','gscCode'];
  ids.forEach(id=>unlockInput($('#'+id,editor)));

  const candidates=$$('.section,.field,[data-section],details',editor);
  candidates.forEach(el=>{
    const text=norm(el.textContent);
    if(text.includes('google analytics')||text.includes('search console')){
      show(el,el.matches('.grid2')?'grid':'block');
      $$('input,textarea,select',el).forEach(unlockInput);
      $$('.field,.grid2',el).forEach(child=>show(child,child.classList.contains('grid2')?'grid':'block'));
    }
  });
}
function start(){
  restoreAnalyticsFields();
  const editor=$('#editorView')||document.body;
  new MutationObserver(()=>requestAnimationFrame(restoreAnalyticsFields)).observe(editor,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','hidden','disabled','readonly']});
  document.addEventListener('change',e=>{if(e.target?.id==='storeType')setTimeout(restoreAnalyticsFields,30)},true);
  setInterval(restoreAnalyticsFields,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
