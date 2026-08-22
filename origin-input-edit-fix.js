/* ChatShop - garante visibilidade e edicao real dos 4 enderecos da SuperFrete. */
(function(){
'use strict';

const drafts=new Map();

function keyOf(el){
  if(el?.hasAttribute('data-origin-label')) return 'label-'+el.getAttribute('data-origin-label');
  if(el?.hasAttribute('data-origin-cep')) return 'cep-'+el.getAttribute('data-origin-cep');
  return '';
}
function isOriginInput(el){ return !!el?.matches?.('[data-origin-label],[data-origin-cep]'); }

function ensureVisibility(){
  const sf=document.querySelector('#superfreteSettings');
  if(!sf) return;

  sf.style.display='block';
  sf.style.visibility='visible';
  sf.style.opacity='1';

  sf.querySelectorAll('.field').forEach(el=>{
    el.style.setProperty('display','block','important');
    el.style.setProperty('visibility','visible','important');
    el.style.setProperty('opacity','1','important');
    el.style.pointerEvents='auto';
    el.removeAttribute('hidden');
    el.removeAttribute('inert');
  });

  const root=document.querySelector('#sfOrigins');
  if(!root) return;
  root.style.setProperty('display','grid','important');
  root.style.visibility='visible';
  root.style.opacity='1';
  root.style.pointerEvents='auto';
  root.removeAttribute('hidden');
  root.removeAttribute('inert');

  root.querySelectorAll('.sf-origin-row').forEach(row=>{
    row.style.setProperty('display','block','important');
    row.style.setProperty('min-height','150px','important');
    row.style.visibility='visible';
    row.style.opacity='1';
    row.style.pointerEvents='auto';
    row.removeAttribute('hidden');
    row.removeAttribute('inert');

    const grid=row.querySelector('.grid2');
    if(grid){
      grid.style.setProperty('display','grid','important');
      grid.style.setProperty('grid-template-columns','1fr','important');
      grid.style.setProperty('gap','8px','important');
      grid.style.visibility='visible';
      grid.style.opacity='1';
    }
  });

  root.querySelectorAll('label').forEach(el=>{
    el.style.setProperty('display','block','important');
    el.style.visibility='visible';
    el.style.opacity='1';
    el.style.marginBottom='5px';
  });

  root.querySelectorAll('[data-origin-label],[data-origin-cep]').forEach(el=>{
    el.disabled=false;
    el.readOnly=false;
    el.removeAttribute('disabled');
    el.removeAttribute('readonly');
    el.removeAttribute('hidden');
    el.removeAttribute('inert');
    el.style.setProperty('display','block','important');
    el.style.setProperty('visibility','visible','important');
    el.style.setProperty('opacity','1','important');
    el.style.setProperty('width','100%','important');
    el.style.setProperty('min-height','44px','important');
    el.style.setProperty('background','#fff','important');
    el.style.setProperty('color','#111827','important');
    el.style.setProperty('border','1px solid #d1d5db','important');
    el.style.setProperty('border-radius','10px','important');
    el.style.setProperty('padding','10px 12px','important');
    el.style.pointerEvents='auto';
    el.style.userSelect='text';
    el.style.webkitUserSelect='text';
    el.tabIndex=0;

    const k=keyOf(el);
    if(document.activeElement===el && k && drafts.has(k) && el.value!==drafts.get(k)){
      el.value=drafts.get(k);
    }
  });

  ['sfEnvironment','sfToken'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){
      el.style.setProperty('display','block','important');
      el.style.setProperty('visibility','visible','important');
      el.style.setProperty('opacity','1','important');
      el.disabled=false;
      el.removeAttribute('disabled');
      el.removeAttribute('hidden');
    }
  });

  sf.querySelectorAll('.sf-service').forEach(el=>{
    el.style.setProperty('display','inline-block','important');
    el.style.visibility='visible';
    el.style.opacity='1';
    el.disabled=false;
    el.removeAttribute('disabled');
  });
}

function remember(el){
  const k=keyOf(el);
  if(k) drafts.set(k,el.value);
}

function boot(){
  ensureVisibility();

  document.addEventListener('focusin',e=>{
    if(isOriginInput(e.target)){
      ensureVisibility();
      remember(e.target);
    }
  },true);

  document.addEventListener('input',e=>{
    if(isOriginInput(e.target)) remember(e.target);
  },true);

  document.addEventListener('change',e=>{
    if(isOriginInput(e.target)) remember(e.target);
  },true);

  document.addEventListener('focusout',e=>{
    if(isOriginInput(e.target)){
      remember(e.target);
      setTimeout(()=>drafts.delete(keyOf(e.target)),300);
    }
  },true);

  const obs=new MutationObserver(()=>ensureVisibility());
  obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','hidden','disabled','readonly','inert']});

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    ensureVisibility();
    if(tries>80) clearInterval(timer);
  },250);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
