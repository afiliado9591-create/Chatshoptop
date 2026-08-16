/* ChatShop — regras de acesso dos planos
   Grátis: 1 loja, 10 produtos, catálogo + WhatsApp.
   Básico: 1 loja, 30 produtos, recursos normais da loja + frete + WhatsApp.
   Profissional: 2 lojas, produtos ilimitados, domínio próprio e checkout Mercado Pago.
*/
(function(){
'use strict';

const INTERNAL_UNLIMITED = 1000000;
const POLICY = {
  aprendiz: {
    name:'Grátis', price:'Grátis', products:10, chats:1,
    features:{catalog:true,whatsapp:true,virtual:false,chat:false,shipping:false,coupons:false,customDomain:false,mercadoPago:false}
  },
  basico: {
    name:'Básico', price:'R$ 18,00/mês', products:30, chats:1,
    features:{catalog:true,whatsapp:true,virtual:true,chat:true,shipping:true,coupons:true,customDomain:false,mercadoPago:false}
  },
  profissional: {
    name:'Profissional', price:'R$ 49,90/mês', products:INTERNAL_UNLIMITED, chats:2,
    features:{catalog:true,whatsapp:true,virtual:true,chat:true,shipping:true,coupons:true,customDomain:true,mercadoPago:true}
  }
};

function currentPlan(){
  try{
    if(typeof isAdmin!=='undefined'&&isAdmin===true)return 'profissional';
    return (typeof myPlan!=='undefined' && myPlan) || 'aprendiz';
  }catch(e){return 'aprendiz'}
}
function cap(plan){return POLICY[plan] || POLICY.aprendiz}
function isPro(){return currentPlan()==='profissional'}
function isFree(){return currentPlan()==='aprendiz'}
function productLabel(plan){return plan==='profissional'?'Ilimitados':String(cap(plan).products)}
function safe(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function patchPlanConstants(){
  try{
    if(typeof PLANOS!=='undefined'){
      PLANOS.aprendiz.nome='Grátis';
      PLANOS.aprendiz.preco=0; PLANOS.aprendiz.precoTexto='Grátis'; PLANOS.aprendiz.limiteProdutos=10; PLANOS.aprendiz.limiteChats=1;
      PLANOS.basico.nome='Básico';
      PLANOS.basico.preco=18; PLANOS.basico.precoTexto='R$ 18,00/mês'; PLANOS.basico.limiteProdutos=30; PLANOS.basico.limiteChats=1;
      PLANOS.profissional.nome='Profissional';
      PLANOS.profissional.preco=49.90; PLANOS.profissional.precoTexto='R$ 49,90/mês'; PLANOS.profissional.limiteProdutos=INTERNAL_UNLIMITED; PLANOS.profissional.limiteChats=2;
    }
  }catch(e){console.warn('Não consegui atualizar PLANOS',e)}
}

async function syncLoggedUser(){
  try{
    if(typeof db==='undefined'||!db||typeof myUid==='undefined'||!myUid)return;
    const ref=db.collection('users').doc(myUid);
    const snap=await ref.get();
    const plan=(typeof isAdmin!=='undefined'&&isAdmin===true)?'profissional':((snap.exists&&snap.data().plan)||currentPlan()||'aprendiz');
    const c=cap(plan);
    await ref.set({productLimit:c.products,chatLimit:c.chats,planPolicyVersion:'2026-08-14'}, {merge:true});
    try{myPlan=plan;myProductLimit=c.products;myChatLimit=c.chats}catch(e){}

    // Marca as lojas do usuário com o plano atual. Isso permite ao site público
    // aplicar os recursos corretos sem depender do painel aberto.
    try{
      const stores=await db.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').where('ownerUid','==',myUid).get();
      const featureData={...c.features};
      await Promise.all(stores.docs.map(d=>d.ref.set({planTier:plan,planFeatures:featureData},{merge:true})));
    }catch(e){console.warn('Não consegui atualizar o plano nas lojas',e)}

    if(typeof loadDashboard==='function') await loadDashboard();
    setTimeout(applyEditorAccess,80);
  }catch(e){console.warn('Sincronização dos limites do plano falhou',e)}
}

function hideClosestFieldByText(text){
  const wanted=String(text).toLowerCase();
  document.querySelectorAll('#editorView .field').forEach(f=>{
    if(String(f.textContent||'').toLowerCase().includes(wanted)) f.style.display='none';
  });
}
function showClosestFieldByText(text){
  const wanted=String(text).toLowerCase();
  document.querySelectorAll('#editorView .field').forEach(f=>{
    if(String(f.textContent||'').toLowerCase().includes(wanted)) f.style.display='';
  });
}
function sectionByHeading(text){
  const wanted=String(text).toLowerCase();
  return [...document.querySelectorAll('#editorView .section')].find(s=>String(s.querySelector('h2')?.textContent||'').toLowerCase().includes(wanted));
}

function applyEditorAccess(){
  const plan=currentPlan(), c=cap(plan);
  try{myProductLimit=c.products;myChatLimit=c.chats}catch(e){}

  const type=document.getElementById('storeType');
  if(type){
    const virtualOpt=[...type.options].find(o=>o.value==='virtual');
    if(virtualOpt) virtualOpt.disabled=!c.features.virtual;
    if(!c.features.virtual && type.value==='virtual'){
      type.value='affiliate';
      try{type.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}
    }
    const typeField=type.closest('.field');
    if(typeField) typeField.style.display=c.features.virtual?'':'none';
  }

  const shipping=document.getElementById('shippingSettings');
  if(shipping) shipping.style.display=c.features.shipping && type?.value==='virtual'?'block':'none';

  const custom=document.getElementById('customDomainField');
  const locked=document.getElementById('customDomainLocked');
  if(custom) custom.style.display=c.features.customDomain?'block':'none';
  if(locked){
    locked.style.display=c.features.customDomain?'none':'block';
    const small=locked.querySelector('small');
    if(small) small.innerHTML='Disponível somente no plano <b>Profissional</b>. <a href="#" id="verPlanosDominioPolicy">Ver planos</a>';
    const link=document.getElementById('verPlanosDominioPolicy');
    if(link) link.onclick=e=>{e.preventDefault();try{abrirPlanos()}catch(err){}};
  }

  const qna=sectionByHeading('perguntas e respostas');
  if(qna) qna.style.display=c.features.chat?'':'none';

  document.querySelectorAll('.seller-audio-editor').forEach(x=>x.style.display=c.features.chat?'':'none');
  document.querySelectorAll('#products .prod-qna-list,#products .add-prod-qna').forEach(x=>x.style.display=c.features.chat?'':'none');

  if(isFree()){
    hideClosestFieldByText('mensagem inicial');
    hideClosestFieldByText('vídeo de destaque');
  }else{
    showClosestFieldByText('mensagem inicial');
    showClosestFieldByText('vídeo de destaque');
  }

  const banner=document.getElementById('limitBanner');
  if(banner && plan==='profissional') banner.style.display='none';
}

function patchCollect(){
  if(typeof window.collect!=='function'||window.collect.__planPolicyWrapped)return;
  const original=window.collect;
  function wrapped(){
    const d=original();
    const plan=currentPlan(), c=cap(plan);
    d.planTier=plan;
    d.planFeatures={...c.features};
    if(!c.features.virtual) d.storeType='affiliate';
    if(!c.features.chat){
      d.qna=[];
      (d.products||[]).forEach(p=>{
        p.qna=[];
        p.sellerAudioMode='off'; p.sellerAudioText=''; p.sellerAudioUrl='';
      });
    }
    if(!c.features.shipping) d.shipping={mode:'none'};
    if(!c.features.customDomain) d.customDomain='';
    d.checkoutMode=c.features.mercadoPago?'mercadopago_or_whatsapp':'whatsapp';
    return d;
  }
  wrapped.__planPolicyWrapped=true;
  window.collect=wrapped;
}

function installPlanModal(){
  if(typeof window.abrirPlanos!=='function')return;
  function customOpen(){
    const cols=document.getElementById('plansCols');
    if(!cols)return;
    const plan=currentPlan();
    const cards=[
      {key:'aprendiz',title:'Grátis',price:'R$ 0',items:['1 ChatShop','Até 10 produtos','Catálogo público','Botão de WhatsApp'],note:'Para começar e testar sua vitrine.'},
      {key:'basico',title:'Básico',price:'R$ 18/mês',items:['1 ChatShop','Até 30 produtos','Loja virtual e sacola','Chat vendedor','Frete / SuperFrete','Cupons','Finalização pelo WhatsApp'],note:'Para vender normalmente sem checkout online.'},
      {key:'profissional',title:'Profissional',price:'R$ 49,90/mês',items:['Até 2 ChatShops','Produtos ilimitados','Tudo do Básico','Domínio próprio','Checkout Mercado Pago','Pagamento confirmado na loja'],note:'Plano completo para vender e receber online.'}
    ];
    cols.innerHTML=cards.map(p=>{
      const current=p.key===plan,free=p.key==='aprendiz';
      return `<div class="plan-card ${current?'current':''}"><h3>${p.title}</h3><div class="preco">${p.price}</div><div class="lim" style="text-align:left;line-height:1.65">${p.items.map(x=>'✅ '+safe(x)).join('<br>')}</div><div style="font-size:11px;color:var(--muted);min-height:34px;margin:7px 0">${safe(p.note)}</div><button data-plano="${p.key}" ${current||free?'disabled':''}>${current?'Plano atual':(free?'Grátis':'Assinar')}</button></div>`;
    }).join('');
    cols.querySelectorAll('button[data-plano]').forEach(btn=>{
      btn.onclick=()=>{try{assinarPlano(btn.dataset.plano,btn)}catch(e){console.error(e)}};
    });
    const msg=document.getElementById('plansMsg');if(msg)msg.style.display='none';
    const modal=document.getElementById('plansModal');if(modal)modal.style.display='flex';
  }
  window.abrirPlanos=customOpen;
  try{abrirPlanos=customOpen}catch(e){}
  const b=document.getElementById('verPlanosBtn');if(b)b.onclick=customOpen;
}

function patchOpenEditor(){
  if(typeof window.openEditor!=='function'||window.openEditor.__planPolicyWrapped)return;
  const original=window.openEditor;
  function wrapped(){const r=original.apply(this,arguments);setTimeout(()=>{patchCollect();applyEditorAccess()},20);return r}
  wrapped.__planPolicyWrapped=true;
  window.openEditor=wrapped;
  try{openEditor=wrapped}catch(e){}
}

function decorateDashboard(){
  try{
    const plan=currentPlan(), c=cap(plan);
    const tag=document.getElementById('planTag');
    if(tag){
      const count=document.querySelectorAll('#storeGrid .storecard').length;
      tag.innerHTML=`Plano ${safe(c.name)} · ${count}/${c.chats} ChatShop(s) · ${plan==='profissional'?'produtos ilimitados':'até '+c.products+' produtos por ChatShop'} &nbsp; <a href="#" id="verPlanosLinkPolicy" style="color:#4c1d95;text-decoration:underline">ver planos</a>`;
      const link=document.getElementById('verPlanosLinkPolicy');if(link)link.onclick=e=>{e.preventDefault();window.abrirPlanos?.()};
    }
    if(plan==='profissional'){
      document.querySelectorAll('.storecard .metrics').forEach(m=>{
        const productBlock=[...m.children].find(x=>String(x.textContent||'').includes('Produtos'));
        if(productBlock){const b=productBlock.querySelector('b');if(b){const n=String(b.textContent||'').split('/')[0];b.textContent=n+'/∞';}}
      });
    }
  }catch(e){}
}

function patchDashboard(){
  if(typeof window.loadDashboard!=='function'||window.loadDashboard.__planPolicyWrapped)return;
  const original=window.loadDashboard;
  async function wrapped(){
    const plan=currentPlan(), c=cap(plan);
    try{myProductLimit=c.products;myChatLimit=c.chats}catch(e){}
    const r=await original.apply(this,arguments);
    setTimeout(decorateDashboard,10);
    return r;
  }
  wrapped.__planPolicyWrapped=true;
  window.loadDashboard=wrapped;
  try{loadDashboard=wrapped}catch(e){}
}

function publicStorePolicy(){
  const data=window.__CHATSHOP_STORE_DATA || window.__CHATSHOP_STORE_FEATURE_DATA;
  const plan=String(data?.planTier||'');
  if(plan!=='aprendiz')return;
  document.querySelectorAll('#pubChatToggle,#pubChatOverlay,.pub-chat-toggle,.pub-chat-overlay,.seller-audio-btn').forEach(el=>el.style.display='none');
  if(document.getElementById('freeWhatsappButton'))return;
  const phone=String(data?.whatsapp||'').replace(/\D/g,'');
  if(!phone)return;
  const a=document.createElement('a');
  a.id='freeWhatsappButton';
  a.href='https://wa.me/'+phone;
  a.target='_blank';a.rel='noopener';
  a.textContent='💬 Falar no WhatsApp';
  a.style.cssText='position:fixed;right:14px;bottom:18px;z-index:120;background:#25D366;color:#fff;text-decoration:none;border-radius:999px;padding:12px 16px;font:800 13px Arial,sans-serif;box-shadow:0 4px 16px #0004';
  document.body.appendChild(a);
}

function install(){
  patchPlanConstants();
  patchCollect();
  patchDashboard();
  patchOpenEditor();
  installPlanModal();
  applyEditorAccess();
  decorateDashboard();
  publicStorePolicy();

  const root=document.body;
  if(root && !root.dataset.planPolicyObserved){
    root.dataset.planPolicyObserved='1';
    let timer;
    new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{patchCollect();applyEditorAccess();decorateDashboard();publicStorePolicy()},80)}).observe(root,{childList:true,subtree:true});
  }

  try{
    if(window.auth && typeof auth.onAuthStateChanged==='function'){
      auth.onAuthStateChanged(user=>{if(user)setTimeout(syncLoggedUser,180)});
    }
  }catch(e){}
}

let tries=0;(function wait(){tries++;patchPlanConstants();if(document.body&&typeof window.collect==='function'){install();return}if(tries<80)setTimeout(wait,100)})();
})();
