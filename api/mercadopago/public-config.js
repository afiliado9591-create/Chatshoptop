const { firestoreGet, parseJsonSafe } = require('./_lib');

const PROJECT_ID = 'chatshop-97ea3';
const FIREBASE_API_KEY = 'AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const BASE_DOMAIN = 'alibr.com.br';

function cleanHost(v){return String(v||'').split(',')[0].trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'')}
function cleanSlug(v){return String(v||'').toLowerCase().trim().replace(/[^a-z0-9-]/g,'').slice(0,80)}
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
function desc(p){return String(p?.cardDescription||p?.displayText||p?.voiceText||'').trim()}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
  try{
    const slug=cleanSlug(req.query?.slug)||await slugFromHost(req.query?.host||req.headers['x-forwarded-host']||req.headers.host);
    if(!slug) return res.status(404).json({error:'store_not_found'});
    const store=await firestoreGet(`chatshops/${encodeURIComponent(slug)}`);
    if(!store) return res.status(404).json({error:'store_not_found'});
    const method=String(store.paymentMethod||store.formaPagamento||'whatsapp').toLowerCase();
    const products=(Array.isArray(store.products)?store.products:[]).map(p=>({name:String(p?.name||''),description:desc(p)}));
    return res.status(200).json({ok:true,slug,paymentMethod:['whatsapp','mercadopago','ambos'].includes(method)?method:'whatsapp',mercadoPagoConnected:store.mercadoPagoConnection?.connected===true,products});
  }catch(e){console.error('MP public config:',e);return res.status(500).json({error:'config_failed'})}
};