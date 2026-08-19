/* ChatShop: paleta de cores disponível para afiliado e lojista. */
(function(){
'use strict';
function restorePalette(){
  const editor=document.getElementById('editorView');
  if(!editor)return;
  const sections=[...editor.querySelectorAll('.section')];
  const appearance=sections.find(s=>/aparência|cores da loja/i.test(s.querySelector('h2')?.textContent||''));
  if(!appearance)return;
  appearance.style.removeProperty('display');
  appearance.removeAttribute('data-affiliate-hidden');
  appearance.querySelectorAll('.field,.grid2').forEach(el=>{
    el.style.removeProperty('display');
    el.removeAttribute('data-affiliate-hidden');
  });
  const ids=['paletaPresets','mainColor','darkColor','accentColor','chatBg','buyColor','priceColor','cardColor','cardOpacity','cardTextColor','categoryColor','categoryTextColor','showCategoryMenu'];
  ids.forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    const field=el.closest('.field');if(field){field.style.removeProperty('display');field.removeAttribute('data-affiliate-hidden');}
    el.style.removeProperty('display');
  });
}
function boot(){restorePalette();new MutationObserver(()=>setTimeout(restorePalette,20)).observe(document.getElementById('editorView')||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});setInterval(restorePalette,700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
