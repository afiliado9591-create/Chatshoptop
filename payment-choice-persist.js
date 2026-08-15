/* ChatShop — persistência forte da forma de pagamento + ajuste do CTA flutuante. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
function getDb(){try{return (typeof db!=='undefined'&&db)||window.firebase?.firestore?.()||null}catch(e){return null}}
function getSlug(){try{return String((typeof mySlug!=='undefined'&&mySlug)||$('#slug')?.value||'').trim()}catch(e){return String($('#slug')?.value||'').trim()}}
async function persist(value){
  if(!['whatsapp','mercadopago','ambos'].includes(value))return;
  const s=getSlug(),d=getDb();if(!s||!d)return;
  try{
    await d.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').doc(s).set({paymentMethod:value,formaPagamento:value,paymentMethodUpdatedAt:window.firebase?.firestore?.FieldValue?.serverTimestamp?.()||new Date().toISOString()},{merge:true});
    try{if(typeof toast==='function')toast('Forma de pagamento salva: '+(value==='mercadopago'?'Mercado Pago':value==='ambos'?'WhatsApp + Mercado Pago':'WhatsApp'))}catch(e){}
  }catch(e){console.error('ChatShop payment persist:',e)}
}
function bind(){
  document.querySelectorAll('input[name="paymentMethodChoice"]').forEach(r=>{
    if(r.dataset.persistBound==='1')return;r.dataset.persistBound='1';
    r.addEventListener('change',()=>{if(r.checked)persist(r.value)});
  });
}
function adjustSeller(){
  const btn=$('#pubChatToggle');if(!btn)return;
  const cartOpen=$('#csvCart')?.classList.contains('on');
  if(cartOpen){btn.style.setProperty('bottom','84px','important');btn.style.setProperty('right','12px','important');btn.style.setProperty('z-index','45','important')}
  else{btn.style.removeProperty('bottom');btn.style.removeProperty('right');btn.style.removeProperty('z-index')}
}
function installStyle(){if($('#paymentPersistStyle'))return;const st=document.createElement('style');st.id='paymentPersistStyle';st.textContent='@media(max-width:520px){#csvCart.on~#pubChatToggle,#pubChatToggle.cart-open{bottom:84px!important;right:12px!important;z-index:45!important}}';document.head.appendChild(st)}
function tick(){bind();adjustSeller()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installStyle();tick()});else{installStyle();tick()}
let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(tick,40)}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
document.addEventListener('click',e=>{if(e.target.closest('#csvBag,[data-close="cart"]'))setTimeout(adjustSeller,20)},true);

/* Regrava a escolha depois da publicação, quando o slug da nova loja já existe.
   Isso evita a loja publicada voltar para o fallback "whatsapp". */
let pendingPaymentChoice='';
function selectedPaymentChoice(){
  const checked=document.querySelector('input[name="paymentMethodChoice"]:checked');
  return ['whatsapp','mercadopago','ambos'].includes(checked?.value)?checked.value:pendingPaymentChoice;
}
function persistAfterPublish(){
  const choice=selectedPaymentChoice();
  if(!choice)return;
  pendingPaymentChoice=choice;
  [0,350,1000,2500,5000].forEach(delay=>setTimeout(()=>{
    const current=selectedPaymentChoice()||pendingPaymentChoice;
    if(current)persist(current);
  },delay));
}
document.addEventListener('change',e=>{
  const radio=e.target.closest?.('input[name="paymentMethodChoice"]');
  if(radio?.checked)pendingPaymentChoice=radio.value;
},true);
document.addEventListener('click',e=>{
  if(e.target.closest?.('#publishBtn'))persistAfterPublish();
},true);

})();