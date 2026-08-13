(function(){
'use strict';
const data=window.__CHATSHOP_STORE_DATA||null;
if(!data||data.homeLayout!=='grid')return;
const products=Array.isArray(data.products)?data.products:[];
function slugBase(value){
  return String(value||'produto').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'produto';
}
function buildSlugs(){
  const used={};
  return products.map(p=>{
    const base=slugBase(p&&p.name);
    used[base]=(used[base]||0)+1;
    return used[base]===1?base:(base+'-'+used[base]);
  });
}
const slugs=buildSlugs();
function pathSlug(){
  const m=location.pathname.match(/^\/produto\/([^/]+)\/?$/i);
  if(!m)return'';
  try{return decodeURIComponent(m[1]).toLowerCase()}catch(e){return String(m[1]||'').toLowerCase()}
}
function productPath(index){return '/produto/'+encodeURIComponent(slugs[index]||('produto-'+(index+1)))}
function titleFor(index){
  const p=products[index]||{};
  const brand=String(data.brand||data.storeName||data.name||'Loja').trim()||'Loja';
  const name=String(p.name||'Produto').trim()||'Produto';
  return name+' | '+brand;
}
let suppress=false;
function setRootUrl(replace){
  const fn=replace?'replaceState':'pushState';
  try{history[fn]({chatshopProduct:false},'', '/')}catch(e){}
  const brand=String(data.brand||data.storeName||data.name||'Loja').trim()||'Loja';
  document.title=brand+' · ChatShop';
}
function setProductUrl(index,replace){
  const fn=replace?'replaceState':'pushState';
  try{history[fn]({chatshopProduct:index},'',productPath(index))}catch(e){}
  document.title=titleFor(index);
}

document.addEventListener('click',function(e){
  if(suppress)return;
  if(e.target.closest('.cgc-buy'))return;
  const back=e.target.closest('.cgc-back');
  if(back){setRootUrl(false);return;}
  const menu=e.target.closest('.cgc-menu');
  if(menu){setRootUrl(false);return;}
  const card=e.target.closest('.cgc[data-i]');
  if(card){
    const index=Number(card.dataset.i);
    if(Number.isInteger(index)&&index>=0&&products[index])setProductUrl(index,false);
  }
},true);

function openRequestedProduct(){
  const wanted=pathSlug();
  if(!wanted)return true;
  const index=slugs.indexOf(wanted);
  if(index<0)return true;
  const card=document.querySelector('.cgc[data-i="'+index+'"]');
  if(!card)return false;
  suppress=true;
  try{card.click()}finally{suppress=false;}
  setProductUrl(index,true);
  return true;
}

let tries=0;(function waitGrid(){
  tries++;
  if(openRequestedProduct())return;
  if(tries<60)setTimeout(waitGrid,50);
})();

window.addEventListener('popstate',function(){
  location.reload();
});
})();