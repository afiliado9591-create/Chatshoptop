const admin=require('firebase-admin');
const PROJECT_ID='chatshop-97ea3';
const COLLECTION='chatshops';

function parseServiceAccount(raw){
  let text=String(raw||'').trim(); if(!text) throw new Error('service_account_missing');
  let parsed; try{parsed=JSON.parse(text);if(typeof parsed==='string')parsed=JSON.parse(parsed)}catch(_){
    const start=text.indexOf('{'); if(start<0)throw new Error('service_account_invalid');
    let depth=0,str=false,esc=false,end=-1;
    for(let i=start;i<text.length;i++){const ch=text[i];if(esc){esc=false;continue}if(ch==='\\'&&str){esc=true;continue}if(ch==='"'){str=!str;continue}if(str)continue;if(ch==='{')depth++;else if(ch==='}'&&--depth===0){end=i;break}}
    parsed=JSON.parse(text.slice(start,end+1));
  }
  if(parsed.private_key)parsed.private_key=String(parsed.private_key).replace(/\\n/g,'\n');
  return parsed;
}
function db(){
  if(admin.apps.length)return admin.app().firestore();
  const sa=parseServiceAccount(process.env.CHATSHOP_FIREBASE_SERVICE_ACCOUNT);
  return admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT_ID}).firestore();
}
function clean(v,max=120){return String(v||'').trim().slice(0,max)}
module.exports=async function(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'method_not_allowed'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const slug=clean(body.slug,80).toLowerCase().replace(/[^a-z0-9-]/g,'');
    const code=clean(body.affiliateCode,120);
    if(!slug||!code)return res.status(400).json({ok:false,error:'missing_data'});
    const storeRef=db().collection(COLLECTION).doc(slug),snap=await storeRef.get();
    if(!snap.exists)return res.status(404).json({ok:false,error:'store_not_found'});
    const store=snap.data()||{},entry=store.affiliateDirectory?.[code];
    if(!entry||entry.affiliateStatus==='inactive')return res.status(404).json({ok:false,error:'affiliate_not_found'});
    const now=admin.firestore.Timestamp.now();
    await storeRef.collection('affiliateClicks').add({
      affiliateCode:code,
      affiliateEmail:String(entry.affiliateEmail||'').toLowerCase(),
      affiliateName:String(entry.affiliateName||''),
      productSlug:clean(body.productSlug,120),
      productName:clean(body.productName,180),
      visitorId:clean(body.visitorId,180),
      source:clean(body.source,80)||'storefront',
      createdAt:now
    });
    return res.status(200).json({ok:true});
  }catch(e){console.error('affiliate-track',e);return res.status(500).json({ok:false,error:'track_failed'});}
};