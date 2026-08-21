/* ChatShop — produto único no modelo página de venda: 1 imagem principal + até 3 miniaturas + cartão e 3 ações. Não altera collect/publicação. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function data(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null}
function products(){const d=data();return Array.isArray(d?.products)?d.products:[]}
function isAffiliateSingle(){return !!$('#pubFeed .pub-slide')&&!document.body?.classList.contains('store-grid-layout')&&!document.body?.classList.contains('chatshop-grid-clean')}
const normUrl=v=>String(v||'').trim();
function imagesOf(p){const list=[];if(Array.isArray(p?.images))list.push(...p.images);if(Array.isArray(p?.gallery))list.push(...p.gallery);if(Array.isArray(p?.additionalImages))list.push(...p.additionalImages);list.push(p?.image,p?.imageUrl,p?.imagem,p?.image2,p?.image3,p?.image4);return [...new Set(list.map(normUrl).filter(Boolean))].slice(0,4)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function hexToRgba(hex,opacity){const m=String(hex||'').match(/^#([0-9a-f]{6})$/i);if(!m)return `rgba(255,255,255,${opacity})`;const n=parseInt(m[1],16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${opacity})`}
function productText(p){const base=String(p?.voiceText||p?.displayText||p?.cardDescription||p?.description||p?.name||'').trim();return (base||String(p?.name||'Conheça este produto'))+' Se gostou, toque no botão Comprar.'}
function speak(p,btn){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(productText(p));u.lang='pt-BR';u.rate=1;btn.disabled=true;u.onend=u.onerror=()=>{btn.disabled=false};speechSynthesis.speak(u)}catch(e){btn.disabled=false}}
function ensureStyle(){if($('#singleProductReferenceStyle'))return;const s=document.createElement('style');s.id='singleProductReferenceStyle';s.textContent=`
body.chatshop-single-reference #pubFeed .pub-slide>img,
body.chatshop-single-reference #pubFeed .pub-slide>.spg-grid,
body.chatshop-single-reference #pubFeed .pub-slide>.spg-product-card,
body.chatshop-single-reference #pubFeed .pub-slide>.pub-slide-overlay,
body.chatshop-single-reference #pubChatToggle,
body.chatshop-single-reference #pubChatToggle.seller-cta,
body.chatshop-single-reference #pubChatToggle.chatshop-seller-cta,
body.chatshop-single-reference .pub-chat-toggle,
body.chatshop-single-reference .global-chat-toggle,
body.chatshop-single-reference .general-chat-button{display:none!important;visibility:hidden!important;pointer-events:none!important}
body.chatshop-single-reference #pubFeed{height:100dvh!important;scroll-snap-type:y mandatory!important}
body.chatshop-single-reference #pubFeed .pub-slide{height:100dvh!important;min-height:100dvh!important;scroll-snap-align:start!important;background:#fff!important;display:block!important;position:relative!important;overflow:hidden!important;padding:0!important}
.spr-page{position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;z-index:20;padding:10px 10px 14px;box-sizing:border-box;gap:8px}
.spr-main{flex:1 1 auto;min-height:0;border-radius:18px;background:#f8fafc;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid #eef2f7}
.spr-main img{width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;position:static!important;background:#fff}
.spr-thumbs{height:102px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;flex:0 0 102px;width:100%}
.spr-thumb{border:2px solid transparent;border-radius:14px;background:#fff;padding:0;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.14);cursor:pointer;min-width:0}
.spr-thumb.active{border-color:var(--store-main,#c2185b)}
.spr-thumb img{width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;position:static!important;background:#fff}
.spr-card{flex:0 0 auto;border-radius:16px;padding:11px 13px;box-shadow:0 3px 14px rgba(0,0,0,.12);border:1px solid rgba(0,0,0,.06)}
.spr-name{font-size:18px;font-weight:900;line-height:1.2;margin:0 0 5px;overflow-wrap:anywhere}
.spr-price{font-size:21px;font-weight:950;color:var(--store-price,var(--store-main,#c2185b));margin-bottom:9px}
.spr-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.spr-actions button,.spr-actions a{border:0;border-radius:12px;min-height:44px;padding:9px 6px;font-size:11px;font-weight:900;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:4px;text-align:center;line-height:1.15}
.spr-buy{background:var(--store-buy,var(--store-main,#7A2E3B));color:#fff}.spr-listen,.spr-chat{background:#fff;color:#111827;border:1px solid #e5e7eb!important}
body.chatshop-single-reference .spf-aff-actions{display:none!important}
@media(max-width:420px){.spr-page{padding:7px 8px 10px;gap:6px}.spr-thumbs{height:88px;flex-basis:88px;gap:7px}.spr-name{font-size:16px}.spr-price{font-size:19px}.spr-actions button,.spr-actions a{font-size:10px;min-height:42px;padding:7px 4px}}
`;document.head.appendChild(s)}
function forceHideGlobalChat(){const btn=$('#pubChatToggle');if(btn){btn.style.setProperty('display','none','important');btn.style.setProperty('visibility','hidden','important');btn.style.setProperty('pointer-events','none','important');btn.setAttribute('aria-hidden','true')}$$('.pub-chat-toggle,.global-chat-toggle,.general-chat-button').forEach(x=>{x.style.setProperty('display','none','important');x.style.setProperty('visibility','hidden','important')})}
function openChat(p,index,slide){window.__CHATSHOP_ACTIVE_PRODUCT=p;window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=index;const chat=slide?.querySelector('.spf-aff-chat');if(chat){chat.click();return}const overlay=$('#spfProductChat');if(overlay){const title=$('#spfProductChatTitle');if(title)title.textContent='💬 '+String(p?.name||'Produto');overlay.classList.add('open');return}const hiddenGlobal=$('#pubChatToggle');if(hiddenGlobal){hiddenGlobal.dataset.productIndex=String(index);hiddenGlobal.dataset.productName=String(p?.name||'');hiddenGlobal.click();forceHideGlobalChat()}}
function buildSlide(slide,p,index){const imgs=imagesOf(p);if(!imgs.length)return;let page=slide.querySelector('.spr-page');const key=JSON.stringify([imgs,p?.name,p?.price,p?.link,p?.buttonText,p?.cardColor,p?.cardOpacity,p?.showSellerButton]);if(page?.dataset.key===key)return;page?.remove();page=document.createElement('div');page.className='spr-page';page.dataset.key=key;const d=data()||{};const opacity=Math.max(0,Math.min(1,Number(d.cardOpacity==null?95:d.cardOpacity)/100));const cardBg=hexToRgba(d.cardColor||'#FFFFFF',opacity);const cardText=d.cardTextColor||'#1A1A1A';const mainSrc=imgs[0];page.innerHTML=`<div class="spr-main"><img src="${esc(mainSrc)}" alt="${esc(p?.name||'Produto')}"></div><div class="spr-thumbs"></div><div class="spr-card" style="background:${cardBg};color:${esc(cardText)}"><div class="spr-name">${esc(p?.name||'Produto')}</div><div class="spr-price">${esc(p?.price||'Consulte')}</div><div class="spr-actions"><button type="button" class="spr-listen">🔊 Ouvir descrição</button><button type="button" class="spr-chat">💬 Falar com vendedor</button><a class="spr-buy" target="_blank" rel="noopener">🛒 Comprar</a></div></div>`;const mainImg=$('.spr-main img',page),thumbs=$('.spr-thumbs',page);imgs.slice(1,4).forEach((src,i)=>{const b=document.createElement('button');b.type='button';b.className='spr-thumb';b.innerHTML=`<img src="${esc(src)}" alt="${esc(p?.name||'Produto')} ${i+2}">`;b.onclick=()=>{mainImg.src=src;$$('.spr-thumb',page).forEach(x=>x.classList.remove('active'));b.classList.add('active')};thumbs.appendChild(b)});while(thumbs.children.length<3){const filler=document.createElement('div');filler.style.visibility='hidden';thumbs.appendChild(filler)}$('.spr-listen',page).onclick=()=>speak(p,$('.spr-listen',page));const chatBtn=$('.spr-chat',page);if(p?.showSellerButton===false)chatBtn.style.display='none';else chatBtn.onclick=()=>openChat(p,index,slide);const buy=$('.spr-buy',page),original=slide.querySelector('.pub-slide-buy');buy.href=String(p?.link||original?.href||'#');buy.textContent='🛒 '+String(p?.buttonText||'Comprar');buy.onclick=e=>{if(original&&(!p?.link||p.link==='#')){e.preventDefault();original.click()}};slide.appendChild(page)}
function decorate(){if(!isAffiliateSingle())return false;ensureStyle();document.body?.classList.remove('chatshop-single-gallery');document.body?.classList.add('chatshop-single-reference');forceHideGlobalChat();const ps=products();$$('#pubFeed .pub-slide').forEach((slide,index)=>buildSlide(slide,ps[index]||{},index));return true}
function boot(){let n=0;const t=setInterval(()=>{n++;decorate();forceHideGlobalChat();if(n>600)clearInterval(t)},100);if(document.body)new MutationObserver(()=>requestAnimationFrame(()=>{decorate();forceHideGlobalChat()})).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});window.addEventListener('load',()=>{decorate();forceHideGlobalChat()},{once:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
