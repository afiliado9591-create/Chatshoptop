/* ChatShop — produto único limpo + carrossel horizontal de até 4 imagens. */
(function(){
'use strict';
/* Recursos da vitrine publicada não devem executar dentro do painel/editor. */
if(location.hostname==='alibr.com.br'||location.hostname==='www.alibr.com.br')return;
const $=(s,r)=>(r||document).querySelector(s), $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const normUrl=v=>String(v||'').trim();
function unique(list){return [...new Set(list.map(normUrl).filter(Boolean))].slice(0,4)}
function productImages(product){
  const list=[];
  if(Array.isArray(product?.images)) list.push(...product.images);
  if(Array.isArray(product?.gallery)) list.push(...product.gallery);
  if(Array.isArray(product?.additionalImages)) list.push(...product.additionalImages);
  list.push(product?.image,product?.imageUrl,product?.imagem,product?.image2,product?.image3,product?.image4);
  return unique(list);
}
function installStyle(){
  if($('#singleProductCarouselCleanStyle'))return;
  const style=document.createElement('style');style.id='singleProductCarouselCleanStyle';style.textContent=`
    body.chatshop-virtual-tiktok .vts-share,body.chatshop-virtual-tiktok .vts-bag,body.chatshop-virtual-tiktok .vs-head .vs-bag,body.chatshop-virtual-tiktok #vsBag{display:none!important}
    body.chatshop-virtual-tiktok .vts-categories{display:none!important}
    body.chatshop-virtual-tiktok.single-menu-enabled .vts-categories{display:flex!important}
    body.chatshop-virtual-tiktok #pubChatToggle{display:none!important}
    body.chatshop-virtual-tiktok .csv-body .vts-card-category,body.chatshop-virtual-tiktok .vs-card-body .vts-card-category{display:none!important}
    body.chatshop-virtual-tiktok .spc-gallery{position:absolute!important;inset:0!important;z-index:1;display:flex!important;overflow-x:auto!important;overflow-y:hidden!important;scroll-snap-type:x mandatory!important;overscroll-behavior-x:contain!important;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;background:#f7f3f3!important;scrollbar-width:none}
    body.chatshop-virtual-tiktok .spc-gallery::-webkit-scrollbar{display:none}
    body.chatshop-virtual-tiktok .spc-shot{position:relative!important;min-width:100%!important;width:100%!important;height:100%!important;scroll-snap-align:start!important;scroll-snap-stop:always!important;display:block!important;object-fit:cover!important;object-position:center top!important;background:#f7f3f3!important}
    body.chatshop-virtual-tiktok .spc-dots{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:14;display:flex;gap:5px;background:rgba(0,0,0,.26);padding:6px 8px;border-radius:999px}
    body.chatshop-virtual-tiktok .spc-dot{width:7px;height:7px;border:0;border-radius:50%;padding:0;background:rgba(255,255,255,.45)}
    body.chatshop-virtual-tiktok .spc-dot.active{background:#fff;transform:scale(1.18)}
    body.chatshop-virtual-tiktok .spc-actions{position:absolute;right:12px;bottom:116px;z-index:22;display:flex;flex-direction:column;gap:10px;align-items:center}
    body.chatshop-virtual-tiktok .spc-action{width:54px;height:54px;border:0;border-radius:50%;background:rgba(255,255,255,.96);color:#111827;font-size:22px;display:grid;place-items:center;box-shadow:0 5px 18px rgba(0,0,0,.28);cursor:pointer}
    body.chatshop-virtual-tiktok .spc-action.buy{background:var(--store-main,#7A2E3B);color:#fff}
    body.chatshop-virtual-tiktok .spc-action span{position:absolute;right:62px;background:rgba(17,24,39,.84);color:#fff;padding:6px 9px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap;opacity:0;pointer-events:none}
    body.chatshop-virtual-tiktok .spc-action:active span,body.chatshop-virtual-tiktok .spc-action:focus span{opacity:1}
    body.chatshop-virtual-tiktok .csv-card,body.chatshop-virtual-tiktok .vs-card{content-visibility:auto;contain-intrinsic-size:auto 100dvh}
    body.chatshop-virtual-tiktok .csv-open,body.chatshop-virtual-tiktok .vs-open{display:none!important}
    body.chatshop-virtual-tiktok .virtual-seller-audio-btn,body.chatshop-virtual-tiktok .seller-audio-btn{display:none!important}
    .spc-editor-extra{margin-top:8px;padding:10px;border:1px dashed #c4b5fd;border-radius:10px;background:#faf5ff}
    .spc-editor-extra label{display:block;font-size:12px;font-weight:800;margin-bottom:6px}
    .spc-editor-extra input{width:100%;margin:5px 0;border:1px solid #d1d5db;border-radius:8px;padding:9px}
  `;document.head.appendChild(style);
}
function readProductData(index){return (window.__CHATSHOP_STORE_DATA?.products||window.__CHATSHOP_STORE_FEATURE_DATA?.products||[])[index]||null}
function speak(product){
  const text=String(product?.voiceText||product?.displayText||product?.cardDescription||product?.description||product?.name||'').trim();
  if(!text)return;
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';speechSynthesis.speak(u)}catch(e){}
}
function openSeller(product,index){
  window.__CHATSHOP_ACTIVE_PRODUCT=product;window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=index;
  const chat=$('#pubChatToggle');
  if(chat){chat.dataset.productIndex=String(index);chat.dataset.productName=String(product?.name||'');chat.click();return}
  const alt=$('.csv-chat-toggle,.vs-chat-toggle,[data-open-chat]');alt?.click();
}
function buy(card){
  const link=card.querySelector('.csv-open,.vs-open,[data-product],a[href]');
  if(link){link.click();return}
}
function decorateCard(card,index){
  if(card.dataset.spcReady==='1'&&card.querySelector('.spc-actions'))return;
  const product=readProductData(index)||{};const imgs=productImages(product);
  const photo=card.querySelector('.csv-photo,.vs-card-img');
  if(photo&&imgs.length){
    photo.innerHTML='';photo.style.overflow='hidden';
    const gallery=document.createElement('div');gallery.className='spc-gallery';
    imgs.forEach((src,i)=>{const img=document.createElement('img');img.className='spc-shot';img.loading=index===0&&i===0?'eager':'lazy';img.decoding='async';img.fetchPriority=index===0&&i===0?'high':'low';img.src=src;img.alt=String(product.name||'Produto')+' - imagem '+(i+1);gallery.appendChild(img)});
    photo.appendChild(gallery);
    if(imgs.length>1){const dots=document.createElement('div');dots.className='spc-dots';imgs.forEach((_,i)=>{const d=document.createElement('button');d.type='button';d.className='spc-dot'+(i===0?' active':'');dots.appendChild(d)});photo.appendChild(dots);gallery.addEventListener('scroll',()=>requestAnimationFrame(()=>{const active=Math.round(gallery.scrollLeft/Math.max(1,gallery.clientWidth));$$('.spc-dot',dots).forEach((d,i)=>d.classList.toggle('active',i===active))}),{passive:true});}
  }
  card.querySelector('.vts-actions')?.remove();
  if(!card.querySelector('.spc-actions')){
    const actions=document.createElement('div');actions.className='spc-actions';
    const b=document.createElement('button');b.type='button';b.className='spc-action buy';b.innerHTML='🛒<span>Comprar</span>';b.onclick=e=>{e.stopPropagation();buy(card)};
    const play=document.createElement('button');play.type='button';play.className='spc-action';play.innerHTML='▶️<span>Ouvir descrição</span>';play.onclick=e=>{e.stopPropagation();speak(product)};
    actions.append(b,play);card.appendChild(actions);
  }
  card.dataset.spcReady='1';
}
function decoratePublished(){
  if(!document.body.classList.contains('chatshop-virtual-tiktok'))return;
  installStyle();
  const menuSetting=window.__CHATSHOP_STORE_DATA?.singleProductMenuEnabled??window.__CHATSHOP_STORE_FEATURE_DATA?.singleProductMenuEnabled;
  document.body.classList.toggle('single-menu-enabled',menuSetting===true);
  $$('.csv-card,.vs-card').forEach(decorateCard);
}
function installEditorExtras(){
  /* O editor principal já possui imageUrl2, imageUrl3 e imageUrl4.
     Remove o bloco legado para não duplicar campos e altura no celular. */
  $$('.spc-editor-extra').forEach(el=>el.remove());
}

function wrapCollect(){
  try{
    if(typeof collect!=='function'||collect.__spcWrapped)return;
    const original=collect;const wrapped=function(){const value=original();const cards=$$('#products .product');if(Array.isArray(value?.products))value.products.forEach((p,i)=>{const card=cards[i];if(!card)return;const first=normUrl(card.querySelector('[data-k="imageUrl"]')?.value||p.image||p.imageUrl);const extras=[2,3,4].map(n=>normUrl(card.querySelector('[data-k="imageUrl'+n+'"]')?.value));p.images=unique([first,...extras,...productImages(p)]);p.image=p.images[0]||p.image||''});value.singleProductMenuEnabled=!!$('#singleProductMenuEnabled')?.checked;return value};wrapped.__spcWrapped=true;collect=wrapped;window.collect=wrapped;
  }catch(e){}
}
function fillEditorFromData(){
  const data=window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA;const products=Array.isArray(data?.products)?data.products:[];
  $$('#products .product').forEach((card,i)=>{const imgs=productImages(products[i]||{});[2,3,4].forEach((n,idx)=>{const input=card.querySelector('[data-k="imageUrl'+n+'"]');if(input&&!input.value)input.value=imgs[idx+1]||''})});
  const menu=$('#singleProductMenuEnabled');if(menu&&data)menu.checked=data.singleProductMenuEnabled===true;
}
function boot(){
  installStyle();wrapCollect();installEditorExtras();fillEditorFromData();decoratePublished();
  let queued=false;
  const refreshEditor=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;installEditorExtras();fillEditorFromData();wrapCollect()})};
  const attachEditorObserver=()=>{const products=$('#products');if(!products||products.dataset.spcObserved==='1')return false;products.dataset.spcObserved='1';new MutationObserver(refreshEditor).observe(products,{childList:true,subtree:true});return true};
  if(!attachEditorObserver()){let tries=0;const timer=setInterval(()=>{tries++;installEditorExtras();fillEditorFromData();wrapCollect();if(attachEditorObserver()||tries>=40)clearInterval(timer)},250)}
  /* Observa somente a grade. Evita varrer o documento inteiro a cada alteração do chat,
     da sacola ou de outros recursos da página. */
  let publicQueued=false,gridObserver=null,observedGrid=null;
  const refreshPublished=()=>{if(publicQueued)return;publicQueued=true;requestAnimationFrame(()=>{publicQueued=false;decoratePublished()})};
  const attachPublishedObserver=()=>{
    const grid=$('.csv-grid,.vs-grid');if(!grid)return false;
    if(grid===observedGrid)return true;
    gridObserver?.disconnect();observedGrid=grid;
    gridObserver=new MutationObserver(refreshPublished);
    gridObserver.observe(grid,{childList:true,subtree:true});
    return true;
  };
  [100,300,700,1200,2000].forEach(ms=>setTimeout(()=>{attachPublishedObserver();refreshPublished()},ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
