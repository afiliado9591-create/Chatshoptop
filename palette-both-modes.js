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
