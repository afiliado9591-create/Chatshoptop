/* ChatShop — produto único no modelo página de venda: 1 imagem principal + 4 miniaturas + cartão e 3 ações. Não altera collect/publicação. */
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
function speak(p,btn){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(productText(p));u.lang='pt-BR';u.rate=1;btn.disabled=true;btn.classList.add('speaking');u.onend=u.onerror=()=>{btn.disabled=false;btn.classList.remove('speaking')};speechSynthesis.speak(u)}catch(e){btn.disabled=false;btn.classList.remove('speaking')}}
function preload(src){return new Promise(resolve=>{if(!src)return resolve(false);const img=new Image();img.onload=()=>resolve(true);img.onerror=()=>resolve(false);img.src=src;if(img.complete)resolve(true)})}
function preloadProductMain(p){const src=imagesOf(p)[0];if(!src)return;const i=new Image();i.decoding='async';i.src=src}
function ensureStyle(){if($('#singleProductReferenceStyle'))return;const s=document.createElement('style');s.id='singleProductReferenceStyle';s.textContent=`
body.chatshop-single-reference #pubFeed .pub-slide>.spg-grid,
body.chatshop-single-reference #pubFeed .pub-slide>.spg-product-card,
body.chatshop-single-reference #pubFeed .pub-slide>.pub-slide-overlay,
body.chatshop-single-reference #pubChatToggle,
body.chatshop-single-reference #pubChatToggle.seller-cta,
body.chatshop-single-reference #pubChatToggle.chatshop-seller-cta,
body.chatshop-single-reference .pub-chat-toggle,
body.chatshop-single-reference .global-chat-toggle,
body.chatshop-single-reference .general-chat-button{display:none!important;visibility:hidden!important;pointer-events:none!important}
body.chatshop-single-reference #pubFeed .pub-slide:not(.spr-ready)>img{display:block!important;visibility:visible!important;opacity:1!important}
body.chatshop-single-reference #pubFeed .pub-slide.spr-ready>img{display:none!important}
body.chatshop-single-reference #pubFeed{height:100dvh!important;scroll-snap-type:y mandatory!important}
body.chatshop-single-reference #pubFeed .pub-slide{height:100dvh!important;min-height:100dvh!important;scroll-snap-align:start!important;background:#fff!important;display:block!important;position:relative!important;overflow:hidden!important;padding:0!important}
.spr-page{position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;z-index:20;padding:10px 10px 14px;box-sizing:border-box;gap:8px;opacity:0;pointer-events:none;transition:opacity .12s ease}
.spr-page.ready{opacity:1;pointer-events:auto}
.spr-main{flex:1 1 auto;min-height:0;border-radius:18px;background:#f8fafc;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid #eef2f7;position:relative}
.spr-main:before{content:'Carregando produto...';position:absolute;color:#6b7280;font-size:12px;font-weight:800}
.spr-page.ready .spr-main:before{display:none}
.spr-main img{width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;position:relative!important;z-index:1;background:#fff}
.spr-thumbs{height:94px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;flex:0 0 94px;width:100%}
.spr-thumb{border:2px solid transparent;border-radius:12px;background:#fff;padding:0;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.14);cursor:pointer;min-width:0}
.spr-thumb.active{border-color:var(--store-main,#c2185b)}
.spr-thumb img{width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;position:static!important;background:#fff}
.spr-card{flex:0 0 auto;border-radius:16px;padding:11px 13px;box-shadow:0 3px 14px rgba(0,0,0,.12);border:1px solid rgba(0,0,0,.06)}
.spr-name{font-size:18px;font-weight:900;line-height:1.2;margin:0 0 5px;overflow-wrap:anywhere}
.spr-price{font-size:21px;font-weight:950;color:var(--store-price,var(--store-main,#c2185b));margin-bottom:9px}
.spr-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.spr-actions button,.spr-actions a{border:0;border-radius:14px;min-height:48px;padding:10px 7px;font-size:11px;font-weight:950;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:5px;text-align:center;line-height:1.15;box-shadow:0 3px 10px rgba(0,0,0,.12)}
.spr-buy{background:var(--store-buy,var(--store-main,#7A2E3B));color:#fff}
.spr-listen{background:#2563eb;color:#fff;border:1px solid #1d4ed8!important}
.spr-listen.speaking{background:#1d4ed8;transform:scale(.98)}
.spr-chat{background:#e11d48;color:#fff;border:1px solid #be123c!important;box-shadow:0 4px 14px rgba(225,29,72,.30)!important;transition:background .18s ease,transform .18s ease,box-shadow .18s ease}
.spr-chat:active{transform:scale(.98)}
.spr-chat.chat-open{background:#7c3aed!important;border-color:#6d28d9!important;box-shadow:0 5px 18px rgba(124,58,237,.38)!important;transform:translateY(-1px)}
body.chatshop-single-reference .spf-aff-actions{display:none!important}
@media(max-width:420px){.spr-page{padding:7px 8px 10px;gap:6px}.spr-thumbs{height:78px;flex-basis:78px;gap:6px}.spr-name{font-size:16px}.spr-price{font-size:19px}.spr-actions button,.spr-actions a{font-size:10px;min-height:46px;padding:8px 4px}}
`;document.head.appendChild(s)}
function forceHideGlobalChat(){const btn=$('#pubChatToggle');if(btn){btn.style.setProperty('display','none','important');btn.style.setProperty('visibility','hidden','important');btn.style.setProperty('pointer-events','none','important');btn.setAttribute('aria-hidden','true')}$$('.pub-chat-toggle,.global-chat-toggle,.general-chat-button').forEach(x=>{x.style.setProperty('display','none','important');x.style.setProperty('visibility','hidden','important')})}
function syncChatButtonState(){const open=$('#spfProductChat')?.classList.contains('open');$$('.spr-chat').forEach(btn=>btn.classList.toggle('chat-open',!!open&&Number(btn.dataset.productIndex)===Number(window.__CHATSHOP_ACTIVE_PRODUCT_INDEX)))}
function openChat(p,index,slide){window.__CHATSHOP_ACTIVE_PRODUCT=p;window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=index;syncChatButtonState();const chat=slide?.querySelector('.spf-aff-chat');if(chat){chat.click();setTimeout(syncChatButtonState,30);return}const overlay=$('#spfProductChat');if(overlay){const title=$('#spfProductChatTitle');if(title)title.textContent='💬 '+String(p?.name||'Produto');overlay.classList.add('open');syncChatButtonState();return}const hiddenGlobal=$('#pubChatToggle');if(hiddenGlobal){hiddenGlobal.dataset.productIndex=String(index);hiddenGlobal.dataset.productName=String(p?.name||'');hiddenGlobal.click();forceHideGlobalChat();setTimeout(syncChatButtonState,30)}}
function buildSlide(slide,p,index){const imgs=imagesOf(p);if(!imgs.length)return;let page=slide.querySelector('.spr-page');const key=JSON.stringify([imgs,p?.name,p?.price,p?.link,p?.buttonText,p?.cardColor,p?.cardOpacity,p?.showSellerButton]);if(page?.dataset.key===key)return;slide.classList.remove('spr-ready');page?.remove();page=document.createElement('div');page.className='spr-page';page.dataset.key=key;const d=data()||{};const opacity=Math.max(0,Math.min(1,Number(d.cardOpacity==null?95:d.cardOpacity)/100));const cardBg=hexToRgba(d.cardColor||'#FFFFFF',opacity);const cardText=d.cardTextColor||'#1A1A1A';const mainSrc=imgs[0];page.innerHTML=`<div class="spr-main"><img src="${esc(mainSrc)}" alt="${esc(p?.name||'Produto')}" loading="eager" decoding="async"></div><div class="spr-thumbs"></div><div class="spr-card" style="background:${cardBg};color:${esc(cardText)}"><div class="spr-name">${esc(p?.name||'Produto')}</div><div class="spr-price">${esc(p?.price||'Consulte')}</div><div class="spr-actions"><button type="button" class="spr-listen">🔊 Ouvir descrição</button><button type="button" class="spr-chat" data-product-index="${index}">💬 Falar com vendedor</button><a class="spr-buy" target="_blank" rel="noopener">🛒 Comprar</a></div></div>`;const mainImg=$('.spr-main img',page),thumbs=$('.spr-thumbs',page);
imgs.slice(0,4).forEach((src,i)=>{const b=document.createElement('button');b.type='button';b.className='spr-thumb'+(i===0?' active':'');b.innerHTML=`<img src="${esc(src)}" alt="${esc(p?.name||'Produto')} ${i+1}" loading="${i===0?'eager':'lazy'}" decoding="async">`;b.onclick=async()=>{if(mainImg.src===new URL(src,location.href).href){$$('.spr-thumb',page).forEach(x=>x.classList.remove('active'));b.classList.add('active');return}const ok=await preload(src);if(ok){mainImg.src=src;$$('.spr-thumb',page).forEach(x=>x.classList.remove('active'));b.classList.add('active')}};thumbs.appendChild(b)});
while(thumbs.children.length<4){const filler=document.createElement('div');filler.style.visibility='hidden';thumbs.appendChild(filler)}
const reveal=()=>{page.classList.add('ready');slide.classList.add('spr-ready')};mainImg.addEventListener('load',reveal,{once:true});mainImg.addEventListener('error',()=>{page.classList.add('ready')},{once:true});if(mainImg.complete&&mainImg.naturalWidth>0)reveal();
$('.spr-listen',page).onclick=()=>speak(p,$('.spr-listen',page));const chatBtn=$('.spr-chat',page);if(p?.showSellerButton===false)chatBtn.style.display='none';else chatBtn.onclick=()=>openChat(p,index,slide);const buy=$('.spr-buy',page),original=slide.querySelector('.pub-slide-buy');buy.href=String(p?.link||original?.href||'#');buy.textContent='🛒 '+String(p?.buttonText||'Comprar');buy.onclick=e=>{if(original&&(!p?.link||p.link==='#')){e.preventDefault();original.click()}};slide.appendChild(page);syncChatButtonState()}
function decorate(){if(!isAffiliateSingle())return false;ensureStyle();document.body?.classList.remove('chatshop-single-gallery');document.body?.classList.add('chatshop-single-reference');forceHideGlobalChat();const ps=products();const slides=$$('#pubFeed .pub-slide');slides.forEach((slide,index)=>buildSlide(slide,ps[index]||{},index));if(ps[1])preloadProductMain(ps[1]);syncChatButtonState();return true}
function boot(){let n=0;const t=setInterval(()=>{n++;decorate();forceHideGlobalChat();syncChatButtonState();if(n>600)clearInterval(t)},120);if(document.body)new MutationObserver(()=>requestAnimationFrame(()=>{decorate();forceHideGlobalChat();syncChatButtonState()})).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});window.addEventListener('load',()=>{decorate();forceHideGlobalChat();syncChatButtonState()},{once:true});document.addEventListener('click',()=>setTimeout(syncChatButtonState,20),true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
