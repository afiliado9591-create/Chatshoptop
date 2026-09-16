const admin=require('firebase-admin');
const PROJECT_ID='chatshop-97ea3';
const ADMIN_EMAILS=['jeanaguiar636@gmail.com'];

function parseServiceAccount(raw){
  let text=String(raw||'').trim();
  if(!text)throw new Error('CHATSHOP_FIREBASE_SERVICE_ACCOUNT ausente');
  let parsed;
  try{parsed=JSON.parse(text);if(typeof parsed==='string')parsed=JSON.parse(parsed)}catch(_){
    const start=text.indexOf('{');const end=text.lastIndexOf('}');
    if(start<0||end<start)throw new Error('CHATSHOP_FIREBASE_SERVICE_ACCOUNT inválida');
    parsed=JSON.parse(text.slice(start,end+1));
  }
  if(parsed.private_key)parsed.private_key=String(parsed.private_key).replace(/\\n/g,'\n');
  return parsed;
}
function getAdmin(){
  if(admin.apps.length)return admin.app();
  const service=parseServiceAccount(process.env.CHATSHOP_FIREBASE_SERVICE_ACCOUNT);
  return admin.initializeApp({credential:admin.credential.cert(service),projectId:PROJECT_ID});
}
function clean(v,max=200){return String(v||'').trim().slice(0,max)}
async function authUser(req){
  const h=String(req.headers?.authorization||'');
  if(!/^Bearer\s+/i.test(h))throw Object.assign(new Error('Login necessário.'),{status:401});
  const token=h.replace(/^Bearer\s+/i,'').trim();
  if(!token)throw Object.assign(new Error('Login necessário.'),{status:401});
  return getAdmin().auth().verifyIdToken(token);
}
function normalizePlan(v){
  const s=String(v||'aprendiz').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(s.includes('prof')||s==='pro'||s.includes('premium'))return'profissional';
  if(s.includes('bas'))return'basico';
  return'aprendiz';
}
function isAdmin(decoded,userDoc){
  const email=String(decoded?.email||'').toLowerCase();
  return ADMIN_EMAILS.includes(email)||(userDoc&&userDoc.isAdmin===true);
}
function safeDoc(doc){return{id:doc.id,...(doc.data()||{})}}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
  try{
    const decoded=await authUser(req);
    const db=getAdmin().firestore();
    const userSnap=await db.collection('users').doc(decoded.uid).get();
    const userDoc=userSnap.exists?userSnap.data()||{}:{};
    const adminUser=isAdmin(decoded,userDoc);
    const plan=adminUser?'profissional':normalizePlan(userDoc.plan||userDoc.plano||userDoc.subscriptionPlan||'aprendiz');
    const action=clean(req.query?.action||'list',30);
    if(action==='list'){
      const snap=await db.collection('catalogos').orderBy('createdAt','desc').limit(100).get();
      const catalogs=snap.docs.map(d=>{
        const c=safeDoc(d);
        const free=c.liberadoGratis===true;
        const allowed=adminUser||plan!=='aprendiz'||free;
        return{id:c.id,nome:c.nome||'Catálogo',linkAfiliacao:c.linkAfiliacao||'',liberadoGratis:free,allowed};
      });
      return res.status(200).json({ok:true,plan,admin:adminUser,catalogs});
    }
    if(action==='products'){
      const catalogId=clean(req.query?.catalogId,160);
      if(!catalogId)return res.status(400).json({error:'catalog_required'});
      const catSnap=await db.collection('catalogos').doc(catalogId).get();
      if(!catSnap.exists)return res.status(404).json({error:'catalog_not_found'});
      const c=catSnap.data()||{};
      const allowed=adminUser||plan!=='aprendiz'||c.liberadoGratis===true;
      if(!allowed)return res.status(403).json({error:'catalog_locked',message:'Este catálogo está disponível nos planos pagos.'});
      const snap=await db.collection('catalogoGeral').where('catalogoId','==',catalogId).limit(300).get();
      const products=snap.docs.map(safeDoc).sort((a,b)=>Number(b.createdAt?.seconds||0)-Number(a.createdAt?.seconds||0));
      return res.status(200).json({ok:true,plan,admin:adminUser,catalog:{id:catalogId,...c},products});
    }
    return res.status(400).json({error:'invalid_action'});
  }catch(e){
    console.error('catalog-access',e);
    const status=Number(e.status)||500;
    return res.status(status).json({error:'catalog_access_failed',message:String(e.message||'Não foi possível carregar o catálogo.')});
  }
};
