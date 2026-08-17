/* ChatShop: mini produtos relacionados na pagina de vendas da Loja Virtual. */
(function(){
'use strict';

const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

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
    .vxs-title{font-size:13px;font-weight:900;color:#1f2937;margin:0 0 9px}
    .vxs-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .vxs-item{min-width:0;border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:5px;cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent}
    .vxs-item:active{transform:scale(.97)}
    .vxs-img,.vxs-noimg{width:100%;aspect-ratio:1/1;border-radius:7px;background:#f5f5f5;display:grid;place-items:center;overflow:hidden}
    .vxs-img img{width:100%;height:100%;object-fit:cover;display:block}
    .vxs-noimg{font-size:22px;color:#9ca3af}
    .vxs-name{font-size:10px;line-height:1.18;font-weight:800;color:#374151;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .vxs-price{font-size:10px;line-height:1.15;font-weight:900;color:${main};margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    @media(max-width:430px){.vxs-wrap{margin-top:14px;padding:11px 9px}.vxs-grid{gap:6px}.vxs-item{padding:4px}.vxs-name,.vxs-price{font-size:9.5px}}
  `;
  document.head.appendChild(style);
}

function currentIndex(products,slugs,scope){
  const m=location.pathname.match(/^\/produto\/([^/]+)\/?$/i);
  if(m){
    let wanted='';try{wanted=decodeURIComponent(m[1]).toLowerCase();}catch(e){wanted=String(m[1]||'').toLowerCase();}
    const bySlug=slugs.indexOf(wanted);if(bySlug>=0)return bySlug;
  }
  const explicit=scope?.querySelector('[data-product-index]')?.dataset?.productIndex || scope?.querySelector('[data-i]')?.dataset?.i || scope?.querySelector('[data-product]')?.dataset?.product;
  if(explicit!==undefined&&explicit!==null&&explicit!==''){
    const i=Number(explicit);if(Number.isInteger(i)&&products[i])return i;
  }
  const nameEl=scope?.querySelector('.sg-name,.cgc-name,.csv-detail-name,.vs-detail-name,.csv-name');
  const shown=norm(nameEl?.textContent||'');
  if(shown){const i=products.findIndex(p=>norm(p?.name)===shown);if(i>=0)return i;}
  return -1;
}

function detailScope(){
  return $('.sg-detail-wrap') || $('.cgc-detail,.cgc-detail-wrap') || $('#vsProductBody') || $('.csv-product-detail,.csv-detail-wrap') || null;
}
function anchorIn(scope){
  return scope.querySelector('.sg-buy,.cgc-buy,#vsAdd,.vs-add,.csv-buy,.csv-add') || scope.querySelector('.sg-card,.cgc-card,.vs-detail-name,.csv-detail-name') || scope.lastElementChild;
}

function render(){
  const data=readData();
  if(!data||data.storeType!=='virtual')return;
  const products=Array.isArray(data.products)?data.products:[];
  if(products.length<2)return;
  const scope=detailScope();
  if(!scope){$$('.vxs-wrap').forEach(x=>x.remove());return;}
  if(scope.querySelector('.vxs-wrap'))return;

  const slugs=buildSlugs(products);
  const active=currentIndex(products,slugs,scope);
  if(active<0)return;
  const related=products.map((p,i)=>({p,i})).filter(x=>x.i!==active).slice(0,4);
  if(!related.length)return;

  const main=/^#[0-9a-f]{6}$/i.test(String(data.priceColor||''))?data.priceColor:(/^#[0-9a-f]{6}$/i.test(String(data.mainColor||''))?data.mainColor:'#c2185b');
  installStyle(main);
  const wrap=document.createElement('section');
  wrap.className='vxs-wrap';
  wrap.setAttribute('aria-label','Produtos relacionados');
  wrap.innerHTML='<div class="vxs-title">Você também pode gostar</div><div class="vxs-grid">'+related.map(({p,i})=>{
    const img=safeImage(p),name=String(p?.name||'Produto').trim()||'Produto';
    return `<button type="button" class="vxs-item" data-vxs-index="${i}" aria-label="Ver ${esc(name)}"><div class="vxs-img">${img?`<img src="${esc(img)}" alt="${esc(name)}">`:'<div class="vxs-noimg">🛍️</div>'}</div><div class="vxs-name">${esc(name)}</div>${p?.price?`<div class="vxs-price">${esc(price(p.price))}</div>`:''}</button>`;
  }).join('')+'</div>';
  wrap.addEventListener('click',e=>{
    const item=e.target.closest('[data-vxs-index]');if(!item)return;
    const i=Number(item.dataset.vxsIndex);if(!Number.isInteger(i)||!products[i])return;
    location.href='/produto/'+encodeURIComponent(slugs[i]||('produto-'+(i+1)));
  });
  const anchor=anchorIn(scope);
  if(anchor&&anchor.parentNode)anchor.insertAdjacentElement('afterend',wrap);else scope.appendChild(wrap);
}

let timer=null;
function schedule(){clearTimeout(timer);timer=setTimeout(render,70);}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
document.addEventListener('click',schedule,true);
window.addEventListener('popstate',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
setTimeout(schedule,350);setTimeout(schedule,1000);
})();
