/* ChatShop Loja Virtual — corrige forma de pagamento publicada e descrição do produto. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
let cfg=null,loading=false;

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function host(){return location.hostname.toLowerCase()}
async function loadConfig(){
  if(cfg||loading)return cfg;loading=true;
  try{
    const r=await fetch('/api/mercadopago/public-config?host='+encodeURIComponent(host()),{cache:'no-store'});
    const j=await r.json();if(r.ok&&j?.ok)cfg=j;
  }catch(e){console.warn('ChatShop payment config:',e)}finally{loading=false}
  return cfg;
}
function productDesc(name){
  const p=(cfg?.products||[]).find(x=>String(x?.name||'').trim()===String(name||'').trim());
  return String(p?.description||'').trim();
}
function installStyle(){
  if($('#csvPaymentFixStyle'))return;
  const s=document.createElement('style');s.id='csvPaymentFixStyle';s.textContent=`
  .csv-mp-btn{width:100%;border:0;background:#009ee3;color:#fff;padding:13px;border-radius:12px;font-weight:900;font-size:15px;margin-top:10px;cursor:pointer}.csv-mp-btn:disabled{opacity:.55;cursor:not-allowed}.csv-pay-note{font-size:11px;color:#64748b;text-align:center;margin-top:6px}.csv-pay-actions{display:grid;gap:8px;margin-top:10px}.csv-pay-actions .csv-checkout,.csv-pay-actions .csv-mp-btn{margin-top:0}.vcd-description{margin:8px 0 12px!important;padding:11px 12px!important;background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:11px!important;color:#334155!important;line-height:1.45!important;font-size:14px!important;white-space:pre-wrap!important;max-height:none!important;overflow:visible!important}.vcd-description-title{font-weight:900;color:#111827;margin-bottom:5px}@media(max-width:520px){.csv-mainimg{max-height:48vh!important;object-fit:contain!important}.csv-sheet{max-height:96dvh!important}.vcd-description{font-size:13px!important}}
  `;document.head.appendChild(s);
}
function fixDescription(){
  const body=$('#csvProductBody');if(!body)return;
  const name=$('.csv-dname',body)?.textContent?.trim();const price=$('.csv-dprice',body);if(!name||!price)return;
  let box=$('.vcd-description',body);const text=productDesc(name);
  if(!box&&text){box=document.createElement('section');box.className='vcd-description';box.innerHTML='<div class="vcd-description-title">📝 Descrição do produto</div>'+esc(text).replace(/\n/g,'<br>')}
  if(box){
    if(!box.querySelector('.vcd-description-title')&&text)box.innerHTML='<div class="vcd-description-title">📝 Descrição do produto</div>'+esc(text).replace(/\n/g,'<br>');
    if(price.nextElementSibling!==box)price.insertAdjacentElement('afterend',box);
  }
}
function cartItems(){
  return $$('.csv-item').map(row=>{
    const name=$('b',row)?.textContent?.trim()||'';const detail=$('small',row)?.textContent||'';
    const q=detail.match(/Qtd:\s*(\d+)/i);const c=detail.match(/Cor:\s*([^·]+?)(?:\s*·|$)/i);
    return {name,qty:q?Number(q[1]):1,color:c?c[1].trim():''};
  }).filter(x=>x.name);
}
async function payMercadoPago(btn){
  const address=$('#sfAddress')?.value?.trim()||$('#csvAddress')?.value?.trim()||'';const km=$('#csvKm')?.value||'';const err=$('#sfCalcStatus')||$('#csvShipError');
  if(!address){if(err){err.style.display='block';err.textContent='Digite o endereço de entrega antes de pagar.'}else alert('Digite o endereço de entrega.');return}
  const items=cartItems();if(!items.length){alert('Sua sacola está vazia.');return}
  const old=btn.textContent;btn.disabled=true;btn.textContent='Abrindo Mercado Pago...';
  try{
    const r=await fetch('/api/mercadopago/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug:cfg?.slug||'',host:host(),items,address,km})});
    const j=await r.json();if(!r.ok||!j.checkoutUrl)throw new Error(j.message||'Não foi possível abrir o Mercado Pago.');
    location.href=j.checkoutUrl;
  }catch(e){console.error(e);alert(e.message||'Não foi possível iniciar o pagamento.');btn.disabled=false;btn.textContent=old}
}
function setupCheckout(){
  const original=$('#csvCheckout');const existingMp=$('#csvCheckoutMp');
  if(!original&&!existingMp)return;
  const method=String(cfg?.paymentMethod||'whatsapp');const connected=cfg?.mercadoPagoConnected===true;
  if(method==='whatsapp'){
    if(existingMp)existingMp.remove();
    if(original){original.textContent='Finalizar pedido no WhatsApp';original.style.display='block'}
    return;
  }
  if(method==='mercadopago'){
    const btn=existingMp||original;
    if(btn.id==='csvCheckout')btn.id='csvCheckoutMp';
    btn.className='csv-mp-btn';btn.textContent=connected?'🔵 Pagar com Mercado Pago':'Mercado Pago indisponível';btn.disabled=!connected;
    if(!btn.dataset.mpBound){btn.dataset.mpBound='1';btn.addEventListener('click',()=>payMercadoPago(btn))}
    return;
  }
  if(method==='ambos'){
    let wrap=$('.csv-pay-actions');
    if(!wrap&&original){wrap=document.createElement('div');wrap.className='csv-pay-actions';original.parentNode.insertBefore(wrap,original);wrap.appendChild(original)}
    if(original){original.textContent='🟢 Finalizar pelo WhatsApp';original.style.display='block'}
    if(wrap&&!$('#csvCheckoutMp',wrap)){
      const mp=document.createElement('button');mp.id='csvCheckoutMp';mp.type='button';mp.className='csv-mp-btn';mp.textContent=connected?'🔵 Pagar com Mercado Pago':'Mercado Pago indisponível';mp.disabled=!connected;mp.addEventListener('click',()=>payMercadoPago(mp));wrap.appendChild(mp);
    }else if(existingMp){existingMp.textContent=connected?'🔵 Pagar com Mercado Pago':'Mercado Pago indisponível';existingMp.disabled=!connected}
  }
}
async function apply(){installStyle();await loadConfig();fixDescription();setupCheckout()}
function observe(){
  let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(apply,25)}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('[data-product],#csvBag,#csvAdd'))setTimeout(apply,35)},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{apply();observe()});else{apply();observe()}
})();