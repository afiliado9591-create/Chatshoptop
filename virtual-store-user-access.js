/* ChatShop — liberação manual da função Loja Virtual por usuário. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dbRef=()=>{try{return typeof db!=='undefined'&&db?db:null}catch(e){return null}};
const adminOk=()=>{try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}};
const notify=msg=>{try{if(typeof toast==='function')return toast(msg)}catch(e){} alert(msg)};
let currentAccess=false;
let currentUid='';

function setAccess(value){
  currentAccess=value===true;
  window.__CHATSHOP_VIRTUAL_STORE_UNLOCKED=currentAccess;
  document.documentElement.dataset.virtualStoreUnlocked=currentAccess?'1':'0';
  applyEditorAccess();
}
function canUseVirtual(){return adminOk()||currentAccess===true||window.__CHATSHOP_VIRTUAL_STORE_UNLOCKED===true}

async function loadCurrentUserAccess(user){
  const d=dbRef();if(!d||!user?.uid)return;
  currentUid=user.uid;
  try{
    const snap=await d.collection('users').doc(user.uid).get();
    const data=snap.exists?snap.data()||{}:{};
    setAccess(data.virtualStoreEnabled===true||data.permissions?.virtualStore===true);
  }catch(e){console.warn('Não foi possível ler a permissão de Loja Virtual',e)}
}

function applyEditorAccess(){
  if(!canUseVirtual())return;
  const type=$('#storeType');
  if(type){
    const opt=[...type.options].find(o=>o.value==='virtual');
    if(opt){opt.hidden=false;opt.disabled=false;}
    const field=type.closest('.field');if(field)field.style.display='';
  }
}

function wrapCollect(){
  const current=window.collect;
  if(typeof current!=='function'||current.__virtualUserAccessWrapped)return;
  const wrapped=function(){
    const selected=$('#storeType')?.value;
    const value=current.apply(this,arguments);
    if(canUseVirtual()&&selected==='virtual'){
      value.storeType='virtual';
      value.planFeatures={...(value.planFeatures||{}),virtual:true};
      value.virtualStoreManualAccess=true;
    }
    return value;
  };
  wrapped.__virtualUserAccessWrapped=true;
  wrapped.__planPolicyWrapped=true;
  window.collect=wrapped;try{collect=wrapped}catch(e){}
}

function watchEditor(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;wrapCollect();applyEditorAccess();
    if(tries>120)clearInterval(timer);
  },120);
  if(document.body)new MutationObserver(()=>requestAnimationFrame(()=>{wrapCollect();applyEditorAccess()})).observe(document.body,{childList:true,subtree:true});
}

function isLikelyAdminUser(u){return u?.isAdmin===true||u?.admin===true||String(u?.role||'').toLowerCase()==='admin'}
function userTitle(id,u){return u?.name||u?.displayName||u?.email||id}
function accessOn(u){return u?.virtualStoreEnabled===true||u?.permissions?.virtualStore===true}

async function renderAdminVirtualStoreControls(){
  if(!adminOk())return;
  const box=$('#adminConteudo');if(!box||$('#adminVirtualStoreAccessBox',box))return;
  const d=dbRef();if(!d)return;
  const wrap=document.createElement('section');wrap.id='adminVirtualStoreAccessBox';wrap.style.cssText='margin-top:18px;border-top:2px solid #e5e7eb;padding-top:16px';
  wrap.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><h3 style="margin:0">🏪 Liberar Loja Virtual por usuário</h3><small style="color:#6b7280">Ative a função somente para os usuários que você escolher. O plano do usuário não é alterado.</small></div></div><div id="adminVirtualStoreUsers" style="margin-top:12px"><p style="color:#6b7280">Carregando usuários...</p></div>';
  box.appendChild(wrap);
  const list=$('#adminVirtualStoreUsers',wrap);
  try{
    const snap=await d.collection('users').limit(500).get();
    const rows=snap.docs.map(doc=>({id:doc.id,data:doc.data()||{}})).filter(x=>!isLikelyAdminUser(x.data));
    rows.sort((a,b)=>userTitle(a.id,a.data).localeCompare(userTitle(b.id,b.data),'pt-BR'));
    if(!rows.length){list.innerHTML='<p style="color:#6b7280">Nenhum usuário encontrado.</p>';return;}
    list.innerHTML=rows.map(({id,data})=>{
      const on=accessOn(data),plan=data.plan||'aprendiz',email=data.email||'';
      return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:11px;margin-bottom:8px;background:#fff"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div style="min-width:190px;flex:1"><b>${esc(userTitle(id,data))}</b>${email&&email!==userTitle(id,data)?`<div style="font-size:11px;color:#6b7280">${esc(email)}</div>`:''}<div style="font-size:11px;color:#6b7280;margin-top:3px">Plano: ${esc(plan)} · Loja Virtual: <b style="color:${on?'#15803d':'#b45309'}">${on?'LIBERADA':'BLOQUEADA'}</b></div></div><button type="button" class="btn ${on?'danger':'success'}" data-virtual-user="${esc(id)}" data-virtual-next="${on?'0':'1'}">${on?'🔒 Bloquear Loja Virtual':'🏪 Liberar Loja Virtual'}</button></div></div>`;
    }).join('');
    $$('[data-virtual-user]',list).forEach(btn=>btn.onclick=()=>toggleUserVirtualAccess(btn));
  }catch(e){console.error(e);list.innerHTML='<p style="color:#b91c1c">Não foi possível carregar os usuários.</p>';}
}

async function toggleUserVirtualAccess(btn){
  if(!adminOk())return;
  const uid=btn.dataset.virtualUser,next=btn.dataset.virtualNext==='1';
  if(!uid)return;
  const text=next?'liberar':'bloquear';
  if(!confirm(`Deseja ${text} a função Loja Virtual para este usuário?`))return;
  const d=dbRef();if(!d)return;
  btn.disabled=true;
  try{
    await d.collection('users').doc(uid).set({virtualStoreEnabled:next,virtualStoreUpdatedAt:firebase.firestore.FieldValue.serverTimestamp(),virtualStoreUpdatedBy:(typeof currentUser!=='undefined'&&currentUser?.email)||''},{merge:true});
    notify(next?'Loja Virtual liberada para o usuário!':'Loja Virtual bloqueada para o usuário.');
    const old=$('#adminVirtualStoreAccessBox');if(old)old.remove();
    await renderAdminVirtualStoreControls();
  }catch(e){console.error(e);notify('Não foi possível alterar a permissão de Loja Virtual.');btn.disabled=false;}
}

function installAdminHook(){
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('#adminTabUsuarios');
    if(tab)setTimeout(renderAdminVirtualStoreControls,180);
  },true);
  let tries=0;const timer=setInterval(()=>{
    tries++;
    if(adminOk()&&$('#adminTabUsuarios')){
      clearInterval(timer);
      const active=$('#adminTabUsuarios');
      if(active?.classList.contains('active'))setTimeout(renderAdminVirtualStoreControls,150);
    }else if(tries>120)clearInterval(timer);
  },150);
}

function boot(){
  watchEditor();installAdminHook();
  try{
    if(window.auth&&typeof auth.onAuthStateChanged==='function')auth.onAuthStateChanged(user=>{if(user)loadCurrentUserAccess(user);else setAccess(false)});
    else if(typeof currentUser!=='undefined'&&currentUser?.uid)loadCurrentUserAccess(currentUser);
  }catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
