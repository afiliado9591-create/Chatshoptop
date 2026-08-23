/* ChatShop — impede que módulos voltem a embrulhar collect() indefinidamente. */
(function(){
'use strict';
const markers=[
  '__storePagesWrapped',
  '__mpOauthWrapped',
  '__sellerAudioWrapped',
  '__catalogSellerModelWrapped',
  '__singleProductVideoWrapped',
  '__singleProductMenuWrapped',
  '__superfreteWrapped',
  '__productSellerButtonWrapped',
  '__sellerButtonProductWrapped',
  '__planAccessWrapped',
  '__planPolicyWrapped',
  '__manualVirtualAccessWrapped',
  '__affiliateCatalogQnaWrapped'
];
let lastCollect=null;
function markCurrent(){
  const fn=window.collect;
  if(typeof fn!=='function')return false;
  markers.forEach(k=>{try{fn[k]=true}catch(e){}});
  lastCollect=fn;
  return true;
}
function ensureAdminCsvAfterAuth(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    let admin=false;
    try{admin=typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){}
    if(admin){
      clearInterval(timer);
      if(window.__chatshopAdminCsvReloaded)return;
      window.__chatshopAdminCsvReloaded=true;
      const s=document.createElement('script');
      s.src='/admin-public-pages.js?v=20260820-1055-after-auth';
      s.async=true;
      document.body.appendChild(s);
      return;
    }
    if(tries>120)clearInterval(timer);
  },250);
}

function installEditorPerformance(){
  const root=document.getElementById('products');
  if(!root||root.dataset.performanceObserved==='1')return;
  root.dataset.performanceObserved='1';

  let queued=false;
  const tune=()=>{
    queued=false;
    root.querySelectorAll('.image-preview img').forEach(img=>{
      if(!img.hasAttribute('loading'))img.loading='lazy';
      if(!img.hasAttribute('decoding'))img.decoding='async';
      try{img.fetchPriority='low'}catch(e){}
    });
  };
  const schedule=()=>{
    if(queued)return;
    queued=true;
    if('requestIdleCallback' in window)requestIdleCallback(tune,{timeout:500});
    else setTimeout(tune,80);
  };
  schedule();
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
}

/* Corrige espaços vazios gigantes no editor mobile sem esconder campos. */
function installEditorMobileLayoutFix(){
  if(document.getElementById('chatshopEditorMobileLayoutFix'))return;
  const style=document.createElement('style');
  style.id='chatshopEditorMobileLayoutFix';
  style.textContent=`
    @media(max-width:700px){
      #editorView .section,
      #editorView .field,
      #editorView .grid2{
        min-height:0!important;
        height:auto!important;
      }
      #editorView .grid2{align-items:start!important;align-content:start!important}
      #editorView label:has(#showCategoryMenu){
        min-height:0!important;
        height:auto!important;
        margin-bottom:12px!important;
        align-items:flex-start!important;
      }
    }
  `;
  document.head.appendChild(style);

  const normalizeCategoryBlock=()=>{
    const cb=document.getElementById('showCategoryMenu');
    if(!cb)return;
    let el=cb.parentElement;
    let steps=0;
    while(el&&steps<5){
      el.style.setProperty('min-height','0','important');
      el.style.setProperty('height','auto','important');
      if(el.classList?.contains('section'))break;
      el=el.parentElement;steps++;
    }
  };
  normalizeCategoryBlock();
  setTimeout(normalizeCategoryBlock,300);
  setTimeout(normalizeCategoryBlock,1200);
}

function boot(){
  /*
   * Não paramos de vigiar depois do primeiro collect(). Vários módulos do ChatShop
   * são reinjetados ou executam refresh periódico. Quando um deles cria um novo
   * wrapper, as flags que estavam no wrapper anterior deixam de estar na função
   * externa. Reaplicar todas as flags na função corrente impede a formação de uma
   * cadeia infinita de wrappers e preserva os wrappers já instalados.
   */
  markCurrent();
  setInterval(()=>{
    const fn=window.collect;
    if(typeof fn!=='function')return;
    if(fn!==lastCollect)markCurrent();
    else markers.forEach(k=>{try{fn[k]=true}catch(e){}});
  },500);

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#publishBtn')){
      markCurrent();
      setTimeout(markCurrent,0);
    }
  },true);

  /* Se scripts forem adicionados dinamicamente, marque novamente o collect atual. */
  if(document.documentElement&&!document.documentElement.dataset.collectGuardObserved){
    document.documentElement.dataset.collectGuardObserved='1';
    new MutationObserver(mutations=>{
      if(mutations.some(m=>[...m.addedNodes].some(n=>n?.tagName==='SCRIPT')))setTimeout(markCurrent,0);
    }).observe(document.documentElement,{childList:true,subtree:true});
  }
  ensureAdminCsvAfterAuth();
  installEditorMobileLayoutFix();

  let perfTries=0;
  const perfTimer=setInterval(()=>{
    perfTries++;
    installEditorPerformance();
    installEditorMobileLayoutFix();
    if(document.getElementById('products')||perfTries>40)clearInterval(perfTimer);
  },250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
