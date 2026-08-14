/* ChatShop: Loja Virtual, mensagens e métricas do lojista. */
(function(){
'use strict';

const $=(s,r)=> (r||document).querySelector(s);
const $$=(s,r)=> Array.from((r||document).querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ownerDelegationInstalled=false,patchTimer=null,lastSaleSignature='',cartRevision=0;

function getDb(){
  try{if(typeof db!=='undefined'&&db)return db}catch(e){}
  try{return window.firebase?.firestore?.()||null}catch(e){return null}
}
function collectionName(){try{if(typeof COLECAO!=='undefined'&&COLECAO)return COLECAO}catch(e){}return 'chatshops'}
function fieldValue(){try{return window.firebase?.firestore?.FieldValue||firebase.firestore.FieldValue}catch(e){return null}}
function conversationSlug(){try{return typeof conversasSlugAtual!=='undefined'?String(conversasSlugAtual||''):''}catch(e){return''}}
function adminAllowed(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function fmtDate(ts){try{return ts?.toDate?ts.toDate().toLocaleString('pt-BR'):''}catch(e){return''}}
function notify(msg){try{if(typeof toast==='function'){toast(msg);return}}catch(e){}alert(msg)}

/* 1) Botão do chat da Loja Virtual igual ao catálogo. */
function installStyles(){
  if($('#storeOwnerMetricsStyle'))return;
  const st=document.createElement('style');st.id='storeOwnerMetricsStyle';st.textContent=`
  #pubChatToggle.chatshop-virtual-seller-pill{position:fixed!important;right:14px!important;bottom:18px!important;width:auto!important;min-width:174px!important;height:52px!important;border-radius:999px!important;padding:0 17px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;font-size:14px!important;line-height:1!important;font-weight:900!important;white-space:nowrap!important;z-index:95!important}
  #pubChatToggle.chatshop-virtual-seller-pill .seller-pill-icon{font-size:20px!important;line-height:1!important}
  #pubChatToggle.chatshop-virtual-seller-pill .seller-pill-text{font-size:14px!important;line-height:1!important}
  #storeGrid .metrics{flex-wrap:wrap!important;row-gap:8px!important}#storeGrid .metrics>div{min-width:58px!important}
  .som-msg-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px}.som-danger{border:1px solid #fecaca;background:#fff1f2;color:#b91c1c;border-radius:9px;padding:8px 10px;font-weight:800;cursor:pointer}.som-back{border:0;background:none;color:#6d28d9;font-weight:800;padding:4px 0;cursor:pointer}.som-msg{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start;padding:10px 0;border-bottom:1px solid #eee}.som-msg-text{font-size:13px;line-height:1.45;word-break:break-word}.som-msg-time{font-size:11px;color:#6b7280;margin-top:3px}.som-del{border:1px solid #fecaca;background:#fff;color:#b91c1c;border-radius:8px;padding:6px 8px;font-weight:800;cursor:pointer;white-space:nowrap}.som-admin-store{border:1px solid #eee;border-radius:10px;padding:10px;margin-bottom:9px;background:#fff}.som-admin-store-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.som-admin-store-actions{display:flex;gap:7px;flex-wrap:wrap}.som-btn{border:1px solid #ddd;background:#fff;color:#4c1d95;border-radius:8px;padding:7px 9px;font-size:12px;font-weight:800;cursor:pointer}
  @media(max-width:520px){#pubChatToggle.chatshop-virtual-seller-pill{right:12px!important;bottom:16px!important;min-width:166px!important;height:50px!important;padding:0 14px!important}.som-msg{grid-template-columns:1fr}.som-del{justify-self:start}}
  `;document.head.appendChild(st);
}
function applyVirtualChatPill(){
  const virtual=!!$('.vs-page,.csv-page')||window.__CHATSHOP_STORE_DATA?.storeType==='virtual';
  const btn=$('#pubChatToggle');if(!virtual||!btn)return;
  btn.classList.add('chatshop-virtual-seller-pill');
  if(!btn.querySelector('.seller-pill-text'))btn.innerHTML='<span class="seller-pill-icon">💬</span><span class="seller-pill-text">Fale com o vendedor</span>';
  btn.title='Fale com o vendedor';
}
installStyles();
new MutationObserver(applyVirtualChatPill).observe(document.documentElement,{childList:true,subtree:true});

/* 2) Mensagens: o dono apaga as da própria loja; admin gerencia todas. */
async function syncMessageCount(slug){
  const d=getDb();if(!d||!slug)return 0;
  const ref=d.collection(collectionName()).doc(slug),snap=await ref.collection('mensagens').get();
  await ref.set({messageCount:snap.size},{merge:true});return snap.size;
}
async function deleteAllMessages(slug){
  const d=getDb();if(!d||!slug)throw new Error('Banco de dados indisponível.');
  const storeRef=d.collection(collectionName()).doc(slug),col=storeRef.collection('mensagens');
  while(true){const snap=await col.limit(400).get();if(snap.empty)break;const batch=d.batch();snap.docs.forEach(doc=>batch.delete(doc.ref));await batch.commit();if(snap.size<400)break}
  await storeRef.set({messageCount:0},{merge:true});
}
async function renderOwnerMessages(){
  const box=$('#conversasConteudo'),slug=conversationSlug(),d=getDb();if(!box||!slug||!d)return;
  box.innerHTML='<p class="empty-hint">Carregando mensagens...</p>';
  try{
    const ref=d.collection(collectionName()).doc(slug).collection('mensagens'),snap=await ref.orderBy('data','desc').limit(150).get();
    const top='<div class="som-msg-toolbar"><b style="font-size:13px;flex:1">💬 Mensagens da sua loja</b><button type="button" class="som-danger" id="somOwnerClear">🗑️ Apagar todas</button></div>';
    box.innerHTML=top+(snap.empty?'<p class="empty-hint">Nenhuma mensagem salva.</p>':snap.docs.map(doc=>{const x=doc.data()||{};return `<div class="som-msg" data-msg="${doc.id}"><div><div class="som-msg-text">${esc(x.texto||'')}</div><div class="som-msg-time">${esc(fmtDate(x.data))}</div></div><button type="button" class="som-del" data-del-msg="${doc.id}">🗑️ Apagar</button></div>`}).join(''));
    $('#somOwnerClear',box)?.addEventListener('click',async()=>{if(!confirm('Apagar todas as mensagens desta loja?'))return;try{await deleteAllMessages(slug);notify('Todas as mensagens foram apagadas.');await renderOwnerMessages();refreshDashboardMetricForSlug(slug)}catch(e){console.error(e);alert('Não foi possível apagar as mensagens. Verifique as permissões do Firestore.')}});
    $$('[data-del-msg]',box).forEach(btn=>btn.onclick=async()=>{if(!confirm('Apagar esta mensagem?'))return;try{await ref.doc(btn.dataset.delMsg).delete();await syncMessageCount(slug);btn.closest('.som-msg')?.remove();refreshDashboardMetricForSlug(slug)}catch(e){console.error(e);alert('Não foi possível apagar esta mensagem. Verifique as permissões do Firestore.')}});
  }catch(e){console.error(e);box.innerHTML='<p class="empty-hint">Não foi possível carregar as mensagens.<br><small style="color:#dc2626">'+esc(e.message||String(e))+'</small></p>'}
}
let ownerConversationMode='messages';
function installOwnerMessages(){
  const tab=$('#convTabMensagens');if(tab)tab.onclick=()=>{ownerConversationMode='messages';renderOwnerMessages()};
  const contacts=$('#convTabContatos');if(contacts&&!contacts.dataset.somBound){contacts.dataset.somBound='1';contacts.addEventListener('click',()=>{ownerConversationMode='contacts'},true)}
  if(!ownerDelegationInstalled){ownerDelegationInstalled=true;document.addEventListener('click',e=>{if(e.target.closest?.('.ver-conversas'))ownerConversationMode='messages'},true)}
  try{window.mostrarMensagens=renderOwnerMessages}catch(e){}
  const modal=$('#conversasModal');if(modal&&!modal.dataset.somObserved){modal.dataset.somObserved='1';new MutationObserver(()=>{if(modal.style.display!=='none'&&ownerConversationMode==='messages')setTimeout(renderOwnerMessages,40)}).observe(modal,{attributes:true,attributeFilter:['style']})}
}

async function renderAdminStoreMessages(){
  const box=$('#adminConteudo'),d=getDb();if(!box||!d||!adminAllowed())return;
  box.innerHTML='<p class="empty-hint">Carregando lojas e mensagens...</p>';
  try{
    const snap=await d.collection(collectionName()).get(),stores=snap.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>(b.messageCount||0)-(a.messageCount||0));
    box.innerHTML='<div style="font-weight:900;margin-bottom:10px">🧹 Mensagens de todas as lojas</div>'+(stores.length?stores.map(s=>`<div class="som-admin-store"><div class="som-admin-store-head"><div><b>${esc(s.brand||s.id)}</b><div style="font-size:11px;color:#6b7280">${esc(s.id)}.alibr.com.br · 💬 ${Number(s.messageCount||0)} mensagens</div></div><div class="som-admin-store-actions"><button class="som-btn" data-admin-view="${esc(s.id)}" data-admin-name="${esc(s.brand||s.id)}">Ver mensagens</button><button class="som-danger" data-admin-clear="${esc(s.id)}">Apagar todas</button></div></div></div>`).join(''):'<p class="empty-hint">Nenhuma loja encontrada.</p>');
    $$('[data-admin-view]',box).forEach(btn=>btn.onclick=()=>renderAdminMessagesForSlug(btn.dataset.adminView,btn.dataset.adminName));
    $$('[data-admin-clear]',box).forEach(btn=>btn.onclick=async()=>{const slug=btn.dataset.adminClear;if(!confirm('Apagar todas as mensagens de '+slug+'?'))return;try{await deleteAllMessages(slug);notify('Mensagens apagadas.');renderAdminStoreMessages()}catch(e){console.error(e);alert('Não foi possível apagar. Verifique as permissões de administrador no Firestore.')}});
  }catch(e){console.error(e);box.innerHTML='<p class="empty-hint">Não foi possível carregar.<br><small style="color:#dc2626">'+esc(e.message||String(e))+'</small></p>'}
}
async function renderAdminMessagesForSlug(slug,name){
  const box=$('#adminConteudo'),d=getDb();if(!box||!d||!adminAllowed())return;
  box.innerHTML='<p class="empty-hint">Carregando mensagens...</p>';
  try{
    const ref=d.collection(collectionName()).doc(slug).collection('mensagens'),snap=await ref.orderBy('data','desc').limit(200).get();
    box.innerHTML=`<div class="som-msg-toolbar"><button type="button" class="som-back" id="somAdminBack">← Voltar às lojas</button><b style="flex:1">${esc(name||slug)}</b><button type="button" class="som-danger" id="somAdminClearOne">🗑️ Apagar todas</button></div>`+(snap.empty?'<p class="empty-hint">Nenhuma mensagem salva.</p>':snap.docs.map(doc=>{const x=doc.data()||{};return `<div class="som-msg"><div><div class="som-msg-text">${esc(x.texto||'')}</div><div class="som-msg-time">${esc(fmtDate(x.data))}</div></div><button type="button" class="som-del" data-admin-del="${doc.id}">🗑️ Apagar</button></div>`}).join(''));
    $('#somAdminBack',box).onclick=renderAdminStoreMessages;
    $('#somAdminClearOne',box).onclick=async()=>{if(!confirm('Apagar todas as mensagens desta loja?'))return;try{await deleteAllMessages(slug);notify('Mensagens apagadas.');renderAdminMessagesForSlug(slug,name)}catch(e){console.error(e);alert('Não foi possível apagar. Verifique as permissões do Firestore.')}};
    $$('[data-admin-del]',box).forEach(btn=>btn.onclick=async()=>{if(!confirm('Apagar esta mensagem?'))return;try{await ref.doc(btn.dataset.adminDel).delete();await syncMessageCount(slug);renderAdminMessagesForSlug(slug,name)}catch(e){console.error(e);alert('Não foi possível apagar esta mensagem.')}});
  }catch(e){console.error(e);box.innerHTML='<p class="empty-hint">Não foi possível carregar.<br><small style="color:#dc2626">'+esc(e.message||String(e))+'</small></p>'}
}
function installAdminMessagesTab(){
  const metric=$('#adminTabMetricas');if(!metric||$('#adminTabMensagensGerenciar'))return;
  const b=document.createElement('button');b.className='btn';b.id='adminTabMensagensGerenciar';b.type='button';b.textContent='🧹 Mensagens';b.onclick=renderAdminStoreMessages;metric.insertAdjacentElement('afterend',b);
}

/* 3) Vendas: conta quando o cliente finaliza o pedido para o WhatsApp. */
function storefrontSlug(){
  const fromData=String(window.__CHATSHOP_STORE_DATA?.slug||'').trim();if(fromData)return fromData;
  const h=location.hostname.toLowerCase().replace(/\.$/,'');const suffix='.alibr.com.br';if(!h.endsWith(suffix))return'';const s=h.slice(0,-suffix.length);return s&&!s.includes('.')&&s!=='www'?s:'';
}
function validCheckout(btn){
  if(!btn||btn.disabled)return false;
  const body=$('#csvCartBody')||$('#vsCartBody');if(!body||!String(body.textContent||'').trim())return false;
  const sf=$('#sfDeliveryBox');if(sf){const quote=$('#sfQuoteOptions input:checked'),addr=String($('#sfAddress')?.value||'').trim();if(!quote||!addr)return false}
  const knownPhone=String(window.__CHATSHOP_STORE_DATA?.whatsapp||'').replace(/\D/g,'');if(window.__CHATSHOP_STORE_DATA&&knownPhone.length<10)return false;
  return true;
}
async function countSale(){
  const slug=storefrontSlug(),d=getDb();if(!slug||!d)return;
  const body=$('#csvCartBody')||$('#vsCartBody'),sig=slug+'|'+cartRevision+'|'+String(body?.textContent||'').replace(/\s+/g,' ').trim().slice(0,1200);
  if(!sig||sig===lastSaleSignature)return;lastSaleSignature=sig;
  try{
    const FV=fieldValue(),data={lastSaleAt:FV?.serverTimestamp?FV.serverTimestamp():new Date()};
    if(FV?.increment)data.saleCount=FV.increment(1);else{const ref=d.collection(collectionName()).doc(slug),snap=await ref.get();data.saleCount=Number(snap.data()?.saleCount||0)+1}
    await d.collection(collectionName()).doc(slug).set(data,{merge:true});
  }catch(e){console.warn('Não consegui contar a venda',e);lastSaleSignature=''}
}
window.addEventListener('click',e=>{
  if(e.target.closest?.('#csvAdd,#vsAdd')){cartRevision++;return}
  const rem=e.target.closest?.('[data-remove]');if(rem&&($('#csvCartBody')?.contains(rem)||$('#vsCartBody')?.contains(rem))){cartRevision++;return}
  const checkout=e.target.closest?.('#csvCheckout,#vsCheckout,.csv-checkout,.vs-checkout');if(checkout&&validCheckout(checkout))setTimeout(countSale,0);
},true);

/* Preserva a contagem de vendas quando o lojista republica a loja. */
function installPublishPreserve(){
  const btn=$('#publishBtn');if(!btn||btn.dataset.somSalesWrapped==='1'||typeof btn.onclick!=='function')return;
  const original=btn.onclick;btn.dataset.somSalesWrapped='1';
  btn.onclick=async function(e){
    const d=getDb(),slug=String($('#slug')?.value||'').trim();let saved=null;
    try{if(d&&slug){const snap=await d.collection(collectionName()).doc(slug).get();if(snap.exists){const x=snap.data()||{};saved={saleCount:Number(x.saleCount||0),lastSaleAt:x.lastSaleAt||null}}}}catch(err){console.warn('read sales before publish',err)}
    const out=await original.call(this,e);
    try{if(d&&slug&&saved){const keep={saleCount:saved.saleCount};if(saved.lastSaleAt)keep.lastSaleAt=saved.lastSaleAt;await d.collection(collectionName()).doc(slug).set(keep,{merge:true})}}catch(err){console.warn('restore sales after publish',err)}
    return out;
  };
}

/* Métricas do painel do lojista: Visitas, Mensagens, Vendas, Produtos. */
function slugFromCard(card){const tag=$('.slugtag',card);const m=String(tag?.textContent||'').trim().match(/^([a-z0-9-]+)\.alibr\.com\.br$/i);return m?m[1]:''}
async function patchOneCard(card,force=false){
  if(!card||(!force&&card.dataset.salesMetricReady==='1'))return;
  const slug=slugFromCard(card),metrics=$('.metrics',card),d=getDb();if(!slug||!metrics||!d)return;
  let sales=$('.metric-sales',metrics);if(!sales){sales=document.createElement('div');sales.className='metric-sales';sales.innerHTML='🛒 Vendas<br><b>0</b>';const children=$$('div',metrics);if(children[1])children[1].insertAdjacentElement('afterend',sales);else metrics.appendChild(sales)}
  try{
    const snap=await d.collection(collectionName()).doc(slug).get(),data=snap.data()||{};
    $('b',sales).textContent=Number(data.saleCount||data.salesCount||0);
    const blocks=$$('div',metrics),msg=blocks.find(x=>/Mensagens/i.test(x.textContent||''));if(msg&&$('b',msg))$('b',msg).textContent=Number(data.messageCount||0);
    card.dataset.salesMetricReady='1';
  }catch(e){console.warn('sales metric',e)}
}
function patchDashboardCards(force=false){clearTimeout(patchTimer);patchTimer=setTimeout(()=>{$$('#storeGrid .storecard').forEach(c=>patchOneCard(c,force))},60)}
function refreshDashboardMetricForSlug(slug){const card=$$('#storeGrid .storecard').find(c=>slugFromCard(c)===slug);if(card){card.dataset.salesMetricReady='0';patchOneCard(card,true)}}
function installDashboardMetrics(){const grid=$('#storeGrid');if(grid&&!grid.dataset.salesObserved){grid.dataset.salesObserved='1';new MutationObserver(()=>patchDashboardCards(false)).observe(grid,{childList:true,subtree:true});patchDashboardCards(true)}}

function installAll(){applyVirtualChatPill();installOwnerMessages();installAdminMessagesTab();installDashboardMetrics();installPublishPreserve()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installAll,{once:true});else installAll();
setTimeout(installAll,250);setTimeout(installAll,900);setInterval(installAll,2500);

})();
