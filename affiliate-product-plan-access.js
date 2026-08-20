/* ChatShop: catálogo em todos os planos; produto próprio a partir do Básico. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s), $$=(s,r)=>[...(r||document).querySelectorAll(s)];

/* Evita que scripts antigos entrem em loop quando os cartões de Planos são alterados. */
(function guardPlanMutations(){
  if(window.__chatshopPlanMutationGuard)return;
  window.__chatshopPlanMutationGuard=true;
  const NativeMutationObserver=window.MutationObserver;
  if(!NativeMutationObserver)return;
  window.MutationObserver=function(callback){
    return new NativeMutationObserver((mutations,observer)=>{
      const relevantes=mutations.filter(m=>{
        const target=m.target&&m.target.nodeType===1?m.target:m.target?.parentElement;
        return !(target&&target.closest&&target.closest('#plansCols'));
      });
      if(relevantes.length)callback(relevantes,observer);
    });
  };
  window.MutationObserver.prototype=NativeMutationObserver.prototype;
})();

function isAdminUser(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function currentPlan(){try{return isAdminUser()?'profissional':((typeof myPlan!=='undefined'&&myPlan)||'aprendiz')}catch(e){return'aprendiz'}}
function affiliateMode(){try{return !isAdminUser()&&($('#storeType')?.value||'affiliate')==='affiliate'}catch(e){return false}}
function canOwnProducts(){return isAdminUser()||currentPlan()==='basico'||currentPlan()==='profissional'}
function canEditCatalogQna(){return affiliateMode()&&(currentPlan()==='basico'||currentPlan()==='profissional')}
function limitFor(p){return p==='aprendiz'?10:(p==='basico'?50:1000000)}
function upgrade(){try{if(typeof abrirPlanos==='function')return abrirPlanos()}catch(e){};try{window.abrirPlanos?.()}catch(e){}}
function notify(msg){try{if(typeof toast==='function')return toast(msg)}catch(e){};alert(msg)}
function applyLimits(){
  try{
    if(typeof PLANOS!=='undefined'){
      if(PLANOS.aprendiz)PLANOS.aprendiz.limiteProdutos=10;
      if(PLANOS.basico)PLANOS.basico.limiteProdutos=50;
      if(PLANOS.profissional)PLANOS.profissional.limiteProdutos=1000000;
    }
    if(typeof myProductLimit!=='undefined')myProductLimit=limitFor(currentPlan());
  }catch(e){}
}
function installOwnProductStyle(){
  if($('#basicOwnProductStyle'))return;
  const style=document.createElement('style');
  style.id='basicOwnProductStyle';
  style.textContent=`
    #products .product.basic-own-product-editor{display:block!important}
    #products .product.basic-own-product-editor .product-head{display:flex!important}
    #products .product.basic-own-product-editor .affiliate-product-summary{display:none!important}
    #products .product.basic-own-product-editor .own-product-visible{display:flex!important}
    #products .product.basic-own-product-editor .own-product-image-tabs{display:flex!important}
    #products .product.basic-own-product-editor .own-product-image-box{display:block!important}
    #products .product.basic-own-product-editor .own-product-image-box.upload-box:not(.active){display:none!important}
    #products .product.basic-own-product-editor .image-preview{display:flex!important}

    /* Básico/Profissional: perguntas específicas continuam editáveis mesmo no catálogo simplificado. */
    #products .product.catalog-qna-editor{display:block!important}
    #products .product.catalog-qna-editor .catalog-qna-visible{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
    #products .product.catalog-qna-editor .add-prod-qna.catalog-qna-visible{display:inline-flex!important;align-items:center!important}
    #products .product.catalog-qna-editor .prod-qna-list.catalog-qna-visible{display:block!important}
    #products .product.catalog-qna-editor .prod-qna-row{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
    #products .product.catalog-qna-editor .prod-qna-row input,
    #products .product.catalog-qna-editor .prod-qna-row textarea{pointer-events:auto!important}
  `;
  document.head.appendChild(style);
}
function markOwnProductFields(card){
  if(!card)return;
  card.classList.add('basic-own-product-editor');
  card.classList.remove('affiliate-compact-card');
  ['name','price','link','imageUrl'].forEach(k=>{
    const input=card.querySelector(`[data-k="${k}"]`);
    const field=input?.closest('.field');
    if(field)field.classList.add('own-product-visible');
  });
  const file=card.querySelector('[data-k="file"]');
  const fileField=file?.closest('.field');
  if(fileField)fileField.classList.add('own-product-visible');
  const urlInput=card.querySelector('[data-k="imageUrl"]');
  const imageArea=urlInput?.closest('.upload-box')?.parentElement;
  if(imageArea){
    imageArea.querySelectorAll('.tabs').forEach(el=>el.classList.add('own-product-image-tabs'));
    imageArea.querySelectorAll('.upload-box').forEach(el=>el.classList.add('own-product-image-box'));
    imageArea.querySelectorAll('.image-preview').forEach(el=>el.style.setProperty('display','flex','important'));
  }else{
    card.querySelectorAll('.tabs').forEach(el=>{
      if(el.querySelector('[data-mode="url"]')||el.querySelector('[data-mode="upload"]'))el.classList.add('own-product-image-tabs');
    });
    card.querySelectorAll('.upload-box').forEach(box=>{
      if(box.querySelector('[data-k="imageUrl"]')||box.querySelector('[data-k="file"]'))box.classList.add('own-product-image-box');
    });
  }
}
function markQnaPath(card,node){
  if(!card||!node)return;
  let el=node;
  while(el&&el!==card){el.classList?.add('catalog-qna-visible');el=el.parentElement;}
}
function revealCatalogQna(){
  if(!canEditCatalogQna())return;
  installOwnProductStyle();
  $$('#products .product').forEach(card=>{
    if(!(card.dataset.catalogProductId||card.dataset.catalogId))return;
    const list=card.querySelector('.prod-qna-list');
    const add=card.querySelector('.add-prod-qna');
    if(!list&&!add)return;
    card.classList.add('catalog-qna-editor');
    markQnaPath(card,list);markQnaPath(card,add);
    list?.classList.add('catalog-qna-visible');
    add?.classList.add('catalog-qna-visible');
    card.querySelectorAll('.prod-qna-row').forEach(row=>{row.classList.add('catalog-qna-visible');markQnaPath(card,row)});
  });
}
function revealOwnProductEditor(){
  if(!canOwnProducts())return;
  installOwnProductStyle();
  const add=$('#addProduct');
  if(add){
    add.style.setProperty('display','inline-block','important');
    add.disabled=false;
    if(add.textContent!=='+ Produto próprio')add.textContent='+ Produto próprio';
  }
  $$('#products .product').forEach(card=>{
    if(card.dataset.catalogProductId||card.dataset.catalogId)return;
    markOwnProductFields(card);
  });
}
function protectFreeOwnProducts(){
  document.addEventListener('click',e=>{
    const add=e.target.closest?.('#addProduct');
    if(!add||canOwnProducts())return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    notify('Produto próprio, upload e link de imagem são liberados a partir do plano Básico. O catálogo continua disponível no Aprendiz.');
    upgrade();
  },true);
}
function updatePlanText(){
  const cols=$('#plansCols');if(!cols)return;
  $$('.plan-card',cols).forEach(card=>{
    const title=card.querySelector('h3')?.textContent||'';
    const lim=card.querySelector('.lim,.plan-benefits');
    if(!lim)return;
    let wanted='';
    if(/aprendiz|grátis/i.test(title))wanted='✅ Até 10 produtos<br>✅ Catálogo pronto<br>✅ Chat Vendedor ativo<br>✅ Troca dos links de afiliado';
    else if(/básico/i.test(title))wanted='✅ Até 50 produtos<br>✅ Catálogo pronto<br>✅ Editar perguntas do produto<br>✅ Produtos próprios<br>✅ Upload de imagem<br>✅ Link de imagem<br>✅ Chat Vendedor ativo';
    else if(/profissional/i.test(title))wanted='✅ Produtos ilimitados<br>✅ Catálogo pronto<br>✅ Editar perguntas do produto<br>✅ Produtos próprios<br>✅ Upload e link de imagem<br>✅ Loja Virtual completa<br>✅ Recursos avançados';
    if(wanted&&lim.innerHTML!==wanted)lim.innerHTML=wanted;
    if(wanted){lim.classList.remove('lim');lim.classList.add('plan-benefits')}
  });
}

/* O simplificador do catálogo injeta o modelo padrão em p.qna. Para Básico/Profissional,
   sobrescrevemos com o que o afiliado realmente editou nos campos daquele produto. */
function installCatalogQnaCollect(){
  if(typeof window.collect!=='function'||window.collect.__affiliateCatalogQnaWrapped)return;
  const original=window.collect;
  function wrapped(){
    const data=original();
    if(canEditCatalogQna()&&Array.isArray(data?.products)){
      const cards=$$('#products .product');
      data.products.forEach((p,i)=>{
        const card=cards[i];
        if(!card||( !(card.dataset.catalogProductId||card.dataset.catalogId) ))return;
        const rows=$$('.prod-qna-row',card);
        if(!rows.length)return;
        p.qna=rows.map(row=>({
          question:String(row.querySelector('.pq-question')?.value||'').trim(),
          answer:String(row.querySelector('.pq-answer')?.value||'').trim()
        })).filter(x=>x.question&&x.answer);
      });
    }
    return data;
  }
  wrapped.__affiliateCatalogQnaWrapped=true;
  window.collect=wrapped;try{collect=wrapped}catch(e){}
}
function refresh(){applyLimits();if(canOwnProducts())revealOwnProductEditor();revealCatalogQna();installCatalogQnaCollect()}
function boot(){
  protectFreeOwnProducts();
  refresh();
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#verPlanosBtn,#verPlanosLink,[onclick*="abrirPlanos"],#addProduct,.add-prod-qna,#catalogoLista button[data-id]'))setTimeout(()=>{updatePlanText();refresh()},80);
  },true);
  setInterval(refresh,2500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
