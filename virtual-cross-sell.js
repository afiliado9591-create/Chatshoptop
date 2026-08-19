/* ChatShop: order bump com mini produtos na pagina de vendas da Loja Virtual. */
(function(){
'use strict';

const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
let autoAdding=false;

function readData(){
  if(window.__CHATSHOP_STORE_DATA)return window.__CHATSHOP_STORE_DATA;
  if(window.__CHATSHOP_STORE_FEATURE_DATA)return window.__CHATSHOP_STORE_FEATURE_DATA;
  for(const id of ['chatshopDirectVirtualBootstrap','chatshopStoreFeatureBootstrap']){
    const text=document.getElementById(id)?.textContent||'';
    const marker=id==='chatshopDirectVirtualBootstrap'?'window.__CHATSHOP_STORE_DATA=':'window.__CHATSHOP_STORE_FEATURE_DATA=';
    const pos=text.indexOf(marker);
    if(pos<0)continue;
    try{return JSON.parse(text.slice(pos+marker.length).trim().replace(/;\s*$/,''));}catch(e){}
  }
  return null;
}

function normalizedStoreType(data){
  return norm(data?.storeType||data?.type||'').replace(/[^a-z]/g,'');
}
function slugBase(value){
  return norm(value).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'produto';
}
function buildSlugs(products){
  const used={};
  return products.map(p=>{
    const base=slugBase(p?.name);
    used[base]=(used[base]||0)+1;
    return used[base]===1?base:(base+'-'+used[base]);
  });
}
function safeImage(p){
  const list=Array.isArray(p?.images)?p.images:[p?.image];
  const raw=String(list.find(Boolean)||p?.image||'').trim();
  if(/^data:image\//i.test(raw))return raw;
  try{const u=new URL(raw,location.origin);return /^https?:$/.test(u.protocol)?u.href:'';}catch(e){return '';}
}
function price(v){
  const s=String(v||'').trim();
  if(!s)return '';
  return /r\$/i.test(s)?s:'R$ '+s;
}

function installStyle(main){
  if($('#virtualCrossSellStyle'))return;
  const style=document.createElement('style');
  style.id='virtualCrossSellStyle';
  style.textContent=`
    .vxs-wrap{margin:16px 0 4px;padding:13px 12px 12px;border:1px solid #ececec;border-radius:14px;background:#fff;box-shadow:0 2px 9px rgba(0,0,0,.06)}
    .vxs-title{font-size:13px;font-weight:900;color:#1f2937;margin:0 0 3px}.vxs-sub{font-size:10.5px;color:#6b7280;margin:0 0 9px}
    .vxs-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .vxs-item{position:relative;min-width:0;border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:5px;cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent;display:block}
    .vxs-item:active{transform:scale(.97)}.vxs-item.selected{border-color:${main};box-shadow:0 0 0 2px ${main}22;background:#fffafb}
    .vxs-check{position:absolute;top:8px;right:8px;z-index:2;width:20px;height:20px;accent-color:${main};cursor:pointer}
    .vxs-img,.vxs-noimg{width:100%;aspect-ratio:1/1;border-radius:7px;background:#f5f5f5;display:grid;place-items:center;overflow:hidden}
    .vxs-img img{width:100%;height:100%;object-fit:cover;display:block}.vxs-noimg{font-size:22px;color:#9ca3af}
    .vxs-name{font-size:10px;line-height:1.18;font-weight:800;color:#374151;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .vxs-price{font-size:10px;line-height:1.15;font-weight:900;color:${main};margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .vxs-picked{display:none;font-size:9px;font-weight:900;color:${main};margin-top:4px}.vxs-item.selected .vxs-picked{display:block}
    body.vxs-auto-adding #csvProduct,body.vxs-auto-adding #vsProductModal{visibility:hidden!important;pointer-events:none!important}
    @media(max-width:430px){.vxs-wrap{margin-top:14px;padding:11px 9px}.vxs-grid{gap:6px}.vxs-item{padding:4px}.vxs-name,.vxs-price{font-size:9.5px}.vxs-check{top:6px;right:6px;width:19px;height:19px}}
  `;
  document.head.appendChild(style);
}

function currentIndex(products,slugs,scope){
  const m=location.pathname.match(/^\/produto\/([^/]+)\/?$/i);
  if(m){
    let wanted='';try{wanted=decodeURIComponent(m[1]).toLowerCase();}catch(e){wanted=String(m[1]||'').toLowerCase();}
    const bySlug=slugs.indexOf(wanted);if(bySlug>=0)return bySlug;
  }
  try{
    const qp=new URLSearchParams(location.search).get('product');
    if(qp!==null&&qp!==''){
      const qi=Number(qp);
      if(Number.isInteger(qi)&&products[qi])return qi;
      const qs=slugBase(qp);
      const byQuery=slugs.indexOf(qs);if(byQuery>=0)return byQuery;
    }
  }catch(e){}
  const explicit=scope?.querySelector('[data-product-index]')?.dataset?.productIndex || scope?.querySelector('[data-i]')?.dataset?.i || scope?.querySelector('[data-product]')?.dataset?.product || scope?.dataset?.productIndex || scope?.dataset?.product;
  if(explicit!==undefined&&explicit!==null&&explicit!==''){
    const i=Number(explicit);if(Number.isInteger(i)&&products[i])return i;
  }
  const nameEl=scope?.querySelector('.sg-name,.cgc-name,.csv-dname,.csv-detail-name,.vs-detail-name,.csv-name,[data-product-name],h1,h2');
  const shown=norm(nameEl?.textContent||'');
  if(shown){
    let i=products.findIndex(p=>norm(p?.name)===shown);if(i>=0)return i;
    i=products.findIndex(p=>{const n=norm(p?.name);return n&&shown&&(shown.includes(n)||n.includes(shown));});if(i>=0)return i;
  }
  return -1;
}

function detailScope(){
  const known=$('.sg-detail-wrap') || $('.cgc-detail,.cgc-detail-wrap') || $('#csvProductBody') || $('#vsProductBody') || $('.csv-product-detail,.csv-detail-wrap');
  if(known)return known;
  const buy=$('#csvAdd,.csv-add,#vsAdd,.vs-add,.sg-buy,.cgc-buy,.csv-buy,[data-add-cart]');
  return buy?.closest('section,article,main,.modal,.sheet,.product-detail,div')||null;
}
function anchorIn(scope){
  return scope.querySelector('#csvAdd,.csv-add,#vsAdd,.vs-add,.sg-buy,.cgc-buy,.csv-buy,[data-add-cart]') || scope.querySelector('.sg-card,.cgc-card,.vs-detail-name,.csv-dname,.csv-detail-name,[data-product-name]') || scope.lastElementChild;
}

function selectedBumps(scope){
  return $$('.vxs-check:checked',scope||document).map(x=>Number(x.value)).filter(Number.isInteger);
}
function markSelection(input){
  const item=input.closest('.vxs-item');if(item)item.classList.toggle('selected',input.checked);
}

function addOneThroughExistingCart(index){
  const csvOpen=$(`#csvGrid [data-product="${index}"]`);
  if(csvOpen){
    csvOpen.click();
    const add=$('#csvAdd');
    if(add){add.click();return true;}
  }
  const vsOpen=$(`#vsGrid [data-product="${index}"]`);
  if(vsOpen){
    vsOpen.click();
    const add=$('#vsAdd');
    if(add){add.click();return true;}
  }
  return false;
}
function addBumps(indices){
  const unique=[...new Set(indices)].filter(i=>i>=0);
  if(!unique.length)return;
  autoAdding=true;document.body.classList.add('vxs-auto-adding');
  let added=0;
  unique.forEach(i=>{if(addOneThroughExistingCart(i))added++;});
  document.body.classList.remove('vxs-auto-adding');autoAdding=false;
  if(added){
    const toast=$('#csvToast,#vsToast');
    if(toast){toast.textContent=added===1?'Produto extra adicionado à sacola':'Produtos extras adicionados à sacola';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800);}
  }
}

function render(){
  const data=readData();
  if(!data)return;
  const type=normalizedStoreType(data);
  if(type&&type!=='virtual'&&type!=='lojavirtual')return;
  const products=Array.isArray(data.products)?data.products:[];
  if(products.length<2)return;
  const scope=detailScope();
  if(!scope){$$('.vxs-wrap').forEach(x=>x.remove());return;}
  if(scope.querySelector('.vxs-wrap'))return;

  const slugs=buildSlugs(products);
  let active=currentIndex(products,slugs,scope);
  if(active<0)active=0;
  const related=products.map((p,i)=>({p,i})).filter(x=>x.i!==active).slice(0,4);
  if(!related.length)return;

  const main=/^#[0-9a-f]{6}$/i.test(String(data.priceColor||''))?data.priceColor:(/^#[0-9a-f]{6}$/i.test(String(data.mainColor||''))?data.mainColor:'#c2185b');
  installStyle(main);
  const wrap=document.createElement('section');
  wrap.className='vxs-wrap';
  wrap.setAttribute('aria-label','Adicionar produtos extras ao pedido');
  wrap.innerHTML='<div class="vxs-title">Leve junto</div><div class="vxs-sub">Marque um produto extra para adicionar junto à sacola.</div><div class="vxs-grid">'+related.map(({p,i})=>{
    const img=safeImage(p),name=String(p?.name||'Produto').trim()||'Produto';
    return `<label class="vxs-item" aria-label="Adicionar ${esc(name)} ao pedido"><input class="vxs-check" type="checkbox" value="${i}"><div class="vxs-img">${img?`<img src="${esc(img)}" alt="${esc(name)}">`:'<div class="vxs-noimg">🛍️</div>'}</div><div class="vxs-name">${esc(name)}</div>${p?.price?`<div class="vxs-price">${esc(price(p.price))}</div>`:''}<div class="vxs-picked">✓ Vai junto</div></label>`;
  }).join('')+'</div>';
  wrap.addEventListener('change',e=>{if(e.target.classList.contains('vxs-check'))markSelection(e.target);});
  const anchor=anchorIn(scope);
  if(anchor&&anchor.parentNode)anchor.insertAdjacentElement('afterend',wrap);else scope.appendChild(wrap);
}

document.addEventListener('click',e=>{
  if(autoAdding)return;
  const add=e.target.closest('#csvAdd,.csv-add,#vsAdd,.vs-add,[data-add-cart]');
  if(!add)return;
  const scope=add.closest('#csvProductBody,#vsProductBody,.csv-product-detail,.csv-detail-wrap,.product-detail')||document;
  const bumps=selectedBumps(scope);
  if(!bumps.length)return;
  setTimeout(()=>addBumps(bumps),40);
},true);

let timer=null;
function schedule(){clearTimeout(timer);timer=setTimeout(render,70);}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
document.addEventListener('click',schedule,true);
window.addEventListener('popstate',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
setTimeout(schedule,250);setTimeout(schedule,700);setTimeout(schedule,1500);
})();
