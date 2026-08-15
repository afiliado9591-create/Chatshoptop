const { firestoreGet, decryptMerchantTokens, parseJsonSafe, publicStoreUrl } = require('./_lib');

const PROJECT_ID='chatshop-97ea3';
const FIREBASE_API_KEY='AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const BASE_DOMAIN='alibr.com.br';

function cleanHost(v){return String(v||'').split(',')[0].trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'')}
function cleanSlug(v){return String(v||'').toLowerCase().trim().replace(/[^a-z0-9-]/g,'').slice(0,80)}
function num(v){let s=String(v??'').replace(/[^0-9,.-]/g,'');if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0}
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
  const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:vault.refreshToken});
  const r=await fetch('https://api.mercadopago.com/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/json'},body:body.toString()});
  const j=await parseJsonSafe(r);
  if(!r.ok||!j.access_token) return vault;
  return {...vault,accessToken:String(j.access_token),refreshToken:String(j.refresh_token||vault.refreshToken||''),expiresAt:j.expires_in?new Date(Date.now()+Number(j.expires_in)*1000).toISOString():vault.expiresAt};
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

    const km=num(body.km);const freight=shippingCost(store.shipping,km);
    if(store.shipping?.mode==='per_km'&&store.shipping?.maxKm&&km>num(store.shipping.maxKm)) return res.status(400).json({error:'distance_limit',message:`Esta loja entrega até ${num(store.shipping.maxKm)} km.`});
    if(freight>0) items.push({id:'frete',title:'Frete',quantity:1,currency_id:'BRL',unit_price:Number(freight.toFixed(2))});

    const base=publicStoreUrl(store,slug);
    const preference={
      items,
      external_reference:`chatshop:${slug}:${Date.now()}`,
      statement_descriptor:'CHATSHOP',
      back_urls:{success:base,failure:base,pending:base},
      auto_return:'approved',
      metadata:{chatshop_slug:slug,delivery_address:String(body.address||'').slice(0,250),distance_km:km||0}
    };
    const r=await fetch('https://api.mercadopago.com/checkout/preferences',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+vault.accessToken},body:JSON.stringify(preference)});
    const j=await parseJsonSafe(r);
    if(!r.ok||!j.init_point){console.error('MP preference error:',r.status,j);return res.status(400).json({error:'preference_failed',message:'O Mercado Pago não conseguiu criar o pagamento agora.'});}
    return res.status(200).json({ok:true,checkoutUrl:j.init_point,preferenceId:j.id||''});
  }catch(e){console.error('MP checkout:',e);return res.status(500).json({error:'checkout_failed',message:'Não foi possível iniciar o pagamento.'})}
};