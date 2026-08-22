/* ChatShop — regras de acesso dos planos
   Grátis e Básico focados em afiliados.
   Profissional e Loja Virtual ficam ocultos do público, mas podem ser liberados pelo admin.
*/
(function(){
'use strict';

const INTERNAL_UNLIMITED=1000000;
const POLICY={
  aprendiz:{name:'Grátis',price:'Grátis',products:10,chats:1,features:{catalog:true,whatsapp:true,virtual:false,chat:true,shipping:false,coupons:false,customDomain:false,mercadoPago:false}},
  basico:{name:'Básico',price:'R$ 18,00/mês',products:30,chats:1,features:{catalog:true,whatsapp:true,virtual:false,chat:true,shipping:false,coupons:false,customDomain:false,mercadoPago:false}},
  profissional:{name:'Profissional',price:'R$ 49,90/mês',products:INTERNAL_UNLIMITED,chats:2,features:{catalog:true,whatsapp:true,virtual:true,chat:true,shipping:true,coupons:true,customDomain:true,mercadoPago:true}}
};

function adminMode(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function normalizePlan(v){const s=String(v||'aprendiz').toLowerCase();if(s.includes('prof')||s==='pro'||s.includes('premium'))return'profissional';if(s.includes('bas'))return'basico';return'aprendiz'}
function currentPlan(){try{if(adminMode())return'profissional';return normalizePlan((typeof myPlan!=='undefined'&&myPlan)||'aprendiz')}catch(e){return'aprendiz'}}
function cap(plan){return POLICY[normalizePlan(plan)]||POLICY.aprendiz}
function isFree(){return currentPlan()==='aprendiz'}
function manualVirtualAccess(){try{return window.__CHATSHOP_VIRTUAL_STORE_ACCESS===true}catch(e){return false}}
function canUseVirtual(){const c=cap(currentPlan());return adminMode()||c.features.virtual||manualVirtualAccess()}
function canUseShipping(){const c=cap(currentPlan());return canUseVirtual()&&(adminMode()||c.features.shipping||manualVirtualAccess())}
function canUseCustomDomain(){const c=cap(currentPlan());return adminMode()||c.features.customDomain}
function canUseMercadoPago(){const c=cap(currentPlan());return adminMode()||c.features.mercadoPago}
function safe(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function patchPlanConstants(){
  try{
    if(typeof PLANOS==='undefined')return;
    PLANOS.aprendiz.nome='Grátis';PLANOS.aprendiz.preco=0;PLANOS.aprendiz.precoTexto='Grátis';PLANOS.aprendiz.limiteProdutos=10;PLANOS.aprendiz.limiteChats=1;
    PLANOS.basico.nome='Básico';PLANOS.basico.preco=18;PLANOS.basico.precoTexto='R$ 18,00/mês';PLANOS.basico.limiteProdutos=30;PLANOS.basico.limiteChats=1;
    PLANOS.profissional.nome='Profissional';PLANOS.profissional.preco=49.90;PLANOS.profissional.precoTexto='R$ 49,90/mês';PLANOS.profissional.limiteProdutos=INTERNAL_UNLIMITED;PLANOS.profissional.limiteChats=2;
  }catch(e){console.warn('Não consegui atualizar PLANOS',e)}
}

async function syncLoggedUser(){
  try{
    if(typeof db==='undefined'||!db||typeof myUid==='undefined'||!myUid)return;
    const ref=db.collection('users').doc(myUid),snap=await ref.get(),u=snap.exists?(snap.data()||{}):{};
    const plan=adminMode()?'profissional':normalizePlan(u.plan||u.plano||currentPlan());
    const c=cap(plan);
    try{myPlan=plan;myProductLimit=c.products;myChatLimit=c.chats}catch(e){}
    window.__CHATSHOP_VIRTUAL_STORE_ACCESS=adminMode()||u.virtualStoreAccess===true||c.features.virtual;
    await ref.set({productLimit:c.products,chatLimit:c.chats,planPolicyVersion:'2026-08-21-restore-full-virtual-shipping'},{merge:true});
    try{
      const stores=await db.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').where('ownerUid','==',myUid).get();
      const features={...c.features};
      if(window.__CHATSHOP_VIRTUAL_STORE_ACCESS){features.virtual=true;features.shipping=true}
      await Promise.all(stores.docs.map(d=>d.ref.set({planTier:plan,planFeatures:features},{merge:true})));
    }catch(e){console.warn('Não consegui atualizar o plano nas lojas',e)}
    setTimeout(applyEditorAccess,50);
    if(typeof loadDashboard==='function')try{await loadDashboard()}catch(e){}
  }catch(e){console.warn('Sincronização dos limites do plano falhou',e)}
}

function hideClosestFieldByText(text){const wanted=String(text).toLowerCase();document.querySelectorAll('#editorView .field').forEach(f=>{if(String(f.textContent||'').toLowerCase().includes(wanted))f.style.display='none'})}
function showClosestFieldByText(text){const wanted=String(text).toLowerCase();document.querySelectorAll('#editorView .field').forEach(f=>{if(String(f.textContent||'').toLowerCase().includes(wanted))f.style.display=''})}
function sectionByHeading(text){const wanted=String(text).toLowerCase();return[...document.querySelectorAll('#editorView .section')].find(s=>String(s.querySelector('h2')?.textContent||'').toLowerCase().includes(wanted))}

/* Restaura a estrutura original do frete se a regra de ocultação deixou apenas o título. */
function ensureFullVirtualShipping(){
  const type=document.getElementById('storeType');
  if(!type||type.value!=='virtual'||!canUseShipping())return;
  let box=document.getElementById('shippingSettings');
  const typeField=type.closest('.field');
  if(!box&&typeField){
    box=document.createElement('div');box.id='shippingSettings';box.className='field';
    box.style.cssText='border:1px solid #bae6fd;background:#f0f9ff;border-radius:12px;padding:12px;margin:10px 0 14px';
    typeField.insertAdjacentElement('afterend',box);
  }
  if(!box)return;
  box.style.display='block';
  if(!document.getElementById('shippingMode')){
    box.innerHTML=`<label style="font-size:14px">🚚 Configuração de entrega</label>
      <div class="field" style="margin-top:8px"><label>Tipo de frete</label>
        <select id="shippingMode">
          <option value="free">🎁 Frete grátis</option>
          <option value="per_km">📍 Frete por km</option>
          <option value="superfrete">📦 SuperFrete — cálculo por CEP</option>
        </select>
        <small>Escolha como o frete será calculado na Loja Virtual.</small>
      </div>
      <div id="shippingKmFields" style="display:none">
        <div class="field"><label>Endereço de saída / origem da loja</label><input id="shippingOrigin" placeholder="Ex: Rua Exemplo, 100 - São Paulo - SP"></div>
        <div class="grid2"><div class="field"><label>Valor por km (R$)</label><input id="shippingRate" inputmode="decimal" value="2,50"></div><div class="field"><label>Frete mínimo (R$)</label><input id="shippingMinimum" inputmode="decimal" value="0"></div></div>
        <div class="field"><label>Distância máxima (km)</label><input id="shippingMaxKm" inputmode="decimal" value="0"></div>
      </div>`;
    const mode=document.getElementById('shippingMode');
    const km=document.getElementById('shippingKmFields');
    const update=()=>{if(km)km.style.display=mode?.value==='per_km'?'block':'none';try{window.debounce?.()}catch(e){}};
    mode?.addEventListener('change',update);update();
    if(!document.getElementById('chatshop-superfrete-reload')){
      const s=document.createElement('script');s.id='chatshop-superfrete-reload';s.src='/superfrete-upgrade.js?v=20260821-restore';document.head.appendChild(s);
    }
  }
}

function applyEditorAccess(){
  const plan=currentPlan(),c=cap(plan),allowVirtual=canUseVirtual();
  try{myProductLimit=c.products;myChatLimit=c.chats}catch(e){}
  const type=document.getElementById('storeType');
  if(type){
    const virtualOpt=[...type.options].find(o=>o.value==='virtual');
    if(virtualOpt){virtualOpt.disabled=!allowVirtual;virtualOpt.hidden=!allowVirtual}
    if(!allowVirtual&&type.value==='virtual'){type.value='affiliate';try{type.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}}
    const typeField=type.closest('.field');if(typeField)typeField.style.display=allowVirtual?'':'none';
  }
  const isVirtual=type?.value==='virtual';
  if(isVirtual&&canUseShipping())ensureFullVirtualShipping();
  const shipping=document.getElementById('shippingSettings');
  if(shipping)shipping.style.display=canUseShipping()&&isVirtual?'block':'none';
  const custom=document.getElementById('customDomainField');
  const locked=document.getElementById('customDomainLocked');
  if(custom)custom.style.display=canUseCustomDomain()?'block':'none';
  if(locked)locked.style.display=canUseCustomDomain()?'none':'block';
  const qna=sectionByHeading('perguntas e respostas');if(qna)qna.style.display=c.features.chat?'':'none';
  document.querySelectorAll('.seller-audio-editor').forEach(x=>x.style.display=c.features.chat?'':'none');
  document.querySelectorAll('#products .prod-qna-list,#products .add-prod-qna').forEach(x=>x.style.display=c.features.chat?'':'none');
  if(isFree()){hideClosestFieldByText('mensagem inicial');hideClosestFieldByText('vídeo de destaque')}else{showClosestFieldByText('mensagem inicial');showClosestFieldByText('vídeo de destaque')}
  const banner=document.getElementById('limitBanner');if(banner&&plan==='profissional')banner.style.display='none';
}

function patchCollect(){
  if(typeof window.collect!=='function'||window.collect.__planPolicyWrapped)return;
  const original=window.collect;
  function wrapped(){
    const d=original.apply(this,arguments)||{};
    const plan=currentPlan(),c=cap(plan),allowVirtual=canUseVirtual(),allowShipping=canUseShipping();
    const type=document.getElementById('storeType');
    d.planTier=plan;
    d.planFeatures={...c.features,virtual:allowVirtual,shipping:allowShipping};
    if(allowVirtual&&type?.value==='virtual')d.storeType='virtual';
    else if(!allowVirtual)d.storeType='affiliate';
    if(!c.features.chat){d.qna=[];(d.products||[]).forEach(p=>{p.qna=[];p.sellerAudioMode='off';p.sellerAudioText='';p.sellerAudioUrl=''})}
    if(!allowShipping)d.shipping={mode:'none'};
    if(!canUseCustomDomain())d.customDomain='';
    d.checkoutMode=canUseMercadoPago()?'mercadopago_or_whatsapp':'whatsapp';
    return d;
  }
  wrapped.__planPolicyWrapped=true;
  window.collect=wrapped;try{collect=wrapped}catch(e){}
}

function installAprendizImageUploadLock(){
  if(document.documentElement.dataset.aprendizImageUploadLock==='1')return;
  document.documentElement.dataset.aprendizImageUploadLock='1';
  document.addEventListener('click',function(e){
    if(!isFree())return;const t=e.target;if(!t?.closest?.('#editorView'))return;
    const file=t.closest('input[type="file"]'),tab=t.closest('.tab'),box=t.closest('.upload-box');
    const hit=(file&&file.closest('.product'))||(box&&box.closest('.product'))||(tab&&tab.closest('.product')&&/upload|enviar imagem|galeria|dispositivo/i.test(String(tab.textContent||'')));
    if(!hit)return;e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
    try{toast('Upload de imagem disponível a partir do plano Básico.')}catch(err){}
    try{window.abrirPlanos?.()}catch(err){}
  },true);
}

function installPlanModal(){
  if(typeof window.abrirPlanos!=='function')return;
  function customOpen(){
    const cols=document.getElementById('plansCols');if(!cols)return;const plan=currentPlan();
    const cards=[
      {key:'aprendiz',title:'Grátis',price:'R$ 0',items:['1 ChatShop para afiliado','Até 10 produtos','Catálogo público','Chat vendedor','Link de afiliado por produto']},
      {key:'basico',title:'Básico',price:'R$ 18/mês',items:['1 ChatShop para afiliado','Até 30 produtos','Chat vendedor','Upload de imagens','Catálogo e produto em destaque','Link de afiliado por produto']}
    ];
    if(adminMode())cards.push({key:'profissional',title:'Profissional',price:'R$ 49,90/mês',items:['Até 2 ChatShops','Produtos ilimitados','Loja virtual','Frete','Domínio próprio','Checkout Mercado Pago']});
    cols.innerHTML=cards.map(p=>{const current=p.key===plan,free=p.key==='aprendiz';return`<div class="plan-card ${current?'current':''}"><h3>${p.title}</h3><div class="preco">${p.price}</div><div class="lim" style="text-align:left;line-height:1.65">${p.items.map(x=>'✅ '+safe(x)).join('<br>')}</div><button data-plano="${p.key}" ${current||free?'disabled':''}>${current?'Plano atual':(free?'Grátis':'Assinar')}</button></div>`}).join('');
    cols.querySelectorAll('button[data-plano]').forEach(btn=>btn.onclick=()=>{try{assinarPlano(btn.dataset.plano,btn)}catch(e){}});
    const modal=document.getElementById('plansModal');if(modal)modal.style.display='flex';
  }
  window.abrirPlanos=customOpen;try{abrirPlanos=customOpen}catch(e){}
  const b=document.getElementById('verPlanosBtn');if(b)b.onclick=customOpen;
}

function patchOpenEditor(){
  if(typeof window.openEditor!=='function'||window.openEditor.__planPolicyWrapped)return;
  const original=window.openEditor;
  function wrapped(){const r=original.apply(this,arguments);setTimeout(()=>{patchCollect();applyEditorAccess()},30);return r}
  wrapped.__planPolicyWrapped=true;window.openEditor=wrapped;try{openEditor=wrapped}catch(e){}
}

function decorateDashboard(){
  try{
    const plan=currentPlan(),c=cap(plan),tag=document.getElementById('planTag');
    if(tag){const count=document.querySelectorAll('#storeGrid .storecard').length;tag.innerHTML=`Plano ${safe(c.name)} · ${count}/${c.chats} ChatShop(s) · ${plan==='profissional'?'produtos ilimitados':'até '+c.products+' produtos por ChatShop'} &nbsp; <a href="#" id="verPlanosLinkPolicy" style="color:#4c1d95;text-decoration:underline">ver planos</a>`;const link=document.getElementById('verPlanosLinkPolicy');if(link)link.onclick=e=>{e.preventDefault();window.abrirPlanos?.()}}
  }catch(e){}
}
function patchDashboard(){if(typeof window.loadDashboard!=='function'||window.loadDashboard.__planPolicyWrapped)return;const original=window.loadDashboard;async function wrapped(){const c=cap(currentPlan());try{myProductLimit=c.products;myChatLimit=c.chats}catch(e){}const r=await original.apply(this,arguments);setTimeout(decorateDashboard,10);return r}wrapped.__planPolicyWrapped=true;window.loadDashboard=wrapped;try{loadDashboard=wrapped}catch(e){}}
function publicStorePolicy(){document.getElementById('freeWhatsappButton')?.remove()}

function install(){
  patchPlanConstants();patchCollect();patchDashboard();patchOpenEditor();installPlanModal();installAprendizImageUploadLock();applyEditorAccess();decorateDashboard();publicStorePolicy();
  document.addEventListener('change',e=>{if(e.target?.id==='storeType')setTimeout(applyEditorAccess,0)},true);
  const root=document.body;
  if(root&&!root.dataset.planPolicyObserved){root.dataset.planPolicyObserved='1';let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{patchCollect();applyEditorAccess();decorateDashboard();publicStorePolicy()},100)}).observe(root,{childList:true,subtree:true})}
  try{if(window.auth&&typeof auth.onAuthStateChanged==='function')auth.onAuthStateChanged(user=>{if(user)setTimeout(syncLoggedUser,180)})}catch(e){}
}

let tries=0;(function wait(){tries++;patchPlanConstants();if(document.body&&typeof window.collect==='function'){install();return}if(tries<80)setTimeout(wait,100)})();
})();