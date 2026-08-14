/* ChatShop — conexão Mercado Pago por OAuth para lojistas Profissionais.
   O lojista não cola token: apenas toca em Conectar e autoriza no Mercado Pago. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
let cache={slug:'',connection:null,vault:''},refreshTimer=null;
function plan(){try{return (typeof myPlan!=='undefined'&&myPlan)||'aprendiz'}catch(e){return'aprendiz'}}
function isPro(){return plan()==='profissional'}
function slug(){try{return String((typeof mySlug!=='undefined'&&mySlug)||$('#slug')?.value||'').trim()}catch(e){return''}}
function toastMsg(m){try{if(typeof toast==='function')return toast(m)}catch(e){} alert(m)}
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function ensureEditor(){
  if(!$('#editorView')||$('#mercadoPagoSettings'))return;
  const publish=[...document.querySelectorAll('#editorView .section')].find(s=>String(s.querySelector('h2')?.textContent||'').includes('4. Publicar'));
  if(!publish)return;
  const box=document.createElement('div');box.id='mercadoPagoSettings';box.className='section';
  box.innerHTML=`<h2>💳 Mercado Pago</h2>
    <div id="mpLocked" class="notice" style="display:none">🔒 Checkout Mercado Pago disponível somente no plano <b>Profissional</b>.</div>
    <div id="mpPanel" style="display:none">
      <div id="mpStatusBox" style="border:1px solid #dbeafe;background:#eff6ff;border-radius:12px;padding:12px;font-size:13px;line-height:1.45">Carregando situação...</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button type="button" class="btn primary" id="mpConnectBtn">🔵 Conectar Mercado Pago</button>
        <button type="button" class="btn" id="mpDisconnectBtn" style="display:none">Desconectar</button>
      </div>
      <small style="display:block;color:var(--muted);margin-top:8px">O lojista não precisa copiar Access Token, Client Secret nem chave de API. A autorização é feita na página oficial do Mercado Pago.</small>
    </div>`;
  const affiliate=$('#affiliateProgramSettings');
  if(affiliate) affiliate.parentNode.insertBefore(box,affiliate); else publish.parentNode.insertBefore(box,publish);
  $('#mpConnectBtn').onclick=connect;
  $('#mpDisconnectBtn').onclick=disconnect;
  applyAccess();
}

function applyAccess(){
  const locked=$('#mpLocked'),panel=$('#mpPanel');if(!locked||!panel)return;
  locked.style.display=isPro()?'none':'block';panel.style.display=isPro()?'block':'none';
  if(isPro()) scheduleRefresh();
}

function setStatus(kind,text){
  const el=$('#mpStatusBox');if(!el)return;
  const palette=kind==='ok'?['#ecfdf5','#a7f3d0','#047857']:kind==='warn'?['#fffbeb','#fde68a','#92400e']:['#eff6ff','#bfdbfe','#1d4ed8'];
  el.style.background=palette[0];el.style.borderColor=palette[1];el.style.color=palette[2];el.innerHTML=text;
}

async function firebaseToken(){
  try{const u=(typeof auth!=='undefined'&&auth&&auth.currentUser)||window.firebase?.auth?.().currentUser;if(!u)return'';return await u.getIdToken()}catch(e){return''}
}

async function readStoreForCache(s){
  if(!s||typeof db==='undefined'||!db)return null;
  try{const snap=await db.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').doc(s).get();if(!snap.exists)return null;const d=snap.data()||{};cache={slug:s,connection:d.mercadoPagoConnection||null,vault:d.mercadoPagoVault||''};return d}catch(e){return null}
}

async function refreshStatus(){
  if(!isPro()||!$('#mpPanel'))return;
  const s=slug();
  if(!s||(typeof mySlug!=='undefined'&&!mySlug)){
    setStatus('warn','📌 <b>Publique a loja primeiro.</b><br>Depois de publicar, volte aqui para conectar a conta Mercado Pago.');
    $('#mpConnectBtn').style.display='none';$('#mpDisconnectBtn').style.display='none';return;
  }
  setStatus('info','Consultando Mercado Pago...');
  const token=await firebaseToken();
  if(!token){setStatus('warn','Sua sessão expirou. Entre novamente no ChatShop para conectar o Mercado Pago.');return}
  await readStoreForCache(s);
  try{
    const r=await fetch('/api/mercadopago/status',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({slug:s})});
    const j=await r.json();
    if(j.connected){
      setStatus('ok','✅ <b>Mercado Pago conectado</b><br>A conta desta loja foi autorizada. O lojista não precisa informar token.');
      $('#mpConnectBtn').textContent='🔄 Reconectar Mercado Pago';$('#mpConnectBtn').style.display='inline-block';$('#mpDisconnectBtn').style.display='inline-block';
    }else if(j.configured===false){
      setStatus('warn','⚙️ <b>A integração central do ChatShop ainda precisa ser ativada.</b><br>Faltam as credenciais da aplicação Mercado Pago na Vercel. Depois disso este botão funcionará para todos os lojistas Profissionais.');
      $('#mpConnectBtn').textContent='🔵 Conectar Mercado Pago';$('#mpConnectBtn').style.display='inline-block';$('#mpDisconnectBtn').style.display='none';
    }else if(r.status===403){
      setStatus('warn',safe(j.message||'Este recurso exige o plano Profissional.'));$('#mpConnectBtn').style.display='none';$('#mpDisconnectBtn').style.display='none';
    }else{
      setStatus('info','🔵 <b>Mercado Pago ainda não conectado.</b><br>Toque no botão abaixo e autorize sua conta na página oficial do Mercado Pago.');
      $('#mpConnectBtn').textContent='🔵 Conectar Mercado Pago';$('#mpConnectBtn').style.display='inline-block';$('#mpDisconnectBtn').style.display='none';
    }
  }catch(e){console.error(e);setStatus('warn','Não foi possível consultar a conexão agora. Tente novamente.');}
}
function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(refreshStatus,180)}

async function connect(){
  const s=slug();if(!s||(typeof mySlug!=='undefined'&&!mySlug)){toastMsg('Publique a loja antes de conectar o Mercado Pago.');return}
  const btn=$('#mpConnectBtn');if(btn){btn.disabled=true;btn.textContent='Abrindo Mercado Pago...'}
  try{
    const token=await firebaseToken();if(!token)throw new Error('Sua sessão expirou. Entre novamente no ChatShop.');
    const r=await fetch('/api/mercadopago/connect',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({slug:s})});
    const j=await r.json();if(!r.ok||!j.authorizationUrl)throw new Error(j.message||'Não foi possível iniciar a conexão.');
    location.href=j.authorizationUrl;
  }catch(e){console.error(e);toastMsg(e.message||'Não foi possível conectar o Mercado Pago.');if(btn){btn.disabled=false;btn.textContent='🔵 Conectar Mercado Pago'}}
}

async function disconnect(){
  const s=slug();if(!s||typeof db==='undefined'||!db)return;
  if(!confirm('Desconectar o Mercado Pago desta loja? O checkout online ficará indisponível até conectar novamente.'))return;
  const btn=$('#mpDisconnectBtn');if(btn)btn.disabled=true;
  try{
    const F=window.firebase?.firestore?.FieldValue || firebase.firestore.FieldValue;
    await db.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').doc(s).set({mercadoPagoConnection:{connected:false,provider:'mercadopago',disconnectedAt:F.serverTimestamp()},mercadoPagoVault:F.delete()},{merge:true});
    cache={slug:s,connection:{connected:false},vault:''};toastMsg('Mercado Pago desconectado.');await refreshStatus();
  }catch(e){console.error(e);toastMsg('Não foi possível desconectar. Confira sua conexão e tente novamente.')}finally{if(btn)btn.disabled=false}
}

function wrapCollect(){
  if(typeof window.collect!=='function'||window.collect.__mpOauthWrapped)return;
  const original=window.collect;
  function wrapped(){
    const d=original();const s=slug();
    if(s&&cache.slug===s){
      if(cache.connection)d.mercadoPagoConnection=cache.connection;
      if(cache.vault)d.mercadoPagoVault=cache.vault;
    }
    return d;
  }
  wrapped.__mpOauthWrapped=true;window.collect=wrapped;try{collect=wrapped}catch(e){}
}

function wrapPopulate(){
  if(typeof window.populateForm!=='function'||window.populateForm.__mpOauthWrapped)return;
  const original=window.populateForm;
  async function wrapped(data){
    const s=String(data?.slug||slug()||'');
    cache={slug:s,connection:data?.mercadoPagoConnection||null,vault:data?.mercadoPagoVault||''};
    const r=await original.apply(this,arguments);ensureEditor();applyAccess();scheduleRefresh();return r;
  }
  wrapped.__mpOauthWrapped=true;window.populateForm=wrapped;try{populateForm=wrapped}catch(e){}
}

function wrapClear(){
  if(typeof window.clearForm!=='function'||window.clearForm.__mpOauthWrapped)return;
  const original=window.clearForm;
  function wrapped(){cache={slug:'',connection:null,vault:''};const r=original.apply(this,arguments);ensureEditor();applyAccess();scheduleRefresh();return r}
  wrapped.__mpOauthWrapped=true;window.clearForm=wrapped;try{clearForm=wrapped}catch(e){}
}

function decorateDashboard(){
  if(!$('#storeGrid'))return;
  document.querySelectorAll('#storeGrid .storecard').forEach(card=>{
    if(card.dataset.mpDecorated==='1')return;
    const visit=card.querySelector('a.visit');if(!visit)return;let s='';try{s=new URL(visit.href).hostname.split('.')[0]}catch(e){}if(!s)return;
    card.dataset.mpDecorated='1';
    if(typeof db!=='undefined'&&db)db.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').doc(s).get().then(sn=>{if(!sn.exists)return;const d=sn.data()||{};if(d.mercadoPagoConnection?.connected===true){const tag=document.createElement('div');tag.style.cssText='font-size:11px;color:#047857;font-weight:800;margin:5px 0';tag.textContent='✅ Mercado Pago conectado';card.querySelector('.slugtag')?.insertAdjacentElement('afterend',tag)}}).catch(()=>{});
  });
}

function handleReturn(){
  try{const p=new URLSearchParams(location.search);if(p.get('mp')==='connected'){setTimeout(()=>toastMsg('Mercado Pago conectado com sucesso!'),500)}}catch(e){}
}
function install(){
  ensureEditor();wrapCollect();wrapPopulate();wrapClear();applyAccess();decorateDashboard();handleReturn();
  const body=document.body;if(body&&!body.dataset.mpOauthObserved){body.dataset.mpOauthObserved='1';let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>{ensureEditor();wrapCollect();wrapPopulate();wrapClear();applyAccess();decorateDashboard()},120)}).observe(body,{childList:true,subtree:true})}
}
let tries=0;(function wait(){tries++;if(document.body&&typeof window.collect==='function'){install();return}if(tries<100)setTimeout(wait,100)})();
})();
