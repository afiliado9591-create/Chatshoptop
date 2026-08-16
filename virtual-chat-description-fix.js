/* Loja Virtual: usa o mesmo ChatShop do catálogo + descrição completa do produto. */
(function(){
'use strict';
const $=(s,r)=> (r||document).querySelector(s);
const $$=(s,r)=> Array.from((r||document).querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const safeImage=v=>{const s=String(v||'').trim();return /^(https?:\/\/|data:image\/)/i.test(s)?s:''};
const money=v=>{let s=String(v??'').replace(/[^0-9,.-]/g,'');if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)&&n?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):(String(v||'').trim()||'Consulte')};
let store=null,products=[],activeProduct=-1;
const productId=(p,i)=>String(p?.id||p?.productId||`${norm(p?.name||'produto').replace(/\s+/g,'-')||'produto'}-${i}`);

async function loadStore(){
  try{
    let data=window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null;
    if(!data){
      const source=$('#chatshopStoreFeatureBootstrap')?.textContent||'';
      const match=source.match(/window\.__CHATSHOP_STORE_FEATURE_DATA\s*=\s*([\s\S]*?)\s*;?\s*$/);
      if(match?.[1])data=JSON.parse(match[1]);
    }
    if(data){
      const db=window.firebase?.firestore?.();
      const slug=String(data.slug||'').trim();
      return{...data,slug,ref:db&&slug?db.collection('chatshops').doc(slug):null};
    }
  }catch(e){console.warn('ChatShop virtual: dados incorporados inválidos',e)}
  const host=location.hostname.toLowerCase().replace(/\.$/,'');
  if(!host.endsWith('.alibr.com.br')||host==='www.alibr.com.br')return null;
  const slug=host.slice(0,-'.alibr.com.br'.length);
  if(!slug||slug.includes('.'))return null;
  try{
    const db=window.firebase?.firestore?.();
    if(!db)return null;
    const snap=await db.collection('chatshops').doc(slug).get();
    if(!snap.exists)return null;
    return{slug,ref:snap.ref,...snap.data()};
  }catch(e){console.warn('ChatShop virtual: não consegui carregar a loja',e);return null}
}

function productDescription(p){return String(p?.cardDescription||p?.displayText||p?.voiceText||'').trim()}
function injectDescription(index){
  const p=products[Number(index)];
  if(!p)return;
  const text=productDescription(p);
  if(!text)return;
  setTimeout(()=>{
    const body=$('#vsProductBody')||$('#csvProductBody');
    if(!body)return;
    body.querySelector('.vcd-description')?.remove();
    const price=body.querySelector('.vs-detail-price,.csv-dprice');
    const box=document.createElement('section');
    box.className='vcd-description';
    box.style.cssText='margin:12px 0 14px;padding:12px 13px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;color:#334155;line-height:1.55;font-size:14px;white-space:pre-wrap';
    box.innerHTML='<div style="font-weight:900;color:#111827;margin-bottom:6px">📝 Descrição do produto</div>'+esc(text).replace(/\n/g,'<br>');
    if(price)price.insertAdjacentElement('afterend',box);else body.appendChild(box);
  },30);
}

function wordsOfProduct(p){return [p?.name,...(Array.isArray(p?.keywords)?p.keywords:[])].flatMap(x=>norm(x).split(' ')).filter(w=>w.length>2)}
function matchProduct(text){
  const q=norm(text);let best=null,bestScore=0;
  products.forEach((p,i)=>{let score=0;wordsOfProduct(p).forEach(w=>{if(q.includes(w))score+=w.length});if(score>bestScore){bestScore=score;best={p,i}}});
  return bestScore?best:null;
}
function productQna(text,preferred=-1){
  const q=norm(text),order=[];
  if(preferred>=0&&products[preferred])order.push([products[preferred],preferred]);
  products.forEach((p,i)=>{if(i!==preferred)order.push([p,i])});
  for(const[p,i]of order){
    for(const qa of(Array.isArray(p.qna)?p.qna:[])){
      if(!qa?.question||!qa?.answer)continue;
      const qWords=norm(qa.question).split(' ').filter(w=>w.length>2);
      const mentionsProduct=wordsOfProduct(p).some(w=>q.includes(w));
      if(qWords.some(w=>q.includes(w))&&(i===preferred||mentionsProduct))return{answer:String(qa.answer),i,p};
    }
  }
  return null;
}
function generalQna(text){
  const q=norm(text);
  for(const qa of(Array.isArray(store?.qna)?store.qna:[])){
    const keys=Array.isArray(qa?.keywords)&&qa.keywords.length?qa.keywords:[qa?.question].filter(Boolean);
    if(keys.some(k=>{const n=norm(k);return n&&(q.includes(n)||n.split(' ').filter(w=>w.length>2).some(w=>q.includes(w)))}))return String(qa.answer||'');
  }
  return'';
}
function categories(){return [...new Set(products.map(p=>String(p?.category||'').trim()).filter(Boolean))]}
function sameCategory(a,b){return norm(a)===norm(b)}
function saveMessage(text,context={}){
  try{
    if(!store?.ref)return;
    store.ref.update({messageCount:firebase.firestore.FieldValue.increment(1)}).catch(()=>{});
    store.ref.collection('mensagens').add({texto:text,productId:context.productId||null,productName:context.productName||null,contextId:context.contextId||null,data:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
  }catch(e){}
}
function saveLead(number){
  try{if(store?.ref)store.ref.collection('leads').add({whatsapp:number,data:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{})}catch(e){}
}

function installOriginalChat(){
  if(store?.adminControl?.chatPaused)return;
  const existingToggle=$('#pubChatToggle');
  if(existingToggle&&typeof window.__CHATSHOP_OPEN_PRODUCT_CHAT==='function')return;
  if(existingToggle){existingToggle.remove();$('#pubChatOverlay')?.remove();$('#customDomainChatStyle')?.remove()}
  $('#virtualChatToggle')?.remove();$('#virtualChatOverlay')?.remove();
  const main=/^#[0-9a-f]{6}$/i.test(store?.mainColor||'')?store.mainColor:'#7A2E3B';
  const dark=/^#[0-9a-f]{6}$/i.test(store?.darkColor||'')?store.darkColor:'#5B2029';
  const accent=/^#[0-9a-f]{6}$/i.test(store?.accentColor||'')?store.accentColor:'#C9A24B';
  const bg=/^#[0-9a-f]{6}$/i.test(store?.chatBg||'')?store.chatBg:'#FBF3EC';
  document.documentElement.style.setProperty('--store-main',main);
  document.documentElement.style.setProperty('--store-dark',dark);
  document.documentElement.style.setProperty('--store-accent',accent);
  document.documentElement.style.setProperty('--store-bg',bg);

  const fallback=document.createElement('style');
  fallback.id='virtualOriginalChatFallbackStyle';
  fallback.textContent=`
  .pub-chat-toggle{position:fixed;right:16px;bottom:22px;width:58px;height:58px;border-radius:50%;background:var(--store-main);color:#fff;font-size:26px;border:0;display:grid;place-items:center;box-shadow:0 3px 14px rgba(0,0,0,.45);z-index:90;cursor:pointer}
  .pub-chat-overlay{position:fixed;inset:0;z-index:100;display:none;flex-direction:column;justify-content:flex-end;background:rgba(0,0,0,.45)}.pub-chat-overlay.open{display:flex}
  .pub-chat-panel{height:90vh;height:90dvh;background:var(--store-bg,#FBF3EC);border-radius:18px 18px 0 0;display:flex;flex-direction:column;overflow:hidden;position:relative}
  .pub-chat-close{position:absolute;top:10px;right:12px;background:rgba(0,0,0,.18);color:#fff;border:0;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;z-index:2}
  .live-head{background:var(--store-main);color:#fff;padding:13px 15px;display:flex;align-items:center;gap:10px}.live-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--store-accent);font-weight:800;overflow:hidden}.live-avatar img{width:100%;height:100%;object-fit:cover}
  .live-messages{flex:1;overflow:auto;padding:15px;display:flex;flex-direction:column;gap:9px}.live-row{display:flex}.live-row.user{justify-content:flex-end}.live-bubble{max-width:82%;padding:10px 12px;border-radius:14px;background:#fff;border:1px solid #ead9cc;line-height:1.4;font-size:14px}.live-row.user .live-bubble{background:#f3e3d3;border:0;border-top-right-radius:3px}.live-time{display:block;text-align:right;font-size:10px;color:#8a7570;margin-top:4px}
  .live-inputbar{display:flex;gap:8px;padding:10px;background:#f1e6dc}.live-inputbar input{flex:1;border:0;border-radius:22px;padding:12px 15px;font-size:15px;outline:none}.live-inputbar button{width:44px;height:44px;border:0;border-radius:50%;background:var(--store-main);color:#fff;font-size:18px;cursor:pointer;display:grid;place-items:center;flex-shrink:0}.live-inputbar button.recording{background:#dc2626}
  .conversation-bar{display:flex;align-items:center;gap:9px;padding:8px 10px;background:rgba(255,255,255,.92);border-top:1px solid rgba(0,0,0,.06);border-bottom:1px solid rgba(0,0,0,.08);flex-wrap:wrap}.conversation-toggle{border:0;border-radius:999px;background:#16a34a;color:#fff;padding:10px 14px;font-weight:900;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:7px}.conversation-toggle.active{background:#dc2626}.conversation-dot{width:9px;height:9px;border-radius:50%;background:#fff}.conversation-hint{font-size:11px;color:#6b7280;line-height:1.25;flex:1;min-width:150px}.conversation-hint.active{color:#15803d;font-weight:800}
  .voice-output-toggle{border:0;border-radius:999px;background:var(--store-main);color:#fff;padding:10px 13px;font-weight:900;font-size:12px;cursor:pointer;white-space:nowrap}.voice-output-toggle.off{background:#6b7280}
  .rec-status{display:none;align-items:center;gap:6px;color:#b91c1c;font-size:12px;font-weight:700;padding:0 4px}.rec-status.show{display:flex}.listen-btn{border:none;background:var(--store-main);color:#fff;cursor:pointer;font-size:16px;width:30px;height:30px;border-radius:50%;margin-left:6px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle}
  .cat-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.cat-chip{border:1px solid var(--store-main);background:#fff;color:var(--store-main);padding:6px 11px;border-radius:16px;font-size:12px;font-weight:700;cursor:pointer}.cat-chip.all-chip{background:var(--store-main);color:#fff}.cat-chip.lead-chip{background:#25D366;border-color:#25D366;color:#fff}
  .vcd-product-seller{width:100%;border:0;border-radius:999px;background:var(--store-main,#7A2E3B);color:#fff;padding:11px 13px;margin:9px 0;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.16)}.vcd-product-seller-card{margin:8px 10px 10px;width:calc(100% - 20px);padding:9px 8px;font-size:12px}.live-pcard{width:220px;margin-top:8px}.live-pcard img{width:100%;height:125px;object-fit:contain;border-radius:8px;background:#f6f6f6}.live-pdesc{font-size:12px;line-height:1.4;color:#4b5563;margin:5px 0;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.live-noimg{height:125px;display:grid;place-items:center;background:#f3f4f6;border-radius:8px;font-size:36px}.live-price{color:var(--store-main);font-weight:800;margin:4px 0}.live-buy{display:block;text-align:center;background:var(--store-main);color:#fff;text-decoration:none;padding:8px;border-radius:8px;font-weight:700;font-size:12px;border:0;width:100%;cursor:pointer}.lead-form{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}.lead-input{flex:1;min-width:150px;border:1px solid #ddd;border-radius:8px;padding:7px 10px;font-size:13px}.lead-submit{border:0;background:var(--store-main);color:#fff;border-radius:8px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer}`;
  fallback.textContent+=`.live-back-catalog{display:block;width:100%;margin-top:7px;padding:8px;border:1px solid var(--store-main);border-radius:8px;background:#fff;color:var(--store-main);font-size:12px;font-weight:900;cursor:pointer}`;
  document.head.appendChild(fallback);

  const logo=safeImage(store.logo);
  document.body.insertAdjacentHTML('beforeend',`
    <button class="pub-chat-toggle" id="pubChatToggle" type="button" title="Abrir ChatShop">💬</button>
    <div class="pub-chat-overlay" id="pubChatOverlay">
      <div class="pub-chat-panel">
        <button class="pub-chat-close" id="pubChatClose" type="button">×</button>
        <div class="live-head" style="background:var(--store-main)">
          <div class="live-avatar" style="background:var(--store-accent)" id="pubAvatar">${logo?`<img src="${esc(logo)}" alt="">`:esc((store.brand||'C').charAt(0).toUpperCase())}</div>
          <div><b id="pubBrand">${esc(store.brand||'ChatShop')}</b><small style="display:block;opacity:.85">Atendimento online</small></div>
        </div>
        <div class="live-messages" id="pubMessages"></div>
        <div class="conversation-bar">
          <button id="pubVoiceToggle" class="voice-output-toggle" type="button" aria-pressed="true">🔊 Conversa ativada</button>
          <span class="conversation-hint" id="pubConversationHint">Depois da resposta, o microfone abre automaticamente para você falar.</span>
        </div>
        <div class="live-inputbar"><button id="pubMic" type="button" title="Falar uma vez" style="background:var(--store-main)">🎤</button><input id="pubInput" placeholder="Digite o que procura"><span class="rec-status" id="pubRecStatus">🔴 <span id="pubRecTime">00:00</span></span><button id="pubSend" type="button" style="background:var(--store-main)">➤</button></div>
      </div>
    </div>`);

  const overlay=$('#pubChatOverlay'),messages=$('#pubMessages'),input=$('#pubInput');
  let lastProduct=null,lastAnnouncedProduct=-1,productContext=null,catalogReminderTimer=null,voiceEnabled=localStorage.getItem('chatshop_voice_output')!=='off',conversationMode=false,conversationSpeaking=false,conversationRestartTimer=null,conversationSpeechTimer=null,pubRecognition=null,pubListening=false;

  function productWrittenText(p){return String(p?.displayText||p?.cardDescription||'').trim()}
  function productVoiceText(p){return String(p?.voiceText||`${p?.name||'Produto'}, ${money(p?.price)}.`).trim()}
  function productCard(p,i){
    const img=safeImage(Array.isArray(p.images)?p.images[0]:p.image);
    const description=productWrittenText(p);
    return `<div class="live-pcard">${img?`<img src="${esc(img)}" alt="${esc(p.name||'Produto')}">`:'<div class="live-noimg">🛍️</div>'}<b>${esc(p.name||'Produto')}</b>${description?`<div class="live-pdesc">${esc(description)}</div>`:''}<div class="live-price">${esc(money(p.price))}</div><button class="live-buy" type="button" data-pub-product="${i}">Comprar</button></div>`;
  }
  function productActions(p,i){return `<button class="live-buy" type="button" data-pub-product="${i}" style="margin-top:10px">Comprar ${esc(p?.name||'este produto')}</button><button class="live-back-catalog" type="button" data-back-catalog>↩ Voltar ao catálogo</button>`}
  function catalogVoice(text){
    const base=String(text||'');if(!productContext)return base;
    productContext.replyCount=(productContext.replyCount||0)+1;
    if(productContext.replyCount<(productContext.nextCatalogVoiceAt||3))return base;
    const step=productContext.catalogVoiceStep||4;productContext.nextCatalogVoiceAt+=step;productContext.catalogVoiceStep=step===4?3:4;
    return base+' Se quiser ver mais produtos, volte ao catálogo. Clique no botão Voltar ao catálogo.';
  }
  function scheduleCatalogReminder(){
    clearTimeout(catalogReminderTimer);if(!productContext||productContext.idleReminderSent)return;
    const contextId=productContext.contextId;
    catalogReminderTimer=setTimeout(()=>{
      if(!productContext||productContext.contextId!==contextId||productContext.idleReminderSent||!overlay.classList.contains('open'))return;
      const p=products[productContext.index],i=productContext.index;if(!p)return;
      productContext.idleReminderSent=true;
      const reminder='Se quiser ver mais produtos, volte ao catálogo. Clique no botão Voltar ao catálogo.';
      add('bot',reminder+productActions(p,i),reminder);
    },35000);
  }
  function productResultHtml(p){const i=products.indexOf(p);return productCard(p,i)}
  function catButtons(list){
    let html='<div class="cat-row"><button type="button" class="cat-chip all-chip" data-cat="__ALL__">Ver todos</button>';
    list.forEach(c=>html+=`<button type="button" class="cat-chip" data-cat="${esc(c)}">${esc(c)}</button>`);
    html+='<button type="button" class="cat-chip lead-chip" data-cat="__LEAD__">📱 Deixar WhatsApp</button></div>';
    return html;
  }
  function speak(text,force=false){
    if(!voiceEnabled&&!force)return;
    try{
      clearTimeout(conversationRestartTimer);clearTimeout(conversationSpeechTimer);conversationSpeaking=true;
      if(pubListening&&pubRecognition){try{pubRecognition.stop()}catch(e){}}
      speechSynthesis.cancel();
      const parts=String(text).split('[[pausa]]').map(x=>x.trim()).filter(Boolean);
      let partIndex=0,finished=false;
      const finish=()=>{if(finished)return;finished=true;conversationSpeaking=false;if(conversationMode)scheduleConversationListen(450)};
      const next=()=>{
        if(partIndex>=parts.length){finish();return}
        const u=new SpeechSynthesisUtterance(parts[partIndex++]);
        u.lang='pt-BR';u.rate=.88;u.pitch=1;
        u.onend=()=>{conversationSpeechTimer=setTimeout(next,650)};
        u.onerror=finish;
        speechSynthesis.speak(u);
      };
      if(parts.length)next();else finish();
    }catch(e){conversationSpeaking=false;if(conversationMode)scheduleConversationListen(400)}
  }
  function add(who,html,voiceText=''){
    const row=document.createElement('div');row.className='live-row '+who;
    const clean=String(html).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    const spoken=String(voiceText||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()||clean;
    const listen=(who==='bot'&&spoken)?'<button type="button" class="listen-btn" title="Ouvir mensagem">🔊</button>':'';
    row.innerHTML=`<div class="live-bubble">${html}${listen}<span class="live-time">${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>`;
    if(who==='bot'){const b=row.querySelector('.listen-btn');if(b)b.onclick=()=>speak(spoken,true)}
    messages.appendChild(row);messages.scrollTop=messages.scrollHeight;
    if(who==='bot'&&conversationMode&&spoken)setTimeout(()=>speak(spoken),120);
    if(who==='bot'&&productContext)scheduleCatalogReminder();
  }
  function showLeadForm(){add('bot','Deixe seu WhatsApp e a loja pode entrar em contato com você:<div class="lead-form"><input class="lead-input" inputmode="tel" placeholder="DDD + número"><button type="button" class="lead-submit">Enviar</button></div>')}
  function catalogVoiceText(list){
    const shown=list.slice(0,12);
    const parts=['Vou apresentar nosso catálogo, produto por produto.'];
    shown.forEach((p,i)=>{
      parts.push(i===0?'Primeiro produto.':'Temos também.');
      parts.push(String(p?.name||'Produto')+'.');
      const description=String(p?.voiceText||p?.cardDescription||p?.displayText||'').trim();
      if(description)parts.push(description);
      parts.push('O valor é '+money(p?.price)+'.');
      parts.push('Para comprar, toque no botão Comprar.');
    });
    if(list.length>shown.length)parts.push('Há mais produtos disponíveis. Você pode continuar navegando pelo catálogo.');
    return parts.join(' [[pausa]] ');
  }
  function showAllProducts(){
    if(!products.length){add('bot','Nenhum produto cadastrado ainda.');return}
    const shown=products.slice(0,12);
    add('bot','Veja os produtos disponíveis:'+shown.map(productResultHtml).join(''),catalogVoiceText(products));
  }
  function showCategory(cat,skipEcho=false){
    if(!skipEcho)add('user',esc(cat));
    const list=products.filter(p=>sameCategory(p.category,cat));
    if(!list.length){add('bot','Não encontrei produtos nessa categoria.');return}
    add('bot','Aqui estão as opções de '+esc(cat)+':'+list.map(productResultHtml).join(''),catalogVoiceText(list));
  }
  function reply(text){
    const query=norm(text);
    if(productContext&&products[productContext.index]){
      const p=products[productContext.index],i=productContext.index;
      const purchaseIntent=/como comprar|quero comprar|onde comprar|comprar|vou levar|sacola|carrinho/.test(query);
      if(purchaseIntent){
        const name=String(p?.name||'este produto');
        add('bot','Para comprar <b>'+esc(name)+'</b>, toque no botão abaixo.'+productActions(p,i),catalogVoice('Para comprar '+name+', toque no botão Comprar.'));return;
      }
      for(const qa of(Array.isArray(p.qna)?p.qna:[])){
        if(!qa?.question||!qa?.answer)continue;
        const words=norm(qa.question).split(' ').filter(w=>w.length>2);
        if(words.some(w=>query.includes(w))){add('bot',esc(qa.answer)+productActions(p,i),catalogVoice(qa.answer));return}
      }
      if(/preco|valor|quanto custa|custa/.test(query)){add('bot','O valor de <b>'+esc(p.name||'este produto')+'</b> é '+esc(money(p.price))+'.'+productActions(p,i),catalogVoice('O valor é '+money(p.price)+'.'));return}
      if(/descricao|detalhe|como e|fale sobre|material|tecido/.test(query)){
        const description=productWrittenText(p);
        if(description){add('bot',esc(description)+productActions(p,i),catalogVoice(productVoiceText(p)));return}
      }
      const unavailable='Não encontrei essa informação cadastrada para '+String(p.name||'este produto')+'. Posso responder somente com os dados e perguntas cadastradas para este produto.';
      add('bot',esc(unavailable)+productActions(p,i),catalogVoice(unavailable));return;
    }
    const purchaseIntent=/como comprar|quero comprar|onde comprar|comprar (?:esse|este|essa|esta)|vou levar|adicionar (?:na|ao) (?:sacola|carrinho)|colocar (?:na|no) (?:sacola|carrinho)/.test(query);
    if(purchaseIntent&&lastProduct){
      const i=products.indexOf(lastProduct);activeProduct=i;
      const name=String(lastProduct?.name||'este produto');
      const written='Para comprar '+esc(name)+', toque em <b>Comprar</b>. Na página você escolhe a cor e a quantidade, adiciona à sacola e finaliza o pedido.';
      const voice='Para comprar '+name+', toque no botão Comprar. Depois escolha a cor e a quantidade, adicione à sacola e finalize o pedido.';
      add('bot',written+productCard(lastProduct,i),voice);return;
    }
    const mentioned=matchProduct(text);
    const pq=productQna(text,lastProduct?products.indexOf(lastProduct):-1);
    if(pq){lastProduct=pq.p;activeProduct=pq.i;add('bot',esc(pq.answer)+productCard(pq.p,pq.i),String(pq.answer));return}
    const g=generalQna(text);if(g){if(mentioned){lastProduct=mentioned.p;activeProduct=mentioned.i;add('bot',esc(g)+productCard(mentioned.p,mentioned.i),String(g)+' '+productVoiceText(mentioned.p))}else add('bot',esc(g));return}
    const cat=categories().find(c=>{const cn=norm(c);return query.includes(cn)||cn.includes(query)||query.includes(cn.replace(/s$/,''))});
    if(cat){showCategory(cat,true);return}
    if(/catalogo|ver todos|todos os produtos|mostrar produtos|quais produtos|produtos disponiveis/.test(query)){showAllProducts();return}
    const found=mentioned;
    if(found){lastProduct=found.p;activeProduct=found.i;const written=productWrittenText(found.p);add('bot',(written?esc(written):'Encontrei este produto para você:')+productCard(found.p,found.i),productVoiceText(found.p));return}
    if(/oi|ola|bom dia|boa tarde|boa noite/.test(query)){add('bot',esc(store.welcome||'Olá! Como posso ajudar?'));return}
    if(/preco|valor|quanto/.test(query)){add('bot','Os preços aparecem nos produtos. Escreva o nome do produto que você quer consultar.');return}
    if(/frete|entrega|cep/.test(query)){add('bot','Adicione o produto à sacola. Na sacola você pode calcular ou conferir o frete antes de finalizar o pedido.');return}
    if(/whats|atendente|humano/.test(query)){
      const phone=String(store.whatsapp||'').replace(/\D/g,'');
      add('bot',phone?`Fale conosco pelo WhatsApp:<br><a class="live-buy" style="background:#25D366;margin-top:8px" href="https://wa.me/${phone}" target="_blank" rel="noopener">Abrir WhatsApp</a>`:'O WhatsApp da loja ainda não foi informado.');return;
    }
    add('bot','Não encontrei um produto exato. Tente escrever o nome ou escolha uma opção abaixo:'+catButtons(categories()));
  }
  function submit(){const text=input.value.trim();if(!text)return;clearTimeout(catalogReminderTimer);if(productContext)productContext.idleReminderSent=false;add('user',esc(text));input.value='';saveMessage(text,productContext||{});setTimeout(()=>reply(text),250)}

  function openChatForProduct(index){
    const i=Number(index),p=products[i];if(!Number.isInteger(i)||!p)return;
    const id=productId(p,i),changed=!productContext||productContext.productId!==id;
    activeProduct=i;lastProduct=p;lastAnnouncedProduct=i;
    clearTimeout(catalogReminderTimer);productContext={productId:id,productName:String(p.name||'Produto'),contextId:id+'-'+Date.now().toString(36),index:i,replyCount:0,nextCatalogVoiceAt:3,catalogVoiceStep:4,idleReminderSent:false};
    overlay.classList.add('open');
    if(changed)messages.innerHTML='';
    const name=String(p.name||'este produto'),description=productWrittenText(p).slice(0,240);
    const summary=description?esc(description):'Confira os detalhes, o preço e as opções disponíveis.';
    const intro='<b>'+esc(name)+'</b><br>'+summary+productCard(p,i)+'<button class="live-back-catalog" type="button" data-back-catalog>↩ Voltar ao catálogo</button><div style="margin-top:8px;font-weight:800">Tem alguma dúvida sobre esse produto?</div>';
    const voice=catalogVoice('Voz ativada. Se preferir, desative a voz. '+name+'. '+(description||'Confira os detalhes e as opções disponíveis.')+'. O valor é '+money(p.price)+'. Tem alguma dúvida sobre esse produto?');
    setConversationMode(voiceEnabled,true);
    add('bot',intro,voice);
    setTimeout(()=>input.focus(),120);
  }
  window.__CHATSHOP_OPEN_PRODUCT_CHAT=openChatForProduct;

  messages.addEventListener('click',e=>{
    const back=e.target.closest('[data-back-catalog]');
    if(back){clearTimeout(catalogReminderTimer);setConversationMode(false,true);try{speechSynthesis.cancel()}catch(err){};productContext=null;activeProduct=-1;lastProduct=null;lastAnnouncedProduct=-1;overlay.classList.remove('open');return}
    const prod=e.target.closest('[data-pub-product]');
    if(prod){
      const i=Number(prod.dataset.pubProduct);activeProduct=i;lastProduct=products[i]||null;overlay.classList.remove('open');
      const btn=$(`[data-product="${i}"]`);if(btn)btn.click();injectDescription(i);return;
    }
    const chip=e.target.closest('.cat-chip');
    if(chip){const c=chip.dataset.cat;if(c==='__ALL__')showAllProducts();else if(c==='__LEAD__')showLeadForm();else showCategory(c);return}
    const send=e.target.closest('.lead-submit');
    if(send){const wrap=send.closest('.lead-form'),inp=wrap?.querySelector('.lead-input'),numero=String(inp?.value||'').replace(/\D/g,'');if(numero.length<10){if(inp){inp.style.borderColor='#dc2626';inp.placeholder='Digite um número válido com DDD'}return}send.disabled=true;if(inp)inp.disabled=true;send.textContent='Enviado ✓';saveLead(numero);setTimeout(()=>add('bot','Perfeito, já anotei aqui! 😊 Em breve a loja pode entrar em contato.'),250)}
  });

  $('#pubChatToggle').onclick=()=>{if(activeProduct>=0&&products[activeProduct]){openChatForProduct(activeProduct);return}overlay.classList.add('open');setConversationMode(voiceEnabled,true);if(!messages.children.length)add('bot',esc(store.welcome||'Olá! 💛 Seja bem-vinda(o). Escreva o nome do produto que procura ou veja as opções abaixo.')+catButtons(categories()),store.welcome||'Olá! Como posso ajudar?');setTimeout(()=>input.focus(),120)};
  $('#pubChatClose').onclick=()=>{clearTimeout(catalogReminderTimer);overlay.classList.remove('open');setConversationMode(false,true)};
  $('#pubSend').onclick=submit;input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});

  function updateVoiceOutputUI(){
    const btn=$('#pubVoiceToggle');if(!btn)return;
    btn.textContent=voiceEnabled?'🔊 Conversa ativada':'🔇 Conversa desativada';btn.classList.toggle('off',!voiceEnabled);btn.setAttribute('aria-pressed',voiceEnabled?'true':'false');
  }
  $('#pubVoiceToggle').onclick=()=>{voiceEnabled=!voiceEnabled;localStorage.setItem('chatshop_voice_output',voiceEnabled?'on':'off');if(!voiceEnabled){setConversationMode(false,true);try{speechSynthesis.cancel()}catch(e){}}else{setConversationMode(true,true);speak('Conversa por voz ativada. Pode falar depois do sinal.',true)}updateVoiceOutputUI()};
  updateVoiceOutputUI();

  function makeRecognition(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return null;const r=new SR();r.lang='pt-BR';r.continuous=false;r.interimResults=false;r.maxAlternatives=1;return r}
  function updateConversationUI(){
    const btn=$('#pubConversationToggle'),label=$('#pubConversationLabel'),hint=$('#pubConversationHint');if(!btn)return;
    btn.classList.toggle('active',conversationMode);btn.setAttribute('aria-pressed',conversationMode?'true':'false');
    label.textContent=conversationMode?'⏹ Desativar conversa':'🎙️ Ativar conversa';
    hint.textContent=conversationMode?'Conversa ativa: fale normalmente. O ChatShop ouve e responde sozinho.':'Fale e o ChatShop responde em voz alta automaticamente.';hint.classList.toggle('active',conversationMode);
  }
  function scheduleConversationListen(delay=450){clearTimeout(conversationRestartTimer);if(!conversationMode)return;conversationRestartTimer=setTimeout(()=>{if(!conversationMode)return;if(conversationSpeaking||(window.speechSynthesis&&speechSynthesis.speaking)){scheduleConversationListen(350);return}startRecognition(true)},delay)}
  function startRecognition(autoMode=false){
    if(pubListening||conversationSpeaking||(window.speechSynthesis&&speechSynthesis.speaking)){if(autoMode&&conversationMode)scheduleConversationListen(350);return}
    pubRecognition=makeRecognition();
    if(!pubRecognition){if(autoMode){conversationMode=false;updateConversationUI()}add('bot','Seu navegador não permite conversa por voz. Use o Chrome ou escreva o que procura.');return}
    pubListening=true;$('#pubMic').classList.add('recording');$('#pubMic').textContent='⏹';$('#pubRecStatus').classList.add('show');$('#pubRecTime').textContent=autoMode?'ouvindo...':'00:00';
    pubRecognition.onresult=e=>{const text=String(e.results?.[0]?.[0]?.transcript||'').trim();if(!text)return;add('user',esc(text));saveMessage(text);setTimeout(()=>reply(text),250)};
    pubRecognition.onerror=e=>{const c=String(e?.error||'');if(autoMode&&conversationMode&&(c==='no-speech'||c==='aborted'))return;if(c==='not-allowed'||c==='service-not-allowed'){conversationMode=false;updateConversationUI();add('bot','Para usar a conversa por voz, permita o acesso ao microfone no navegador.')}else if(!autoMode)add('bot','Não consegui entender o áudio. Tente novamente ou escreva sua pergunta.')};
    pubRecognition.onend=()=>{pubListening=false;$('#pubMic').classList.remove('recording');$('#pubMic').textContent='🎤';$('#pubRecStatus').classList.remove('show');$('#pubRecTime').textContent='00:00';if(autoMode&&conversationMode)scheduleConversationListen(400)};
    try{pubRecognition.start()}catch(e){pubListening=false}
  }
  function setConversationMode(on,silent=false){
    if(store?.adminControl?.voicePaused){conversationMode=false;updateConversationUI();return}
    conversationMode=!!on;updateConversationUI();
    if(!conversationMode){clearTimeout(conversationRestartTimer);if(pubListening&&pubRecognition){try{pubRecognition.stop()}catch(e){}}speechSynthesis?.cancel?.();return}
    overlay.classList.add('open');if(!silent)add('bot','Conversa por voz ativada 🎙️. Pode falar comigo sem apertar o microfone a cada vez.');scheduleConversationListen(300);
  }
  if(store?.adminControl?.voicePaused){voiceEnabled=false;$('#pubMic').style.display='none';if($('#pubVoiceToggle'))$('#pubVoiceToggle').style.display='none';$('#pubConversationHint').textContent='Conversa por voz desativada pelo lojista.';updateVoiceOutputUI()}
  else{
    $('#pubMic').onclick=()=>{if(conversationMode){setConversationMode(false,true);setTimeout(()=>startRecognition(false),120);return}if(pubListening){try{pubRecognition?.stop()}catch(e){}return}startRecognition(false)};
  }
  updateConversationUI();
}

function makeProductSellerButton(index,card=false){
  const b=document.createElement('button');b.type='button';b.className='vcd-product-seller'+(card?' vcd-product-seller-card':'');b.dataset.chatProduct=String(index);b.textContent=card?'💬 Perguntar ao vendedor':'💬 Perguntar sobre este produto';
  const color=/^#[0-9a-f]{6}$/i.test(store?.mainColor||'')?store.mainColor:'#c2185b';
  b.style.cssText=card
    ? `display:inline-block;width:100%;height:35px;margin:10px 0 0;padding:10px 4px;border:0;border-radius:9px;background:${color};color:#fff;font-size:12px;font-weight:900;line-height:15px;white-space:nowrap;text-align:center;cursor:pointer;box-shadow:none;box-sizing:border-box`
    : `display:block;width:100%;margin:9px 0;padding:12px 13px;border:0;border-radius:999px;background:${color};color:#fff;font-size:14px;font-weight:900;line-height:1.25;text-align:center;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.16);box-sizing:border-box`;
  b.onclick=e=>{e.preventDefault();e.stopPropagation();window.__CHATSHOP_OPEN_PRODUCT_CHAT?.(index)};return b;
}
function injectProductSellerButtons(){
  Array.from(document.querySelectorAll('.csv-card,.vs-card')).forEach((card,fallbackIndex)=>{
    if(card.querySelector('.vcd-product-seller-card'))return;
    const open=card.querySelector('.csv-open[data-product],.vs-open[data-product]');
    let i=Number(open?.dataset.product);if(!Number.isInteger(i)||i<0)i=fallbackIndex;
    if(products[i]){
      const target=card.querySelector('.csv-body,.vs-body')||card;
      target.appendChild(makeProductSellerButton(i,true));
    }
  });
  const body=$('#vsProductBody')||$('#csvProductBody');if(!body||activeProduct<0||!products[activeProduct])return;
  let b=body.querySelector('.vcd-product-seller:not(.vcd-product-seller-card)');
  if(!b){b=makeProductSellerButton(activeProduct,false);const price=body.querySelector('.vs-detail-price,.csv-dprice');if(price)price.insertAdjacentElement('afterend',b);else body.appendChild(b)}
  b.dataset.chatProduct=String(activeProduct);b.onclick=e=>{e.preventDefault();e.stopPropagation();window.__CHATSHOP_OPEN_PRODUCT_CHAT?.(activeProduct)};
}
function bindProductDescription(){
  document.addEventListener('click',e=>{const b=e.target.closest('[data-product]');if(!b)return;const i=Number(b.dataset.product);if(Number.isInteger(i)){activeProduct=i;injectDescription(i);setTimeout(injectProductSellerButtons,40)}},true);
  const root=$('#storefrontScreen')||document.body;
  new MutationObserver(()=>{injectProductSellerButtons();if(activeProduct>=0&&($('#vsProductModal.open')||$('#csvProductModal.on')||$('#csvProductModal.open'))){injectDescription(activeProduct);injectProductSellerButtons()}}).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  injectProductSellerButtons();
}

async function boot(){
  store=await loadStore();
  if(!store||store.storeType!=='virtual')return;
  products=Array.isArray(store.products)?store.products:[];
  installOriginalChat();
  for(let i=0;i<100;i++){if($('.vs-page')||$('.csv-page'))break;await new Promise(r=>setTimeout(r,100))}
  try{bindProductDescription()}catch(e){console.warn('ChatShop: botões por produto indisponíveis',e)}
}
boot();
})();
