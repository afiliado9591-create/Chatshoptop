/* Vídeo por produto no catálogo de 1 produto por tela. */
(function(){
'use strict';
const PROJECT_ID='chatshop-97ea3',API_KEY='AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8',COLLECTION='chatshops',BASE_DOMAIN='alibr.com.br';
const $=(s,r)=> (r||document).querySelector(s), $$=(s,r)=>[...(r||document).querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lastPopulateData=null;

function ensureEditorFields(){
  const root=$('#products');if(!root)return false;
  $$('.product',root).forEach((card,index)=>{
    let field=card.querySelector('[data-product-video-field]');
    if(!field){
      field=document.createElement('div');
      field.className='field';field.setAttribute('data-product-video-field','1');
      field.style.cssText='border:1px solid #bae6fd;background:#f0f9ff;border-radius:12px;padding:10px;margin:10px 0';
      field.innerHTML='<label>🎬 Vídeo deste produto (opcional)</label><input data-k="productVideoUrl" type="url" inputmode="url" placeholder="YouTube, Shorts, TikTok, Shopee ou link direto .mp4"><small>No formato 1 produto por tela, o vídeo abre automaticamente e os botões continuam por cima. YouTube, TikTok e MP4 funcionam dentro da página; a Shopee pode abrir externamente.</small>';
      const desc=card.querySelector('[data-k="cardDescription"]')?.closest('.field')||card.querySelector('.product-page-description-field');
      if(desc)desc.insertAdjacentElement('afterend',field);else card.appendChild(field);
      field.querySelector('input').addEventListener('input',()=>{try{window.debounce?.()}catch(e){}});
    }
    if(lastPopulateData&&Array.isArray(lastPopulateData.products)){
      const input=field.querySelector('[data-k="productVideoUrl"]');
      if(input&&!input.dataset.hydrated){input.value=String(lastPopulateData.products[index]?.videoUrl||lastPopulateData.products[index]?.productVideoUrl||'');input.dataset.hydrated='1'}
    }
  });
  return true;
}
function wrapEditor(){
  if(typeof window.collect==='function'&&!window.collect.__productVideoWrapped){
    const old=window.collect;
    const fn=function(){
      ensureEditorFields();
      const data=old();
      const cards=$$('#products .product');
      if(Array.isArray(data.products))data.products.forEach((product,index)=>{
        product.videoUrl=String(cards[index]?.querySelector('[data-k="productVideoUrl"]')?.value||'').trim();
      });
      return data;
    };
    fn.__productVideoWrapped=true;window.collect=fn;
  }
  if(typeof window.populateForm==='function'&&!window.populateForm.__productVideoWrapped){
    const old=window.populateForm;
    const fn=async function(data){
      lastPopulateData=data||null;
      const result=await old(data);
      [0,80,260].forEach(delay=>setTimeout(()=>{ensureEditorFields();$$('#products .product').forEach((card,index)=>{
        const input=card.querySelector('[data-k="productVideoUrl"]');if(input){input.value=String(data?.products?.[index]?.videoUrl||data?.products?.[index]?.productVideoUrl||'');input.dataset.hydrated='1'}
      })},delay));
      return result;
    };
    fn.__productVideoWrapped=true;window.populateForm=fn;
  }
  if(typeof window.clearForm==='function'&&!window.clearForm.__productVideoWrapped){
    const old=window.clearForm;
    const fn=function(){lastPopulateData=null;const result=old();setTimeout(()=>{ensureEditorFields();$$('[data-k="productVideoUrl"]').forEach(input=>{input.value='';delete input.dataset.hydrated})},0);return result};
    fn.__productVideoWrapped=true;window.clearForm=fn;
  }
}
function installEditor(){
  const root=$('#products');if(!root)return false;
  ensureEditorFields();wrapEditor();
  if(!root.dataset.productVideoObserved){root.dataset.productVideoObserved='1';new MutationObserver(()=>{ensureEditorFields();wrapEditor()}).observe(root,{childList:true})}
  return true;
}

function decode(value){if(!value||typeof value!=='object')return null;if('stringValue'in value)return value.stringValue;if('booleanValue'in value)return value.booleanValue;if('integerValue'in value)return Number(value.integerValue);if('doubleValue'in value)return Number(value.doubleValue);if('nullValue'in value)return null;if('arrayValue'in value)return(value.arrayValue.values||[]).map(decode);if('mapValue'in value)return decodeFields(value.mapValue.fields||{});return null}
function decodeFields(fields){const out={};Object.entries(fields||{}).forEach(([key,value])=>out[key]=decode(value));return out}
function deriveSlug(){const host=location.hostname.toLowerCase().replace(/\.$/,'');const suffix='.'+BASE_DOMAIN;if(!host.endsWith(suffix))return'';const slug=host.slice(0,-suffix.length);return slug&&!slug.includes('.')&&slug!=='www'?slug:''}
async function fetchStore(){
  const slug=deriveSlug();
  if(slug){const url=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${encodeURIComponent(slug)}?key=${API_KEY}`;const response=await fetch(url,{cache:'no-store'});if(!response.ok)return null;const json=await response.json();return decodeFields(json.fields||{})}
  const host=location.hostname.toLowerCase();const url=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
  const body={structuredQuery:{from:[{collectionId:COLLECTION}],where:{fieldFilter:{field:{fieldPath:'customDomain'},op:'EQUAL',value:{stringValue:host}}},limit:1}};
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});if(!response.ok)return null;
  const rows=await response.json(),doc=Array.isArray(rows)?rows.find(row=>row.document)?.document:null;return doc?decodeFields(doc.fields||{}):null;
}
function videoInfo(value){
  const raw=String(value||'').trim();if(!/^https?:\/\//i.test(raw))return null;
  let match=raw.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  if(match){const id=match[1];return{type:'youtube',src:`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&rel=0`}}
  match=raw.match(/tiktok\.com\/(?:@[^/]+\/video\/|v\/)(\d+)/i);
  if(match)return{type:'tiktok',src:`https://www.tiktok.com/player/v1/${match[1]}?autoplay=1&loop=1&mute=1&controls=1`};
  if(/\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(raw))return{type:'direct',src:raw};
  if(/(?:shopee\.|s\.shopee\.)/i.test(raw))return{type:'shopee',src:raw};
  return{type:'external',src:raw};
}
function addStyle(){
  if($('#singleProductVideoStyle'))return;
  const style=document.createElement('style');style.id='singleProductVideoStyle';style.textContent=`
  body:not(.store-grid-layout) #pubFeed .pub-slide.has-product-video>img,
  body:not(.store-grid-layout) #pubFeed .pub-slide.has-product-video>.pub-noimg{opacity:0!important}
  .product-video-layer{position:absolute!important;inset:0!important;z-index:0!important;background:#000!important;overflow:hidden!important}
  .product-video-layer iframe,.product-video-layer video{width:100%!important;height:100%!important;border:0!important;display:block!important;object-fit:cover!important;background:#000!important}
  .product-video-layer iframe{pointer-events:auto!important}
  body:not(.store-grid-layout) #pubFeed .pub-slide.has-product-video .pub-slide-overlay{z-index:3!important;pointer-events:none!important}
  body:not(.store-grid-layout) #pubFeed .pub-slide.has-product-video .pub-slide-overlay a,
  body:not(.store-grid-layout) #pubFeed .pub-slide.has-product-video .pub-slide-overlay button{pointer-events:auto!important}
  .product-video-external{position:absolute!important;inset:0!important;z-index:2!important;display:grid!important;place-items:center!important;text-decoration:none!important;background:rgba(0,0,0,.28)!important;color:#fff!important}
  .product-video-external span{background:rgba(0,0,0,.76)!important;border:1px solid rgba(255,255,255,.5)!important;border-radius:999px!important;padding:13px 18px!important;font-weight:900!important;box-shadow:0 4px 18px rgba(0,0,0,.35)!important}
  .product-video-sound{position:absolute!important;top:50px!important;right:12px!important;z-index:5!important;border:0!important;border-radius:999px!important;padding:9px 12px!important;background:rgba(0,0,0,.68)!important;color:#fff!important;font-weight:800!important;cursor:pointer!important}
  `;document.head.appendChild(style);
}
function productForSlide(slide,products,index){
  const name=slide.querySelector('.pub-slide-textbox b')?.textContent?.trim();
  return products.find(product=>String(product?.name||'').trim()===name)||products[index]||null;
}
function decorateSlides(data){
  if(data?.homeLayout==='grid'||document.body.classList.contains('store-grid-layout'))return;
  const products=Array.isArray(data?.products)?data.products:[];
  $$('#pubFeed .pub-slide').forEach((slide,index)=>{
    const product=productForSlide(slide,products,index),info=videoInfo(product?.videoUrl||product?.productVideoUrl);
    const current=slide.dataset.productVideoUrl||'';
    const wanted=String(product?.videoUrl||product?.productVideoUrl||'').trim();
    if(current===wanted&&slide.querySelector('.product-video-layer'))return;
    slide.querySelector('.product-video-layer')?.remove();slide.classList.remove('has-product-video');slide.dataset.productVideoUrl= '';
    if(!info)return;
    const layer=document.createElement('div');layer.className='product-video-layer';slide.classList.add('has-product-video');slide.dataset.productVideoUrl=wanted;
    if(info.type==='direct'){
      layer.innerHTML='<video autoplay muted loop playsinline controls preload="metadata" aria-label="Vídeo do produto"><source src="'+esc(info.src)+'"></video><button type="button" class="product-video-sound">🔇 Ativar som</button>';
      const video=layer.querySelector('video'),button=layer.querySelector('button');button.onclick=()=>{video.muted=!video.muted;button.textContent=video.muted?'🔇 Ativar som':'🔊 Desativar som';if(video.paused)video.play().catch(()=>{})};
      video.play().catch(()=>{});
    }else if(info.type==='youtube'||info.type==='tiktok'){
      layer.innerHTML='<iframe src="'+esc(info.src)+'" title="Vídeo do produto" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="eager"></iframe>';
    }else{
      const label=info.type==='shopee'?'▶ Assistir ao vídeo na Shopee':'▶ Abrir vídeo do produto';
      layer.innerHTML='<a class="product-video-external" href="'+esc(info.src)+'" target="_blank" rel="noopener"><span>'+label+'</span></a>';
    }
    slide.insertBefore(layer,slide.firstChild);
  });
}
async function installPublished(){
  const published=(typeof window.STOREFRONT_MODE!=='undefined'&&window.STOREFRONT_MODE)||(typeof window.CUSTOM_DOMAIN_MODE!=='undefined'&&window.CUSTOM_DOMAIN_MODE)||deriveSlug();
  if(!published)return false;
  let data=null;try{data=await fetchStore()}catch(e){return false}
  if(!data||data.homeLayout==='grid')return false;
  addStyle();
  for(let i=0;i<50&&!$('#pubFeed');i++)await new Promise(resolve=>setTimeout(resolve,100));
  const feed=$('#pubFeed');if(!feed)return false;
  const apply=()=>requestAnimationFrame(()=>decorateSlides(data));apply();
  new MutationObserver(apply).observe(feed,{childList:true});
  [300,900,1800].forEach(delay=>setTimeout(apply,delay));
  return true;
}
function boot(){
  const host=location.hostname.toLowerCase(),editor=host==='alibr.com.br'||host==='www.alibr.com.br';
  if(editor){
    let attempts=0;const timer=setInterval(()=>{attempts++;if(installEditor()||attempts>=30)clearInterval(timer)},200);
  }else{
    installPublished();
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();