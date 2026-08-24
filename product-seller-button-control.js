/* Controle do botão "Fale com o vendedor" por produto, tamanhos da Loja Virtual e correção de sobreposição. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>[...(r||document).querySelectorAll(s)];
let lastData=null;

function parseSizes(value){
  const raw=Array.isArray(value)?value:String(value||'').split(/[;,\n]/);
  return [...new Set(raw.map(x=>String(x||'').trim()).filter(Boolean))];
}
function ensureEditorFields(){
  const root=$('#products');if(!root)return false;
  $$('.product',root).forEach((card,index)=>{
    let sizeField=card.querySelector('[data-size-field]');
    if(!sizeField){
      sizeField=document.createElement('div');
      sizeField.className='field product-size-field';
      sizeField.setAttribute('data-size-field','1');
      sizeField.style.cssText='border:1px solid #f9a8d4;background:#fdf2f8;border-radius:12px;padding:10px;margin:10px 0';
      sizeField.innerHTML='<label><b>📏 Tamanhos disponíveis</b></label><input type="text" data-k="sizes" placeholder="Ex: P, M, G, GG, G1, G2"><small style="display:block;margin-top:4px">Separe os tamanhos por vírgula. Se deixar vazio, a opção de tamanho não aparece neste produto.</small>';
      const seller=card.querySelector('[data-seller-button-field]');
      const video=card.querySelector('[data-product-video-field]');
      const audio=card.querySelector('.seller-audio-editor');
      if(seller)seller.insertAdjacentElement('beforebegin',sizeField);else if(video)video.insertAdjacentElement('afterend',sizeField);else if(audio)audio.insertAdjacentElement('beforebegin',sizeField);else card.appendChild(sizeField);
      sizeField.querySelector('input').addEventListener('input',()=>{try{window.debounce?.()}catch(e){}});
    }
    const sizesInput=sizeField.querySelector('[data-k="sizes"]');
    if(sizesInput&&!sizesInput.dataset.hydrated&&lastData?.products){
      sizesInput.value=parseSizes(lastData.products[index]?.sizes).join(', ');
      sizesInput.dataset.hydrated='1';
    }

    let field=card.querySelector('[data-seller-button-field]');
    if(!field){
      field=document.createElement('div');
      field.className='field seller-button-product-field';
      field.setAttribute('data-seller-button-field','1');
      field.style.cssText='border:1px solid #bfdbfe;background:#eff6ff;border-radius:12px;padding:10px;margin:10px 0';
      field.innerHTML='<label style="display:flex;gap:9px;align-items:flex-start;cursor:pointer"><input type="checkbox" data-k="showSellerButton" checked style="width:18px;height:18px;margin-top:1px;flex:0 0 auto"><span><b>💬 Mostrar “Fale com o vendedor” neste produto</b><small style="display:block;margin-top:4px">Desmarque para retirar o botão somente deste produto.</small></span></label>';
      const video=card.querySelector('[data-product-video-field]');
      const audio=card.querySelector('.seller-audio-editor');
      if(video)video.insertAdjacentElement('afterend',field);else if(audio)audio.insertAdjacentElement('beforebegin',field);else card.appendChild(field);
      field.querySelector('input').addEventListener('change',()=>{try{window.debounce?.()}catch(e){}});
    }
    const input=field.querySelector('[data-k="showSellerButton"]');
    if(input&&!input.dataset.hydrated&&lastData?.products){
      input.checked=lastData.products[index]?.showSellerButton!==false;
      input.dataset.hydrated='1';
    }
  });
  return true;
}
function wrapEditor(){
  if(typeof window.collect==='function'&&!window.collect.__sellerButtonProductWrapped){
    const old=window.collect;
    const fn=function(){
      ensureEditorFields();
      const data=old(),cards=$$('#products .product');
      if(Array.isArray(data.products))data.products.forEach((p,i)=>{
        p.showSellerButton=cards[i]?.querySelector('[data-k="showSellerButton"]')?.checked!==false;
        p.sizes=parseSizes(cards[i]?.querySelector('[data-k="sizes"]')?.value||'');
      });
      return data;
    };
    fn.__sellerButtonProductWrapped=true;window.collect=fn;
    try{collect=fn}catch(e){}
  }
  if(typeof window.populateForm==='function'&&!window.populateForm.__sellerButtonProductWrapped){
    const old=window.populateForm;
    const fn=async function(data){
      lastData=data||null;
      const result=await old(data);
      [0,100,350].forEach(delay=>setTimeout(()=>{
        ensureEditorFields();
        $$('#products .product').forEach((card,i)=>{
          const input=card.querySelector('[data-k="showSellerButton"]');
          if(input){input.checked=data?.products?.[i]?.showSellerButton!==false;input.dataset.hydrated='1'}
          const sizes=card.querySelector('[data-k="sizes"]');
          if(sizes){sizes.value=parseSizes(data?.products?.[i]?.sizes).join(', ');sizes.dataset.hydrated='1'}
        });
      },delay));
      return result;
    };
    fn.__sellerButtonProductWrapped=true;window.populateForm=fn;
    try{populateForm=fn}catch(e){}
  }
  if(typeof window.clearForm==='function'&&!window.clearForm.__sellerButtonProductWrapped){
    const old=window.clearForm;
    const fn=function(){lastData=null;const result=old();setTimeout(()=>{ensureEditorFields();$$('[data-k="showSellerButton"]').forEach(input=>{input.checked=true;delete input.dataset.hydrated});$$('[data-k="sizes"]').forEach(input=>{input.value='';delete input.dataset.hydrated})},0);return result};
    fn.__sellerButtonProductWrapped=true;window.clearForm=fn;
    try{clearForm=fn}catch(e){}
  }
}
function installEditor(){
  const root=$('#products');if(!root)return false;
  ensureEditorFields();wrapEditor();
  if(!root.dataset.sellerButtonObserved){
    root.dataset.sellerButtonObserved='1';
    new MutationObserver(()=>{ensureEditorFields();wrapEditor()}).observe(root,{childList:true});
  }
  return true;
}

function publicData(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null}
function products(){const d=publicData();return Array.isArray(d?.products)?d.products:[]}
function productByName(name){const n=String(name||'').trim();return products().find(p=>String(p?.name||'').trim()===n)||null}
function allowedByPlan(){return true}
function setSellerButton(product,inProductPage){
  const btn=$('#pubChatToggle');if(!btn)return;
  const visible=allowedByPlan()&&(!product||product.showSellerButton!==false);
  btn.style.setProperty('display',visible?'flex':'none','important');
  document.body.classList.toggle('chatshop-product-page-open',!!inProductPage);
}
function activeSingleProduct(){
  const slides=$$('#pubFeed .pub-slide');if(!slides.length)return null;
  const center=innerHeight/2;
  let chosen=slides[0],distance=Infinity;
  slides.forEach(slide=>{const r=slide.getBoundingClientRect(),d=Math.abs((r.top+r.bottom)/2-center);if(d<distance){distance=d;chosen=slide}});
  const name=chosen.querySelector('.pub-slide-textbox b')?.textContent;
  const list=products();
  return productByName(name)||list[slides.indexOf(chosen)]||null;
}
function refreshPublic(){
  const btn=$('#pubChatToggle'),feed=$('#pubFeed');if(!btn||!feed)return false;
  const detail=$('.cgc-detail',feed);
  if(detail){
    setSellerButton(productByName($('.cgc-name',detail)?.textContent),true);
    return true;
  }
  if(document.body.classList.contains('store-grid-layout')||document.body.classList.contains('chatshop-grid-clean')){
    setSellerButton(null,false);
    return true;
  }
  setSellerButton(activeSingleProduct(),true);
  return true;
}
function virtualProductModalOpen(){
  return Boolean(document.querySelector('#csvProduct.on,#csvProduct.open,#csvProductModal.on,#csvProductModal.open,#vsProduct.on,#vsProduct.open,#vsProductModal.on,#vsProductModal.open'));
}
function syncVirtualProductGuard(){
  const open=virtualProductModalOpen();
  document.body?.classList.toggle('chatshop-virtual-product-open',open);
  return open;
}
function installVirtualProductGuard(){
  if(!document.body)return false;
  if(!document.getElementById('virtualProductChatGuardStyle')){
    const style=document.createElement('style');style.id='virtualProductChatGuardStyle';
    style.textContent='body.chatshop-virtual-product-open #pubChatToggle{display:none!important}';
    document.head.appendChild(style);
  }
  if(!document.body.dataset.virtualProductChatGuard){
    document.body.dataset.virtualProductChatGuard='1';
    new MutationObserver(syncVirtualProductGuard).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    document.addEventListener('click',()=>setTimeout(syncVirtualProductGuard,0),true);
  }
  syncVirtualProductGuard();
  return true;
}

function ensureSizeStyle(){
  if($('#chatshopVirtualSizeStyle'))return;
  const d=publicData();
  const main=/^#[0-9a-f]{6}$/i.test(String(d?.mainColor||''))?d.mainColor:'#c2185b';
  const style=document.createElement('style');style.id='chatshopVirtualSizeStyle';
  style.textContent=`.csv-sizes,.vs-sizes{display:flex;gap:8px;flex-wrap:wrap}.csv-size,.vs-size{min-width:44px;border:1px solid #d1d5db;background:#fff;border-radius:10px;padding:9px 12px;font-weight:900;font-size:12px;cursor:pointer}.csv-size.active,.vs-size.active{background:${main};color:#fff;border-color:${main}}.csv-size-error,.vs-size-error{display:none;margin-top:7px;color:#b91c1c;font-size:12px;font-weight:800}`;
  document.head.appendChild(style);
}
function productForVirtualScope(scope){
  const name=scope?.querySelector('.csv-dname,.vs-detail-name,.csv-detail-name')?.textContent||'';
  return productByName(name);
}
function selectedSize(scope){return scope?.querySelector('.csv-size.active,.vs-size.active')?.dataset?.size||''}
function injectSizeChooser(){
  const data=publicData();if(data?.storeType!=='virtual')return false;
  const scope=$('#csvProductBody')||$('#vsProductBody');if(!scope)return false;
  const p=productForVirtualScope(scope);if(!p)return false;
  const sizes=parseSizes(p.sizes);
  const old=scope.querySelector('[data-chatshop-size-block]');
  if(!sizes.length){old?.remove();return true}
  if(old&&old.dataset.productName===String(p.name||''))return true;
  old?.remove();ensureSizeStyle();
  const block=document.createElement('div');block.setAttribute('data-chatshop-size-block','1');block.dataset.productName=String(p.name||'');
  block.innerHTML='<div class="csv-label">Escolha o tamanho</div><div class="csv-sizes">'+sizes.map(s=>'<button type="button" class="csv-size" data-size="'+String(s).replace(/"/g,'&quot;')+'">'+String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</button>').join('')+'</div><div class="csv-size-error">Escolha um tamanho antes de adicionar à sacola.</div>';
  const qty=scope.querySelector('.csv-qty,#csvQty,.vs-qty,#vsQty');
  const label=qty?.previousElementSibling;
  if(label&&label.classList.contains('csv-label'))label.insertAdjacentElement('beforebegin',block);else if(qty)qty.insertAdjacentElement('beforebegin',block);else scope.querySelector('#csvAdd,.csv-add,#vsAdd,.vs-add')?.insertAdjacentElement('beforebegin',block);
  block.addEventListener('click',e=>{const b=e.target.closest('.csv-size,.vs-size');if(!b)return;block.querySelectorAll('.csv-size,.vs-size').forEach(x=>x.classList.remove('active'));b.classList.add('active');const er=block.querySelector('.csv-size-error,.vs-size-error');if(er)er.style.display='none'});
  return true;
}
function encodeSizeIntoExistingCart(scope,size){
  const activeColor=scope.querySelector('.csv-color.active,.vs-color.active');
  const original=activeColor?.dataset?.color||'';
  let helper=scope.querySelector('[data-chatshop-size-cart-helper]');
  if(!helper){helper=document.createElement('button');helper.type='button';helper.className='csv-color';helper.setAttribute('data-chatshop-size-cart-helper','1');helper.style.display='none';scope.appendChild(helper)}
  helper.dataset.color=(original?original+' | ':'')+'Tamanho: '+size;
  helper.click();
}
function prettifySizeInCart(){
  $$('#csvCartBody small,#vsCartBody small').forEach(el=>{
    const t=el.textContent||'';
    if(t.includes('Cor: Tamanho:'))el.textContent=t.replace('Cor: Tamanho:','Tamanho:');
    else if(t.includes(' | Tamanho:'))el.textContent=t.replace(' | Tamanho:',' · Tamanho:');
  });
}
function installVirtualSizes(){
  if(publicData()?.storeType!=='virtual')return false;
  injectSizeChooser();
  if(!document.body?.dataset.chatshopSizeEvents){
    document.body.dataset.chatshopSizeEvents='1';
    document.addEventListener('click',e=>{
      const add=e.target.closest('#csvAdd,.csv-add,#vsAdd,.vs-add');if(!add)return;
      const scope=add.closest('#csvProductBody,#vsProductBody')||$('#csvProductBody')||$('#vsProductBody');if(!scope)return;
      const p=productForVirtualScope(scope),sizes=parseSizes(p?.sizes);if(!sizes.length)return;
      const size=selectedSize(scope);
      if(!size){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const er=scope.querySelector('.csv-size-error,.vs-size-error');if(er)er.style.display='block';return}
      encodeSizeIntoExistingCart(scope,size);
      setTimeout(prettifySizeInCart,30);
    },true);
    new MutationObserver(()=>{injectSizeChooser();prettifySizeInCart()}).observe(document.body,{childList:true,subtree:true});
  }
  return true;
}

function installPublic(){
  installVirtualSizes();
  if(!publicData())return false;
  if(!$('#pubFeed')||!$('#pubChatToggle'))return false;
  if(!$('#sellerButtonProductStyle')){
    const style=document.createElement('style');style.id='sellerButtonProductStyle';
    style.textContent=`body.chatshop-product-page-open #pubChatToggle.seller-cta,body.chatshop-product-page-open #pubChatToggle.chatshop-seller-cta{bottom:92px!important;right:12px!important}@media(max-width:560px){body.chatshop-product-page-open #pubChatToggle.seller-cta,body.chatshop-product-page-open #pubChatToggle.chatshop-seller-cta{bottom:88px!important;right:10px!important}}`;
    document.head.appendChild(style);
  }
  const feed=$('#pubFeed');
  if(!feed.dataset.sellerButtonPublicObserved){
    feed.dataset.sellerButtonPublicObserved='1';
    new MutationObserver(()=>requestAnimationFrame(refreshPublic)).observe(feed,{childList:true,subtree:true});
    feed.addEventListener('scroll',()=>requestAnimationFrame(refreshPublic),{passive:true});
    window.addEventListener('resize',()=>requestAnimationFrame(refreshPublic),{passive:true});
    document.addEventListener('click',()=>setTimeout(refreshPublic,0),true);
  }
  refreshPublic();
  return true;
}
function boot(){
  const host=location.hostname.toLowerCase(),editor=host==='alibr.com.br'||host==='www.alibr.com.br';
  let tries=0;const timer=setInterval(()=>{
    tries++;
    let ready=false;if(editor)ready=installEditor();else{ready=installVirtualProductGuard()&&installVirtualSizes();installPublic();}
    if(ready||tries>=30)clearInterval(timer);
  },200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
