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
async function authAdmin(req){
  const h=String(req.headers?.authorization||'');
  if(!/^Bearer\s+/i.test(h))throw Object.assign(new Error('Login necessário.'),{status:401});
  const token=h.replace(/^Bearer\s+/i,'').trim();
  const decoded=await getAdmin().auth().verifyIdToken(token);
  const db=getAdmin().firestore();
  const userSnap=await db.collection('users').doc(decoded.uid).get();
  const userDoc=userSnap.exists?userSnap.data()||{}:{};
  const email=String(decoded.email||'').toLowerCase();
  if(!ADMIN_EMAILS.includes(email)&&userDoc.isAdmin!==true)
    throw Object.assign(new Error('Acesso administrativo necessário.'),{status:403});
  return {decoded,db};
}
function clean(v,max=200){return String(v??'').trim().slice(0,max)}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
  try{
    const {db}=await authAdmin(req);
    const b=req.body||{};
    const catalogoId=clean(b.catalogoId,160);
    const name=clean(b.name,200);
    const image=clean(b.image,1000000);
    if(!catalogoId||!name||!image)return res.status(400).json({error:'missing_fields',message:'Nome, imagem e catálogo são obrigatórios.'});
    const cat=await db.collection('catalogos').doc(catalogoId).get();
    if(!cat.exists)return res.status(404).json({error:'catalog_not_found'});
    const keywords=Array.isArray(b.keywords)?b.keywords.map(x=>clean(x,80)).filter(Boolean).slice(0,30):[];
    const data={
      name,
      image,
      category:clean(b.category,120),
      keywords,
      price:clean(b.price,40),
      baseLink:clean(b.baseLink,2000),
      buttonText:clean(b.buttonText,40)||'Comprar agora',
      buttonColor:/^#[0-9a-fA-F]{6}$/.test(String(b.buttonColor||''))?String(b.buttonColor):'#7A2E3B',
      catalogoId,
      createdAt:admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:admin.firestore.FieldValue.serverTimestamp()
    };
    const ref=await db.collection('catalogoGeral').add(data);
    return res.status(200).json({ok:true,id:ref.id});
  }catch(e){
    console.error('catalog-admin',e);
    const status=Number(e.status)||500;
    return res.status(status).json({error:'catalog_admin_failed',message:String(e.message||'Não foi possível adicionar o produto.')});
  }
};
