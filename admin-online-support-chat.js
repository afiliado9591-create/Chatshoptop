(()=>{
'use strict';
const PRESENCE='adminPresence', CHATS='adminChats', ONLINE_WINDOW_MS=180000, HEARTBEAT_MS=90000;
let presenceTimer=null, onlineStop=null, chatStop=null, profileCache={};

const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safePhoto=v=>{try{const u=new URL(String(v||''));return u.protocol==='https:'?u.href:''}catch{return''}};
const time=v=>{const d=v?.toDate?v.toDate():null;return d?d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''};

function styles(){
 if(document.getElementById('adminLiveSupportStyle'))return;
 const s=document.createElement('style');s.id='adminLiveSupportStyle';s.textContent=`
 .als-summary{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px}
 .als-stat{padding:13px;border-radius:12px;background:#f7f5ff;text-align:center}.als-stat b{display:block;font-size:24px;color:#6d28d9}.als-stat small{color:#6b7280}
 .als-user{width:100%;border:1px solid #e5e7eb;background:#fff;border-radius:12px;padding:10px;display:flex;align-items:center;gap:10px;text-align:left;margin-bottom:8px;cursor:pointer}
 .als-avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#ede9fe;display:grid;place-items:center;color:#6d28d9;font-weight:900;font-size:18px;flex:0 0 auto}
 .als-user-main{min-width:0;flex:1}.als-user-main b,.als-user-main small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.als-user-main small{color:#6b7280;margin-top:3px}
 .als-dot{width:11px;height:11px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px #dcfce7;flex:0 0 auto}
 .als-chat{display:flex;flex-direction:column;height:min(56vh,520px);border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#f8fafc}
 .als-chat-head{padding:10px;background:#fff;border-bottom:1px solid #e5e7eb;font-weight:800}
 .als-messages{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
 .als-msg{max-width:82%;padding:9px 11px;border-radius:12px;background:#fff;border:1px solid #e5e7eb;align-self:flex-start;white-space:pre-wrap;word-break:break-word}
 .als-msg.mine{align-self:flex-end;background:#ede9fe;border-color:#ddd6fe}.als-msg small{display:block;text-align:right;color:#6b7280;margin-top:4px;font-size:10px}
 .als-compose{display:flex;gap:7px;padding:9px;background:#fff;border-top:1px solid #e5e7eb}.als-compose input{min-width:0;flex:1;border:1px solid #d1d5db;border-radius:999px;padding:10px 13px}.als-compose button{border:0;border-radius:999px;background:#6d28d9;color:#fff;font-weight:800;padding:9px 14px}
 #userSupportButton{position:fixed;right:18px;bottom:18px;z-index:80;border:0;border-radius:999px;background:#6d28d9;color:#fff;padding:12px 16px;font-weight:900;box-shadow:0 8px 24px #4c1d9560;display:none}
 #userSupportModal{position:fixed;inset:0;z-index:120;background:#0008;display:none;align-items:center;justify-content:center;padding:14px}
 #userSupportModal .als-box{background:#fff;width:min(520px,100%);border-radius:16px;padding:14px}
 `;document.head.appendChild(s);
}

async function loadProfile(uid,user){
 if(profileCache[uid])return profileCache[uid];
 let p={};try{const d=await db.collection('profiles').doc(uid).get();if(d.exists)p=d.data()||{}}catch{}
 const value={name:p.name||user?.displayName||user?.email?.split('@')[0]||'Usuário',photo:safePhoto(p.photo||user?.photoURL||''),email:user?.email||p.email||''};
 profileCache[uid]=value;return value;
}

async function heartbeat(user,offline=false){
 if(!user||typeof db==='undefined')return;
 const p=await loadProfile(user.uid,user);
 try{await db.collection(PRESENCE).doc(user.uid).set({
  uid:user.uid,email:user.email||p.email||'',name:p.name,photo:p.photo,status:offline?'offline':'online',
  lastSeen:firebase.firestore.FieldValue.serverTimestamp()
 },{merge:true})}catch(e){console.warn('Presença ChatShop indisponível',e)}
}

function startPresence(user){
 clearInterval(presenceTimer);if(!user)return;
 heartbeat(user,false);presenceTimer=setInterval(()=>{if(document.visibilityState==='visible')heartbeat(user,false)},HEARTBEAT_MS);
 document.addEventListener('visibilitychange',()=>heartbeat(user,document.visibilityState!=='visible'));
 window.addEventListener('pagehide',()=>heartbeat(user,true),{once:true});
}

async function totalVisits(){
 try{const snap=await db.collection(typeof COLECAO!=='undefined'?COLECAO:'stores').get();return snap.docs.reduce((n,d)=>n+(Number(d.data()?.visitCount)||0),0)}catch{return 0}
}

function addAdminTab(){
 const metric=document.getElementById('adminTabMetricas');if(!metric)return;
 let b=document.getElementById('adminTabOnline');
 if(!b){b=document.createElement('button');b.className='btn';b.id='adminTabOnline';b.type='button';b.textContent='🟢 Online agora';metric.insertAdjacentElement('afterend',b)}
 b.onclick=showOnline;
}

async function showOnline(){
 if(typeof isAdmin!=='undefined'&&!isAdmin)return;
 const box=document.getElementById('adminConteudo');if(!box)return;
 if(chatStop){chatStop();chatStop=null}if(onlineStop)onlineStop();
 box.innerHTML='<p class="empty-hint">Carregando pessoas online...</p>';
 const visits=await totalVisits(),cutoff=firebase.firestore.Timestamp.fromMillis(Date.now()-ONLINE_WINDOW_MS);
 onlineStop=db.collection(PRESENCE).where('lastSeen','>=',cutoff).onSnapshot(snap=>{
  const people=snap.docs.map(d=>d.data()||{}).filter(p=>p.status!=='offline'&&p.uid&&p.uid!==currentUser?.uid);
  box.innerHTML=`<div class="als-summary"><div class="als-stat"><b>${visits}</b><small>👁️ Visitas gerais</small></div><div class="als-stat"><b>${people.length}</b><small>🟢 Online agora</small></div></div><div id="alsOnlineList"></div>`;
  const list=document.getElementById('alsOnlineList');
  list.innerHTML=people.length?people.map(p=>`<button class="als-user" data-live-uid="${h(p.uid)}"><span class="als-avatar">${safePhoto(p.photo)?`<img src="${h(safePhoto(p.photo))}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`:h((p.name||'U').charAt(0).toUpperCase())}</span><span class="als-user-main"><b>${h(p.name||'Usuário')}</b><small>${h(p.email||'')}</small></span><span class="als-dot"></span></button>`).join(''):'<p class="empty-hint">Nenhum usuário online neste momento.</p>';
  list.querySelectorAll('[data-live-uid]').forEach(el=>el.onclick=()=>openChat(el.dataset.liveUid,people.find(p=>p.uid===el.dataset.liveUid)||{} ,true));
 },e=>{console.error(e);box.innerHTML='<p class="empty-hint">Não foi possível consultar quem está online. Publique as novas regras do Firebase.</p>'});
}

function renderChat(host,uid,person,adminMode){
 if(chatStop)chatStop();
 host.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">${adminMode?'<button class="btn" id="alsBack" type="button">← Online</button>':''}<b>${h(person.name||person.email||'Atendimento')}</b></div><div class="als-chat"><div class="als-chat-head">💬 Conversa privada</div><div class="als-messages" id="alsMessages"><p class="empty-hint">Carregando...</p></div><form class="als-compose" id="alsCompose"><input id="alsInput" maxlength="1000" placeholder="Digite uma mensagem" autocomplete="off"><button>Enviar</button></form></div>`;
 if(adminMode)document.getElementById('alsBack').onclick=showOnline;
 const messages=document.getElementById('alsMessages');
 chatStop=db.collection(CHATS).doc(uid).collection('messages').orderBy('createdAt','asc').limit(100).onSnapshot(s=>{
  messages.innerHTML=s.empty?'<p class="empty-hint">Nenhuma mensagem ainda.</p>':s.docs.map(d=>{const m=d.data()||{},mine=m.senderUid===currentUser?.uid;return `<div class="als-msg ${mine?'mine':''}">${h(m.text||'')}<small>${time(m.createdAt)}</small></div>`}).join('');
  messages.scrollTop=messages.scrollHeight;
 },()=>{messages.innerHTML='<p class="empty-hint">Não foi possível carregar a conversa.</p>'});
 document.getElementById('alsCompose').onsubmit=async e=>{
  e.preventDefault();const input=document.getElementById('alsInput'),text=input.value.trim();if(!text||!currentUser)return;
  input.value='';try{await db.collection(CHATS).doc(uid).collection('messages').add({text,senderUid:currentUser.uid,senderRole:adminMode?'admin':'user',createdAt:firebase.firestore.FieldValue.serverTimestamp()})}catch(err){console.error(err);input.value=text;alert('Não foi possível enviar. Confira as regras do Firebase.')}
 };
}

function openChat(uid,person,adminMode){
 if(adminMode){if(onlineStop){onlineStop();onlineStop=null}const box=document.getElementById('adminConteudo');renderChat(box,uid,person,true);return}
 const modal=document.getElementById('userSupportModal');modal.style.display='flex';renderChat(modal.querySelector('.als-body'),uid,person,false);
}

function addUserSupport(user){
 if(document.getElementById('userSupportButton'))return;
 const b=document.createElement('button');b.id='userSupportButton';b.type='button';b.textContent='💬 Falar com o suporte';document.body.appendChild(b);
 const m=document.createElement('div');m.id='userSupportModal';m.innerHTML='<div class="als-box"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0">💬 Suporte ChatShop</h3><button id="userSupportClose" style="border:0;background:none;font-size:25px">×</button></div><div class="als-body"></div></div>';document.body.appendChild(m);
 b.style.display='block';b.onclick=()=>openChat(user.uid,{name:'Administrador ChatShop'},false);
 m.querySelector('#userSupportClose').onclick=()=>{m.style.display='none';if(chatStop){chatStop();chatStop=null}};
 m.onclick=e=>{if(e.target===m)m.querySelector('#userSupportClose').click()};
}

function init(){
 if(typeof STOREFRONT_MODE!=='undefined'&&STOREFRONT_MODE)return;
 styles();addAdminTab();
 const timer=setInterval(addAdminTab,1000);setTimeout(()=>clearInterval(timer),20000);
 if(typeof auth==='undefined')return;
 auth.onAuthStateChanged(user=>{
  if(!user){clearInterval(presenceTimer);return}
  setTimeout(()=>{
   startPresence(user);
   if(typeof isAdmin!=='undefined'&&isAdmin)addAdminTab();else addUserSupport(user);
  },500);
 });
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();