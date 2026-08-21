/* ChatShop — página única: chat/voz por produto e editor de Q&A no Básico. Não toca em collect/publicação. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function data(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null}
function isVirtualSingle(){const d=data();return document.body?.classList.contains('chatshop-virtual-tiktok')||(d?.storeType==='virtual'&&d?.virtualDisplayMode==='single')}
function isAffiliateSingle(){return !!$('#pubFeed .pub-slide')&&!document.body?.classList.contains('store-grid-layout')&&!document.body?.classList.contains('chatshop-grid-clean')}
function isSingle(){return isVirtualSingle()||isAffiliateSingle()}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function currentPlan(){try{return typeof myPlan!=='undefined'?String(myPlan||'aprendiz'):String(window.myPlan||'aprendiz')}catch(e){return 'aprendiz'}}
function adminUser(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function paidQnaAllowed(){const p=currentPlan();return adminUser()||p==='basico'||p==='basic'||p==='profissional'||p==='professional'||p==='pro'}

function ensureStyle(){
  if($('#singleProductFinalCleanupStyle'))return;
  const s=document.createElement('style');s.id='singleProductFinalCleanupStyle';
  s.textContent=`
    body.chatshop-single-final-clean footer,
    body.chatshop-single-final-clean #footer,
    body.chatshop-single-final-clean .footer,
    body.chatshop-single-final-clean .site-footer,
    body.chatshop-single-final-clean .store-footer,
    body.chatshop-single-final-clean .csv-footer,
    body.chatshop-single-final-clean .vs-footer,
    body.chatshop-single-final-clean .rodape,
    body.chatshop-single-final-clean #rodape,
    body.chatshop-single-final-clean [data-footer],
    body.chatshop-single-final-clean #pubChatToggle,
    body.chatshop-single-final-clean .pub-chat-toggle,
    body.chatshop-single-final-clean .global-chat-toggle,
    body.chatshop-single-final-clean .general-chat-button,
    body.chatshop-virtual-tiktok .vts-share,
    body.chatshop-virtual-tiktok .vts-bag,
    body.chatshop-virtual-tiktok #csvBag,
    body.chatshop-virtual-tiktok .vs-bag{display:none!important}
    body.chatshop-single-final-clean{padding-bottom:0!important;margin-bottom:0!important;min-height:100dvh!important}
    body.chatshop-single-final-clean #pubFeed{height:100dvh!important;margin:0!important;padding:0!important}
    body.chatshop-single-final-clean .pub-slide{height:100dvh!important;min-height:100dvh!important;margin:0!important;padding-bottom:0!important}
    body.chatshop-single-final-clean .spf-aff-actions{position:absolute;right:14px;bottom:112px;z-index:18;display:flex;flex-direction:column;gap:10px;align-items:center}
    body.chatshop-single-final-clean .spf-aff-btn{width:56px;height:56px;border:0;border-radius:50%;background:rgba(255,255,255,.96);color:#111827;box-shadow:0 4px 16px rgba(0,0,0,.28);font-size:22px;display:grid;place-items:center;cursor:pointer;position:relative}
    body.chatshop-single-final-clean .spf-aff-btn span{position:absolute;right:64px;background:rgba(17,24,39,.86);color:#fff;padding:6px 9px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap;opacity:0;pointer-events:none}
    body.chatshop-single-final-clean .spf-aff-btn:active span,body.chatshop-single-final-clean .spf-aff-btn:focus span{opacity:1}
    .spf-product-chat{position:fixed;inset:0;z-index:1002;background:rgba(0,0,0,.48);display:none;align-items:flex-end}.spf-product-chat.open{display:flex}
    .spf-product-chat-panel{width:100%;height:min(76dvh,720px);background:#fff;border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden}
    .spf-product-chat-head{padding:13px 15px;background:var(--store-main,#7A2E3B);color:#fff;display:flex;align-items:center;gap:10px}.spf-product-chat-head b{flex:1}.spf-product-chat-close{border:0;background:rgba(255,255,255,.2);color:#fff;width:34px;height:34px;border-radius:50%;font-size:20px}
    .spf-product-chat-messages{flex:1;overflow:auto;padding:13px;background:#f8fafc;display:flex;flex-direction:column;gap:8px}.spf-msg{max-width:85%;padding:10px 12px;border-radius:14px;background:#fff;border:1px solid #e5e7eb;line-height:1.35;font-size:14px}.spf-msg.user{align-self:flex-end;background:#ede9fe;border-color:#ddd6fe}.spf-msg.bot{align-self:flex-start}
    .spf-product-chat-input{display:grid;grid-template-columns:44px 1fr 44px;gap:7px;padding:10px;border-top:1px solid #e5e7eb;background:#fff}.spf-product-chat-input input{border:1px solid #d1d5db;border-radius:999px;padding:10px 13px;font:inherit;min-width:0}.spf-product-chat-input button{border:0;border-radius:50%;background:var(--store-main,#7A2E3B);color:#fff;font-size:18px}
    .spf-qna-toggle{width:100%;margin:8px 0;border:1px solid #c4b5fd;background:#f5f3ff;color:#5b21b6;border-radius:10px;padding:10px 12px;font-weight:900;cursor:pointer;text-align:left}.spf-qna-lock{font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:9px;margin:7px 0}.spf-qna-panel{display:none}.spf-qna-panel.open{display:block}
    @media(max-width:560px){body.chatshop-single-final-clean .spf-aff-actions{right:10px;bottom:105px}body.chatshop-single-final-clean .spf-aff-btn{width:52px;height:52px}}
  `;
  document.head.appendChild(s);
}
function productText(p){
  const base=String(p?.voiceText||p?.displayText||p?.cardDescription||p?.description||p?.name||'').trim();
  return (base||String(p?.name||'Conheça este produto'))+' Se gostou deste produto, toque no botão Comprar para continuar a compra.';
}
function speak(p,btn){
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(productText(p));u.lang='pt-BR';u.rate=1;btn?.classList.add('speaking');u.onend=u.onerror=()=>btn?.classList.remove('speaking');speechSynthesis.speak(u)}catch(e){console.warn('Voz do produto:',e)}
}

let activeProduct=null,activeIndex=-1;
function bestProductAnswer(p,text){
  const q=norm(text);if(!q)return '';
  const rows=Array.isArray(p?.qna)?p.qna:[];let best=null,bestScore=0;
  for(const item of rows){
    if(!item?.question||!item?.answer)continue;
    const question=norm(item.question),words=question.split(' ').filter(w=>w.length>2);let score=0;
    if(q===question)score=100;else if(q.includes(question)||question.includes(q))score=80;else{const hits=words.filter(w=>q.includes(w)).length;score=words.length?Math.round(hits/words.length*70):0}
    if(score>bestScore){bestScore=score;best=item}
  }
  if(best&&bestScore>=25)return String(best.answer||'');
  if(/preco|valor|quanto custa/.test(q)&&p?.price)return 'O valor deste produto é '+String(p.price)+'.';
  if(/cor|cores/.test(q)&&Array.isArray(p?.colors)&&p.colors.length)return 'As cores disponíveis são: '+p.colors.join(', ')+'.';
  if(/tamanho|tamanhos|medida/.test(q)&&Array.isArray(p?.sizes)&&p.sizes.length)return 'Os tamanhos disponíveis são: '+p.sizes.join(', ')+'.';
  return 'Não encontrei uma resposta exata para essa pergunta neste produto. Tente perguntar de outra forma.';
}
function ensureProductChat(){
  let overlay=$('#spfProductChat');if(overlay)return overlay;
  overlay=document.createElement('div');overlay.id='spfProductChat';overlay.className='spf-product-chat';
  overlay.innerHTML='<div class="spf-product-chat-panel"><div class="spf-product-chat-head"><b id="spfProductChatTitle">Produto</b><button class="spf-product-chat-close" id="spfProductChatClose" type="button">×</button></div><div class="spf-product-chat-messages" id="spfProductChatMessages"></div><div class="spf-product-chat-input"><button id="spfProductMic" type="button" title="Falar">🎤</button><input id="spfProductInput" placeholder="Pergunte sobre este produto"><button id="spfProductSend" type="button">➤</button></div></div>';
  document.body.appendChild(overlay);
  $('#spfProductChatClose').onclick=()=>overlay.classList.remove('open');
  const add=(who,text)=>{const m=document.createElement('div');m.className='spf-msg '+who;m.textContent=text;$('#spfProductChatMessages').appendChild(m);$('#spfProductChatMessages').scrollTop=$('#spfProductChatMessages').scrollHeight};
  const submit=()=>{const input=$('#spfProductInput'),text=input.value.trim();if(!text||!activeProduct)return;add('user',text);input.value='';setTimeout(()=>add('bot',bestProductAnswer(activeProduct,text)),120)};
  $('#spfProductSend').onclick=submit;$('#spfProductInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});
  $('#spfProductMic').onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert('O reconhecimento de voz não está disponível neste navegador.');return}try{const r=new SR();r.lang='pt-BR';r.interimResults=false;r.onresult=e=>{const t=e.results?.[0]?.[0]?.transcript||'';if(t){$('#spfProductInput').value=t;submit()}};r.start()}catch(e){console.warn('Microfone do produto:',e)}};
  return overlay;
}
function setActiveProduct(p,index,resetChat){
  activeProduct=p||null;activeIndex=Number(index);window.__CHATSHOP_ACTIVE_PRODUCT=activeProduct;window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=activeIndex;
  const title=$('#spfProductChatTitle');if(title)title.textContent=activeProduct?.name?('💬 '+activeProduct.name):'Produto';
  if(resetChat&&$('#spfProductChatMessages')){$('#spfProductChatMessages').innerHTML='';const m=document.createElement('div');m.className='spf-msg bot';m.textContent='Você está falando sobre: '+String(activeProduct?.name||'este produto')+'. Pode perguntar sobre tamanho, cor, características ou outras dúvidas cadastradas.';$('#spfProductChatMessages').appendChild(m)}
}
function openProductChat(p,index){ensureStyle();const overlay=ensureProductChat();setActiveProduct(p,index,true);overlay.classList.add('open');setTimeout(()=>$('#spfProductInput')?.focus(),80)}

function cleanupVirtual(card){
  const primary=card.querySelector('.csv-open,.vs-open');if(primary){primary.textContent='Comprar';primary.style.removeProperty('display')}
  card.querySelectorAll('button,a').forEach(el=>{if(el===primary||el.closest('.vts-play')||el.closest('.vts-seller'))return;if(el.classList.contains('vts-play')||el.classList.contains('vts-seller'))return;const t=norm(el.textContent);if(/^(comprar|comprar agora|adicionar|adicionar a sacola)$/.test(t)||t.includes('compartilhar')||t.includes('fale com o vendedor')||t.includes('conversar sobre este produto'))el.style.setProperty('display','none','important')});
}
function cleanupAffiliate(){
  const d=data(),products=Array.isArray(d?.products)?d.products:[],slides=$$('#pubFeed .pub-slide');
  slides.forEach((slide,index)=>{
    const p=products[index]||{};const buy=slide.querySelector('.pub-slide-buy');if(buy){buy.textContent='Comprar';buy.style.removeProperty('display')}
    slide.querySelectorAll('button,a').forEach(el=>{if(el===buy||el.closest('.spf-aff-actions'))return;const t=norm(el.textContent);if(t.includes('ouvir')||t.includes('conversar sobre este produto')||t.includes('fale com o vendedor')||t==='comprar'||t==='comprar agora')el.style.setProperty('display','none','important')});
    let actions=slide.querySelector('.spf-aff-actions');if(!actions){actions=document.createElement('div');actions.className='spf-aff-actions';slide.appendChild(actions)}
    let play=actions.querySelector('.spf-aff-play');if(!play){play=document.createElement('button');play.type='button';play.className='spf-aff-btn spf-aff-play';actions.appendChild(play)}
    play.innerHTML='🔊<span>Ouvir sobre o produto</span>';play.onclick=e=>{e.preventDefault();e.stopPropagation();setActiveProduct(p,index,false);speak(p,play)};
    let chat=actions.querySelector('.spf-aff-chat');if(!chat){chat=document.createElement('button');chat.type='button';chat.className='spf-aff-btn spf-aff-chat';actions.appendChild(chat)}
    chat.innerHTML='💬<span>Falar sobre este produto</span>';chat.onclick=e=>{e.preventDefault();e.stopPropagation();openProductChat(p,index)};
  });
  if(slides.length&&!$('#pubFeed').dataset.spfProductContext){
    $('#pubFeed').dataset.spfProductContext='1';let raf=0;$('#pubFeed').addEventListener('scroll',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const center=innerHeight/2;let best=0,dist=Infinity;slides.forEach((s,i)=>{const r=s.getBoundingClientRect(),d=Math.abs((r.top+r.bottom)/2-center);if(d<dist){dist=d;best=i}});if(best!==activeIndex)setActiveProduct(products[best]||{},best,$('#spfProductChat')?.classList.contains('open'))})},{passive:true});
  }
  if(activeIndex<0&&products.length)setActiveProduct(products[0],0,false);
}

function decorateEditorQna(){
  const products=$$('#products .product');if(!products.length)return false;
  const allowed=paidQnaAllowed();
  products.forEach(card=>{
    const list=card.querySelector('.prod-qna-list'),add=card.querySelector('.add-prod-qna');if(!list||!add)return;
    if(card.querySelector('.spf-qna-toggle'))return;
    const label=[...card.querySelectorAll('.field')].find(x=>/perguntas e respostas deste produto/i.test(x.textContent||''));
    const panel=document.createElement('div');panel.className='spf-qna-panel';
    if(label)panel.appendChild(label);panel.appendChild(list);panel.appendChild(add);
    const toggle=document.createElement('button');toggle.type='button';toggle.className='spf-qna-toggle';toggle.textContent='❓ Perguntas e respostas deste produto';
    const anchor=card.querySelector('.extra-images-wrap,.product-extra-images,[data-extra-images]')||panel;
    if(panel.parentNode)panel.parentNode.insertBefore(toggle,panel);else card.append(toggle,panel);
    if(allowed){toggle.onclick=()=>{panel.classList.toggle('open');toggle.textContent=panel.classList.contains('open')?'❓ Fechar perguntas e respostas':'❓ Perguntas e respostas deste produto'}}
    else{toggle.disabled=false;toggle.onclick=()=>{const old=card.querySelector('.spf-qna-lock');old?.remove();const n=document.createElement('div');n.className='spf-qna-lock';n.textContent='🔒 A edição de perguntas e respostas por produto está disponível no plano Básico.';toggle.insertAdjacentElement('afterend',n)};list.querySelectorAll('input,textarea,button').forEach(x=>x.disabled=true);add.disabled=true}
  });
  return true;
}
function apply(){
  ensureStyle();decorateEditorQna();
  if(!isSingle())return false;
  document.body?.classList.add('chatshop-single-final-clean');
  const global=$('#pubChatToggle');if(global)global.style.setProperty('display','none','important');
  $$('footer,#footer,.footer,.site-footer,.store-footer,.csv-footer,.vs-footer,.rodape,#rodape,[data-footer]').forEach(x=>x.style.setProperty('display','none','important'));
  if(isVirtualSingle())$$('.csv-card,.vs-card').forEach(cleanupVirtual);
  if(isAffiliateSingle())cleanupAffiliate();
  return true;
}
function boot(){let n=0;const timer=setInterval(()=>{n++;apply();if(n>240)clearInterval(timer)},100);if(document.body)new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',apply,{once:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
