(function(){
'use strict';

function storeSize(){
  try{return typeof window.collect==='function'?new Blob([JSON.stringify(window.collect())]).size:0}catch(e){return 0}
}
function human(bytes){return bytes<1024?`${bytes} bytes`:`${Math.round(bytes/1024)} KB`}
function install(){
  const publish=document.getElementById('publishBtn');
  const status=document.getElementById('publishStatus');
  if(!publish||!status||document.getElementById('optimizeStoreImagesBtn'))return !!publish;
  const btn=document.createElement('button');
  btn.id='optimizeStoreImagesBtn';
  btn.type='button';
  btn.className='btn success';
  btn.style.cssText='width:100%;margin-top:10px';
  btn.textContent='📦 Otimizar imagens para publicar';
  status.insertAdjacentElement('afterend',btn);
  btn.onclick=async()=>{
    const fixer=window.ChatShopImageStorageFix;
    if(!fixer||typeof fixer.ensureLightweight!=='function'){
      status.innerHTML='❌ O otimizador de imagens ainda não carregou. Feche e abra o ChatShop e tente novamente.';
      return;
    }
    if(!fixer.hasEmbeddedImages()){
      status.innerHTML=`✅ Não há imagens pesadas embutidas. Dados atuais: ${human(storeSize())}. Você já pode tocar em Publicar.`;
      return;
    }
    btn.disabled=true;
    btn.textContent='⏳ Otimizando imagens...';
    try{
      await fixer.ensureLightweight({onProgress(info){
        status.innerHTML=`⏳ Enviando imagem ${info.current} de ${info.total}... ${Number(info.percent||0)}%`;
      }});
      const size=storeSize();
      if(size>900000){
        status.innerHTML=`⚠️ As imagens foram otimizadas, mas a loja ainda está com ${human(size)}. Ainda existe conteúdo grande demais.`;
      }else{
        status.innerHTML=`✅ Imagens otimizadas. A loja agora está com ${human(size)}. Toque em 🚀 Publicar Chatbot.`;
      }
    }catch(error){
      status.innerHTML=`❌ Não consegui otimizar as imagens: ${String(error?.message||error||'erro desconhecido')}`;
    }finally{
      btn.disabled=false;
      btn.textContent='📦 Otimizar imagens para publicar';
    }
  };
  return true;
}
let tries=0;
const timer=setInterval(()=>{if(install()||++tries>200)clearInterval(timer)},100);
install();
})();