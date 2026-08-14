/* Corrige rolagem da Loja Virtual no mobile sem afetar o catálogo. */
(function(){
  'use strict';
  function applyScrollFix(){
    const root=document.getElementById('storefrontScreen');
    const page=document.querySelector('.vs-page,.csv-page');
    if(!root && !page) return;

    document.documentElement.style.overflowX='hidden';
    document.documentElement.style.overflowY='auto';
    document.body.style.overflowX='hidden';
    document.body.style.overflowY='auto';
    document.body.style.touchAction='pan-y';

    if(root){
      root.style.setProperty('height','100dvh','important');
      root.style.setProperty('max-height','100dvh','important');
      root.style.setProperty('overflow-x','hidden','important');
      root.style.setProperty('overflow-y','auto','important');
      root.style.setProperty('overscroll-behavior-y','contain','important');
      root.style.setProperty('touch-action','pan-y','important');
      root.style.webkitOverflowScrolling='touch';
    }
    if(page){
      page.style.setProperty('height','auto','important');
      page.style.setProperty('min-height','100%','important');
      page.style.setProperty('overflow','visible','important');
      page.style.setProperty('touch-action','pan-y','important');
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyScrollFix,{once:true});
  else applyScrollFix();
  setTimeout(applyScrollFix,250);
  setTimeout(applyScrollFix,900);

  document.addEventListener('click',function(e){
    const open=e.target.closest('#pubChatToggle');
    const close=e.target.closest('#pubChatClose');
    if(open){
      const root=document.getElementById('storefrontScreen');
      if(root) root.style.setProperty('overflow-y','hidden','important');
    }
    if(close){
      setTimeout(applyScrollFix,0);
    }
  },true);
})();
