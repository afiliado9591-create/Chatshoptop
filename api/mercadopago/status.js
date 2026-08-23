const {
  platformReady, verifyFirebaseUser, loadOwnedProfessionalStore,
  decryptMerchantTokens, firestoreGet, parseJsonSafe,
} = require('../../lib/mercadopago');

function digits(v){return String(v||'').replace(/\D/g,'')}
function cleanSlug(v){return String(v||'').toLowerCase().trim().replace(/[^a-z0-9-]/g,'').slice(0,80)}
function paymentStatus(v){
  const map={approved:'Pago',pending:'Aguardando pagamento',in_process:'Pagamento em análise',rejected:'Pagamento recusado',cancelled:'Cancelado',refunded:'Reembolsado',charged_back:'Contestado'};
  return map[String(v||'').toLowerCase()]||'Aguardando pagamento';
}
async function merchant(store){
  if(store?.mercadoPagoConnection?.connected!==true||!store?.mercadoPagoVault)throw Object.assign(new Error('mercadopago_not_connected'),{statusCode:400});
  const vault=decryptMerchantTokens(store.mercadoPagoVault);
  if(!vault.accessToken)throw Object.assign(new Error('merchant_token_missing'),{statusCode:400});
  return vault;
}
async function searchPayments(vault,query=''){
  const url='https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=50'+(query?'&external_reference='+encodeURIComponent(query):'');
  const r=await fetch(url,{headers:{authorization:'Bearer '+vault.accessToken,accept:'application/json'}});
  const j=await parseJsonSafe(r);if(!r.ok)throw Object.assign(new Error('payment_search_failed'),{statusCode:400});
  return Array.isArray(j?.results)?j.results:[];
}
function publicOrder(payment,tracking){
  const md=payment?.metadata||{};const items=Array.isArray(payment?.additional_info?.items)?payment.additional_info.items:[];
  return {orderNumber:String(md.order_number||String(payment?.external_reference||'').split(':').pop()||''),paymentStatus:paymentStatus(payment?.status),paymentStatusCode:String(payment?.status||''),total:Number(payment?.transaction_amount||0),createdAt:String(payment?.date_created||''),customerName:String(md.customer_name||''),shippingService:String(md.shipping_service||''),shippingDays:Number(md.shipping_days||0),destinationPostalCode:String(md.destination_postal_code||''),items:items.map(x=>({name:String(x.title||x.description||'Produto'),quantity:Number(x.quantity||1),price:Number(x.unit_price||0)})),tracking:tracking&&typeof tracking==='object'?{carrier:String(tracking.carrier||''),code:String(tracking.code||''),url:String(tracking.url||''),status:String(tracking.status||''),updatedAt:String(tracking.updatedAt||'')}:null};
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    if(req.method==='GET'){
      const slug=cleanSlug(req.query?.slug),order=String(req.query?.order||'').trim().toUpperCase(),phone=digits(req.query?.phone);
      if(!slug||!/^CS-[A-Z0-9-]{8,40}$/.test(order)||phone.length<10)return res.status(400).json({error:'invalid_lookup',message:'Informe o número do pedido e o telefone usado na compra.'});
      const store=await firestoreGet('chatshops/'+encodeURIComponent(slug));if(!store)return res.status(404).json({error:'store_not_found',message:'Loja não encontrada.'});
      const vault=await merchant(store);const ref='chatshop:'+slug+':'+order;const payments=await searchPayments(vault,ref);const payment=payments[0];
      if(!payment||digits(payment?.metadata?.customer_phone)!==phone)return res.status(404).json({error:'order_not_found',message:'Pedido não encontrado. Confira o número e o telefone.'});
      return res.status(200).json({ok:true,order:publicOrder(payment,store?.orderTracking?.[order])});
    }
    if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
    const user=await verifyFirebaseUser(req);const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});const owned=await loadOwnedProfessionalStore(body.slug,user);const c=owned.storeDoc.mercadoPagoConnection||{};
    if(body.action==='orders'){
      const vault=await merchant(owned.storeDoc);const prefix='chatshop:'+owned.slug+':';const payments=(await searchPayments(vault)).filter(p=>String(p.external_reference||'').startsWith(prefix));
      return res.status(200).json({ok:true,orders:payments.map(p=>publicOrder(p,owned.storeDoc?.orderTracking?.[String(p?.metadata?.order_number||'')]))});
    }
    return res.status(200).json({configured:platformReady(),eligible:true,connected:c.connected===true,provider:c.provider||'mercadopago',userId:c.userId||'',connectedAt:c.connectedAt||'',expiresAt:c.expiresAt||''});
  }catch(error){
    const code=error?.message||'status_failed';const messages={firebase_token_missing:'Entre novamente no ChatShop.',firebase_token_invalid:'Sua sessão expirou. Entre novamente no ChatShop.',invalid_store:'Publique a loja primeiro.',store_not_found:'Loja não encontrada.',not_store_owner:'Esta loja não pertence à sua conta.',professional_plan_required:'Pedidos estão disponíveis no plano Profissional.',mercadopago_not_connected:'Mercado Pago não conectado.',merchant_token_missing:'Reconecte o Mercado Pago.',payment_search_failed:'Não foi possível consultar os pagamentos agora.'};
    return res.status(error?.statusCode||500).json({configured:platformReady(),eligible:false,connected:false,error:code,message:messages[code]||'Não foi possível consultar os pedidos.'});
  }
};