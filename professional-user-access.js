/* ChatShop — controle individual do plano Profissional: cortesia ou liberação para assinatura. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const dbRef=()=>{try{return typeof db!=='undefined'&&db?db:null}catch(e){return null}};
const adminOk=()=>{try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}};
const notify=msg=>{try{if(typeof toast==='function')return toast(msg)}catch(e){} alert(msg)};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let signupEnabled=false;

function userTitle(id,u){return u?.name||u?.displayName||u?.email||id}
function isLikelyAdminUser(u){return u?.isAdmin===true||u?.admin===true||String(u?.role||'').toLowerCase()==='admin'}
function isFreeProfessional(u){return u?.professionalGrantedFree===true}
function canSignupProfessional(u){return u?.professionalSignupEnabled===true}
function limitsFor(plan){return plan==='profissional'?{productLimit:1000000,chatLimit:2}:plan==='basico'?{productLimit:30,chatLimit:1}:{productLimit:10,chatLimit:1}}

async function loadCurrentUserFlags(user){
  const d=dbRef();if(!d||!user?.uid)return;
  try{
    const snap=await d.collection('users').doc(user.uid).get();
    const u=snap.exists?(snap.data()||{}):{};
    signupEnabled=u.professionalSignupEnabled===true;
    window.__CHATSHOP_PRO_SIGNUP_ENABLED=signupEnabled;
    window.__CHATSHOP_PRO_FREE_GRANTED=u.professionalGrantedFree===true;
    if(u.professionalGrantedFree===true||u.plan==='profissional'){
      try{myPlan='profissional';myProductLimit=1000000;myChatLimit=2}catch(e){}
      window.__CHATSHOP_VIRTUAL_STORE_UNLOCKED=true;
    }
    installPlanVisibility();
  }catch(e){console.warn('Não foi possível ler permissões do Profissional',e)}
}

function appendProfessionalCard(){
  if(!(signupEnabled||window.__CHATSHOP_PRO_SIGNUP_ENABLED===true))return;
  const cols=$('#plansCols');if(!cols||cols.querySelector('[data-pro-manual-card]'))return;
  if(cols.querySelector('button[data-plano="profissional"]'))return;
  const card=document.createElement('div');card.className='plan-card';card.dataset.proManualCard='1';
  card.innerHTML='<h3>Profissional</h3><div class="preco">R$ 49,90/mês</div><div class="lim" style="text-align:left;line-height:1.65">✅ Até 2 ChatShops<br>✅ Produtos ilimitados<br>✅ Loja virtual<br>✅ Domínio próprio<br>✅ Checkout Mercado Pago<br>✅ Recursos avançados</div><div style="font-size:11px;color:var(--muted);min-height:34px;margin:7px 0">Plano Profissional liberado pelo admin para sua assinatura.</div><button type="button" data-plano="profissional">Assinar Profissional</button>';
  const btn=card.querySelector('button');
  btn.onclick=()=>{try{if(typeof assinarPlano==='function')assinarPlano('profissional',btn);else notify('Não foi possível iniciar a assinatura agora.')}catch(e){console.error(e);notify('Não foi possível iniciar a assinatura agora.')}};
  cols.appendChild(card);
}

function installPlanVisibility(){
  let tries=0;const timer=setInterval(()=>{
    tries++;
    if(typeof window.abrirPlanos==='function'&&!window.abrirPlanos.__proSignupWrapped){
      const original=window.abrirPlanos;
      const wrapped=function(){const r=original.apply(this,arguments);setTimeout(appendProfessionalCard,0);return r};
      wrapped.__proSignupWrapped=true;window.abrirPlanos=wrapped;try{abrirPlanos=wrapped}catch(e){}
    }
    if($('#plansModal')?.style.display==='flex')appendProfessionalCard();
    if(tries>120)clearInterval(timer);
  },120);
}

async function renderAdminProfessionalControls(){
  if(!adminOk())return;
  const box=$('#adminConteudo');if(!box||$('#adminProfessionalAccessBox',box))return;
  const d=dbRef();if(!d)return;
  const wrap=document.createElement('section');wrap.id='adminProfessionalAccessBox';wrap.style.cssText='margin-top:18px;border-top:2px solid #e5e7eb;padding-top:16px';
  wrap.innerHTML='<div><h3 style="margin:0">⭐ Plano Profissional por usuário</h3><small style="color:#6b7280">Você pode dar o Profissional gratuitamente ou apenas liberar o plano para o usuário assinar.</small></div><div id="adminProfessionalUsers" style="margin-top:12px"><p style="color:#6b7280">Carregando usuários...</p></div>';
  box.appendChild(wrap);
  const list=$('#adminProfessionalUsers',wrap);
  try{
    const snap=await d.collection('users').limit(500).get();
    const rows=snap.docs.map(doc=>({id:doc.id,data:doc.data()||{}})).filter(x=>!isLikelyAdminUser(x.data));
    rows.sort((a,b)=>userTitle(a.id,a.data).localeCompare(userTitle(b.id,b.data),'pt-BR'));
    if(!rows.length){list.innerHTML='<p style="color:#6b7280">Nenhum usuário encontrado.</p>';return;}
    list.innerHTML=rows.map(({id,data})=>{
      const free=isFreeProfessional(data),signup=canSignupProfessional(data),plan=data.plan||'aprendiz';
      return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:11px;margin-bottom:8px;background:#fff"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div style="min-width:190px;flex:1"><b>${esc(userTitle(id,data))}</b><div style="font-size:11px;color:#6b7280;margin-top:3px">Plano atual: ${esc(plan)} · Cortesia Pro: <b>${free?'SIM':'NÃO'}</b> · Pode assinar Pro: <b>${signup?'SIM':'NÃO'}</b></div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ${free?'danger':'success'}" type="button" data-pro-free-user="${esc(id)}" data-pro-free-next="${free?'0':'1'}">${free?'↩️ Retirar Profissional grátis':'🎁 Liberar Profissional grátis'}</button><button class="btn" type="button" data-pro-signup-user="${esc(id)}" data-pro-signup-next="${signup?'0':'1'}">${signup?'🙈 Ocultar assinatura Profissional':'💳 Liberar para assinar Profissional'}</button></div></div></div>`;
    }).join('');
    $$('[data-pro-free-user]',list).forEach(btn=>btn.onclick=()=>toggleFreeProfessional(btn));
    $$('[data-pro-signup-user]',list).forEach(btn=>btn.onclick=()=>toggleProfessionalSignup(btn));
  }catch(e){console.error(e);list.innerHTML='<p style="color:#b91c1c">Não foi possível carregar os usuários.</p>';}
}

async function toggleFreeProfessional(btn){
  if(!adminOk())return;
  const uid=btn.dataset.proFreeUser,next=btn.dataset.proFreeNext==='1',d=dbRef();if(!uid||!d)return;
  if(!confirm(next?'Liberar o plano Profissional gratuitamente para este usuário?':'Retirar a cortesia do plano Profissional deste usuário?'))return;
  btn.disabled=true;
  try{
    const ref=d.collection('users').doc(uid),snap=await ref.get(),u=snap.exists?(snap.data()||{}):{};
    if(next){
      const previous=u.plan&&u.plan!=='profissional'?u.plan:(u.previousPlanBeforeFreeProfessional||'aprendiz');
      await ref.set({professionalGrantedFree:true,previousPlanBeforeFreeProfessional:previous,plan:'profissional',...limitsFor('profissional'),professionalAccessUpdatedAt:firebase.firestore.FieldValue.serverTimestamp(),professionalAccessUpdatedBy:(typeof currentUser!=='undefined'&&currentUser?.email)||''},{merge:true});
      notify('Plano Profissional liberado gratuitamente!');
    }else{
      const restore=u.previousPlanBeforeFreeProfessional||'aprendiz';
      await ref.set({professionalGrantedFree:false,plan:restore,...limitsFor(restore),professionalAccessUpdatedAt:firebase.firestore.FieldValue.serverTimestamp(),professionalAccessUpdatedBy:(typeof currentUser!=='undefined'&&currentUser?.email)||''},{merge:true});
      notify('Cortesia do Profissional retirada.');
    }
    $('#adminProfessionalAccessBox')?.remove();await renderAdminProfessionalControls();
  }catch(e){console.error(e);notify('Não foi possível alterar o Profissional grátis.');btn.disabled=false;}
}

async function toggleProfessionalSignup(btn){
  if(!adminOk())return;
  const uid=btn.dataset.proSignupUser,next=btn.dataset.proSignupNext==='1',d=dbRef();if(!uid||!d)return;
  if(!confirm(next?'Liberar o plano Profissional para este usuário visualizar e assinar?':'Ocultar novamente o plano Profissional para este usuário?'))return;
  btn.disabled=true;
  try{
    await d.collection('users').doc(uid).set({professionalSignupEnabled:next,professionalSignupUpdatedAt:firebase.firestore.FieldValue.serverTimestamp(),professionalSignupUpdatedBy:(typeof currentUser!=='undefined'&&currentUser?.email)||''},{merge:true});
    notify(next?'Assinatura do Profissional liberada para o usuário!':'Plano Profissional ocultado para o usuário.');
    $('#adminProfessionalAccessBox')?.remove();await renderAdminProfessionalControls();
  }catch(e){console.error(e);notify('Não foi possível alterar a liberação de assinatura.');btn.disabled=false;}
}

function installAdminHook(){
  document.addEventListener('click',e=>{if(e.target.closest?.('#adminTabUsuarios'))setTimeout(renderAdminProfessionalControls,220)},true);
  let tries=0;const timer=setInterval(()=>{tries++;if(adminOk()&&$('#adminTabUsuarios')){clearInterval(timer);if($('#adminTabUsuarios')?.classList.contains('active'))setTimeout(renderAdminProfessionalControls,220)}else if(tries>120)clearInterval(timer)},150);
}

function boot(){installPlanVisibility();installAdminHook();try{if(window.auth&&typeof auth.onAuthStateChanged==='function')auth.onAuthStateChanged(user=>{if(user)loadCurrentUserFlags(user)});else if(typeof currentUser!=='undefined'&&currentUser?.uid)loadCurrentUserFlags(currentUser)}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
