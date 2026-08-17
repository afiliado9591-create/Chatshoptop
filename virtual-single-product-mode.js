/* ChatShop: opção de Loja Virtual com um único produto, preservando sacola e checkout. */
(function(){
'use strict';
document.documentElement.dataset.singleProductScript='20260817-1945';
setTimeout(function earlySingleProductRecovery(){
  try{
    const el=document.getElementById('chatshopDirectVirtualBootstrap');
    const text=el&&el.textContent||'';
    const marker='window.__CHATSHOP_STORE_DATA=';
    const start=text.indexOf(marker);
    if(start<0)return;
    const value=JSON.parse(text.slice(start+marker.length).trim().replace(/;\s*$/,''));
    window.__CHATSHOP_STORE_DATA=value;
    window.__CHATSHOP_DIRECT_STORE_ACTIVE=true;
    document.documentElement.dataset.singleProductData='ready';
    if(typeof renderPublishedStore==='function'){
      renderPublishedStore(value,null);
      const auth=document.getElementById('authScreen'),gen=document.getElementById('genApp'),root=document.getElementById('storefrontScreen');
      if(auth)auth.style.display='none';if(gen)gen.style.display='none';if(root)root.style.display='block';
      document.documentElement.classList.remove('chatshop-virtual-pending');
      document.documentElement.dataset.singleProductRender='ready';
    }
  }catch(error){
    document.documentElement.dataset.singleProductError=String(error&&error.message||error).slice(0,160);
  }
},300);

function readBootstrapData(){
  const direct=window.__CHATSHOP_STORE_DATA||null;
  if(direct)return direct;
  for(const id of ['chatshopDirectVirtualBootstrap','chatshopStoreFeatureBootstrap']){
    const text=document.getElementById(id)?.textContent||'';
    const marker=id==='chatshopDirectVirtualBootstrap'?'window.__CHATSHOP_STORE_DATA=':'window.__CHATSHOP_STORE_FEATURE_DATA=';
    const start=text.indexOf(marker);
    if(start<0)continue;
    const raw=text.slice(start+marker.length).trim().replace(/;\s*$/,'');
    try{return JSON.parse(raw)}catch(e){console.warn('bootstrap data parse:',id,e)}
  }
  return window.__CHATSHOP_STORE_FEATURE_DATA||null;
}
let data=readBootstrapData();
if(data){window.__CHATSHOP_STORE_DATA=window.__CHATSHOP_STORE_DATA||data;window.__CHATSHOP_DIRECT_STORE_ACTIVE=window.__CHATSHOP_DIRECT_STORE_ACTIVE||!!document.getElementById('chatshopDirectVirtualBootstrap');}
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
function installPublished(storeData){
  const publishedData=storeData||window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null;
  if(!publishedData||publishedData.storeType!=='virtual'||publishedData.virtualDisplayMode!=='single')return;
  if(document.body.classList.contains('chatshop-virtual-single-product'))return;
  const products=Array.isArray(publishedData.products)?publishedData.products:[];
  const index=Math.min(Math.max(0,Number(publishedData.virtualFeaturedProduct)||0),Math.max(0,products.length-1));
  let tries=0;
  (function open(){
    tries++;
    const page=$('.vs-page,.csv-page'),button=$('[data-product="'+index+'"]'),modal=$('#vsProductModal,#csvProduct'),cart=$('#vsCartModal,#csvCart');
    if(!page||!button||!modal){if(tries<100)setTimeout(open,80);return}
    document.body.classList.add('chatshop-virtual-single-product');
    const style=document.createElement('style');style.id='virtualSingleProductPublishedStyle';
    style.textContent='body.chatshop-virtual-single-product .vs-hero,body.chatshop-virtual-single-product .vs-grid,body.chatshop-virtual-single-product .csv-hero,body.chatshop-virtual-single-product .csv-grid{display:none!important}body.chatshop-virtual-single-product .vs-page,body.chatshop-virtual-single-product .csv-page{min-height:100dvh!important}body.chatshop-virtual-single-product #vsProductModal,body.chatshop-virtual-single-product #csvProduct{background:#f8fafc!important;align-items:flex-start!important;padding-top:64px!important}body.chatshop-virtual-single-product #vsProductModal .vs-sheet,body.chatshop-virtual-single-product #csvProduct .csv-sheet{max-width:760px!important;max-height:calc(100dvh - 64px)!important;border-radius:0!important}body.chatshop-virtual-single-product #vsProductModal .vs-close,body.chatshop-virtual-single-product #csvProduct .csv-close{display:none!important}';
    document.head.appendChild(style);
    button.click();
    // Mantém o domínio raiz no modo produto único. Rotas /produto podem não existir em domínios próprios.
    try{history.replaceState({chatshopSingleProduct:index},'', location.pathname==='/'?('/'+location.search):('/'+location.search))}catch(e){}
    const keepOpen=new MutationObserver(()=>{if(!modal.classList.contains('open')&&!cart?.classList.contains('open'))setTimeout(()=>button.click(),40)});
    keepOpen.observe(modal,{attributes:true,attributeFilter:['class']});
    cart&&keepOpen.observe(cart,{attributes:true,attributeFilter:['class']});
  })();
}

function wrapPublishedRenderer(){
  data=data||readBootstrapData();
  if(data){window.__CHATSHOP_STORE_DATA=window.__CHATSHOP_STORE_DATA||data;window.__CHATSHOP_DIRECT_STORE_ACTIVE=window.__CHATSHOP_DIRECT_STORE_ACTIVE||!!document.getElementById('chatshopDirectVirtualBootstrap');}
  try{
    if(typeof renderVirtualPublished==='function'&&!renderVirtualPublished.__virtualSingleWrapped){
      const original=renderVirtualPublished;
      const wrapped=function(value,ref){const result=original(value,ref);setTimeout(()=>installPublished(value),0);return result};
      wrapped.__virtualSingleWrapped=true;
      renderVirtualPublished=wrapped;
    }
  }catch(e){console.warn('virtual single published:',e)}
  if((window.__CHATSHOP_DIRECT_STORE_ACTIVE||$('#chatshopDirectVirtualBootstrap'))&&data&&!$('.vs-page')){
    let tries=0;
    (function renderDirect(){
      tries++;
      try{
        if(typeof renderPublishedStore==='function'){
          renderPublishedStore(data,null);
          document.documentElement.classList.remove('chatshop-virtual-pending');
          return;
        }
      }catch(e){console.warn('virtual direct render:',e)}
      if(tries<80)setTimeout(renderDirect,50);
      else document.documentElement.classList.remove('chatshop-virtual-pending');
    })();
  }else{
    installPublished(data);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installEditor();wrapPublishedRenderer()},{once:true});
else{installEditor();wrapPublishedRenderer()}
// Domínios próprios podem receber este arquivo depois do DOMContentLoaded.
setTimeout(()=>{installEditor();wrapPublishedRenderer()},100);
setTimeout(()=>wrapPublishedRenderer(),800);
})();
