const { firestoreGet, decryptMerchantTokens, parseJsonSafe, publicStoreUrl, env } = require('../../lib/mercadopago');

const PROJECT_ID='chatshop-97ea3';
const FIREBASE_API_KEY='AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const BASE_DOMAIN='alibr.com.br';

function cleanHost(v){return String(v||'').split(',')[0].trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'')}
function cleanSlug(v){return String(v||'').toLowerCase().trim().replace(/[^a-z0-9-]/g,'').slice(0,80)}
function num(v){let s=String(v??'').replace(/[^0-9,.-]/g,'');if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0}
function digits(v){return String(v||'').replace(/\D/g,'')}
function orderNumber(){return 'CS-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}
async function slugFromHost(host){
  const h=cleanHost(host);
  if(h.endsWith('.'+BASE_DOMAIN)&&h!==('www.'+BASE_DOMAIN)) return cleanSlug(h.slice(0,-('.'+BASE_DOMAIN).length));
  if(!h||h===BASE_DOMAIN||h==='www.'+BASE_DOMAIN||h.endsWith('.vercel.app')) return '';
  const candidates=h.startsWith('www.')?[h,h.slice(4)]:[h,'www.'+h];
  const url=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
  for(const candidate of [...new Set(candidates)]){
    const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({structuredQuery:{from:[{collectionId:'chatshops'}],where:{fieldFilter:{field:{fieldPath:'customDomain'},op:'EQUAL',value:{stringValue:candidate}}},limit:1}})});
    if(!r.ok) continue;
    const rows=await parseJsonSafe(r);const doc=Array.isArray(rows)?rows.find(x=>x&&x.document)?.document:null;
    if(doc){const s=doc.fields?.slug?.stringValue||String(doc.name||'').split('/').pop();if(s)return cleanSlug(s)}
  }
  return '';
}
function shippingCost(shipping,km){
  const s=shipping&&typeof shipping==='object'?shipping:{};
  if(s.mode==='free'||s.mode==='none') return 0;
  if(s.mode!=='per_km') return 0;
  const d=Math.max(0,num(km));if(!d)return 0;
  return Math.max(0,num(s.minimum),d*Math.max(0,num(s.ratePerKm)));
}
async function refreshAccessToken(vault){
  if(!vault.refreshToken) return vault;
  const exp=vault.expiresAt?Date.parse(vault.expiresAt):0;
  if(exp && exp-Date.now()>5*60*1000) return vault;
  const cfg=env();
  const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:vault.refreshToken,client_id:cfg.clientId,client_secret:cfg.clientSecret});
  const r=await fetch('https://api.mercadopago.com/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/json'},body:body.toString()});
  const j=await parseJsonSafe(r);
  if(!r.ok||!j.access_token) return vault;
  return {...vault,accessToken:String(j.access_token),refreshToken:String(j.refresh_token||vault.refreshToken||''),expiresAt:j.expires_in?new Date(Date.now()+Number(j.expires_in)*1000).toISOString():vault.expiresAt};
}

async function quoteSuperFrete(req,slug,store,requested,body){
  const cep=digits(body.destinationPostalCode||body.toPostalCode||body.cep||'');
  if(cep.length!==8) throw Object.assign(new Error('Calcule o frete com um CEP válido antes de pagar.'),{status:400,code:'shipping_cep_required'});
  const serviceName=String(body.shippingServiceName||'').trim();
  const optionIndex=Number(body.shippingOptionIndex);
  if(!serviceName&&!Number.isInteger(optionIndex)) throw Object.assign(new Error('Escolha PAC, SEDEX ou outra opção de frete antes de pagar.'),{status:400,code:'shipping_required'});

  const storeProducts=Array.isArray(store.products)?store.products:[];
  const quoteItems=[];
  for(const row of requested){
    const name=String(row?.name||'').trim();
    const qty=Math.max(1,Math.min(99,Math.floor(num(row?.qty)||1)));
    const index=storeProducts.findIndex(x=>String(x?.name||'').trim()===name);
    if(index>=0)quoteItems.push({index,quantity:qty});
  }
  if(!quoteItems.length) throw Object.assign(new Error('A sacola está vazia ou os produtos não foram encontrados.'),{status:400,code:'empty_cart'});

  const forwarded=cleanHost(req.headers['x-forwarded-host']||req.headers.host||'');
  if(!forwarded) throw Object.assign(new Error('Não foi possível validar o frete agora.'),{status:500,code:'shipping_host_missing'});
  const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim()||'https';
  const quoteUrl=`${proto}://${forwarded}/api/superfrete-quote.js`;
  const qr=await fetch(quoteUrl,{method:'POST',headers:{'content-type':'application/json','x-forwarded-host':forwarded},body:JSON.stringify({storeSlug:slug,host:body.host||forwarded,toPostalCode:cep,destinationPostalCode:cep,items:quoteItems})});
  const qj=await parseJsonSafe(qr);
  if(!qr.ok) throw Object.assign(new Error(qj?.error||'Não foi possível validar o frete.'),{status:400,code:'shipping_quote_failed'});
  const quotes=Array.isArray(qj?.quotes)?qj.quotes:[];
  let selected=null;
  if(serviceName){
    const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    selected=quotes.find(q=>norm(q?.name)===norm(serviceName)||norm(q?.name).startsWith(norm(serviceName)+' ·'))||null;
  }
  if(!selected&&Number.isInteger(optionIndex)&&optionIndex>=0&&quotes[optionIndex])selected=quotes[optionIndex];
  if(!selected||num(selected.price)<=0) throw Object.assign(new Error('A opção de frete escolhida não é mais válida. Calcule novamente.'),{status:400,code:'shipping_option_invalid'});
  return {price:num(selected.price),name:String(selected.name||serviceName||'Frete'),days:num(selected.days),cep};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const slug=cleanSlug(body.slug)||await slugFromHost(body.host||req.headers['x-forwarded-host']||req.headers.host);
    if(!slug) return res.status(404).json({error:'store_not_found',message:'Loja não encontrada.'});
    const store=await firestoreGet(`chatshops/${encodeURIComponent(slug)}`);
    if(!store) return res.status(404).json({error:'store_not_found',message:'Loja não encontrada.'});
    const method=String(store.paymentMethod||store.formaPagamento||'whatsapp').toLowerCase();
    if(!['mercadopago','ambos'].includes(method)) return res.status(400).json({error:'mercadopago_not_enabled',message:'Mercado Pago não está selecionado nesta loja.'});
    if(store.mercadoPagoConnection?.connected!==true||!store.mercadoPagoVault) return res.status(400).json({error:'mercadopago_not_connected',message:'O Mercado Pago desta loja ainda não está conectado.'});

    let vault=decryptMerchantTokens(store.mercadoPagoVault);
    vault=await refreshAccessToken(vault);
    if(!vault.accessToken) return res.status(400).json({error:'merchant_token_missing',message:'A conexão Mercado Pago precisa ser refeita.'});

    const storeProducts=Array.isArray(store.products)?store.products:[];
    const requested=Array.isArray(body.items)?body.items:[];
    const items=[];
    for(const row of requested){
      const name=String(row?.name||'').trim();const qty=Math.max(1,Math.min(99,Math.floor(num(row?.qty)||1)));
      const p=storeProducts.find(x=>String(x?.name||'').trim()===name);if(!p)continue;
      const price=num(p.price);if(price<=0)continue;
      items.push({id:String(storeProducts.indexOf(p)),title:String(p.name||'Produto').slice(0,120),quantity:qty,currency_id:'BRL',unit_price:Number(price.toFixed(2)),description:String(row?.color||'').trim()?`Cor: ${String(row.color).trim().slice(0,60)}`:undefined});
    }
    if(!items.length) return res.status(400).json({error:'empty_cart',message:'A sacola está vazia ou os produtos não foram encontrados.'});

    const km=num(body.km);
    let freight=shippingCost(store.shipping,km);
    let freightMeta={mode:String(store.shipping?.mode||'')};
    if(store.shipping?.mode==='per_km'&&store.shipping?.maxKm&&km>num(store.shipping.maxKm)) return res.status(400).json({error:'distance_limit',message:`Esta loja entrega até ${num(store.shipping.maxKm)} km.`});
    if(store.shipping?.mode==='superfrete'){
      const selected=await quoteSuperFrete(req,slug,store,requested,body);
      freight=selected.price;
      freightMeta={mode:'superfrete',service:selected.name,days:selected.days,destination_postal_code:selected.cep};
    }
    if(freight>0) items.push({id:'frete',title:freightMeta.service?`Frete ${freightMeta.service}`:'Frete',quantity:1,currency_id:'BRL',unit_price:Number(freight.toFixed(2))});

    const customerPhone=digits(body.customerPhone||body.phone||'');
    const customerName=String(body.customerName||'').trim().slice(0,100);
    if(customerPhone.length<10||customerPhone.length>13) return res.status(400).json({error:'customer_phone_required',message:'Informe um telefone válido para acompanhar o pedido.'});
    const number=orderNumber();
    const externalReference=`chatshop:${slug}:${number}`;
    const base=publicStoreUrl(store,slug);
    const orderUrl=`${base.replace(/\/$/,'')}/meus-pedidos?pedido=${encodeURIComponent(number)}`;
    const preference={
      items,
      external_reference:externalReference,
      statement_descriptor:'CHATSHOP',
      back_urls:{success:orderUrl,failure:orderUrl,pending:orderUrl},
      auto_return:'approved',
      metadata:{chatshop_slug:slug,order_number:number,customer_name:customerName,customer_phone:customerPhone,delivery_address:String(body.address||'').slice(0,250),distance_km:km||0,shipping_mode:freightMeta.mode||'',shipping_service:freightMeta.service||'',shipping_days:freightMeta.days||0,destination_postal_code:freightMeta.destination_postal_code||''}
    };
    const r=await fetch('https://api.mercadopago.com/checkout/preferences',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+vault.accessToken},body:JSON.stringify(preference)});
    const j=await parseJsonSafe(r);
    if(!r.ok||!j.init_point){console.error('MP preference error:',r.status,j);return res.status(400).json({error:'preference_failed',message:'O Mercado Pago não conseguiu criar o pagamento agora.'});}
    return res.status(200).json({ok:true,checkoutUrl:j.init_point,preferenceId:j.id||'',orderNumber:number,orderUrl,freight:Number(freight.toFixed(2)),shipping:freightMeta});
  }catch(e){
    console.error('MP checkout:',e);
    const status=Number(e?.status)||500;
    return res.status(status).json({error:e?.code||'checkout_failed',message:String(e?.message||'Não foi possível iniciar o pagamento.')});
  }
};