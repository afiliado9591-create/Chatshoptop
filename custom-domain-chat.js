/* ChatShop - restaura o chat completo da Loja Virtual em dominios proprios. */
(function(){
'use strict';
const $=(s,r)=> (r||document).querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const safeImage=v=>{const s=String(v||'').trim();return /^(https?:\/\/|data:image\/)/i.test(s)?s:''};
const money=v=>{let s=String(v??'').replace(/[^0-9,.-]/g,'');if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)&&n?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):(String(v||'').trim()||'Consulte')};

function isCustomDomain(){
  const h=location.hostname.toLowerCase().replace(/\.$/,'');
  return !h.endsWith('.alibr.com.br') && h!=='alibr.com.br' && h!=='www.alibr.com.br' && !h.endsWith('.vercel.app') && h!=='localhost';
}

async function waitStore(){
  for(let i=0;i<80;i++){
    const d=window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA;
    if(d&&d.storeType==='virtual')return d;
    await new Promise(r=>setTimeout(r,100));
  }
  return null;
}

async function getStoreRef(data){
  try{
    const db=window.firebase?.firestore?.(); if(!db)return null;
    const slug=String(data?.slug||'').trim();
    if(slug){const r=db.collection('chatshops').doc(slug);const s=await r.get();if(s.exists)return r;}
    const host=location.hostname.toLowerCase().replace(/\.$/,'');
    for(const candidate of [host,host.replace(/^www\./,''),'www.'+host.replace(/^www\./,'')]){
      const q=await db.collection('chatshops').where('customDomain','==',candidate).limit(1).get();
      if(!q.empty)return q.docs[0].ref;
    }
  }catch(e){console.warn('ChatShop dominio proprio: referencia da loja indisponivel',e)}
  return null;
}

function installStyle(main,bg,accent){
  if($('#customDomainChatStyle'))return;
  const s=document.createElement('style');s.id='customDomainChatStyle';s.textContent=`
  #pubChatToggle.chatshop-virtual-seller-pill{position:fixed!important;right:14px!important;bottom:18px!important;width:auto!important;min-width:174px!important;height:52px!important;border:0!important;border-radius:999px!important;padding:0 17px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;background:${main}!important;color:#fff!important;font-size:14px!important;font-weight:900!important;white-space:nowrap!important;box-shadow:0 4px 16px rgba(0,0,0,.35)!important;z-index:120!important;cursor:pointer!important}
  #pubChatToggle .seller-pill-icon{font-size:20px!important}.cdc-overlay{position:fixed;inset:0;z-index:130;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.46)}.cdc-overlay.open{display:flex}.cdc-panel{width:100%;max-width:680px;height:90dvh;background:${bg};border-radius:20px 20px 0 0;overflow:hidden;display:flex;flex-direction:column;position:relative}.cdc-head{background:${main};color:#fff;padding:13px 48px 13px 14px;display:flex;gap:10px;align-items:center}.cdc-avatar{width:42px;height:42px;border-radius:50%;background:${accent};display:grid;place-items:center;overflow:hidden;font-weight:900}.cdc-avatar img{width:100%;height:100%;object-fit:cover}.cdc-close{position:absolute;right:12px;top:10px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(0,0,0,.18);color:#fff;font-size:20px;z-index:2}.cdc-msgs{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:9px}.cdc-row{display:flex}.cdc-row.user{justify-content:flex-end}.cdc-bubble{max-width:84%;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:10px 12px;line-height:1.42;font-size:14px}.cdc-row.user .cdc-bubble{background:#e8ddff;border:0}.cdc-time{display:block;text-align:right;font-size:10px;color:#6b7280;margin-top:4px}.cdc-input{display:flex;gap:8px;padding:10px;background:rgba(255,255,255,.88);border-top:1px solid rgba(0,0,0,.08)}.cdc-input input{flex:1;border:1px solid #d1d5db;border-radius:999px;padding:11px 14px;font-size:15px;outline:none}.cdc-input button{width:44px;height:44px;border:0;border-radius:50%;background:${main};color:#fff;font-size:18px}.cdc-voicebar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 10px;background:rgba(255,255,255,.86);border-top:1px solid rgba(0,0,0,.06)}.cdc-cont{border:0;border-radius:999px;background:#16a34a;color:#fff;padding:9px 12px;font-weight:900;font-size:12px}.cdc-cont.active{background:#dc2626}.cdc-hint{font-size:11px;color:#6b7280}.cdc-chiprow{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.cdc-chip{border:1px solid ${main};background:#fff;color:${main};padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800}.cdc-card{margin-top:8px;width:220px;max-width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}.cdc-card img{width:100%;height:135px;object-fit:contain;background:#f8fafc}.cdc-card-body{padding:9px}.cdc-card-price{font-weight:900;color:${main};margin:4px 0 8px}.cdc-card button{width:100%;border:0;background:${main};color:#fff;border-radius:8px;padding:8px;font-weight:900}.cdc-listen{border:0;background:${main};color:#fff;border-radius:50%;width:28px;height:28px;margin-left:6px;vertical-align:middle}.cdc-lead{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.cdc-lead input{flex:1;min-width:150px;border:1px solid #ddd;border-radius:8px;padding:8px}.cdc-lead button{border:0;background:#25D366;color:#fff;border-radius:8px;padding:8px 11px;font-weight:900}
  @media(max-width:520px){#pubChatToggle.chatshop-virtual-seller-pill{right:12px!important;bottom:16px!important;min-width:166px!important;height:50px!important;padding:0 14px!important}#pubChatToggle.chatshop-virtual-seller-pill.product-open{bottom:96px!important}.cdc-panel{height:92dvh}.cdc-bubble{max-width:88%}}
  `;document.head.appendChild(s);
}

async function install(){
  if(!isCustomDomain()||$('#pubChatToggle'))return;
  const store=await waitStore();if(!store||$('#pubChatToggle')||store?.adminControl?.chatPaused)return;
  const products=Array.isArray(store.products)?store.products:[];
  const main=/^#[0-9a-f]{6}$/i.test(store.mainColor||'')?store.mainColor:'#c2185b';
  const bg=/^#[0-9a-f]{6}$/i.test(store.chatBg||'')?store.chatBg:'#fff7fb';
  const accent=/^#[0-9a-f]{6}$/i.test(store.accentColor||'')?store.accentColor:'#f8bbd0';
  installStyle(main,bg,accent);
  const logo=safeImage(store.logo);
  document.body.insertAdjacentHTML('beforeend',`<button id="pubChatToggle" class="chatshop-virtual-seller-pill" type="button" title="Fale com o vendedor"><span class="seller-pill-icon">💬</span><span class="seller-pill-text">Fale com o vendedor</span></button><div class="cdc-overlay" id="pubChatOverlay"><section class="cdc-panel"><button class="cdc-close" id="pubChatClose" type="button">×</button><header class="cdc-head"><div class="cdc-avatar">${logo?`<img src="${esc(logo)}" alt="">`:esc((store.brand||'L').charAt(0).toUpperCase())}</div><div><b>${esc(store.brand||'Loja')}</b><small style="display:block;opacity:.86">Atendimento online</small></div></header><div class="cdc-msgs" id="pubMessages"></div><div class="cdc-voicebar"><button class="cdc-cont" id="pubConversationToggle" type="button">🎙️ Ativar conversa</button><span class="cdc-hint" id="pubConversationHint">Fale e o ChatShop responde em voz alta.</span></div><div class="cdc-input"><button id="pubMic" type="button" title="Falar">🎤</button><input id="pubInput" placeholder="Digite o que procura"><button id="pubSend" type="button">➤</button></div></section></div>`);
  const ref=await getStoreRef(store),overlay=$('#pubChatOverlay'),msgs=$('#pubMessages'),input=$('#pubInput');
  let lastProduct=-1,conversation=false,recognition=null,listening=false,speaking=false,restartTimer=null;
  const categories=[...new Set(products.map(p=>String(p?.category||'').trim()).filter(Boolean))];
  const words=p=>[p?.name,...(Array.isArray(p?.keywords)?p.keywords:[])].flatMap(x=>norm(x).split(' ')).filter(w=>w.length>2);
  function speak(text){try{clearTimeout(restartTimer);speaking=true;if(listening&&recognition)try{recognition.stop()}catch(e){};speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text||''));u.lang='pt-BR';u.onend=u.onerror=()=>{speaking=false;if(conversation)scheduleListen(350)};speechSynthesis.speak(u)}catch(e){speaking=false}}
  function add(who,html,voice=''){
    const row=document.createElement('div');row.className='cdc-row '+who;const spoken=String(voice||String(html).replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();row.innerHTML=`<div class="cdc-bubble">${html}${who==='bot'&&spoken?`<button class="cdc-listen" type="button" title="Ouvir">🔊</button>`:''}<span class="cdc-time">${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>`;row.querySelector('.cdc-listen')?.addEventListener('click',()=>speak(spoken));msgs.appendChild(row);msgs.scrollTop=msgs.scrollHeight;if(who==='bot'&&conversation&&spoken)setTimeout(()=>speak(spoken),120)
  }
  function save(text){try{if(ref){ref.set({messageCount:firebase.firestore.FieldValue.increment(1)},{merge:true}).catch(()=>{});ref.collection('mensagens').add({texto:text,data:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{})}}catch(e){}}
  function productCard(p,i){const img=safeImage(Array.isArray(p.images)?p.images[0]:p.image);return `<div class="cdc-card">${img?`<img src="${esc(img)}" alt="${esc(p.name||'Produto')}">`:''}<div class="cdc-card-body"><b>${esc(p.name||'Produto')}</b><div class="cdc-card-price">${esc(money(p.price))}</div><button type="button" data-cdc-product="${i}">Ver produto</button></div></div>`}
  function chips(){let h='<div class="cdc-chiprow"><button class="cdc-chip" data-cdc-cat="__ALL__">Ver todos</button>';categories.forEach(c=>h+=`<button class="cdc-chip" data-cdc-cat="${esc(c)}">${esc(c)}</button>`);h+='<button class="cdc-chip" data-cdc-cat="__LEAD__">📱 Deixar WhatsApp</button></div>';return h}
  function reply(text){
    const q=norm(text);
    for(let i=0;i<products.length;i++){const p=products[i];for(const qa of(Array.isArray(p.qna)?p.qna:[])){const qw=norm(qa?.question).split(' ').filter(w=>w.length>2);if(qa?.answer&&qw.some(w=>q.includes(w))&&(i===lastProduct||words(p).some(w=>q.includes(w)))){lastProduct=i;add('bot',esc(qa.answer));return}}}
    for(const qa of(Array.isArray(store.qna)?store.qna:[])){const ks=Array.isArray(qa?.keywords)?qa.keywords:[];if(qa?.answer&&ks.some(k=>{const n=norm(k);return n&&(q.includes(n)||n.split(' ').filter(w=>w.length>2).some(w=>q.includes(w))) })){add('bot',esc(qa.answer));return}}
    let best=-1,score=0;products.forEach((p,i)=>{let s=0;words(p).forEach(w=>{if(q.includes(w))s+=w.length});if(s>score){score=s;best=i}});if(best>=0){lastProduct=best;const p=products[best],written=String(p.displayText||p.cardDescription||'').trim();add('bot',(written?esc(written):'Encontrei este produto para você:')+productCard(p,best),String(p.voiceText||`${p.name||'Produto'}, ${money(p.price)}.`));return}
    const cat=categories.find(c=>q.includes(norm(c))||norm(c).includes(q));if(cat){const list=products.map((p,i)=>({p,i})).filter(x=>norm(x.p.category)===norm(cat));add('bot',`Aqui estão as opções de ${esc(cat)}:`+list.map(x=>productCard(x.p,x.i)).join(''));return}
    if(/oi|ola|bom dia|boa tarde|boa noite/.test(q)){add('bot',esc(store.welcome||'Olá! Como posso ajudar?'));return}
    if(/whats|atendente|humano/.test(q)){const phone=String(store.whatsapp||'').replace(/\D/g,'');add('bot',`Fale conosco pelo WhatsApp:<br><a href="https://wa.me/${phone}" target="_blank" rel="noopener" style="display:inline-block;margin-top:7px;background:#25D366;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none;font-weight:900">Abrir WhatsApp</a>`);return}
    add('bot','Não encontrei um produto exato. Escolha uma categoria ou veja todos:'+chips())
  }
  function submit(text){const t=String(text??input.value).trim();if(!t)return;add('user',esc(t));input.value='';save(t);setTimeout(()=>reply(t),220)}
  msgs.addEventListener('click',e=>{const pbtn=e.target.closest('[data-cdc-product]');if(pbtn){const i=Number(pbtn.dataset.cdcProduct);overlay.classList.remove('open');setTimeout(()=>{const b=document.querySelector(`.vs-open[data-product="${i}"],.csv-open[data-product="${i}"]`)||document.querySelectorAll('.vs-open,.csv-open')[i];b?.click()},80);return}const c=e.target.closest('[data-cdc-cat]');if(c){const cat=c.dataset.cdcCat;if(cat==='__ALL__'){add('user','Ver todos');add('bot','Aqui está o nosso catálogo:'+products.map((p,i)=>productCard(p,i)).join(''));return}if(cat==='__LEAD__'){add('user','Quero deixar meu WhatsApp');add('bot','Digite seu WhatsApp com DDD:<div class="cdc-lead"><input type="tel" placeholder="(11) 91234-5678"><button type="button" data-cdc-lead>Enviar</button></div>');return}const list=products.map((p,i)=>({p,i})).filter(x=>norm(x.p.category)===norm(cat));add('user',esc(cat));add('bot',`Aqui estão as opções de ${esc(cat)}:`+list.map(x=>productCard(x.p,x.i)).join(''))}const lead=e.target.closest('[data-cdc-lead]');if(lead){const n=lead.parentElement.querySelector('input').value.replace(/\D/g,'');if(n.length<10)return;try{ref?.collection('leads').add({whatsapp:n,data:firebase.firestore.FieldValue.serverTimestamp()})}catch(err){};lead.disabled=true;lead.textContent='Enviado ✓';add('bot','Perfeito! Seu WhatsApp foi anotado.')}});
  const sellerToggle=$('#pubChatToggle');
  function adjustSellerPosition(){
    const productOpen=$('#csvProduct')?.classList.contains('on')||$('#vsProductModal')?.classList.contains('open')||$('#vsProductModal')?.classList.contains('on');
    sellerToggle?.classList.toggle('product-open',!!productOpen);
  }
  const productRoot=$('#storefrontScreen')||document.body;
  new MutationObserver(()=>requestAnimationFrame(adjustSellerPosition)).observe(productRoot,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
  document.addEventListener('click',()=>setTimeout(adjustSellerPosition,30),true);
  adjustSellerPosition();
  $('#pubChatToggle').onclick=()=>overlay.classList.add('open');$('#pubChatClose').onclick=()=>{overlay.classList.remove('open');setConversation(false)};$('#pubSend').onclick=()=>submit();input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});
  function makeRecognition(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return null;const r=new SR();r.lang='pt-BR';r.continuous=false;r.interimResults=false;return r}
  function scheduleListen(ms=350){clearTimeout(restartTimer);if(!conversation)return;restartTimer=setTimeout(()=>{if(conversation&&!speaking)startRecognition(true)},ms)}
  function startRecognition(auto=false){if(listening||speaking)return;recognition=makeRecognition();if(!recognition){if(auto)setConversation(false);add('bot','Seu navegador não permite conversa por voz. Use o Chrome ou escreva sua pergunta.');return}listening=true;$('#pubMic').textContent='⏹';recognition.onresult=e=>{const t=String(e.results?.[0]?.[0]?.transcript||'').trim();if(t)submit(t)};recognition.onerror=e=>{if(['not-allowed','service-not-allowed'].includes(String(e.error||''))){setConversation(false);add('bot','Permita o acesso ao microfone no navegador para usar a voz.')}};recognition.onend=()=>{listening=false;$('#pubMic').textContent='🎤';if(auto&&conversation)scheduleListen(450)};try{recognition.start()}catch(e){listening=false;$('#pubMic').textContent='🎤'}}
  function setConversation(on){conversation=!!on;const b=$('#pubConversationToggle');b?.classList.toggle('active',conversation);if(b)b.textContent=conversation?'⏹ Desativar conversa':'🎙️ Ativar conversa';if(!conversation){clearTimeout(restartTimer);if(listening&&recognition)try{recognition.stop()}catch(e){};if(speaking)try{speechSynthesis.cancel()}catch(e){};speaking=false;return}overlay.classList.add('open');scheduleListen(250)}
  $('#pubConversationToggle').onclick=()=>setConversation(!conversation);$('#pubMic').onclick=()=>{if(listening){try{recognition.stop()}catch(e){};return}if(conversation)setConversation(false);startRecognition(false)};
  add('bot',esc(store.welcome||'Olá! Como posso ajudar?'));if(products.length)add('bot','Veja por categoria ou fale o nome do produto:'+chips());
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,700);setTimeout(install,1800);setTimeout(install,3500);
})();