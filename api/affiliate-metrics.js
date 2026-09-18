const admin=require('firebase-admin');
const {verifyFirebaseUser,decryptMerchantTokens}=require('../lib/mercadopago');

const PROJECT_ID='chatshop-97ea3';

function initAdmin(){
  if(admin.apps.length)return admin.app();
  let raw=String(process.env.CHATSHOP_FIREBASE_SERVICE_ACCOUNT||'').trim(),sa;
  try{sa=JSON.parse(raw);if(typeof sa==='string')sa=JSON.parse(sa)}catch(_){sa=JSON.parse(raw.slice(raw.indexOf('{')))}
  if(sa.private_key)sa.private_key=String(sa.private_key).replace(/\\n/g,'\n');
  return admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT_ID});
}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
async function searchPayments(vault){
  const r=await fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=100',{headers:{authorization:'Bearer '+vault.accessToken,accept:'application/json'}});
  if(!r.ok)return [];
  const j=await r.json().catch(()=>({}));return Array.isArray(j.results)?j.results:[];
}
module.exports=async function(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'method_not_allowed'});
  try{
    const user=await verifyFirebaseUser(req);
    const db=initAdmin().firestore();
    const storesSnap=await db.collection('chatshops').get();
    const mine=[];
    for(const doc of storesSnap.docs){
      const store=doc.data()||{},directory=store.affiliateDirectory||{};
      for(const [code,entry] of Object.entries(directory)){
        if(String(entry?.affiliateEmail||'').toLowerCase()===String(user.email||'').toLowerCase() && entry?.affiliateStatus!=='inactive'){
          mine.push({slug:doc.id,code,name:String(entry.affiliateName||'Afiliado'),brand:String(store.brand||doc.id),commissionPercent:num(store.affiliateProgram?.commissionPercent),storeType:String(store.storeType||'affiliate'),entry});
        }
      }
    }
    const result=[];
    for(const item of mine){
      const clicksSnap=await db.collection('chatshops').doc(item.slug).collection('affiliateClicks').where('affiliateCode','==',item.code).get();
      let sales=0,total=0,approvedSales=0;
      if(item.storeType==='virtual' && item.entry && item.entry.affiliateCode && item.entry.affiliateStatus!=='inactive' && item.commissionPercent>=0 && item.commissionPercent<=100){
        const store=(await db.collection('chatshops').doc(item.slug).get()).data()||{};
        if(store.mercadoPagoConnection?.connected===true && store.mercadoPagoVault){
          try{
            const vault=decryptMerchantTokens(store.mercadoPagoVault),payments=await searchPayments(vault);
            for(const p of payments){
              const ref=String(p?.metadata?.affiliate_ref||'');
              if(ref!==item.code)continue;
              const status=String(p?.status||'').toLowerCase();
              sales++;
              if(status==='approved'){approvedSales++;total+=num(p.transaction_amount||0);}
            }
          }catch(e){console.warn('affiliate-metrics payments',item.slug,e.message)}
        }
      }
      result.push({
        slug:item.slug,brand:item.brand,code:item.code,
        clicks:clicksSnap.size,sales:approvedSales,totalSalesValue:Number(total.toFixed(2)),
        commissionPercent:item.commissionPercent,
        estimatedCommission:Number((total*item.commissionPercent/100).toFixed(2))
      });
    }
    const summary=result.reduce((a,x)=>({clicks:a.clicks+x.clicks,sales:a.sales+x.sales,total:a.total+x.totalSalesValue,commission:a.commission+x.estimatedCommission}),{clicks:0,sales:0,total:0,commission:0});
    summary.conversion=summary.clicks?Number((summary.sales/summary.clicks*100).toFixed(2)):0;
    return res.status(200).json({ok:true,affiliate:user.email,stores:result,summary});
  }catch(e){
    console.error('affiliate-metrics',e);
    const code=e?.message||'metrics_failed';
    return res.status(e?.statusCode||500).json({ok:false,error:code,message:code==='firebase_token_missing'||code==='firebase_token_invalid'?'Entre novamente no ChatShop.':'Não foi possível carregar suas métricas.'});
  }
};