/* ChatShop — guarda o produto e impede popup bloqueado no Comprar agora. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));

function store(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||{};}
function products(){const d=store();return Array.isArray(d.products)?d.products:[];}
function remember(btn){
  let idx=-1;
  for(const v of [btn?.dataset?.productIndex,btn?.dataset?.chatProduct,btn?.dataset?.product]){
    const n=Number(v);if(Number.isInteger(n)&&n>=0){idx=n;break;}
  }
  if(idx<0){
    const card=btn?.closest?.('.csv-card,.vs-card,.pub-slide,.sg-card,.cgc');
    if(card){
      const sel=card.matches('.csv-card')?'.csv-card':card.matches('.vs-card')?'.vs-card':card.matches('.pub-slide')?'.pub-slide':card.matches('.cgc')?'.cgc':'.sg-card';
      idx=$$(sel).indexOf(card);
    }
  }
  if(idx>=0){
    window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=idx;
    const p=products()[idx];if(p)window.__CHATSHOP_ACTIVE_PRODUCT=p;
  }
}
function activeIndex(){
  const n=Number(window.__CHATSHOP_ACTIVE_PRODUCT_INDEX);
  return Number.isInteger(n)&&n>=0?n:0;
}
function closeChat(){
  $('#spfProductChat')?.classList.remove('open');
  $('#pubChatOverlay')?.classList.remove('open');
  $('#virtualChatOverlay')?.classList.remove('open');
}
function safeOpenProduct(idx){
  const card=$$('.csv-card')[idx]||$$('.vs-card')[idx]||$(`.sg-card[data-product-index="${idx}"]`)||$$('.sg-card')[idx]||$(`.cgc[data-i="${idx}"]`)||$$('.cgc')[idx]||$$('#pubFeed .pub-slide')[idx]||null;
  if(!card)return false;
  /* Nunca clica em <a>, href, target=_blank ou window.open. Abre somente pelo próprio cartão. */
  card.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  return true;
}

document.addEventListener('pointerdown',function(e){
  const seller=e.target?.closest?.('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');
  if(seller)remember(seller);
},true);

document.addEventListener('click',function(e){
  const seller=e.target?.closest?.('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');
  if(seller)remember(seller);

  const buy=e.target?.closest?.('.spf-chat-product-buy');
  if(!buy)return;
  const d=store();
  if(String(d.storeType||'').toLowerCase()!=='virtual')return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const idx=activeIndex();
  closeChat();
  requestAnimationFrame(()=>{
    if(!safeOpenProduct(idx))console.warn('ChatShop: produto não encontrado para índice',idx);
  });
},true);
})();
