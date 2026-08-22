/* ChatShop — guarda o produto e abre a página de venda interna correta. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function store(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||{};}
function products(){const d=store();return Array.isArray(d.products)?d.products:[];}
function remember(btn){
  let idx=-1;
  for(const v of [btn?.dataset?.productIndex,btn?.dataset?.chatProduct,btn?.dataset?.product]){const n=Number(v);if(Number.isInteger(n)&&n>=0){idx=n;break;}}
  if(idx<0){
    const card=btn?.closest?.('.csv-card,.vs-card,.pub-slide,.sg-card,.cgc,[data-product-index]');
    if(card?.dataset?.productIndex!=null)idx=Number(card.dataset.productIndex);
    else if(card?.dataset?.i!=null)idx=Number(card.dataset.i);
    else if(card){
      const sel=card.matches('.csv-card')?'.csv-card':card.matches('.vs-card')?'.vs-card':card.matches('.pub-slide')?'.pub-slide':card.matches('.cgc')?'.cgc':'.sg-card';
      idx=$$(sel).indexOf(card);
    }
  }
  if(idx>=0){window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=idx;const p=products()[idx];if(p)window.__CHATSHOP_ACTIVE_PRODUCT=p;}
  return idx;
}
function activeIndex(){const n=Number(window.__CHATSHOP_ACTIVE_PRODUCT_INDEX);return Number.isInteger(n)&&n>=0?n:-1;}
function closeChat(){
  $('#spfProductChat')?.classList.remove('open');
  $('#pubChatOverlay')?.classList.remove('open');
  $('#virtualChatOverlay')?.classList.remove('open');
}
function openSalesPage(idx){
  /* Loja virtual normal: usa exatamente o botão interno Ver produto. */
  const csvButton=$(`button.csv-open[data-product="${idx}"]`)||$$('.csv-card')[idx]?.querySelector('button.csv-open');
  if(csvButton){csvButton.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true;}

  const vsButton=$(`button.vs-open[data-product="${idx}"]`)||$$('.vs-card')[idx]?.querySelector('button.vs-open');
  if(vsButton){vsButton.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true;}

  /* Grade de 2 produtos: clicar no cartão abre showDetail(), sem tocar no link Comprar. */
  const sg=$(`.sg-card[data-product-index="${idx}"]`)||$$('.sg-card[data-product-index]')[idx];
  if(sg){sg.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true;}

  /* Outros layouts internos. */
  const cgc=$(`.cgc[data-i="${idx}"]`)||$$('.cgc')[idx];
  if(cgc){cgc.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true;}
  const slide=$$('#pubFeed .pub-slide')[idx];
  if(slide){slide.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true;}
  return false;
}
document.addEventListener('pointerdown',e=>{
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
  if(idx<0){console.warn('ChatShop: produto do chat não identificado');return;}
  closeChat();
  setTimeout(()=>{
    if(!openSalesPage(idx))console.warn('ChatShop: página de venda interna não encontrada para produto',idx);
  },60);
},true);
})();
