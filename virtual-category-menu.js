/* ChatShop - menu de categorias na Loja Virtual.
   Mostra os mesmos botoes de categoria do modulo Catalogo e filtra os produtos. */
(function(){
'use strict';
/* Recursos da vitrine publicada não devem executar dentro do painel/editor. */
if(location.hostname==='alibr.com.br'||location.hostname==='www.alibr.com.br')return;

const data=window.__CHATSHOP_STORE_DATA||null;
if(!data||data.storeType!=='virtual')return;

const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/s$/,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const products=Array.isArray(data.products)?data.products:[];
const categories=[];
const seen=new Set();
products.forEach(p=>{
  const label=String(p?.category||'').trim();
  const key=norm(label);
  if(label&&key&&!seen.has(key)){seen.add(key);categories.push(label)}
});

function validColor(v,fallback){return /^#[0-9a-f]{6}$/i.test(String(v||''))?String(v):fallback}
const main=validColor(data.categoryColor,validColor(data.mainColor,'#c2185b'));
const text=validColor(data.categoryTextColor,'#ffffff');

function installStyle(){
  if(document.getElementById('virtualCategoryMenuStyle'))return;
  const s=document.createElement('style');
  s.id='virtualCategoryMenuStyle';
  s.textContent=`
  .vcm-menu{position:sticky;z-index:11;display:flex;gap:8px;align-items:center;overflow-x:auto;overflow-y:hidden;padding:9px 10px 10px;background:#fafafa;border-bottom:1px solid #ececec;box-shadow:0 2px 8px rgba(0,0,0,.05);white-space:nowrap;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .vcm-menu::-webkit-scrollbar{display:none}
  .vcm-btn{flex:0 0 auto;border:1px solid #e5e7eb;border-radius:999px;padding:9px 14px;background:#fff;color:${main};font-size:12px;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,.07);cursor:pointer}
  .vcm-btn.active{background:${main};color:${text};border-color:${main}}
  .vcm-empty{grid-column:1/-1;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center;color:#6b7280;font-size:13px}
  @media(max-width:520px){.vcm-menu{padding:8px 8px 9px}.vcm-btn{padding:9px 13px;font-size:12px}}
  `;
  document.head.appendChild(s);
}

function getPage(){return document.querySelector('.csv-page,.vs-page')}
function getHead(page){return page?.querySelector('.csv-head,.vs-head')||null}
function getGrid(page){return page?.querySelector('#csvGrid,#vsGrid')||null}
function getCards(grid){return grid?Array.from(grid.querySelectorAll('.csv-card,.vs-card')):[]}
function cardIndex(card,fallback){
  const b=card.querySelector('[data-product]');
  const n=Number(b?.dataset?.product);
  return Number.isInteger(n)&&n>=0?n:fallback;
}

function applyFilter(page,category){
  const grid=getGrid(page);if(!grid)return;
  grid.querySelector('.vcm-empty')?.remove();
  const cards=getCards(grid);
  let visible=0;
  cards.forEach((card,i)=>{
    const idx=cardIndex(card,i);
    const p=products[idx]||{};
    const show=!category||norm(p.category)===norm(category);
    card.style.display=show?'':'none';
    if(show)visible++;
  });
  if(!visible&&cards.length){
    const empty=document.createElement('div');
    empty.className='vcm-empty';
    empty.textContent='Nenhum produto nesta categoria.';
    grid.appendChild(empty);
  }
}

function installMenu(){
  if(data.showCategoryMenu===false||!categories.length)return false;
  const page=getPage();if(!page)return false;
  const head=getHead(page),grid=getGrid(page);if(!head||!grid)return false;
  installStyle();
  let menu=page.querySelector('.vcm-menu');
  if(!menu){
    menu=document.createElement('nav');
    menu.className='vcm-menu';
    menu.setAttribute('aria-label','Categorias de produtos');
    head.insertAdjacentElement('afterend',menu);
  }
  menu.style.top=Math.max(0,head.offsetHeight)+'px';
  if(menu.dataset.ready!=='1'){
    menu.innerHTML=`<button type="button" class="vcm-btn active" data-vcm-cat="">Todas</button>`+
      categories.map(c=>`<button type="button" class="vcm-btn" data-vcm-cat="${esc(c)}">${esc(c)}</button>`).join('');
    menu.addEventListener('click',e=>{
      const btn=e.target.closest('.vcm-btn');if(!btn)return;
      menu.querySelectorAll('.vcm-btn').forEach(x=>x.classList.toggle('active',x===btn));
      applyFilter(page,btn.dataset.vcmCat||'');
    });
    menu.dataset.ready='1';
  }
  return true;
}

let tries=0;
(function start(){tries++;if(installMenu())return;if(tries<50)setTimeout(start,80)})();

const root=document.getElementById('storefrontScreen')||document.body;
new MutationObserver(()=>{setTimeout(installMenu,0)}).observe(root,{childList:true,subtree:true});
window.addEventListener('resize',()=>{const page=getPage(),head=getHead(page),menu=page?.querySelector('.vcm-menu');if(head&&menu)menu.style.top=head.offsetHeight+'px'});
})();
