const FIREBASE_API_KEY='AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
const ADMIN_EMAILS=['jeanaguiar636@gmail.com'];

function sendJson(res,status,body){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  return res.status(status).send(JSON.stringify(body));
}
async function adminEmailFromToken(idToken){
  if(!idToken)return'';
  const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+FIREBASE_API_KEY,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({idToken})
  });
  if(!response.ok)return'';
  const data=await response.json();
  return String(data?.users?.[0]?.email||'').trim().toLowerCase();
}
module.exports=async function handler(req,res){
  if(req.method!=='POST')return sendJson(res,405,{error:'Método não permitido.'});
  try{
    const authorization=String(req.headers.authorization||'');
    const token=authorization.startsWith('Bearer ')?authorization.slice(7).trim():'';
    const email=await adminEmailFromToken(token);
    if(!ADMIN_EMAILS.includes(email))return sendJson(res,403,{error:'Acesso exclusivo do administrador.'});

    const slug=String(req.body?.slug||'').trim().toLowerCase();
    if(!/^[a-z0-9-]{3,80}$/.test(slug))return sendJson(res,400,{error:'Identificador da loja inválido.'});

    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),20000);
    let upstream;
    try{
      upstream=await fetch('https://'+slug+'.alibr.com.br/',{
        headers:{accept:'text/html','user-agent':'ChatShop Admin Export/1.0'},
        cache:'no-store',
        signal:controller.signal
      });
    }finally{clearTimeout(timeout)}
    if(!upstream.ok)return sendJson(res,502,{error:'Não foi possível carregar o HTML publicado desta loja.'});
    const html=await upstream.text();
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store, private');
    res.setHeader('Content-Disposition','inline; filename="'+slug+'-index.html"');
    return res.status(200).send(html);
  }catch(error){
    console.error('admin store html export',error);
    return sendJson(res,error?.name==='AbortError'?504:500,{error:error?.name==='AbortError'?'A loja demorou para responder. Tente novamente.':'Não foi possível gerar o HTML da loja.'});
  }
};
