/* ChatShop — página única focada no produto: sem rodapé/chat geral; ações por produto. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function data(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null}
function isSingle(){const d=data();return d?.virtualDisplayMode==='single'||document.body?.classList.contains('chatshop-virtual-tiktok')}
function css(){
  if($('#singleProductFocusV2Style'))return;
  const s=document.createElement('style');s.id='singleProductFocusV2Style';s.textContent=`
    body.chatshop-virtual-tiktok footer,
    body.chatshop-virtual-tiktok .footer,
    body.chatshop-virtual-tiktok .site-footer,
    body.chatshop-virtual-tiktok .store-footer,
    body.chatshop-virtual-tiktok #storeFooter,
    body.chatshop-virtual-tiktok #pubFooter,
    body.chatshop-virtual-tiktok #pubChatToggle,
    body.chatshop-virtual-tiktok .pub-chat-toggle,
    body.chatshop-virtual-tiktok .vts-share,
    body.chatshop-virtual-tiktok .vts-card-category{display:none!important}
    body.chatshop-virtual-tiktok .vts-actions{display:flex!important;flex-direction:column!important;gap:10px!important}
    body.chatshop-virtual-tiktok .vts-seller,
    body.chatshop-virtual-tiktok .vts-play{display:grid!important}
    #singleProductFloatingBag{position:fixed;top:14px;right:14px;z-index:90;border:0;border-radius:999px;background:#111827;color:#fff;padding:10px 14px;font-weight:900;box-shadow:0 5px 18px rgba(0,0,0,.28);display:flex;align-items:center;gap:7px;cursor:pointer}
    #singleProductFloatingBag .spfb-count{min-width:22px;height:22px;border-radius:999px;background:#dc2626;color:#fff;display:grid;place-items:center;font-size:12px;padding:0 6px}
    #singleProductFloatingBag:active{transform:scale(.97)}
  `;document.head.appendChild(s);
}
function productText(p){
  const base=String(p?.voiceText||p?.displayText||p?.cardDescription||p?.description||p?.name||'').trim();
  const cta=' Se gostou deste produto, toque no botão Comprar para continuar a compra.';
  return (base||String(p?.name||'Conheça este produto'))+cta;
}
function speak(p,btn){
  const text=productText(p);if(!text)return;
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';u.rate=1;
    btn?.classList.add('speaking');u.onend=u.onerror=()=>btn?.classList.remove('speaking');speechSynthesis.speak(u);
  }catch(e){console.warn('Voz do produto:',e)}
}
function openProductChat(p,index){
  window.__CHATSHOP_ACTIVE_PRODUCT=p;window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=index;
  const trigger=$('#pubChatToggle');
  if(trigger){trigger.dataset.productIndex=String(index);trigger.dataset.productName=String(p?.name||'');trigger.click();return;}
  const overlay=$('.pub-chat-overlay');if(overlay)overlay.classList.add('open');
}
function ensureFloatingBag(){
  if(!isSingle())return;
  const original=$('#csvBag,.vs-bag');if(!original)return;
  let floating=$('#singleProductFloatingBag');
  if(!floating){
    floating=document.createElement('button');floating.type='button';floating.id='singleProductFloatingBag';
    floating.innerHTML='🛍️ Sacola <span class="spfb-count">0</span>';
    floating.onclick=e=>{e.preventDefault();e.stopPropagation();original.click()};
    document.body.appendChild(floating);
  }
  const source=$('#csvCount',original)||$('#csvCount')||original.querySelector('span');
  const target=$('.spfb-count',floating);if(source&&target)target.textContent=String(source.textContent||'0').trim()||'0';
  if(source&&!source.__singleBagObserved){
    source.__singleBagObserved=true;
    new MutationObserver(()=>{const t=$('.spfb-count','#singleProductFloatingBag');if(t)t.textContent=String(source.textContent||'0').trim()||'0'}).observe(source,{childList:true,subtree:true,characterData:true});
  }
}
function decorate(){
  if(!isSingle())return false;css();
  const d=data(),products=Array.isArray(d?.products)?d.products:[];
  $$('.csv-card,.vs-card').forEach((card,index)=>{
    const p=products[index]||{};
    card.querySelectorAll('.vts-share').forEach(x=>x.remove());
    const buy=card.querySelector('.csv-open,.vs-open,[data-product]');if(buy)buy.textContent='Comprar';
    const actions=card.querySelector('.vts-actions');if(!actions)return;
    let play=actions.querySelector('.vts-play');if(!play){play=document.createElement('button');play.type='button';play.className='vts-action vts-play';actions.prepend(play)}
    play.innerHTML='▶️<span>Ouvir sobre o produto</span>';play.onclick=e=>{e.preventDefault();e.stopPropagation();speak(p,play)};
    let seller=actions.querySelector('.vts-seller');if(!seller){seller=document.createElement('button');seller.type='button';seller.className='vts-action vts-seller';actions.appendChild(seller)}
    seller.innerHTML='💬<span>Falar sobre este produto</span>';seller.onclick=e=>{e.preventDefault();e.stopPropagation();openProductChat(p,index)};
  });
  $$('footer,.footer,.site-footer,.store-footer,#storeFooter,#pubFooter').forEach(x=>x.style.setProperty('display','none','important'));
  ensureFloatingBag();
  return true;
}
function boot(){
  let n=0,queued=false;
  const run=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})};
  const t=setInterval(()=>{n++;if(decorate()||n>=30)clearInterval(t)},200);
  const attach=()=>{
    const grid=$('.csv-grid,.vs-grid');if(!grid||grid.dataset.singleFocusObserved==='1')return false;
    grid.dataset.singleFocusObserved='1';
    new MutationObserver(run).observe(grid,{childList:true,subtree:true});
    return true;
  };
  if(!attach()){let tries=0;const wait=setInterval(()=>{tries++;if(attach()||tries>=20)clearInterval(wait)},200)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();