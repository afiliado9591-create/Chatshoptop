/* ChatShop — cartão do produto específico dentro do chat. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const PROJECT_ID='chatshop-97ea3';
const API_KEY='AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
let fetchedStore=null,fetchPromise=null;
function data(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||fetchedStore||null}
function products(){const d=data();return Array.isArray(d?.products)?d.products:[]}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()}
function imageOf(p){const list=[];if(Array.isArray(p?.images))list.push(...p.images);if(Array.isArray(p?.gallery))list.push(...p.gallery);if(Array.isArray(p?.additionalImages))list.push(...p.additionalImages);list.push(p?.image,p?.imageUrl,p?.imagem,p?.image2,p?.image3,p?.image4);return String(list.find(Boolean)||'').trim()}
function descriptionOf(p){return String(p?.chatDescription||p?.cardDescription||p?.displayText||p?.description||p?.voiceText||'').trim()}
function usefulProduct(p){return !!(p&&(p.name||p.price||imageOf(p)||p.link||p.baseLink))}
function decode(v){if(!v||typeof v!=='object')return null;if('stringValue'in v)return v.stringValue;if('booleanValue'in v)return v.booleanValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return Number(v.doubleValue);if('nullValue'in v)return null;if('arrayValue'in v)return(v.arrayValue.values||[]).map(decode);if('mapValue'in v)return decodeFields(v.mapValue.fields||{});return null}
function decodeFields(fields){const out={};Object.entries(fields||{}).forEach(([k,v])=>out[k]=decode(v));return out}
function slugFromHost(){const host=location.hostname.toLowerCase().replace(/\.$/,'');if(!host.endsWith('.alibr.com.br'))return'';const slug=host.slice(0,-'.alibr.com.br'.length);return slug&&!slug.includes('.')?slug:''}
async function fetchStore(){if(data()&&Array.isArray(data()?.products)&&data().products.length)return data();if(fetchPromise)return fetchPromise;const slug=slugFromHost();if(!slug)return null;fetchPromise=(async()=>{try{const url=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/chatshops/${encodeURIComponent(slug)}?key=${API_KEY}`;const r=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});if(!r.ok)return null;const doc=await r.json();fetchedStore=decodeFields(doc.fields||{});if(fetchedStore){window.__CHATSHOP_STORE_FEATURE_DATA=window.__CHATSHOP_STORE_FEATURE_DATA||fetchedStore}return fetchedStore}catch(e){console.warn('ChatShop produto: falha ao recuperar dados da loja',e);return null}})();return fetchPromise}
function ensureStyle(){if($('#productChatCardStyle'))return;const s=document.createElement('style');s.id='productChatCardStyle';s.textContent=`
.spf-chat-product-card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:12px;margin:2px 0 10px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.spf-chat-product-desc{font-size:14px;line-height:1.35;color:#374151;margin:0 0 10px}
.spf-chat-product-image{width:100%;max-height:240px;object-fit:contain;display:block;background:#f8fafc;border-radius:14px;margin-bottom:10px}
.spf-chat-product-name{font-size:17px;font-weight:900;line-height:1.2;color:#111827;margin-bottom:4px}
.spf-chat-product-price{font-size:20px;font-weight:950;color:var(--store-main,#c2185b);margin-bottom:10px}
.spf-chat-product-buy{width:100%;min-height:48px;border:0;border-radius:12px;background:var(--store-main,#c2185b);color:#fff;font-size:16px;font-weight:900;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 3px 10px rgba(0,0,0,.12);cursor:pointer}
`;
document.head.appendChild(s)}
function preferProductChatUi(){
  const modern=$('#spfProductChat');
  if(!modern)return false;
  const oldToggle=$('#pubChatToggle');
  const oldOverlay=$('#pubChatOverlay');
  const oldVirtualToggle=$('#virtualChatToggle');
  const oldVirtualOverlay=$('#virtualChatOverlay');
  if(oldToggle)oldToggle.style.setProperty('display','none','important');
  if(oldOverlay){oldOverlay.classList.remove('open');oldOverlay.style.setProperty('display','none','important');oldOverlay.setAttribute('aria-hidden','true')}
  if(oldVirtualToggle)oldVirtualToggle.style.setProperty('display','none','important');
  if(oldVirtualOverlay){oldVirtualOverlay.classList.remove('open');oldVirtualOverlay.style.setProperty('display','none','important');oldVirtualOverlay.setAttribute('aria-hidden','true')}
  document.body?.classList.add('chatshop-use-product-chat');
  return true;
}
function indexFromVisibleProduct(){
  const direct=Number(window.__CHATSHOP_ACTIVE_PRODUCT_INDEX);if(Number.isInteger(direct)&&direct>=0)return direct;
  const visibleName=String($('.sg-detail-wrap .sg-name,.vs-detail-name,.csv-dname,.vs-product-name,.csv-product-name')?.textContent||'').trim();
  if(visibleName){const n=products().findIndex(p=>norm(p?.name)===norm(visibleName));if(n>=0)return n}
  return 0;
}
function captureContext(btn){
  let idx=-1;
  for(const v of [btn?.dataset?.productIndex,btn?.dataset?.chatProduct,btn?.dataset?.product]){const n=Number(v);if(Number.isInteger(n)&&n>=0){idx=n;break}}
  if(idx<0){const card=btn?.closest?.('[data-product-index],.csv-card,.vs-card,.pub-slide,.sg-card,.cgc');if(card?.dataset?.productIndex!=null)idx=Number(card.dataset.productIndex);else if(card?.dataset?.i!=null)idx=Number(card.dataset.i);else if(card){const sel=card.matches('.pub-slide')?'.pub-slide':card.matches('.csv-card')?'.csv-card':card.matches('.vs-card')?'.vs-card':card.matches('.cgc')?'.cgc':'.sg-card';idx=$$(sel).indexOf(card)}}
  if(Number.isInteger(idx)&&idx>=0){window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=idx;const p=products()[idx];if(usefulProduct(p))window.__CHATSHOP_ACTIVE_PRODUCT=p}
}
function activeProduct(){const idx=indexFromVisibleProduct(),p=window.__CHATSHOP_ACTIVE_PRODUCT;if(usefulProduct(p))return p;return products()[idx]||null}
function closeChat(){
  $('#spfProductChat')?.classList.remove('open');
  $('#pubChatOverlay')?.classList.remove('open');
  $('#virtualChatOverlay')?.classList.remove('open');
}
function openVirtualProduct(idx){
  const csv=$$('.csv-card')[idx];
  if(csv){const open=csv.querySelector('.csv-open');if(open){open.click();return true}csv.click();return true}
  const vs=$$('.vs-card')[idx];
  if(vs){const open=vs.querySelector('.vs-open');if(open){open.click();return true}vs.click();return true}
  const sg=$(`.sg-card[data-product-index="${idx}"]`)||$$('.sg-card')[idx];
  if(sg){const open=sg.querySelector('.sg-buy');if(open){open.click();return true}sg.click();return true}
  const cgc=$(`.cgc[data-i="${idx}"]`)||$$('.cgc')[idx];
  if(cgc){const open=cgc.querySelector('.cgc-buy');if(open){open.click();return true}cgc.click();return true}
  const slide=$$('#pubFeed .pub-slide')[idx];
  if(slide){slide.click();return true}
  return false;
}
function doBuy(p,idx,e){
  e?.preventDefault?.();e?.stopPropagation?.();e?.stopImmediatePropagation?.();
  const d=data()||{};
  const isVirtual=String(d.storeType||'').toLowerCase()==='virtual';
  if(isVirtual){
    closeChat();
    requestAnimationFrame(()=>{
      if(!openVirtualProduct(idx))console.warn('ChatShop: produto virtual não encontrado para índice',idx);
    });
    return;
  }
  const link=String(p?.link||p?.baseLink||p?.url||'').trim();
  if(/^https?:\/\//i.test(link)){location.href=link}
}
async function renderCard(){
  preferProductChatUi();
  const box=$('#spfProductChatMessages');if(!box)return false;
  let p=activeProduct();let idx=indexFromVisibleProduct();
  if(!usefulProduct(p)){await fetchStore();idx=indexFromVisibleProduct();p=products()[idx]||null}
  if(!usefulProduct(p))return false;
  window.__CHATSHOP_ACTIVE_PRODUCT=p;window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=idx;
  ensureStyle();const key=[idx,p?.name,p?.price,imageOf(p),p?.link,p?.baseLink].join('|');let card=$('#spfChatProductCard');if(card?.dataset.key===key)return true;card?.remove();card=document.createElement('div');card.id='spfChatProductCard';card.className='spf-chat-product-card';card.dataset.key=key;
  const img=imageOf(p),desc=descriptionOf(p),name=String(p?.name||'Produto'),price=String(p?.price||'Consulte');
  card.innerHTML=`${img?`<img class="spf-chat-product-image" src="${esc(img)}" alt="${esc(name)}" loading="eager" decoding="async">`:''}<div class="spf-chat-product-name">${esc(name)}</div><div class="spf-chat-product-price">${esc(price)}</div>${desc?`<div class="spf-chat-product-desc">${esc(desc)}</div>`:''}<button class="spf-chat-product-buy" type="button">🛒 Comprar agora</button>`;
  $('.spf-chat-product-buy',card).onclick=e=>doBuy(p,idx,e);
  box.prepend(card);box.scrollTop=0;return true
}
function bindOverlay(){const overlay=$('#spfProductChat');if(!overlay||overlay.dataset.productCardBound)return false;overlay.dataset.productCardBound='1';preferProductChatUi();new MutationObserver(()=>{preferProductChatUi();if(overlay.classList.contains('open'))setTimeout(renderCard,20)}).observe(overlay,{attributes:true,attributeFilter:['class']});return true}
function tick(){preferProductChatUi();bindOverlay();if($('#spfProductChat')?.classList.contains('open'))renderCard()}
function boot(){fetchStore();let n=0;const timer=setInterval(()=>{n++;tick();if(n>100)clearInterval(timer)},100);new MutationObserver(()=>preferProductChatUi()).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('pointerdown',e=>{const btn=e.target?.closest?.('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');if(btn)captureContext(btn)},true);document.addEventListener('click',e=>{const btn=e.target?.closest?.('.spr-chat,.vts-seller,.vcd-product-seller,[data-product-chat]');if(btn)captureContext(btn);setTimeout(tick,30)},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
