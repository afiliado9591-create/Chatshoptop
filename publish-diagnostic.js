(function(){
'use strict';

let lastCheck=null;

/*
 * Vários módulos do editor acrescentam dados envolvendo window.collect().
 * Quando um módulo substitui collect(), ele pode perder a marca deixada pelo
 * módulo anterior. Isso fazia dois ou mais módulos se embrulharem novamente
 * em sequência até estourar a pilha (Maximum call stack size exceeded).
 *
 * Preservamos somente marcas que já apareceram em alguma versão de collect().
 * Assim cada módulo pode instalar sua extensão uma vez, mas não volta a se
 * instalar depois que outro módulo troca a função externa.
 */
const collectWrapperMarkers=[
  '__storePagesWrapped',
  '__mpOauthWrapped',
  '__sellerAudioWrapped',
  '__catalogSellerModelWrapped',
  '__singleProductVideoWrapped',
  '__singleProductMenuWrapped',
  '__productVideoWrapped',
  '__superfreteWrapped',
  '__productSellerButtonWrapped',
  '__sellerButtonProductWrapped',
  '__planAccessWrapped',
  '__affiliateProductPlanWrapped',
  '__affiliateCatalogQnaWrapped',
  '__virtualShippingWrapped',
  '__spcWrapped'
];
const seenCollectMarkers=new Set();
let lastCollectFn=null;
function stabilizeCollect(){
  const fn=window.collect;
  if(typeof fn!=='function')return false;
  collectWrapperMarkers.forEach(marker=>{
    try{if(fn[marker])seenCollectMarkers.add(marker)}catch(e){}
  });
  seenCollectMarkers.forEach(marker=>{try{fn[marker]=true}catch(e){}});
  lastCollectFn=fn;
  return true;
}

/*
 * A proteção precisa durar enquanto o editor estiver aberto. Alguns módulos
 * fazem refresh periódico (inclusive a cada 1,2 s), então parar a proteção
 * depois de poucos segundos permitia que a cadeia de wrappers crescesse de
 * novo. 250 ms é rápido o bastante para preservar as flags e leve no navegador.
 */
stabilizeCollect();
setInterval(stabilizeCollect,250);

function qs(id){return document.getElementById(id)}

function invalidValues(value,path,found,seen){
  if(found.length>=8)return;
  const type=typeof value;
  if(type==='undefined'||type==='function'||type==='symbol'||type==='bigint'){
    found.push(`${path}: ${type}`);return;
  }
  if(type==='number'&&!Number.isFinite(value)){
    found.push(`${path}: número inválido`);return;
  }
  if(value==null||type!=='object')return;
  if(value instanceof Date)return;
  if(typeof Blob!=='undefined'&&value instanceof Blob){found.push(`${path}: arquivo não convertido`);return;}
  if(typeof Node!=='undefined'&&value instanceof Node){found.push(`${path}: elemento da página`);return;}
  if(seen.has(value))return;
  seen.add(value);
  if(Array.isArray(value)){
    value.forEach((v,i)=>invalidValues(v,`${path}[${i}]`,found,seen));
  }else{
    Object.keys(value).forEach(k=>invalidValues(value[k],path?`${path}.${k}`:k,found,seen));
  }
}

function preflight(){
  const result={uid:'',email:'',bytes:0,invalid:[],error:''};
  try{
    const user=window.firebase&&firebase.auth?firebase.auth().currentUser:null;
    result.uid=user?.uid||'';
    result.email=user?.email||'';
  }catch(e){}
  if(!result.uid)return result;
  try{
    stabilizeCollect();
    if(typeof window.collect!=='function')throw new Error('A função que prepara os dados da loja não carregou.');
    const data=window.collect();
    invalidValues(data,'loja',result.invalid,new WeakSet());
    const json=JSON.stringify(data);
    result.bytes=new Blob([json]).size;
  }catch(e){result.error=String(e?.message||e||'Erro ao preparar os dados');}
  return result;
}

function humanSize(bytes){
  if(bytes<1024)return `${bytes} bytes`;
  return `${Math.round(bytes/1024)} KB`;
}

function detailText(check){
  if(!check.uid)return '🔎 Diagnóstico: sua sessão de login não está ativa. Saia do ChatShop, entre novamente e tente publicar.';
  if(check.error)return `🔎 Diagnóstico: erro ao preparar os dados da loja — ${check.error}`;
  if(check.invalid.length)return `🔎 Diagnóstico: encontrei um dado inválido antes de enviar ao Firebase: ${check.invalid.slice(0,3).join(' | ')}`;
  if(check.bytes>900000)return `🔎 Diagnóstico: os dados da loja estão com ${humanSize(check.bytes)}. O documento ficou grande demais ou muito perto do limite do Firestore. Imagens enviadas do aparelho podem aumentar muito o tamanho; prefira links de imagem.`;
  return `🔎 Pré-teste concluído: login ativo (${check.email||'usuário autenticado'}) e dados da loja com ${humanSize(check.bytes)}. Como essa parte está normal, a falha ocorre quando o Firebase tenta gravar o documento.`;
}

function addDetail(status,text){
  if(!status||status.querySelector('.publish-diagnostic-detail'))return;
  const box=document.createElement('div');
  box.className='publish-diagnostic-detail';
  box.style.cssText='margin-top:8px;padding:9px;border:1px solid #fecaca;border-radius:9px;background:#fff;color:#991b1b;font-size:12px;line-height:1.45;text-align:left;word-break:break-word';
  box.textContent=text;
  status.appendChild(box);
}

function install(){
  const btn=qs('publishBtn');
  const status=qs('publishStatus');
  if(!btn||!status)return false;

  if(btn.dataset.preflightDiagnostic!=='1'){
    btn.dataset.preflightDiagnostic='1';
    btn.addEventListener('click',event=>{
      stabilizeCollect();
      status.querySelector('.publish-diagnostic-detail')?.remove();
      lastCheck=preflight();
      if(!lastCheck.uid||lastCheck.error||lastCheck.invalid.length||lastCheck.bytes>900000){
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        status.innerHTML='❌ Não publiquei porque encontrei um problema antes de enviar.';
        addDetail(status,detailText(lastCheck));
      }
    },true);
  }

  if(status.dataset.preflightObserver!=='1'){
    status.dataset.preflightObserver='1';
    new MutationObserver(()=>{
      if(!/Erro ao publicar/i.test(status.textContent||''))return;
      if(status.querySelector('.publish-diagnostic-detail'))return;
      setTimeout(()=>addDetail(status,detailText(lastCheck||preflight())),100);
    }).observe(status,{childList:true,subtree:true,characterData:true});
  }
  return true;
}

let attempts=0;
const timer=setInterval(()=>{
  attempts++;
  stabilizeCollect();
  if(install()||attempts>200)clearInterval(timer);
},150);
install();
})();

/* Carrega a atualização de cupons tanto no editor quanto nas lojas publicadas. */
(function(){
  if(document.querySelector('script[data-chatshop-coupons]'))return;
  const script=document.createElement('script');
  script.src='/coupon-upgrade.js?v=20260813-2027';
  script.defer=true;
  script.dataset.chatshopCoupons='1';
  document.head.appendChild(script);
})();
