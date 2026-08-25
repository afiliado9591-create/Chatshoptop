/* ChatShop: catálogo vertical da Loja Virtual, um produto por tela, preservando sacola e checkout. */
(function(){
'use strict';
document.documentElement.dataset.singleProductScript='20260817-2600-virtual-live-menu-production';
setTimeout(function earlySingleProductRecovery(){
  try{
    const el=document.getElementById('chatshopDirectVirtualBootstrap');
    const text=el&&el.textContent||'';
    const marker='window.__CHATSHOP_STORE_DATA=';
    const start=text.indexOf(marker);
    if(start<0)return;
    const value=JSON.parse(text.slice(start+marker.length).trim().replace(/;\s*$/,''));
    window.__CHATSHOP_STORE_DATA=value;
    window.__CHATSHOP_DIRECT_STORE_ACTIVE=true;
    document.documentElement.dataset.singleProductData='ready';
    if(typeof renderPublishedStore==='function'){
      renderPublishedStore(value,null);
      const auth=document.getElementById('authScreen'),gen=document.getElementById('genApp'),root=document.getElementById('storefrontScreen');
      if(auth)auth.style.display='none';if(gen)gen.style.display='none';if(root)root.style.display='block';
      document.documentElement.classList.remove('chatshop-virtual-pending');
      document.documentElement.dataset.singleProductRender='ready';
    }
  }catch(error){
    document.documentElement.dataset.singleProductError=String(error&&error.message||error).slice(0,160);
  }
},300);

function readBootstrapData(){
  const direct=window.__CHATSHOP_STORE_DATA||null;
  if(direct)return direct;
  for(const id of ['chatshopDirectVirtualBootstrap','chatshopStoreFeatureBootstrap']){
    const text=document.getElementById(id)?.textContent||'';
    const marker=id==='chatshopDirectVirtualBootstrap'?'window.__CHATSHOP_STORE_DATA=':'window.__CHATSHOP_STORE_FEATURE_DATA=';
    const start=text.indexOf(marker);
    if(start<0)continue;
    const raw=text.slice(start+marker.length).trim().replace(/;\s*$/,'');
    try{return JSON.parse(raw)}catch(e){console.warn('bootstrap data parse:',id,e)}
  }
  return window.__CHATSHOP_STORE_FEATURE_DATA||null;
}
let data=readBootstrapData();
if(data){window.__CHATSHOP_STORE_DATA=window.__CHATSHOP_STORE_DATA||data;window.__CHATSHOP_DIRECT_STORE_ACTIVE=window.__CHATSHOP_DIRECT_STORE_ACTIVE||!!document.getElementById('chatshopDirectVirtualBootstrap');}
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

function selectedMode(){return $('input[name="virtualDisplayMode"]:checked')?.value||'catalog';}
function selectedProduct(){return Number($('#virtualFeaturedProduct')?.value||0);}
function isVirtual(){return ($('#storeType')?.value||data?.storeType)==='virtual';}

function productNames(){
  return $$('#products .product').map((row,i)=>String($('[data-k="name"]',row)?.value||'Produto '+(i+1)).trim()||'Produto '+(i+1));
}
function refreshProductSelect(preferred){
  const select=$('#virtualFeaturedProduct');if(!select)return;
  const current=Number.isFinite(Number(preferred))?Number(preferred):Number(select.value||0);
  const names=productNames();
  select.innerHTML=names.length?names.map((name,i)=>'<option value="'+i+'">'+String(name).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'</option>').join(''):'<option value="0">Adicione um produto primeiro</option>';
  select.value=String(Math.min(Math.max(0,current),Math.max(0,names.length-1)));
}
function updateEditorVisibility(){
  const box=$('#virtualSingleProductField');if(!box)return;
  box.style.display=isVirtual()?'block':'none';
  $('#virtualFeaturedProductWrap').style.display='none';
  if(isVirtual())refreshProductSelect();
}
function installEditor(){
  /* O painel usa o controle roxo consolidado de três formatos. */
  if(location.hostname==='alibr.com.br'||location.hostname==='www.alibr.com.br')return;
  if($('#virtualSingleProductField')||!$('#storeType'))return;
  const typeField=$('#storeType').closest('.field');if(!typeField)return;
  const box=document.createElement('div');
  box.id='virtualSingleProductField';box.className='field';
  box.style.cssText='margin-top:10px;padding:12px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px';
  box.innerHTML='<label style="font-size:13px">🛒 Formato da Loja Virtual</label><div style="display:grid;gap:8px;margin-top:8px"><label style="display:flex;gap:8px;align-items:flex-start;background:#fff;border:1px solid #d1fae5;border-radius:10px;padding:10px"><input type="radio" name="virtualDisplayMode" value="catalog" checked><span><b>Catálogo completo</b><small style="display:block;color:#6b7280">Mostra todos os produtos da loja.</small></span></label><label style="display:flex;gap:8px;align-items:flex-start;background:#fff;border:1px solid #d1fae5;border-radius:10px;padding:10px"><input type="radio" name="virtualDisplayMode" value="single"><span><b>1 produto por tela</b><small style="display:block;color:#6b7280">Catálogo vertical: o cliente arrasta para cima para ver o próximo produto.</small></span></label></div><div id="virtualFeaturedProductWrap" style="display:none;margin-top:10px"><label style="font-size:12px;font-weight:800">Produto principal</label><select id="virtualFeaturedProduct" style="width:100%;margin-top:6px;border:1px solid #d1d5db;border-radius:10px;padding:10px;background:#fff"></select><small style="display:block;color:#6b7280;margin-top:5px">Este produto será aberto automaticamente quando o cliente entrar na loja.</small></div>';
  typeField.insertAdjacentElement('afterend',box);
  $('#storeType').addEventListener('change',updateEditorVisibility);
  box.addEventListener('change',()=>{updateEditorVisibility();try{if(typeof debounce==='function')debounce()}catch(e){}});
  $('#products')?.addEventListener('input',e=>{if(e.target.matches('[data-k="name"]'))refreshProductSelect()});
  new MutationObserver(()=>refreshProductSelect()).observe($('#products'),{childList:true,subtree:true});
  updateEditorVisibility();

  try{
    if(typeof collect==='function'&&!collect.__virtualSingleWrapped){
      const original=collect;
      const wrapped=function(){const value=original();value.virtualDisplayMode=selectedMode();value.virtualFeaturedProduct=selectedProduct();return value};
      wrapped.__virtualSingleWrapped=true;collect=wrapped;
    }
    if(typeof populateForm==='function'&&!populateForm.__virtualSingleWrapped){
      const original=populateForm;
      const wrapped=async function(value){const result=await original(value);const mode=value?.virtualDisplayMode==='single'?'single':'catalog';const radio=$('input[name="virtualDisplayMode"][value="'+mode+'"]');if(radio)radio.checked=true;refreshProductSelect(value?.virtualFeaturedProduct||0);updateEditorVisibility();return result};
      wrapped.__virtualSingleWrapped=true;populateForm=wrapped;
    }
    if(typeof clearForm==='function'&&!clearForm.__virtualSingleWrapped){
      const original=clearForm;
      const wrapped=function(){const result=original();const radio=$('input[name="virtualDisplayMode"][value="catalog"]');if(radio)radio.checked=true;refreshProductSelect(0);updateEditorVisibility();return result};
      wrapped.__virtualSingleWrapped=true;clearForm=wrapped;
    }
  }catch(e){console.warn('virtual single editor:',e)}
}

function productSlug(value){return norm(value).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'produto'}
function installPublished(storeData){
  const publishedData=storeData||window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||null;
  if(!publishedData||publishedData.storeType!=='virtual'||publishedData.virtualDisplayMode!=='single')return;
  if(document.body.classList.contains('chatshop-virtual-tiktok'))return;
  let tries=0;
  (function applyTikTokStore(){
    tries++;
    const page=$('.csv-page,.vs-page'),grid=$('.csv-grid,.vs-grid');
    if(!page||!grid){if(tries<120)setTimeout(applyTikTokStore,80);return}
    document.body.classList.add('chatshop-virtual-single-product','chatshop-virtual-swipe','chatshop-virtual-tiktok');
    const products=Array.isArray(publishedData.products)?publishedData.products:[];
    const validColor=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value):fallback;
    const main=validColor(publishedData.mainColor||publishedData.main||publishedData.primaryColor,'#c9145b');
    const paletteCard=validColor(publishedData.cardColor,'#ffffff');
    const cardOpacity=Math.min(100,Math.max(0,Number(publishedData.cardOpacity??95)))/100;
    const cardColor='rgba('+[parseInt(paletteCard.slice(1,3),16),parseInt(paletteCard.slice(3,5),16),parseInt(paletteCard.slice(5,7),16),cardOpacity].join(',')+')';
    const cardText=validColor(publishedData.cardTextColor,'#1a1a1a');
    const priceColor=validColor(publishedData.priceColor,main);
    const categoryColor=validColor(publishedData.categoryColor,main);
    const categoryText=validColor(publishedData.categoryTextColor,'#ffffff');
    const style=document.createElement('style');style.id='virtualSingleProductPublishedStyle';
    style.textContent=`
      body.chatshop-virtual-tiktok{overflow:hidden!important;background:#fff!important}
      body.chatshop-virtual-tiktok .csv-page,body.chatshop-virtual-tiktok .vs-page{height:100dvh!important;min-height:100dvh!important;overflow:hidden!important;background:#fff!important}
      body.chatshop-virtual-tiktok .csv-head,body.chatshop-virtual-tiktok .vs-head,body.chatshop-virtual-tiktok #chatshopGridTop,body.chatshop-virtual-tiktok #chatshopGridMenu,body.chatshop-virtual-tiktok .pub-cat-menu,body.chatshop-virtual-tiktok .vcm-menu,body.chatshop-virtual-tiktok .category-menu,body.chatshop-virtual-tiktok .catalog-categories{display:none!important}
      body.chatshop-virtual-tiktok .csv-title small{color:#f3f4f6!important}
      body.chatshop-virtual-tiktok .csv-hero,body.chatshop-virtual-tiktok .vs-hero{display:none!important}
      body.chatshop-virtual-tiktok .csv-grid,body.chatshop-virtual-tiktok .vs-grid{height:100dvh!important;display:block!important;overflow-y:auto!important;overflow-x:hidden!important;padding:0!important;margin:0!important;max-width:none!important;scroll-snap-type:y mandatory!important;overscroll-behavior-y:contain!important}
      body.chatshop-virtual-tiktok .csv-card,body.chatshop-virtual-tiktok .vs-card{position:relative!important;height:100dvh!important;min-height:100dvh!important;scroll-snap-align:start!important;scroll-snap-stop:always!important;border:0!important;border-radius:0!important;box-shadow:none!important;display:block!important;overflow:hidden!important;background:#fff!important}
      body.chatshop-virtual-tiktok .csv-photo,body.chatshop-virtual-tiktok .vs-card-img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;aspect-ratio:auto!important;background:#f7f3f3!important;display:block!important}
      body.chatshop-virtual-tiktok .csv-photo:after,body.chatshop-virtual-tiktok .vs-card-img:after{content:"";position:absolute;inset:45% 0 0;background:linear-gradient(transparent 0%,rgba(255,255,255,.08) 45%,rgba(255,255,255,.32) 100%)!important;pointer-events:none}
      body.chatshop-virtual-tiktok .csv-photo img,body.chatshop-virtual-tiktok .vs-card-img img{width:100%!important;height:100%!important;object-fit:cover!important;object-position:center top!important}
      body.chatshop-virtual-tiktok .csv-body,body.chatshop-virtual-tiktok .vs-card-body{position:absolute!important;left:18px!important;right:92px!important;bottom:100px!important;z-index:8!important;padding:12px 14px!important;border-radius:14px!important;background:${cardColor}!important;backdrop-filter:none!important;color:${cardText}!important;box-shadow:0 2px 12px rgba(0,0,0,.30)!important}
      body.chatshop-virtual-tiktok .csv-name,body.chatshop-virtual-tiktok .vs-card-name{color:${cardText}!important;font-size:21px!important;line-height:1.2!important;min-height:0!important;font-weight:900!important}
      body.chatshop-virtual-tiktok .csv-price,body.chatshop-virtual-tiktok .vs-card-price{color:${priceColor}!important;font-size:20px!important;margin:6px 0 12px!important}
      body.chatshop-virtual-tiktok .csv-open,body.chatshop-virtual-tiktok .vs-open{width:auto!important;min-width:0!important;border-radius:26px!important;font-size:14px!important;padding:12px 24px!important;background:${main}!important}
      body.chatshop-virtual-tiktok .vts-actions{position:absolute;right:13px;bottom:115px;z-index:18;display:flex;flex-direction:column;gap:10px;align-items:center}
      body.chatshop-virtual-tiktok .vts-action{width:58px;height:58px;border:0;border-radius:50%;background:rgba(255,255,255,.94);color:#111827;box-shadow:0 5px 18px rgba(0,0,0,.28);font-size:23px;display:grid;place-items:center;cursor:pointer}
      body.chatshop-virtual-tiktok .vts-action span{position:absolute;right:64px;background:rgba(17,24,39,.82);color:#fff;padding:6px 9px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap;opacity:0;pointer-events:none}
      body.chatshop-virtual-tiktok .vts-action:focus span,body.chatshop-virtual-tiktok .vts-action:active span{opacity:1}
      body.chatshop-virtual-tiktok .vts-categories{pointer-events:auto!important;isolation:isolate;position:fixed;right:14px;top:50%;transform:translateY(-50%);z-index:32;display:flex;flex-direction:column;align-items:flex-end;gap:8px;max-height:66dvh;overflow:auto;padding:2px}
      body.chatshop-virtual-tiktok .virtual-seller-audio-btn,body.chatshop-virtual-tiktok .seller-audio-btn,body.chatshop-virtual-tiktok .vts-audio{display:none!important}
      body.chatshop-virtual-tiktok .vts-category{pointer-events:auto!important;touch-action:manipulation;cursor:pointer;border:0;border-radius:999px;background:rgba(255,255,255,.96);color:${categoryColor};font-weight:900;padding:10px 14px;box-shadow:0 3px 12px rgba(0,0,0,.22);white-space:nowrap}
      body.chatshop-virtual-tiktok .vts-category.active{background:${categoryColor};color:${categoryText}}
      body.chatshop-virtual-tiktok #pubChatToggle{bottom:18px!important;right:16px!important;z-index:40!important}
      body.chatshop-virtual-tiktok #vsCartModal,body.chatshop-virtual-tiktok #csvCartModal{z-index:80!important}
      body.chatshop-virtual-tiktok .vts-floating-cart{display:none;position:fixed;right:14px;top:14px;z-index:48;border:0;border-radius:999px;background:${main};color:#fff;min-height:48px;padding:10px 15px;align-items:center;gap:7px;font-size:15px;font-weight:900;box-shadow:0 5px 18px rgba(0,0,0,.32);cursor:pointer}
      body.chatshop-virtual-tiktok .vts-floating-cart.has-items{display:flex!important}
      body.chatshop-virtual-tiktok .vts-floating-cart-count{min-width:23px;height:23px;border-radius:50%;background:#fff;color:${main};display:grid;place-items:center;font-size:12px}
      @media(max-width:560px){body.chatshop-virtual-tiktok .csv-body{left:18px!important;right:78px!important;bottom:92px!important;padding:14px!important}body.chatshop-virtual-tiktok .csv-name{font-size:20px!important}body.chatshop-virtual-tiktok .vts-actions{right:10px;bottom:106px}body.chatshop-virtual-tiktok .vts-action{width:52px;height:52px}.vts-categories{top:82px!important}}
    `;
    document.head.appendChild(style);
    const escText=value=>String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const cards=$$('.csv-card,.vs-card',grid);
    const usedSlugs={};
    const productSlugs=products.map(product=>{const base=productSlug(product?.name);usedSlugs[base]=(usedSlugs[base]||0)+1;return usedSlugs[base]===1?base:base+'-'+usedSlugs[base]});
    const productUrl=index=>location.origin+'/produto/'+encodeURIComponent(productSlugs[index]||('produto-'+(index+1)));
    cards.forEach((card,index)=>{
      const product=products[index]||{};
      const buy=card.querySelector('.csv-open,.vs-open,[data-product]');
      if(buy)buy.textContent='Comprar agora';
      const body=card.querySelector('.csv-body,.vs-card-body'),name=card.querySelector('.csv-name,.vs-card-name');
      if(body&&name&&product.category&&!body.querySelector('.vts-card-category')){const chip=document.createElement('span');chip.className='vts-card-category';chip.textContent=String(product.category);chip.style.cssText='display:inline-block;background:'+categoryColor+';color:'+categoryText+';font-size:11px;font-weight:800;padding:4px 10px;border-radius:12px;margin-bottom:8px';body.insertBefore(chip,name)}
      if(card.querySelector('.vts-actions'))return;
      const actions=document.createElement('div');actions.className='vts-actions';
      const share=document.createElement('button');share.type='button';share.className='vts-action vts-share';share.innerHTML='↗️<span>Compartilhar</span>';
      share.onclick=async event=>{event.stopPropagation();const payload={title:String(product.name||publishedData.brand||'Produto'),text:String(product.name||'Confira este produto'),url:productUrl(index)};try{if(navigator.share)await navigator.share(payload);else{await navigator.clipboard.writeText(payload.url);alert('Link do produto copiado!')}}catch(e){}};
      if(index===0){const bag=document.createElement('button');bag.type='button';bag.className='vts-action vts-bag';bag.innerHTML='🛍️<span>Abrir sacola</span>';bag.onclick=event=>{event.stopPropagation();$('#csvBag,.vs-bag')?.click()};actions.appendChild(bag)}
      actions.append(share);card.appendChild(actions);
      card.id='produto-'+productSlugs[index];card.dataset.productSlug=productSlugs[index];
    });
    /* Sacola flutuante: mantém a tela limpa enquanto vazia e aparece após adicionar um item. */
    let floatingBag=$('#vtsFloatingBag');
    if(!floatingBag){
      floatingBag=document.createElement('button');floatingBag.id='vtsFloatingBag';floatingBag.type='button';floatingBag.className='vts-floating-cart';
      floatingBag.innerHTML='🛍️ Sacola <span class="vts-floating-cart-count">0</span>';
      document.body.appendChild(floatingBag);
    }
    const getOriginalBag=()=>document.getElementById('vsBag')||document.getElementById('csvBag')||$('.vs-bag');
    const syncFloatingBag=()=>{
      const originalBag=getOriginalBag();
      const countEl=$('#vsBagCount,#csvCount,#vsBag .vs-bag-count');
      const match=String(countEl?.textContent||originalBag?.textContent||'0').match(/\d+/);
      const count=match?Number(match[0]):0;
      $('.vts-floating-cart-count',floatingBag).textContent=String(count);
      floatingBag.classList.toggle('has-items',count>0);
      floatingBag.setAttribute('aria-label','Abrir sacola com '+count+' item'+(count===1?'':'s'));
    };
    const openShoppingBag=event=>{
      event?.preventDefault();event?.stopPropagation();
      const originalBag=getOriginalBag();
      if(originalBag)originalBag.click();
    };
    floatingBag.onclick=openShoppingBag;
    const originalBag=getOriginalBag();
    if(originalBag&&!originalBag.dataset.floatingBagObserved){
      originalBag.dataset.floatingBagObserved='1';
      new MutationObserver(syncFloatingBag).observe(originalBag,{childList:true,subtree:true,characterData:true});
    }
    document.addEventListener('click',event=>{if(event.target.closest?.('#csvAdd,#vsAdd'))setTimeout(syncFloatingBag,40)},true);
    syncFloatingBag();

    const categoryValues=['Todas',...new Set(products.map(p=>String(p.category||'').trim()).filter(Boolean))];
    if(categoryValues.length>1){
      const rail=document.createElement('nav');rail.className='vts-categories';rail.setAttribute('aria-label','Categorias');
      categoryValues.forEach((category,categoryIndex)=>{
        const button=document.createElement('button');button.type='button';button.className='vts-category'+(categoryIndex===0?' active':'');button.textContent=category;
        button.onclick=event=>{event.preventDefault();event.stopPropagation();rail.querySelectorAll('.vts-category').forEach(x=>x.classList.remove('active'));button.classList.add('active');const targetIndex=category==='Todas'?0:products.findIndex(p=>String(p.category||'').trim()===category);const destination=Math.max(0,targetIndex),liveCards=$('.csv-card,.vs-card',grid);liveCards.forEach((card,cardIndex)=>{const matches=category==='Todas'||String(products[cardIndex]?.category||'').trim()===category;card.style.setProperty('display',matches?'block':'none','important')});grid.scrollTop=0;const target=liveCards[destination];if(target){window.__CHATSHOP_ACTIVE_PRODUCT=products[destination]||null;window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=destination}};
        rail.appendChild(button);
      });
      document.body.appendChild(rail);
    }
    let current=-1;
    const selectProduct=(best,replaceUrl=true)=>{if(best===current)return;current=best;window.__CHATSHOP_ACTIVE_PRODUCT=products[best]||null;window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=best;if(replaceUrl){try{history.replaceState({chatshopProduct:best},'',productUrl(best))}catch(e){}}};
    grid.addEventListener('scroll',()=>requestAnimationFrame(()=>{const center=innerHeight/2;let best=0,distance=Infinity;cards.forEach((card,i)=>{const rect=card.getBoundingClientRect(),delta=Math.abs((rect.top+rect.bottom)/2-center);if(delta<distance){distance=delta;best=i}});selectProduct(best,true)}),{passive:true});
    const requested=String(window.__CHATSHOP_PRODUCT_SLUG||'').toLowerCase(),requestedIndex=requested?productSlugs.indexOf(requested):-1;
    const initialIndex=requestedIndex>=0?requestedIndex:0;window.__CHATSHOP_ACTIVE_PRODUCT=products[initialIndex]||null;window.__CHATSHOP_ACTIVE_PRODUCT_INDEX=initialIndex;current=initialIndex;
    if(requestedIndex>=0&&cards[requestedIndex])setTimeout(()=>cards[requestedIndex].scrollIntoView({block:'start'}),80);
    window.addEventListener('popstate',()=>location.reload());
    const hint=document.createElement('div');hint.textContent='⬆️ Arraste para ver o próximo produto';hint.style.cssText='position:fixed;left:50%;bottom:8px;transform:translateX(-50%);z-index:45;background:rgba(17,24,39,.78);color:#fff;border-radius:999px;padding:7px 12px;font-size:11px;font-weight:800;pointer-events:none';document.body.appendChild(hint);setTimeout(()=>hint.remove(),4200);
  })();
}
function wrapPublishedRenderer(){
  data=data||readBootstrapData();
  if(data){window.__CHATSHOP_STORE_DATA=window.__CHATSHOP_STORE_DATA||data;window.__CHATSHOP_DIRECT_STORE_ACTIVE=window.__CHATSHOP_DIRECT_STORE_ACTIVE||!!document.getElementById('chatshopDirectVirtualBootstrap');}
  try{
    if(typeof renderVirtualPublished==='function'&&!renderVirtualPublished.__virtualSingleWrapped){
      const original=renderVirtualPublished;
      const wrapped=function(value,ref){const result=original(value,ref);setTimeout(()=>installPublished(value),0);return result};
      wrapped.__virtualSingleWrapped=true;
      renderVirtualPublished=wrapped;
    }
  }catch(e){console.warn('virtual single published:',e)}
  if((window.__CHATSHOP_DIRECT_STORE_ACTIVE||$('#chatshopDirectVirtualBootstrap'))&&data&&!$('.vs-page')){
    let tries=0;
    (function renderDirect(){
      tries++;
      try{
        if(typeof renderPublishedStore==='function'){
          renderPublishedStore(data,null);
          document.documentElement.classList.remove('chatshop-virtual-pending');
          return;
        }
      }catch(e){console.warn('virtual direct render:',e)}
      if(tries<80)setTimeout(renderDirect,50);
      else document.documentElement.classList.remove('chatshop-virtual-pending');
    })();
  }else{
    installPublished(data);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installEditor();wrapPublishedRenderer()},{once:true});
else{installEditor();wrapPublishedRenderer()}
// Domínios próprios podem receber este arquivo depois do DOMContentLoaded.
setTimeout(()=>{installEditor();wrapPublishedRenderer()},100);
setTimeout(()=>wrapPublishedRenderer(),800);
})();
