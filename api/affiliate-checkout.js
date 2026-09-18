const admin=require('firebase-admin');

function init(){
  if(admin.apps.length)return admin.app().firestore();
  let raw=String(process.env.CHATSHOP_FIREBASE_SERVICE_ACCOUNT||'').trim(),sa=JSON.parse(raw);
  if(typeof sa==='string')sa=JSON.parse(sa);
  if(sa.private_key)sa.private_key=String(sa.private_key).replace(/\\n/g,'\n');
  return admin.initializeApp({credential:admin.credential.cert(sa),projectId:'chatshop-97ea3'}).firestore();
}
function clean(v,max=120){return String(v||'').trim().slice(0,max)}
module.exports=async function(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'method_not_allowed'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
    const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();
    const base=host?proto+'://'+host:'https://www.alibr.com.br';
    const r=await fetch(base+'/api/mercadopago/checkout.js',{method:'POST',headers:{'content-type':'application/json','x-forwarded-host':host},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.ok)return res.status(r.status||400).json(j);
    const code=clean(body.affiliateRef),slug=clean(body.slug,80);
    if(code&&slug&&j.orderNumber){
      try{await init().collection('chatshops').doc(slug).collection('affiliateAttributions').doc(String(j.orderNumber)).set({affiliateCode:code,orderNumber:String(j.orderNumber),customerPhone:clean(body.customerPhone,30),createdAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});}catch(e){console.warn('affiliate attribution save',e.message)}
    }
    return res.status(200).json(j);
  }catch(e){console.error('affiliate-checkout',e);return res.status(500).json({ok:false,error:'affiliate_checkout_failed',message:'Não foi possível iniciar o pagamento.'});}
};