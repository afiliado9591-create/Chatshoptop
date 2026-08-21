/* ChatShop — cartão do produto dentro do chat específico. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
function data(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null}
function products(){const d=data();return Array.isArray(d?.products)?d.products:[]}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function imageOf(p){const list=[];if(Array.isArray(p?.images))list.push(...p.images);if(Array.isArray(p?.gallery))list.push(...p.gallery);if(Array.isArray(p?.additionalImages))list.push(...p.additionalImages);list.push(p?.image,p?.imageUrl,p?.imagem,p?.image2,p?.image3,p?.image4);return String(list.find(Boolean)||'').trim()}
function descriptionOf(p){return String(p?.chatDescription||p?.cardDescription||p?.displayText||p?.description||p?.voiceText||'').trim()}
function ensureStyle(){if($('#productChatCardStyle'))return;const s=document.createElement('style');s.id='productChatCardStyle';s.textContent=`
.spf-chat-product-card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:12px;margin:2px 0 10px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.spf-chat-product-desc{font-size:14px;line-height:1.35;color:#374151;margin:0 0 10px}
.spf-chat-product-image{width:100%;max-height:230px;object-fit:contain;display:block;background:#f8fafc;border-radius:14px;margin-bottom:10px}
.spf-chat-product-name{font-size:17px;font-weight:900;line-height:1.2;color:#111827;margin-bottom:4px}
.spf-chat-product-price{font-size:20px;font-weight:950;color:var(--store-main,#c2185b);margin-bottom:10px}
.spf-chat-product-buy{width:100%;min-height:48px;border:0;border-radius:12px;background:var(--store-main,#c2185b);color:#fff;font-size:16px;font-weight:900;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 3px 10px rgba(0,0,0,.12)}
`;
document.head.appendChild(s)}
function activeProduct(){const idx=Number(window.__CHATSHOP_ACTIVE_PRODUCT_INDEX);return window.__CHATSHOP_ACTIVE_PRODUCT||products()[Number.isFinite(idx)?idx:0]||null}
function renderCard(){const box=$('#spfProductChatMessages');if(!box)return false;const p=activeProduct();if(!p)return false;ensureStyle();const idx=Number(window.__CHATSHOP_ACTIVE_PRODUCT_INDEX)||0;const key=[idx,p?.name,p?.price,imageOf(p),p?.link].join('|');let card=$('#spfChatProductCard');if(card?.dataset.key===key)return true;card?.remove();card=document.createElement('div');card.id='spfChatProductCard';card.className='spf-chat-product-card';card.dataset.key=key;const img=imageOf(p),desc=descriptionOf(p),name=String(p?.name||'Produto'),price=String(p?.price||'Consulte'),link=String(p?.link||'').trim();card.innerHTML=`${desc?`<div class="spf-chat-product-desc">${esc(desc)}</div>`:''}${img?`<img class="spf-chat-product-image" src="${esc(img)}" alt="${esc(name)}" loading="eager" decoding="async">`:''}<div class="spf-chat-product-name">${esc(name)}</div><div class="spf-chat-product-price">${esc(price)}</div><a class="spf-chat-product-buy" href="${esc(link||'#')}" target="_blank" rel="noopener">Comprar agora</a>`;
const buy=$('.spf-chat-product-buy',card);buy.onclick=e=>{if(link&&link!=='#')return; e.preventDefault();const slide=$$('#pubFeed .pub-slide')[idx];const original=slide?.querySelector('.pub-slide-buy,.spr-buy,.csv-open,.vs-open');if(original)original.click()};
box.prepend(card);box.scrollTop=0;return true}
function $$(s,r){return Array.from((r||document).querySelectorAll(s))}
function bindOverlay(){const overlay=$('#spfProductChat');if(!overlay||overlay.dataset.productCardBound)return false;overlay.dataset.productCardBound='1';new MutationObserver(()=>{if(overlay.classList.contains('open'))setTimeout(renderCard,20)}).observe(overlay,{attributes:true,attributeFilter:['class']});return true}
function tick(){bindOverlay();if($('#spfProductChat')?.classList.contains('open'))renderCard()}
function boot(){let n=0;const timer=setInterval(()=>{n++;tick();if(n>80||bindOverlay())clearInterval(timer)},100);document.addEventListener('click',()=>setTimeout(tick,30),true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
