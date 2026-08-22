/* ChatShop — acesso + restauração dos controles originais da Loja Virtual.
   Mantém a Loja Virtual oculta para quem não tem acesso, mas quando liberada
   restaura formato da loja, frete e SuperFrete no editor.
*/
(function(){
'use strict';

const POLICY={
  aprendiz:{products:10,chats:1,virtual:false},
  basico:{products:30,chats:1,virtual:false},
  profissional:{products:1000000,chats:2,virtual:true}
};
const $=(s,r)=>(r||document).querySelector(s);

function adminMode(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function normalizePlan(v){const s=String(v||'aprendiz').toLowerCase();if(s.includes('prof')||s==='pro'||s.includes('premium'))return'profissional';if(s.includes('bas'))return'basico';return'aprendiz'}
function currentPlan(){try{return adminMode()?'profissional':normalizePlan((typeof myPlan!=='undefined'&&myPlan)||'aprendiz')}catch(e){return'aprendiz'}}
function manualVirtualAccess(){try{return window.__CHATSHOP_VIRTUAL_STORE_ACCESS===true}catch(e){return false}}
function canUseVirtual(){return adminMode()||(POLICY[currentPlan()]||POLICY.aprendiz).virtual||manualVirtualAccess()}

function loadScript(src,id){
  const old=document.getElementById(id);if(old)old.remove();
  const s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.head.appendChild(s);
}

function modeValue(){return $('input[name="virtualStoreFormatRecovery"]:checked')?.value||'catalog'}
function syncUnderlyingFormat(value){
  const v=value||modeValue();
  const home=v==='grid'?'grid':'single';
  const display=v==='single'?'single':'catalog';
  document.querySelectorAll('input[name="homeLayout"]').forEach(r=>r.checked=r.value===home);
  document.querySelectorAll('input[name="virtualDisplayMode"]').forEach(r=>r.checked=r.value===display);
}
function setRecoveryModeFromData(data){
  let value='catalog';
  if(data?.homeLayout==='grid')value='grid';
  else if(data?.virtualDisplayMode==='single')value='single';
  const r=$('input[name="virtualStoreFormatRecovery"][value="'+value+'"]');if(r)r.checked=true;
  syncUnderlyingFormat(value);
}

function ensureFormatControls(){
  const type=$('#storeType');if(!type||!canUseVirtual())return;
  let box=$('#virtualStoreFormatRecovery');
  if(!box){
    box=document.createElement('div');box.id='virtualStoreFormatRecovery';box.className='field';
    box.style.cssText='margin:10px 0 14px;padding:12px;border:1px solid #ddd6fe;background:#faf5ff;border-radius:12px';
    box.innerHTML=`<label style="font-size:14px;font-weight:900;color:#4c1d95">📱 Formato da Loja Virtual</label>
      <div style="display:grid;gap:8px;margin-top:8px">
        <label style="display:flex;gap:9px;align-items:flex-start;background:#fff;border:1px solid #ddd6fe;border-radius:10px;padding:10px"><input type="radio" name="virtualStoreFormatRecovery" value="catalog" checked><span><b>Catálogo completo</b><small style="display:block;color:#6b7280">Formato normal da loja com todos os produtos.</small></span></label>
        <label style="display:flex;gap:9px;align-items:flex-start;background:#fff;border:1px solid #ddd6fe;border-radius:10px;padding:10px"><input type="radio" name="virtualStoreFormatRecovery" value="single"><span><b>1 produto por página</b><small style="display:block;color:#6b7280">Um produto em destaque por vez.</small></span></label>
        <label style="display:flex;gap:9px;align-items:flex-start;background:#fff;border:1px solid #ddd6fe;border-radius:10px;padding:10px"><input type="radio" name="virtualStoreFormatRecovery" value="grid"><span><b>Grade de 2 produtos</b><small style="display:block;color:#6b7280">Dois produtos lado a lado.</small></span></label>
      </div>`;
    type.closest('.field')?.insertAdjacentElement('afterend',box);
    box.addEventListener('change',e=>{if(e.target?.name==='virtualStoreFormatRecovery'){syncUnderlyingFormat(e.target.value);try{window.debounce?.()}catch(err){}}});
  }
  box.style.display=type.value==='virtual'?'block':'none';
}

function ensureShippingBase(){
  const type=$('#storeType');if(!type||type.value!=='virtual'||!canUseVirtual())return false;
  let box=$('#shippingSettings');
  if(!box){box=document.createElement('div');box.id='shippingSettings';box.className='field';type.closest('.field')?.insertAdjacentElement('afterend',box)}
  if(!box)return false;
  box.style.cssText='display:block;border:1px solid #bae6fd;background:#f0f9ff;border-radius:12px;padding:12px;margin:10px 0 14px';
  if(!$('#shippingMode')){
    box.innerHTML=`<label style="font-size:14px;font-weight:900">🚚 Configuração de entrega</label>
      <div class="field" style="margin-top:8px"><label>Tipo de frete</label>
        <select id="shippingMode"><option value="free">🎁 Frete grátis</option><option value="per_km">📍 Frete por km</option><option value="superfrete">📦 SuperFrete — cálculo por CEP</option></select>
        <small>Escolha como o frete será calculado na Loja Virtual.</small>
      </div>
      <div id="shippingKmFields" style="display:none">
        <div class="field"><label>Endereço de saída / origem da loja</label><input id="shippingOrigin" placeholder="Ex: Rua Exemplo, 100 - São Paulo - SP"></div>
        <div class="grid2"><div class="field"><label>Valor por km (R$)</label><input id="shippingRate" inputmode="decimal" value="2,50"></div><div class="field"><label>Frete mínimo (R$)</label><input id="shippingMinimum" inputmode="decimal" value="0"></div></div>
        <div class="field"><label>Distância máxima (km)</label><input id="shippingMaxKm" inputmode="decimal" value="0"></div>
      </div>`;
    const updateKm=()=>{const km=$('#shippingKmFields');if(km)km.style.display=$('#shippingMode')?.value==='per_km'?'block':'none';try{window.debounce?.()}catch(e){}};
    $('#shippingMode')?.addEventListener('change',updateKm);updateKm();
  }
  return true;
}

function reloadOriginalVirtualModules(){
  if(!canUseVirtual())return;
  ensureFormatControls();
  if(ensureShippingBase()){
    if(!window.__chatshopSfRecoveryLoaded){window.__chatshopSfRecoveryLoaded=true;loadScript('/superfrete-upgrade.js?v=20260821-editor-recovery','chatshop-superfrete-editor-recovery')}
  }
  if(!window.__chatshopLayoutRecoveryLoaded){
    window.__chatshopLayoutRecoveryLoaded=true;
    loadScript('/store-layout-upgrade.js?v=20260821-editor-recovery','chatshop-layout-editor-recovery');
    loadScript('/virtual-single-product-mode.js?v=20260821-editor-recovery','chatshop-single-editor-recovery');
  }
}

function patchCollectOnce(){
  if(typeof window.collect!=='function'||window.collect.__virtualRecoveryWrapped)return;
  const original=window.collect;
  function wrapped(){
    const d=original.apply(this,arguments)||{};
    const m=modeValue();
    d.homeLayout=m==='grid'?'grid':'single';
    d.virtualDisplayMode=m==='single'?'single':'catalog';
    if($('#storeType')?.value==='virtual'&&typeof window.ChatShopCollectShipping==='function'){
      try{d.shipping=window.ChatShopCollectShipping()}catch(e){console.warn('shipping collect recovery',e)}
    }
    return d;
  }
  wrapped.__virtualRecoveryWrapped=true;window.collect=wrapped;try{collect=wrapped}catch(e){}
}
function patchPopulateOnce(){
  if(typeof window.populateForm!=='function'||window.populateForm.__virtualRecoveryWrapped)return;
  const original=window.populateForm;
  async function wrapped(data){const r=await original.apply(this,arguments);setTimeout(()=>{setRecoveryModeFromData(data||{});if(typeof window.ChatShopPopulateShipping==='function')try{window.ChatShopPopulateShipping(data||{})}catch(e){}},40);return r}
  wrapped.__virtualRecoveryWrapped=true;window.populateForm=wrapped;try{populateForm=wrapped}catch(e){}
}

function applyAccess(){
  const cap=POLICY[currentPlan()]||POLICY.aprendiz;try{myProductLimit=cap.products;myChatLimit=cap.chats}catch(e){}
  const type=$('#storeType'),allow=canUseVirtual();
  if(type){const opt=[...type.options].find(o=>o.value==='virtual');if(opt){opt.hidden=!allow;opt.disabled=!allow}if(!allow&&type.value==='virtual'){type.value='affiliate';try{type.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}}}
  if(allow){reloadOriginalVirtualModules();patchCollectOnce();patchPopulateOnce()}
  const format=$('#virtualStoreFormatRecovery');if(format&&type)format.style.display=type.value==='virtual'?'block':'none';
  const ship=$('#shippingSettings');if(ship&&type)ship.style.display=allow&&type.value==='virtual'?'block':'none';
}

async function syncLoggedUser(){
  try{if(typeof db==='undefined'||!db||typeof myUid==='undefined'||!myUid)return;const snap=await db.collection('users').doc(myUid).get();const u=snap.exists?(snap.data()||{}):{};const plan=adminMode()?'profissional':normalizePlan(u.plan||u.plano||currentPlan());try{myPlan=plan;myProductLimit=POLICY[plan].products;myChatLimit=POLICY[plan].chats}catch(e){}window.__CHATSHOP_VIRTUAL_STORE_ACCESS=adminMode()||u.virtualStoreAccess===true||POLICY[plan].virtual;setTimeout(applyAccess,50)}catch(e){console.warn('Falha ao sincronizar Loja Virtual',e)}
}

function install(){
  applyAccess();
  document.addEventListener('change',e=>{if(e.target?.id==='storeType')setTimeout(applyAccess,20)},true);
  try{if(window.auth&&typeof auth.onAuthStateChanged==='function')auth.onAuthStateChanged(user=>{if(user)setTimeout(syncLoggedUser,100)})}catch(e){}
  let tries=0;const t=setInterval(()=>{tries++;applyAccess();if($('#storeType')&&$('#virtualStoreFormatRecovery')&&($('#shippingMode')||$('#storeType')?.value!=='virtual')){if(tries>15)clearInterval(t)}if(tries>80)clearInterval(t)},150);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
