/* Controle do botão "Fale com o vendedor" por produto e correção de sobreposição. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>[...(r||document).querySelectorAll(s)];
let lastData=null;

function ensureEditorFields(){
  const root=$('#products');if(!root)return false;
  $$('.product',root).forEach((card,index)=>{
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
        });
      },delay));
      return result;
    };
    fn.__sellerButtonProductWrapped=true;window.populateForm=fn;
    try{populateForm=fn}catch(e){}
  }
  if(typeof window.clearForm==='function'&&!window.clearForm.__sellerButtonProductWrapped){
    const old=window.clearForm;
    const fn=function(){lastData=null;const result=old();setTimeout(()=>{ensureEditorFields();$$('[data-k="showSellerButton"]').forEach(input=>{input.checked=true;delete input.dataset.hydrated})},0);return result};
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
function allowedByPlan(){return String(publicData()?.planTier||'')!=='aprendiz'}
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
function installPublic(){
  if(!publicData())return false;
  if(!$('#pubFeed')||!$('#pubChatToggle'))return false;
  if(!$('#sellerButtonProductStyle')){
    const style=document.createElement('style');style.id='sellerButtonProductStyle';
    style.textContent=`
      body.chatshop-product-page-open #pubChatToggle.seller-cta,
      body.chatshop-product-page-open #pubChatToggle.chatshop-seller-cta{
        bottom:92px!important;right:12px!important;
      }
      @media(max-width:560px){
        body.chatshop-product-page-open #pubChatToggle.seller-cta,
        body.chatshop-product-page-open #pubChatToggle.chatshop-seller-cta{
          bottom:88px!important;right:10px!important;
        }
      }
    `;
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
  let tries=0;const timer=setInterval(()=>{
    tries++;installEditor();installPublic();
    if(tries>100)clearInterval(timer);
  },120);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();