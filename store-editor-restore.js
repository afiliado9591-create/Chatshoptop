/* ChatShop — restaura recursos da Loja Virtual e melhora o fluxo do afiliado. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));

function isAdmin(){try{return typeof window.isAdmin!=='undefined' ? window.isAdmin===true : (typeof isAdmin!=='undefined'&&isAdmin===true)}catch(e){return false}}
function storeType(){return String($('#storeType')?.value||'affiliate').toLowerCase()}
function isVirtual(){return storeType()==='virtual'}
function isAffiliate(){return !isAdmin()&&storeType()==='affiliate'}

function textOf(el){return String(el?.textContent||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function show(el){if(!el)return;el.style.removeProperty('display');if(getComputedStyle(el).display==='none')el.style.display='block'}

function restoreVirtualStoreFields(){
  if(!isVirtual())return;
  const editor=$('#editorView');if(!editor)return;

  editor.classList.remove('affiliate-simple-editor');

  $$('[data-affiliate-hidden="1"]',editor).forEach(el=>{
    el.style.display=el.dataset.oldDisplay||'';
    delete el.dataset.affiliateHidden;
  });

  const keywords=[
    'aparencia','paleta','cor da loja','cores da loja',
    'order bump','upsell','cross sell','oferta adicional',
    'google analytics','analytics','search console','google search console',
    'dominio proprio','domínio próprio','custom domain'
  ];

  $$('.section,.field,[data-section]',editor).forEach(el=>{
    const t=textOf(el);
    if(keywords.some(k=>t.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g,''))))show(el);
  });

  ['mainColor','darkColor','accentColor','chatBg','googleAnalytics','gaId','analyticsId','searchConsole','searchConsoleCode','gscCode','customDomain','domain'].forEach(id=>{
    const input=$('#'+id,editor);if(input){show(input);show(input.closest('.field'));show(input.closest('.section'));}
  });

  const add=$('#addProduct',editor);if(add)show(add);

  /* Link de compra/afiliado pertence somente ao editor de catálogo afiliado. */
  $('#products .product',editor).forEach(card=>{
    const input=$('[data-k="link"]',card);
    const field=input?.closest('.field')||input?.parentElement;
    if(field&&field.dataset.virtualHidden!=='1'){
      field.dataset.virtualHidden='1';
      field.classList.add('affiliate-link-field');
      field.style.setProperty('display','none','important');
    }
    const actions=$('.affiliate-base-link-actions',card);
    if(actions)actions.style.setProperty('display','none','important');
  });
}

function ensureBaseLinkAction(card){
  if(!card||!isAffiliate())return;
  const input=$('[data-k="link"]',card)||$('input[type="url"]',card);
  if(!input)return;

  let field=input.closest('.field')||input.parentElement;
  if(field){
    field.style.display='block';
    field.classList.add('affiliate-link-field');
  }

  let box=$('.affiliate-base-link-actions',card);
  if(!box){
    box=document.createElement('div');
    box.className='affiliate-base-link-actions';
    box.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 10px;align-items:center';
    box.innerHTML='<a class="btn affiliate-open-base-link" target="_blank" rel="noopener noreferrer" style="text-decoration:none">🔗 Abrir produto original</a><small style="color:#64748b">Abra o produto, gere seu link de afiliado e substitua o link abaixo.</small>';
    field?.insertAdjacentElement('beforebegin',box);
  }

  const a=$('.affiliate-open-base-link',box);
  const sync=()=>{
    const v=String(input.value||'').trim();
    if(/^https?:\/\//i.test(v)){
      a.href=v;
      a.style.pointerEvents='auto';
      a.style.opacity='1';
      a.title='Abrir link original do produto';
    }else{
      a.removeAttribute('href');
      a.style.pointerEvents='none';
      a.style.opacity='.5';
      a.title='Este produto ainda não possui link-base';
    }
  };
  sync();
  if(!input.dataset.baseLinkSync){
    input.dataset.baseLinkSync='1';
    input.addEventListener('input',sync);
    input.addEventListener('change',sync);
  }

  const label=$('label',field);
  if(label)label.textContent='🔗 Link deste produto';
  const small=$('small',field);
  if(small)small.textContent='O link original vem do catálogo. Depois de gerar seu link de afiliado, substitua somente este campo.';
}

function refineAffiliateEditor(){
  if(!isAffiliate())return;
  const editor=$('#editorView');if(!editor)return;

  const cat=$('#usarCatalogoBtn',editor);
  if(cat){cat.style.display='';cat.textContent='📦 Escolher catálogo e produtos';}

  // Mantém a paleta de cores disponível para o afiliado.
  ['mainColor','darkColor','accentColor','chatBg'].forEach(id=>{
    const el=$('#'+id,editor);if(el){show(el);show(el.closest('.field'));show(el.closest('.section'));}
  });

  $$('#products .product',editor).forEach(ensureBaseLinkAction);
}

function apply(){
  if(isVirtual())restoreVirtualStoreFields();
  if(isAffiliate())refineAffiliateEditor();
}

function start(){
  apply();
  const root=$('#editorView')||document.body;
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}).observe(root,{childList:true,subtree:true});
  document.addEventListener('change',e=>{if(e.target?.id==='storeType')setTimeout(apply,30)},true);
  document.addEventListener('click',e=>{if(e.target.closest?.('#usarCatalogoBtn,#catalogoLista button[data-id],#products'))setTimeout(apply,60)},true);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
