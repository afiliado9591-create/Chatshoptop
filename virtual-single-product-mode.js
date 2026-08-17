/* ChatShop: opção de Loja Virtual com um único produto, preservando sacola e checkout. */
(function(){
'use strict';

const data=window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null;
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

function selectedMode(){return $('input[name="virtualDisplayMode"]:checked')?.value||'catalog';}
function selectedProduct(){return Number($('#virtualFeaturedProduct')?.value||0);}
function isVirtual(){return ($('#storeType')?.value||data?.storeType)==='virtual';}

function productNames(){
  return $$('#products .product').map((row,i)=>String($('[data-k="name"]',row)?.value||'Produto '+(i+1)).trim()||'Produto '+(i+1));
}
function refreshProductSelect(preferred){
  const select=$('#virtualFeaturedProduct');if(!select)return;
  const current=Number.isFinite(Number(preferred))?Number(preferred):Number(select.value||0);
  const names=productNames();
  select.innerHTML=names.length?names.map((name,i)=>'<option value="'+i+'">'+String(name).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'</option>').join(''):'<option value="0">Adicione um produto primeiro</option>';
  select.value=String(Math.min(Math.max(0,current),Math.max(0,names.length-1)));
}
function updateEditorVisibility(){
  const box=$('#virtualSingleProductField');if(!box)return;
  box.style.display=isVirtual()?'block':'none';
  $('#virtualFeaturedProductWrap').style.display=selectedMode()==='single'?'block':'none';
  if(isVirtual())refreshProductSelect();
}
function installEditor(){
  if($('#virtualSingleProductField')||!$('#storeType'))return;
  const typeField=$('#storeType').closest('.field');if(!typeField)return;
  const box=document.createElement('div');
  box.id='virtualSingleProductField';box.className='field';
  box.style.cssText='margin-top:10px;padding:12px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px';
  box.innerHTML='<label style="font-size:13px">🛒 Formato da Loja Virtual</label><div style="display:grid;gap:8px;margin-top:8px"><label style="display:flex;gap:8px;align-items:flex-start;background:#fff;border:1px solid #d1fae5;border-radius:10px;padding:10px"><input type="radio" name="virtualDisplayMode" value="catalog" checked><span><b>Catálogo completo</b><small style="display:block;color:#6b7280">Mostra todos os produtos da loja.</small></span></label><label style="display:flex;gap:8px;align-items:flex-start;background:#fff;border:1px solid #d1fae5;border-radius:10px;padding:10px"><input type="radio" name="virtualDisplayMode" value="single"><span><b>Página de um produto só</b><small style="display:block;color:#6b7280">Abre somente o produto escolhido, com variações, sacola, frete e checkout.</small></span></label></div><div id="virtualFeaturedProductWrap" style="display:none;margin-top:10px"><label style="font-size:12px;font-weight:800">Produto principal</label><select id="virtualFeaturedProduct" style="width:100%;margin-top:6px;border:1px solid #d1d5db;border-radius:10px;padding:10px;background:#fff"></select><small style="display:block;color:#6b7280;margin-top:5px">Este produto será aberto automaticamente quando o cliente entrar na loja.</small></div>';
  typeField.insertAdjacentElement('afterend',box);
  $('#storeType').addEventListener('change',updateEditorVisibility);
  box.addEventListener('change',()=>{updateEditorVisibility();try{if(typeof debounce==='function')debounce()}catch(e){}});
  $('#products')?.addEventListener('input',e=>{if(e.target.matches('[data-k="name"]'))refreshProductSelect()});
  new MutationObserver(()=>refreshProductSelect()).observe($('#products'),{childList:true,subtree:true});
  updateEditorVisibility();

  try{
    if(typeof collect==='function'&&!collect.__virtualSingleWrapped){
      const original=collect;
      const wrapped=function(){const value=original();value.virtualDisplayMode=selectedMode();value.virtualFeaturedProduct=selectedProduct();return value};
      wrapped.__virtualSingleWrapped=true;collect=wrapped;
    }
    if(typeof populateForm==='function'&&!populateForm.__virtualSingleWrapped){
      const original=populateForm;
      const wrapped=async function(value){const result=await original(value);const mode=value?.virtualDisplayMode==='single'?'single':'catalog';const radio=$('input[name="virtualDisplayMode"][value="'+mode+'"]');if(radio)radio.checked=true;refreshProductSelect(value?.virtualFeaturedProduct||0);updateEditorVisibility();return result};
      wrapped.__virtualSingleWrapped=true;populateForm=wrapped;
    }
    if(typeof clearForm==='function'&&!clearForm.__virtualSingleWrapped){
      const original=clearForm;
      const wrapped=function(){const result=original();const radio=$('input[name="virtualDisplayMode"][value="catalog"]');if(radio)radio.checked=true;refreshProductSelect(0);updateEditorVisibility();return result};
      wrapped.__virtualSingleWrapped=true;clearForm=wrapped;
    }
  }catch(e){console.warn('virtual single editor:',e)}
}

function productSlug(value){return norm(value).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'produto'}
function installPublished(){
  if(!data||data.storeType!=='virtual'||data.virtualDisplayMode!=='single')return;
  const products=Array.isArray(data.products)?data.products:[];
  const index=Math.min(Math.max(0,Number(data.virtualFeaturedProduct)||0),Math.max(0,products.length-1));
  let tries=0;
  (function open(){
    tries++;
    const page=$('.vs-page'),button=$('[data-product="'+index+'"]'),modal=$('#vsProductModal'),cart=$('#vsCartModal');
    if(!page||!button||!modal){if(tries<100)setTimeout(open,80);return}
    document.body.classList.add('chatshop-virtual-single-product');
    const style=document.createElement('style');style.id='virtualSingleProductPublishedStyle';
    style.textContent='body.chatshop-virtual-single-product .vs-hero,body.chatshop-virtual-single-product .vs-grid{display:none!important}body.chatshop-virtual-single-product .vs-page{min-height:100dvh!important}body.chatshop-virtual-single-product #vsProductModal{background:#f8fafc!important;align-items:flex-start!important;padding-top:64px!important}body.chatshop-virtual-single-product #vsProductModal .vs-sheet{max-width:760px!important;max-height:calc(100dvh - 64px)!important;border-radius:0!important}body.chatshop-virtual-single-product #vsProductModal .vs-close{display:none!important}';
    document.head.appendChild(style);
    button.click();
    const name=products[index]?.name||'Produto';
    try{history.replaceState({chatshopSingleProduct:index},'', '/produto/'+encodeURIComponent(productSlug(name))+location.search)}catch(e){}
    const keepOpen=new MutationObserver(()=>{if(!modal.classList.contains('open')&&!cart?.classList.contains('open'))setTimeout(()=>button.click(),40)});
    keepOpen.observe(modal,{attributes:true,attributeFilter:['class']});
    cart&&keepOpen.observe(cart,{attributes:true,attributeFilter:['class']});
  })();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installEditor();installPublished()},{once:true});
else{installEditor();installPublished()}
})();
