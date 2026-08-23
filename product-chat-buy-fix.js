/* ChatShop — guarda o produto e abre a página de venda interna correta. */
(function(){
'use strict';
/* Recursos da vitrine publicada não devem executar dentro do painel/editor. */
if(location.hostname==='alibr.com.br'||location.hostname==='www.alibr.com.br')return;
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
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
function productPageIsOpen(){
  const selectors=['#vsProductModal.open','#vsProductModal.on','#csvProductModal.open','#csvProductModal.on','.sg-detail-wrap','.cgc-detail'];
  return selectors.some(s=>$(s));
}
function safeInternalClick(el){
  if(!el||el.tagName==='A')return false;
  el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  return true;
}
async function triggerVirtualModal(idx){
  /* Primeiro tenta a função pública, se algum layout a expuser. */
  if(typeof window.__CHATSHOP_OPEN_SALES_PRODUCT==='function'){
    try{
      window.__CHATSHOP_OPEN_SALES_PRODUCT(idx);
      await wait(120);
      if(productPageIsOpen())return true;
    }catch(err){}
  }

  /* Tenta o botão real do catálogo normal. */
  const realCsv=$(`button.csv-open[data-product="${idx}"]`)||$$('.csv-card')[idx]?.querySelector('button.csv-open');
  if(realCsv){safeInternalClick(realCsv);await wait(120);if(productPageIsOpen())return true;}
  const realVs=$(`button.vs-open[data-product="${idx}"]`)||$$('.vs-card')[idx]?.querySelector('button.vs-open');
  if(realVs){safeInternalClick(realVs);await wait(120);if(productPageIsOpen())return true;}

  /* Na grade, os cards originais podem ter sido substituídos. Cria um gatilho interno temporário
     para aproveitar o mesmo listener da Loja Virtual, sem usar href/window.open. */
  for(const cls of ['vs-open','csv-open']){
    const ghost=document.createElement('button');
    ghost.type='button';ghost.className=cls;ghost.dataset.product=String(idx);
    ghost.style.cssText='position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
    (document.body||document.documentElement).appendChild(ghost);
    ghost.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
    await wait(150);
    ghost.remove();
    if(productPageIsOpen())return true;
  }

  /* Último fallback: abre o detalhe da grade, mas nunca clica no link externo Comprar. */
  const sg=$(`.sg-card[data-product-index="${idx}"]`)||$$('.sg-card[data-product-index]')[idx];
  if(sg){safeInternalClick(sg);await wait(80);if(productPageIsOpen())return true;}
  const cgc=$(`.cgc[data-i="${idx}"]`)||$$('.cgc[data-i]')[idx];
  if(cgc){safeInternalClick(cgc);await wait(80);if(productPageIsOpen())return true;}
  return false;
}
function withNavigationGuard(fn){
  const oldOpen=window.open;
  let active=true;
  const stopAnchors=e=>{
    if(!active)return;
    const a=e.target?.closest?.('a');
    if(!a)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  };
  document.addEventListener('click',stopAnchors,true);
  try{window.open=function(){return null;};}catch(err){}
  Promise.resolve().then(fn).finally(()=>setTimeout(()=>{
    active=false;document.removeEventListener('click',stopAnchors,true);
    try{window.open=oldOpen;}catch(err){}
  },900));
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
  const d=store(),type=String(d.storeType||'').toLowerCase();
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  const idx=activeIndex();
  if(idx<0){console.warn('ChatShop: produto do chat não identificado');return;}
  if(type!=='virtual'){
    const p=products()[idx]||window.__CHATSHOP_ACTIVE_PRODUCT||{};
    const original=$('.pub-slide')[idx]?.querySelector('.pub-slide-buy');
    const url=String(p.link||p.affiliateLink||p.baseLink||p.checkoutUrl||original?.href||'').trim();
    if(!url||url==='#'){console.warn('ChatShop: link de compra do afiliado não encontrado',idx);return;}
    closeChat();
    const anchor=document.createElement('a');anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.style.display='none';
    document.body.appendChild(anchor);anchor.click();anchor.remove();
    return;
  }
  withNavigationGuard(async()=>{
    closeChat();
    await wait(80);
    const opened=await triggerVirtualModal(idx);
    if(!opened)console.warn('ChatShop: página de venda interna não abriu para produto',idx);
  });
},true);
})();
