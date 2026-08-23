/* ChatShop + SuperFrete
   - Editor: opção SuperFrete, token protegido, CEP de origem e dimensões dos produtos.
   - Loja virtual: cálculo por CEP e inclusão do frete no pedido do WhatsApp.
*/
(function(){
'use strict';

const PROJECT_ID='chatshop-97ea3';
const API_KEY='AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const COLLECTION='chatshops';
const BASE_DOMAIN='alibr.com.br';
const $=(s,r)=> (r||document).querySelector(s);
const $$=(s,r)=> [...(r||document).querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function num(v){let s=String(v??'').trim().replace(/[^0-9,.-]/g,'');if(!s)return 0;if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0}
function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function digits(v){return String(v||'').replace(/\D/g,'')}
function formatCep(v){const d=digits(v).slice(0,8);return d.length>5?d.slice(0,5)+'-'+d.slice(5):d}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

/* ========================= EDITOR ========================= */
let sfTokenCipher='';
function ensureSfOption(){
  const mode=$('#shippingMode');
  if(!mode)return false;
  if(![...mode.options].some(o=>o.value==='superfrete')){
    const o=document.createElement('option');o.value='superfrete';o.textContent='📦 SuperFrete — cálculo por CEP';mode.appendChild(o);
  }
  return true;
}
function selectedServices(){
  return $$('.sf-service:checked').map(x=>x.value).join(',')||'1,2,17,3,33';
}
function setServices(value){
  const set=new Set(String(value||'1,2,17,3,33').split(',').map(x=>x.trim()));
  $$('.sf-service').forEach(x=>x.checked=set.has(x.value));
}
function updateSfEditorVisibility(){
  const box=$('#superfreteSettings');
  if(box)box.style.display=$('#shippingMode')?.value==='superfrete'?'block':'none';
}
function ensureSfEditor(){
  if(!ensureSfOption())return false;
  if($('#superfreteSettings')){updateSfEditorVisibility();return true}
  const shipping=$('#shippingSettings');
  if(!shipping)return false;
  const box=document.createElement('div');
  box.id='superfreteSettings';
  box.style.cssText='display:none;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px;padding:12px;margin-top:10px';
  box.innerHTML=`
    <div style="font-weight:900;color:#166534;margin-bottom:9px">📦 SuperFrete</div>
    <div class="field"><label>Endereços de origem (até 4)</label><small>Cadastre a loja e os fornecedores. Em cada produto você poderá escolher de onde ele será enviado.</small></div>
    <div id="sfOrigins" style="display:grid;gap:9px">
      <div class="sf-origin-row" data-origin="1" style="border:1px solid #d1fae5;background:#fff;border-radius:10px;padding:9px">
        <b style="font-size:12px;color:#166534">Origem 1 · principal</b>
        <div class="grid2" style="margin-top:7px"><div class="field"><label>Nome / fornecedor</label><input data-origin-label="1" maxlength="50" placeholder="Ex: Minha loja"></div><div class="field"><label>CEP de origem</label><input data-origin-cep="1" inputmode="numeric" maxlength="9" placeholder="00000-000"></div></div>
      </div><div class="sf-origin-row" data-origin="2" style="border:1px solid #d1fae5;background:#fff;border-radius:10px;padding:9px">
        <b style="font-size:12px;color:#166534">Origem 2</b>
        <div class="grid2" style="margin-top:7px"><div class="field"><label>Nome / fornecedor</label><input data-origin-label="2" maxlength="50" placeholder="Ex: Fornecedor 2"></div><div class="field"><label>CEP de origem</label><input data-origin-cep="2" inputmode="numeric" maxlength="9" placeholder="00000-000"></div></div>
      </div><div class="sf-origin-row" data-origin="3" style="border:1px solid #d1fae5;background:#fff;border-radius:10px;padding:9px">
        <b style="font-size:12px;color:#166534">Origem 3</b>
        <div class="grid2" style="margin-top:7px"><div class="field"><label>Nome / fornecedor</label><input data-origin-label="3" maxlength="50" placeholder="Ex: Fornecedor 3"></div><div class="field"><label>CEP de origem</label><input data-origin-cep="3" inputmode="numeric" maxlength="9" placeholder="00000-000"></div></div>
      </div><div class="sf-origin-row" data-origin="4" style="border:1px solid #d1fae5;background:#fff;border-radius:10px;padding:9px">
        <b style="font-size:12px;color:#166534">Origem 4</b>
        <div class="grid2" style="margin-top:7px"><div class="field"><label>Nome / fornecedor</label><input data-origin-label="4" maxlength="50" placeholder="Ex: Fornecedor 4"></div><div class="field"><label>CEP de origem</label><input data-origin-cep="4" inputmode="numeric" maxlength="9" placeholder="00000-000"></div></div>
      </div>
    </div>
    <div class="field"><label>Ambiente</label><select id="sfEnvironment"><option value="production">Produção — frete real</option><option value="sandbox">Sandbox — testes</option></select></div>
    <div class="field"><label>Transportadoras / serviços</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;font-size:12px">
      <label><input class="sf-service" type="checkbox" value="1" checked> PAC</label>
      <label><input class="sf-service" type="checkbox" value="2" checked> SEDEX</label>
      <label><input class="sf-service" type="checkbox" value="17" checked> Mini Envios</label>
      <label><input class="sf-service" type="checkbox" value="3" checked> Jadlog</label>
      <label><input class="sf-service" type="checkbox" value="33" checked> J&T</label>
    </div><small>A Loggi é controlada nas configurações do token da SuperFrete.</small></div>
    <div class="field"><label>Token da SuperFrete</label><input id="sfToken" type="password" autocomplete="off" placeholder="Cole o token aqui"><small>O token não será gravado em texto aberto. Toque em “Proteger e conectar token”.</small></div>
    <button type="button" class="btn success" id="sfSaveToken" style="width:100%">🔐 Proteger e conectar token</button>
    <div id="sfTokenStatus" style="font-size:11px;margin-top:8px;color:#166534"></div>
    <div style="font-size:11px;color:#166534;line-height:1.45;margin-top:8px">Depois, informe peso e dimensões em cada produto para o cálculo funcionar.</div>`;
  shipping.appendChild(box);
  $('#shippingMode').addEventListener('change',()=>{updateSfEditorVisibility();try{window.debounce?.()}catch(e){}});
  $('#sfOrigins')?.querySelectorAll('input').forEach(el=>el.addEventListener('input',e=>{if(e.target.matches('[data-origin-cep]')){const formatted=formatCep(e.target.value);if(e.target.value!==formatted)e.target.value=formatted}refreshProductOriginOptions();try{window.debounce?.()}catch(err){}}));
  ['sfEnvironment'].forEach(id=>$('#'+id)?.addEventListener('input',()=>{try{window.debounce?.()}catch(e){}}));
  $$('.sf-service').forEach(x=>x.addEventListener('change',()=>{try{window.debounce?.()}catch(e){}}));
  $('#sfSaveToken').onclick=async()=>{
    const token=$('#sfToken').value.trim(),status=$('#sfTokenStatus'),btn=$('#sfSaveToken');
    if(!token){status.textContent='Cole primeiro o token da SuperFrete.';status.style.color='#b91c1c';return}
    btn.disabled=true;btn.textContent='Protegendo token…';status.textContent='';
    try{
      const r=await fetch('/api/superfrete-token.js',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||'Não foi possível conectar o token.');
      sfTokenCipher=j.tokenCipher||'';
      const tokenBox=$('#superfreteSettings');
      if(tokenBox)tokenBox.dataset.tokenCipher=sfTokenCipher;
      $('#sfToken').value='';
      let savedNow=false;
      /* Em uma loja já publicada, salva o token protegido imediatamente.
         Assim a vitrine não depende de um segundo clique em Publicar. */
      try{
        const knownSlug=typeof mySlug!=='undefined'?String(mySlug||'').trim():'';
        const formSlug=String($('#slug')?.value||'').trim().toLowerCase();
        const publishedSlug=knownSlug||formSlug;
        if(publishedSlug&&typeof db!=='undefined'&&db){
          const shipping=collectShippingForCore();
          const collection=typeof COLECAO!=='undefined'?COLECAO:'chatshops';
          const update={shipping};
          if(typeof firebase!=='undefined'&&firebase.firestore?.FieldValue)update.updatedAt=firebase.firestore.FieldValue.serverTimestamp();
          await db.collection(collection).doc(publishedSlug).update(update);
          savedNow=true;
        }
      }catch(saveError){
        console.warn('Token protegido; salvamento imediato será concluído ao publicar.',saveError);
      }
      status.textContent=savedNow?'✅ Token conectado, protegido e salvo nesta loja.':'✅ Token conectado e protegido. Agora publique a loja.';
      status.style.color='#166534';
      try{window.debounce?.()}catch(e){}
    }catch(e){status.textContent='⚠️ '+e.message;status.style.color='#b91c1c'}
    finally{btn.disabled=false;btn.textContent='🔐 Proteger e conectar token'}
  };
  updateSfEditorVisibility();
  return true;
}

function collectOrigins(){
  const rows=[1,2,3,4].map(n=>({
    id:'origin-'+n,
    label:String($('[data-origin-label="'+n+'"]')?.value||'').trim()||(n===1?'Origem principal':'Fornecedor '+n),
    postalCode:digits($('[data-origin-cep="'+n+'"]')?.value)
  }));
  return rows.filter((o,i)=>i===0||o.postalCode.length===8);
}
function fillOrigins(sf){
  const saved=Array.isArray(sf?.origins)?sf.origins.slice(0,4):[];
  if(!saved.length&&sf?.originPostalCode)saved.push({id:'origin-1',label:'Origem principal',postalCode:sf.originPostalCode});
  [1,2,3,4].forEach(n=>{
    const o=saved[n-1]||{};
    const label=$('[data-origin-label="'+n+'"]'),cep=$('[data-origin-cep="'+n+'"]');
    if(label)label.value=String(o.label||'');
    if(cep)cep.value=formatCep(o.postalCode||o.cep||'');
  });
  refreshProductOriginOptions();
}
function refreshProductOriginOptions(){
  const origins=collectOrigins();
  $$('[data-k="sfOriginId"]').forEach(select=>{
    const current=select.value||'origin-1';
    select.innerHTML=origins.map(o=>'<option value="'+esc(o.id)+'">'+esc(o.label)+' · '+esc(o.postalCode||'CEP não informado')+'</option>').join('');
    select.value=origins.some(o=>o.id===current)?current:'origin-1';
  });
}
function ensureProductDims(){
  $$('#products .product').forEach(card=>{
    if(card.querySelector('[data-sf-dims]'))return;
    const wrap=document.createElement('div');
    wrap.setAttribute('data-sf-dims','1');
    wrap.style.cssText='border:1px solid #d1fae5;background:#f0fdf4;border-radius:12px;padding:10px;margin:10px 0';
    wrap.innerHTML=`<div style="font-weight:900;color:#166534;font-size:13px;margin-bottom:8px">📦 Peso e dimensões para o frete</div>
      <div class="grid2"><div class="field"><label>Peso (kg)</label><input data-k="sfWeight" inputmode="decimal" placeholder="Ex: 0,300"></div><div class="field"><label>Altura (cm)</label><input data-k="sfHeight" inputmode="decimal" placeholder="Ex: 4"></div></div>
      <div class="grid2"><div class="field"><label>Largura (cm)</label><input data-k="sfWidth" inputmode="decimal" placeholder="Ex: 20"></div><div class="field"><label>Comprimento (cm)</label><input data-k="sfLength" inputmode="decimal" placeholder="Ex: 28"></div></div>
      <div class="field"><label>Enviado por / endereço de origem</label><select data-k="sfOriginId"></select><small>Escolha a loja ou o fornecedor responsável pelo envio deste produto.</small></div>
      <small style="color:#166534">Obrigatório somente quando a loja usar SuperFrete.</small>`;
    const desc=card.querySelector('.product-page-description-field');
    if(desc)desc.insertAdjacentElement('afterend',wrap);else card.appendChild(wrap);
    wrap.querySelectorAll('input,select').forEach(i=>i.addEventListener('input',()=>{try{window.debounce?.()}catch(e){}}));
    refreshProductOriginOptions();
  });
}
function fillProductDims(products){
  ensureProductDims();
  $$('#products .product').forEach((card,i)=>{
    const p=products?.[i]||{};
    const set=(k,v)=>{const el=card.querySelector(`[data-k="${k}"]`);if(el)el.value=v?String(v).replace('.',','):''};
    set('sfWeight',p.weight??p.sfWeight);set('sfHeight',p.height??p.sfHeight);set('sfWidth',p.width??p.sfWidth);set('sfLength',p.length??p.sfLength);
    const origin=card.querySelector('[data-k="sfOriginId"]');if(origin)origin.value=String(p.shippingOriginId||'origin-1');
  });
}
function collectShippingForCore(){
  ensureSfEditor();ensureProductDims();
  const origins=collectOrigins();
  return{
    mode:$('#shippingMode')?.value||'free',
    origin:String($('#shippingOrigin')?.value||'').trim(),
    ratePerKm:num($('#shippingRate')?.value),
    minimum:num($('#shippingMinimum')?.value),
    maxKm:num($('#shippingMaxKm')?.value),
    superfrete:{
      originPostalCode:origins[0]?.postalCode||'',
      origins,
      environment:$('#sfEnvironment')?.value==='sandbox'?'sandbox':'production',
      services:selectedServices(),
      tokenCipher:sfTokenCipher||$('#superfreteSettings')?.dataset.tokenCipher||''
    }
  };
}
window.ChatShopCollectShipping=collectShippingForCore;
window.ChatShopPopulateShipping=function(data){
  ensureSfEditor();ensureProductDims();
  const shipping=data?.shipping&&typeof data.shipping==='object'?data.shipping:{};
  const saved=shipping.superfrete&&typeof shipping.superfrete==='object'?shipping.superfrete:{};
  sfTokenCipher=String(saved.tokenCipher||'');
  if($('#superfreteSettings'))$('#superfreteSettings').dataset.tokenCipher=sfTokenCipher;
  if($('#shippingMode'))$('#shippingMode').value=shipping.mode||'free';
  if($('#shippingOrigin'))$('#shippingOrigin').value=String(shipping.origin||'');
  if($('#shippingRate'))$('#shippingRate').value=shipping.ratePerKm?String(shipping.ratePerKm).replace('.',','):'2,50';
  if($('#shippingMinimum'))$('#shippingMinimum').value=shipping.minimum?String(shipping.minimum).replace('.',','):'0';
  if($('#shippingMaxKm'))$('#shippingMaxKm').value=shipping.maxKm?String(shipping.maxKm).replace('.',','):'0';
  fillOrigins(saved);
  if($('#sfEnvironment'))$('#sfEnvironment').value=saved.environment==='sandbox'?'sandbox':'production';
  setServices(saved.services);
  const status=$('#sfTokenStatus');if(status)status.textContent=sfTokenCipher?'✅ Token SuperFrete já conectado. Cole outro token apenas se quiser trocar.':'';
  updateSfEditorVisibility();
  requestAnimationFrame(()=>{fillOrigins(saved);fillProductDims(Array.isArray(data?.products)?data.products:[])});
};
window.ChatShopClearShipping=function(){
  sfTokenCipher='';
  if($('#shippingMode'))$('#shippingMode').value='free';
  if($('#shippingOrigin'))$('#shippingOrigin').value='';
  if($('#shippingRate'))$('#shippingRate').value='2,50';
  if($('#shippingMinimum'))$('#shippingMinimum').value='0';
  if($('#shippingMaxKm'))$('#shippingMaxKm').value='0';
  fillOrigins({origins:[]});
  if($('#sfEnvironment'))$('#sfEnvironment').value='production';
  setServices('1,2,17,3,33');
  if($('#sfTokenStatus'))$('#sfTokenStatus').textContent='';
  updateSfEditorVisibility();
};

function wrapEditorData(){
  if(typeof window.collect==='function'&&!window.collect.__superfreteWrapped){
    const old=window.collect;
    const fn=function(){
      ensureSfEditor();ensureProductDims();
      const d=old();
      d.shipping=d.shipping&&typeof d.shipping==='object'?d.shipping:{};
      if($('#shippingMode'))d.shipping.mode=$('#shippingMode').value||d.shipping.mode||'free';
      const origins=collectOrigins();
      d.shipping.superfrete={
        originPostalCode:origins[0]?.postalCode||'',
        origins,
        environment:$('#sfEnvironment')?.value==='sandbox'?'sandbox':'production',
        services:selectedServices(),
        tokenCipher:sfTokenCipher||$('#superfreteSettings')?.dataset.tokenCipher||d.shipping?.superfrete?.tokenCipher||''
      };
      const cards=$$('#products .product');
      if(Array.isArray(d.products))d.products.forEach((p,i)=>{
        const c=cards[i];if(!c)return;
        p.weight=num(c.querySelector('[data-k="sfWeight"]')?.value);
        p.height=num(c.querySelector('[data-k="sfHeight"]')?.value);
        p.width=num(c.querySelector('[data-k="sfWidth"]')?.value);
        p.length=num(c.querySelector('[data-k="sfLength"]')?.value);
        p.shippingOriginId=String(c.querySelector('[data-k="sfOriginId"]')?.value||'origin-1');
      });
      return d;
    };
    fn.__superfreteWrapped=true;window.collect=fn;try{collect=fn}catch(e){}
  }
  if(typeof window.populateForm==='function'&&!window.populateForm.__superfreteWrapped){
    const old=window.populateForm;
    const fn=async function(data){
      const r=await old(data);ensureSfEditor();ensureProductDims();
      const sf=data?.shipping?.superfrete||{};
      sfTokenCipher=String(sf.tokenCipher||'');
      if($('#shippingMode')&&data?.shipping?.mode==='superfrete')$('#shippingMode').value='superfrete';
      fillOrigins(sf);
      if($('#sfEnvironment'))$('#sfEnvironment').value=sf.environment==='sandbox'?'sandbox':'production';
      setServices(sf.services);
      const st=$('#sfTokenStatus');if(st)st.textContent=sfTokenCipher?'✅ Token SuperFrete já conectado. Cole outro token apenas se quiser trocar.':'';
      requestAnimationFrame(()=>{fillOrigins(sf);fillProductDims(Array.isArray(data?.products)?data.products:[])});
      updateSfEditorVisibility();return r;
    };
    fn.__superfreteWrapped=true;window.populateForm=fn;try{populateForm=fn}catch(e){}
  }
  if(typeof window.clearForm==='function'&&!window.clearForm.__superfreteWrapped){
    const old=window.clearForm;
    const fn=function(){const r=old();sfTokenCipher='';setTimeout(()=>{ensureSfEditor();ensureProductDims();fillOrigins({origins:[]});if($('#sfEnvironment'))$('#sfEnvironment').value='production';setServices('1,2,17,3,33');if($('#sfTokenStatus'))$('#sfTokenStatus').textContent='';updateSfEditorVisibility()},0);return r};
    fn.__superfreteWrapped=true;window.clearForm=fn;try{clearForm=fn}catch(e){}
  }
}
async function bootEditor(){
  for(let i=0;i<60;i++){
    if($('#storeType')&&$('#products')){ensureSfEditor();ensureProductDims();wrapEditorData();const p=$('#products');if(p&&!p.__sfObs){p.__sfObs=new MutationObserver(()=>ensureProductDims());p.__sfObs.observe(p,{childList:true});}return}
    await sleep(100);
  }
}

/* ========================= LOJA PUBLICADA ========================= */
function decode(v){if(!v||typeof v!=='object')return null;if('stringValue'in v)return v.stringValue;if('booleanValue'in v)return v.booleanValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return Number(v.doubleValue);if('nullValue'in v)return null;if('arrayValue'in v)return(v.arrayValue.values||[]).map(decode);if('mapValue'in v)return decodeFields(v.mapValue.fields||{});return null}
function decodeFields(f){const o={};Object.entries(f||{}).forEach(([k,v])=>o[k]=decode(v));return o}
function deriveSlug(){const h=location.hostname.toLowerCase().replace(/\.$/,'');const s='.'+BASE_DOMAIN;if(!h.endsWith(s))return'';const slug=h.slice(0,-s.length);return slug&&!slug.includes('.')&&slug!=='www'?slug:''}
async function fetchStore(){
  const slug=deriveSlug();
  if(slug){const u=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${encodeURIComponent(slug)}?key=${API_KEY}`;const r=await fetch(u,{cache:'no-store'});if(!r.ok)return null;const j=await r.json();return decodeFields(j.fields||{})}
  const host=location.hostname.toLowerCase();const u=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;const body={structuredQuery:{from:[{collectionId:COLLECTION}],where:{fieldFilter:{field:{fieldPath:'customDomain'},op:'EQUAL',value:{stringValue:host}}},limit:1}};const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});if(!r.ok)return null;const rows=await r.json();const doc=Array.isArray(rows)?rows.find(x=>x.document)?.document:null;return doc?decodeFields(doc.fields||{}):null
}
function quoteLabel(q){return `${q.name||'Frete'} — ${money(q.price)}${q.days?` · ${q.days} dia${q.days===1?'':'s'}`:''}`}
async function bootStorefront(){
  let data=null;try{data=await fetchStore()}catch(e){return}
  if(!data||data.storeType!=='virtual'||data?.shipping?.mode!=='superfrete')return;
  const products=Array.isArray(data.products)?data.products:[];
  let cart=[],activeIndex=-1,activeColor='',selectedQuote=null,lastCep='',lastAddress='',quotes=[];
  const key=(i,c)=>i+'|'+String(c||'');
  function addShadow(i,c,q){const p=products[i];if(!p)return;const k=key(i,c),hit=cart.find(x=>x.key===k);if(hit)hit.qty+=q;else cart.push({key:k,index:i,color:c||'',qty:q,price:num(p.price)});selectedQuote=null;quotes=[]}
  function subtotal(){return cart.reduce((a,x)=>a+x.price*x.qty,0)}
  function updateTotals(){
    const freight=selectedQuote?Number(selectedQuote.price||0):0,total=subtotal()+freight;
    const f=$('#csvFreight');if(f)f.textContent=selectedQuote?money(freight):'Calcule pelo CEP';
    const t=$('#csvTotal');if(t)t.textContent=money(total);
    const vt=$('.vs-total span:last-child');if(vt)vt.textContent=money(total);
    const small=$('#sfCartTotal');if(small)small.textContent=money(total);
  }
  function cartBody(){return $('#csvCartBody')||$('#vsCartBody')}
  function renderQuoteOptions(){
    const el=$('#sfQuoteOptions');if(!el)return;
    if(!quotes.length){el.innerHTML='';return}
    el.innerHTML=quotes.map((q,i)=>`<label style="display:flex;gap:9px;align-items:flex-start;border:1px solid #d1fae5;background:#fff;border-radius:10px;padding:10px;margin-top:7px;cursor:pointer"><input type="radio" name="sfQuote" value="${i}" ${selectedQuote===q?'checked':''}><span><b>${esc(q.name||'Frete')}</b><small style="display:block;color:#64748b;margin-top:2px">${money(q.price)}${q.days?` · prazo estimado ${q.days} dia${q.days===1?'':'s'}`:''}</small></span></label>`).join('');
  }
  function enhanceCart(){
    const body=cartBody();if(!body||!cart.length)return;
    body.querySelector('.csv-delivery')?.remove();
    let box=$('#sfDeliveryBox');
    if(!box){box=document.createElement('div');box.id='sfDeliveryBox';box.style.cssText='margin-top:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px';box.innerHTML=`<b style="color:#166534">📦 Calcular frete com SuperFrete</b><label style="display:block;font-size:12px;font-weight:900;margin:10px 0 5px">CEP de entrega</label><input id="sfDestCep" inputmode="numeric" maxlength="9" placeholder="00000-000" style="width:100%;border:1px solid #cbd5e1;border-radius:9px;padding:10px;font:inherit"><button id="sfCalcBtn" type="button" style="width:100%;border:0;background:#166534;color:#fff;border-radius:9px;padding:10px;margin-top:8px;font-weight:900">Calcular frete</button><div id="sfCalcStatus" style="font-size:12px;margin-top:8px"></div><div id="sfQuoteOptions"></div><label style="display:block;font-size:12px;font-weight:900;margin:10px 0 5px">Endereço completo de entrega</label><input id="sfAddress" placeholder="Rua, número, bairro, cidade - UF" style="width:100%;border:1px solid #cbd5e1;border-radius:9px;padding:10px;font:inherit"><div style="display:flex;justify-content:space-between;margin-top:10px;font-size:13px"><span>Total com frete</span><b id="sfCartTotal">${money(subtotal())}</b></div>`;
      const anchor=body.querySelector('.csv-summary')||body.querySelector('.vs-total')||body.querySelector('#csvCheckout')||body.querySelector('#vsCheckout');if(anchor)anchor.insertAdjacentElement('beforebegin',box);else body.appendChild(box);
      $('#sfDestCep').value=formatCep(lastCep);$('#sfAddress').value=lastAddress;
      $('#sfDestCep').addEventListener('input',e=>{lastCep=formatCep(e.target.value);if(e.target.value!==lastCep)e.target.value=lastCep;selectedQuote=null;updateTotals()});
      $('#sfAddress').addEventListener('input',e=>lastAddress=e.target.value);
      $('#sfCalcBtn').onclick=async()=>{
        const cep=digits($('#sfDestCep')?.value||lastCep),status=$('#sfCalcStatus'),btn=$('#sfCalcBtn');lastCep=formatCep(cep);if($('#sfDestCep'))$('#sfDestCep').value=lastCep;
        if(cep.length!==8){status.textContent='Digite um CEP válido com 8 números.';status.style.color='#b91c1c';return}
        btn.disabled=true;btn.textContent='Calculando…';status.textContent='';selectedQuote=null;quotes=[];renderQuoteOptions();updateTotals();
        const controller=new AbortController(),timeoutId=setTimeout(()=>controller.abort(),18000);
        try{
          const items=cart.map(x=>({index:x.index,quantity:x.qty}));
          const r=await fetch('/api/superfrete-quote.js',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({storeSlug:deriveSlug(),host:location.hostname,toPostalCode:cep,destinationPostalCode:cep,items}),signal:controller.signal});
          const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Não foi possível calcular o frete.');
          quotes=(j.quotes||[]).filter(x=>Number(x.price)>0);if(!quotes.length)throw new Error('Nenhuma modalidade de frete ficou disponível para este CEP.');
          status.textContent=(Number(j.packageCount||1)>1?'Seu pedido será enviado em '+j.packageCount+' pacotes, saindo de endereços diferentes. ':'')+'Escolha uma opção abaixo:';status.style.color='#166534';renderQuoteOptions();
        }catch(e){status.textContent='⚠️ '+(e?.name==='AbortError'?'A SuperFrete demorou para responder. Tente calcular novamente em alguns instantes.':e.message);status.style.color='#b91c1c'}finally{clearTimeout(timeoutId);btn.disabled=false;btn.textContent='Calcular frete'}
      };
      $('#sfQuoteOptions').addEventListener('change',e=>{const i=Number(e.target.value);if(Number.isInteger(i)&&quotes[i]){selectedQuote=quotes[i];updateTotals()}});
    }else{if($('#sfDestCep'))$('#sfDestCep').value=formatCep(lastCep);if($('#sfAddress'))$('#sfAddress').value=lastAddress;renderQuoteOptions()}
    updateTotals();
  }
  function checkout(){
    const status=$('#sfCalcStatus');lastAddress=$('#sfAddress')?.value.trim()||lastAddress;
    if(!selectedQuote){if(status){status.textContent='Escolha uma opção de frete antes de finalizar.';status.style.color='#b91c1c'}return}
    if(!lastAddress){if(status){status.textContent='Digite o endereço completo de entrega.';status.style.color='#b91c1c'}return}
    const phone=digits(data.whatsapp);if(!phone){alert('A loja ainda não cadastrou um WhatsApp.');return}
    const sub=subtotal(),freight=Number(selectedQuote.price||0),total=sub+freight;
    const lines=['Olá! Quero fazer este pedido:',''];
    cart.forEach(x=>{const p=products[x.index]||{},v=x.price*x.qty;lines.push('• '+(p.name||'Produto')+(x.color?' | Cor: '+x.color:'')+' | Qtd: '+x.qty+' | '+money(v))});
    lines.push('','Subtotal: '+money(sub),'Frete: '+quoteLabel(selectedQuote),'Total: '+money(total),'','CEP: '+digits(lastCep),'Endereço: '+lastAddress);
    window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(lines.join('\n')),'_blank','noopener');
  }
  document.addEventListener('click',e=>{
    const open=e.target.closest('#csvGrid [data-product],#vsGrid [data-product]');if(open){activeIndex=Number(open.dataset.product);activeColor='';return}
    const col=e.target.closest('.csv-color,.vs-color');if(col){activeColor=col.dataset.color||'';return}
    if(e.target.closest('#csvAdd,#vsAdd')){const q=Math.max(1,Number($('#csvQty')?.textContent||$('#vsQty')?.textContent||1));if(activeIndex>=0)addShadow(activeIndex,activeColor,q);setTimeout(enhanceCart,20);return}
    const rem=e.target.closest('[data-remove]');if(rem&&cartBody()?.contains(rem)){const i=Number(rem.dataset.remove);if(Number.isInteger(i)){cart.splice(i,1);selectedQuote=null;quotes=[];setTimeout(enhanceCart,20)}return}
    if(e.target.closest('#csvBag,#vsBag')){setTimeout(enhanceCart,20);setTimeout(enhanceCart,100);return}
    if(e.target.closest('#csvCheckout,#vsCheckout')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();checkout();return}
  },true);
  const root=$('#storefrontScreen')||document.body;const obs=new MutationObserver(()=>{if(cartBody())requestAnimationFrame(enhanceCart)});obs.observe(root,{childList:true,subtree:true});
}

bootEditor();
bootStorefront();
})();
