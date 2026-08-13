(function(){
'use strict';

let storagePromise=null;
let runningPromise=null;

function isDataImage(value){
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(String(value||''));
}

function currentUid(){
  try{return window.firebase&&firebase.auth?firebase.auth().currentUser?.uid||'':''}catch(e){return''}
}

function loadStorage(){
  try{if(window.firebase&&firebase.storage)return Promise.resolve(firebase.storage())}catch(e){}
  if(storagePromise)return storagePromise;
  storagePromise=new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>/firebase-storage-compat\.js/i.test(s.src||''));
    if(existing){
      const wait=()=>{
        try{if(window.firebase&&firebase.storage)return resolve(firebase.storage())}catch(e){}
        setTimeout(wait,80);
      };
      wait();
      setTimeout(()=>reject(new Error('Tempo limite ao carregar Firebase Storage.')),12000);
      return;
    }
    const s=document.createElement('script');
    s.src='https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js';
    s.onload=()=>{try{resolve(firebase.storage())}catch(e){reject(e)}};
    s.onerror=()=>reject(new Error('Não foi possível carregar o Firebase Storage.'));
    document.head.appendChild(s);
  });
  return storagePromise;
}

function dataUrlToBlob(dataUrl){
  const match=String(dataUrl||'').match(/^data:([^;,]+);base64,(.+)$/s);
  if(!match)throw new Error('Imagem embutida inválida.');
  const mime=match[1]||'image/jpeg';
  const binary=atob(match[2]);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime});
}

function extensionFor(mime){
  const m=String(mime||'').toLowerCase();
  if(m.includes('png'))return'png';
  if(m.includes('webp'))return'webp';
  if(m.includes('gif'))return'gif';
  if(m.includes('svg'))return'svg';
  if(m.includes('avif'))return'avif';
  return'jpg';
}

function storageMessage(error){
  const code=String(error?.code||'');
  if(code==='storage/unauthorized')return'O Firebase Storage recusou o envio das imagens por permissão.';
  if(code==='storage/unauthenticated')return'Sua sessão não foi reconhecida pelo Firebase Storage. Entre novamente na conta.';
  if(code==='storage/quota-exceeded')return'O Firebase Storage está sem cota ou indisponível no plano atual.';
  if(code==='storage/bucket-not-found'||code==='storage/no-default-bucket')return'O Firebase Storage não está configurado corretamente.';
  if(code==='storage/retry-limit-exceeded')return'O envio das imagens demorou demais. Tente novamente em uma conexão melhor.';
  return error?.message||code||'Não foi possível enviar as imagens.';
}

function collectTargets(){
  const targets=[];
  const seen=new Set();
  const add=(kind,data,apply)=>{
    if(!isDataImage(data)||seen.has(data))return;
    seen.add(data);
    targets.push({kind,data,apply});
  };

  const logoWrap=document.getElementById('logoField');
  const logoInput=document.getElementById('logoUrl');
  const logoUpload=logoWrap?.dataset?.upload||'';
  if(isDataImage(logoUpload)){
    add('logo',logoUpload,url=>{
      if(logoWrap)logoWrap.dataset.upload='';
      if(logoInput){logoInput.value=url;logoInput.dispatchEvent(new Event('input',{bubbles:true}));}
      try{if(typeof window.refreshLogo==='function')window.refreshLogo()}catch(e){}
    });
  }else if(isDataImage(logoInput?.value)){
    add('logo',logoInput.value,url=>{
      logoInput.value=url;logoInput.dispatchEvent(new Event('input',{bubbles:true}));
      try{if(typeof window.refreshLogo==='function')window.refreshLogo()}catch(e){}
    });
  }

  document.querySelectorAll('#products .product').forEach((card,index)=>{
    const input=card.querySelector('[data-k="imageUrl"]');
    const upload=card.dataset.upload||'';
    const embedded=isDataImage(upload)?upload:(isDataImage(input?.value)?input.value:'');
    if(!embedded)return;
    add(`produto-${index+1}`,embedded,url=>{
      card.dataset.upload='';
      if(input){input.value=url;input.dispatchEvent(new Event('input',{bubbles:true}));}
      try{if(typeof window.refreshImage==='function')window.refreshImage(card)}catch(e){}
    });
  });
  return targets;
}

async function uploadDataImage(storage,uid,target,index,total,onProgress){
  const blob=dataUrlToBlob(target.data);
  const ext=extensionFor(blob.type);
  const safeKind=String(target.kind||'imagem').replace(/[^a-z0-9_-]/gi,'-').slice(0,40)||'imagem';
  const path=`store-images/${uid}/${Date.now()}-${index+1}-${safeKind}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const ref=storage.ref().child(path);
  onProgress?.({stage:'upload',current:index+1,total,label:target.kind,percent:0});
  const task=ref.put(blob,{contentType:blob.type||'image/jpeg'});
  const snap=await new Promise((resolve,reject)=>{
    task.on('state_changed',snapshot=>{
      const percent=snapshot.totalBytes?Math.round(snapshot.bytesTransferred/snapshot.totalBytes*100):0;
      onProgress?.({stage:'upload',current:index+1,total,label:target.kind,percent});
    },reject,()=>resolve(task.snapshot));
  });
  const url=await snap.ref.getDownloadURL();
  target.apply(url);
  return url;
}

function hasEmbeddedImages(){return collectTargets().length>0}

async function ensureLightweight(options={}){
  if(runningPromise)return runningPromise;
  runningPromise=(async()=>{
    const uid=currentUid();
    if(!uid)throw new Error('Sua sessão não está ativa. Entre novamente antes de publicar.');
    const targets=collectTargets();
    if(!targets.length)return{uploaded:0};
    const storage=await loadStorage();
    for(let i=0;i<targets.length;i++){
      await uploadDataImage(storage,uid,targets[i],i,targets.length,options.onProgress);
    }
    try{if(typeof window.debounce==='function')window.debounce()}catch(e){}
    return{uploaded:targets.length};
  })().catch(error=>{
    const wrapped=new Error(storageMessage(error));
    wrapped.code=error?.code||'';
    wrapped.original=error;
    throw wrapped;
  }).finally(()=>{runningPromise=null});
  return runningPromise;
}

window.ChatShopImageStorageFix={hasEmbeddedImages,ensureLightweight};
})();