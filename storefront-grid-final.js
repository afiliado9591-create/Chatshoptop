(function(){
  'use strict';

  const PROJECT_ID='chatshop-97ea3';
  const API_KEY='AIzaSyBZlCM-6l_iV_GTirvTwUumKM3ZGRvgxt8';
  const COLLECTION='chatshops';
  const BASE_DOMAIN='alibr.com.br';

  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/s$/,'');

  function decode(v){
    if(!v||typeof v!=='object') return null;
    if('stringValue' in v) return v.stringValue;
    if('booleanValue' in v) return v.booleanValue;
    if('integerValue' in v) return Number(v.integerValue);
    if('doubleValue' in v) return Number(v.doubleValue);
    if('nullValue' in v) return null;
    if('arrayValue' in v) return (v.arrayValue.values||[]).map(decode);
    if('mapValue' in v) return decodeFields(v.mapValue.fields||{});
    return null;
  }
  function decodeFields(fields){
    const out={};
    Object.entries(fields||{}).forEach(([k,v])=>out[k]=decode(v));
    return out;
  }
  function safeUrl(v){
    try{ const u=new URL(String(v||''),location.origin); return /^(https?):$/.test(u.protocol)?u.href:'#'; }
    catch(e){ return '#'; }
  }
  function safeImage(v){
    const s=String(v||'').trim();
    if(/^data:image\//i.test(s)) return s;
    const u=safeUrl(s); return u==='#'?'':u;
  }
  function price(v){
    const s=String(v||'').trim();
    if(!s) return 'Consulte';
    return /r\$/i.test(s)?s:'R$ '+s;
  }
  function description(p){
    const options=[p?.cardDescription,p?.displayText,p?.voiceText];
    for(const x of options){
      const s=String(x||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
      if(s) return s;
    }
    if(Array.isArray(p?.keywords)&&p.keywords.length) return p.keywords.filter(Boolean).slice(0,5).join(' • ');
    return p?.category ? 'Confira os detalhes deste produto em '+p.category+'.' : 'Confira os detalhes deste produto.';
  }
  function buttonColor(p){
    const c=String(p?.buttonColor||'').trim();
    return /^#[0-9a-f]{6}$/i.test(c)?c:'var(--store-buy,var(--store-main,#c2185b))';
  }

  async function fetchStore(){
    const host=location.hostname.toLowerCase().replace(/\.$/,'');
    if(!host.endsWith('.'+BASE_DOMAIN)) return null;
    const slug=host.slice(0,-('.'+BASE_DOMAIN).length);
    if(!slug||slug==='www'||slug.includes('.')) return null;
    const url=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${encodeURIComponent(slug)}?key=${API_KEY}`;
    const r=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});
    if(!r.ok) return null;
    const doc=await r.json();
    return decodeFields(doc.fields||{});
  }

  ready(async function(){
    let data=null;
    try{ data=await fetchStore(); }catch(e){ console.warn('grid final store:',e); }
    if(!data||data.homeLayout!=='grid') return;

    const products=Array.isArray(data.products)?data.products:[];
    const categories=[]; const seen=new Set();
    products.forEach(p=>{ const c=String(p?.category||'').trim(); const n=norm(c); if(c&&n&&!seen.has(n)){seen.add(n);categories.push(c);} });
    let active='';
    let rendering=false;
    let detailOpen=false;

    const style=document.createElement('style');
    style.id='storefrontGridUnifiedStyle';
    style.textContent=`
      body.storefront-grid-unified{background:#f5f5f5!important}
      body.storefront-grid-unified #storefrontScreen,
      body.storefront-grid-unified #storefrontScreen #liveApp{background:#f5f5f5!important}
      body.storefront-grid-unified .promo-badge{display:none!important}
      #pubFeed.storefront-grid-unified-feed{
        height:100dvh!important;overflow-y:auto!important;overflow-x:hidden!important;
        display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:10px!important;align-content:start!important;padding:72px 10px 165px!important;
        background:#f5f5f5!important;scroll-snap-type:none!important;-webkit-overflow-scrolling:touch!important;
      }
      .sg-card{min-width:0!important;height:auto!important;display:flex!important;flex-direction:column!important;background:#fff!important;border:1px solid #ececec!important;border-radius:14px!important;overflow:hidden!important;box-shadow:0 2px 9px rgba(0,0,0,.10)!important;cursor:pointer!important;-webkit-tap-highlight-color:transparent!important}
      .sg-card:active{transform:scale(.985)!important}
      .sg-image{position:relative!important;width:100%!important;aspect-ratio:1/1!important;min-height:0!important;flex:0 0 auto!important;background:#fff!important;overflow:hidden!important;border-bottom:1px solid #f0f0f0!important}
      .sg-image img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;background:#fff!important}
      .sg-noimg{position:absolute!important;inset:0!important;display:grid!important;place-items:center!important;background:#fafafa!important;font-size:42px!important;color:#aaa!important}
      .sg-offer{position:absolute!important;top:9px!important;left:9px!important;z-index:2!important;background:#ee4d2d!important;color:#fff!important;border-radius:7px!important;padding:6px 9px!important;font-size:10px!important;font-weight:900!important;box-shadow:0 2px 7px rgba(0,0,0,.18)!important}
      .sg-info{display:flex!important;flex-direction:column!important;flex:1 0 auto!important;padding:10px 11px 11px!important;background:#fff!important}
      .sg-cat{display:inline-flex!important;align-self:flex-start!important;max-width:100%!important;margin-bottom:7px!important;padding:4px 9px!important;border-radius:999px!important;background:#fff1f5!important;border:1px solid #ffd5e2!important;color:var(--store-cat,var(--store-main,#c2185b))!important;font-size:10px!important;line-height:1!important;font-weight:900!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .sg-name{color:#222!important;font-size:14px!important;line-height:1.3!important;font-weight:900!important;margin:0 0 6px!important;min-height:36px!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
      .sg-desc{color:#626262!important;font-size:11.7px!important;line-height:1.35!important;font-weight:600!important;margin:0 0 8px!important;min-height:32px!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
      .sg-price{color:var(--store-price,var(--store-main,#ee4d2d))!important;font-size:20px!important;line-height:1.1!important;font-weight:900!important;letter-spacing:-.3px!important;margin:2px 0 10px!important}
      .sg-buy{display:block!important;width:100%!important;margin-top:auto!important;padding:11px 8px!important;border-radius:9px!important;text-align:center!important;text-decoration:none!important;color:#fff!important;font-size:12.5px!important;line-height:1.1!important;font-weight:900!important;box-shadow:0 2px 6px rgba(0,0,0,.14)!important}
      .sg-empty{grid-column:1/-1!important;background:#fff!important;border-radius:14px!important;padding:28px 18px!important;text-align:center!important;color:#666!important;box-shadow:0 2px 8px rgba(0,0,0,.07)!important}
      .sg-detail-wrap{grid-column:1/-1!important;display:block!important;padding:0 4px 18px!important}
      .sg-detail-back{border:0!important;background:#fff!important;color:var(--store-main,#c2185b)!important;border-radius:999px!important;padding:10px 15px!important;margin:0 0 10px!important;font-size:13px!important;font-weight:900!important;box-shadow:0 2px 8px rgba(0,0,0,.10)!important;cursor:pointer!important}
      .sg-detail-wrap .sg-card{width:min(100%,420px)!important;margin:0 auto!important;cursor:default!important;transform:none!important}
      .sg-detail-wrap .sg-image{aspect-ratio:4/5!important;max-height:58dvh!important}
      .sg-detail-wrap .sg-info{padding:12px 14px 14px!important}
      .sg-detail-wrap .sg-name{font-size:19px!important;min-height:0!important;display:block!important;overflow:visible!important;margin-bottom:7px!important}
      .sg-detail-wrap .sg-desc{font-size:14px!important;min-height:0!important;display:block!important;overflow:visible!important;margin-bottom:10px!important;font-weight:500!important}
      .sg-detail-wrap .sg-price{font-size:25px!important;margin:3px 0 14px!important}
      .sg-detail-wrap .sg-buy{font-size:15px!important;padding:14px 10px!important;border-radius:11px!important}
      body.storefront-grid-unified .pub-cat-menu{position:fixed!important;top:0!important;left:0!important;right:0!important;transform:none!important;z-index:25!important;display:flex!important;flex-direction:row!important;gap:8px!important;max-height:none!important;overflow-x:auto!important;overflow-y:hidden!important;align-items:center!important;padding:10px!important;white-space:nowrap!important;background:rgba(245,245,245,.98)!important;border-bottom:1px solid #e5e7eb!important;box-shadow:0 2px 8px rgba(0,0,0,.07)!important;scrollbar-width:none!important}
      body.storefront-grid-unified .pub-cat-menu::-webkit-scrollbar{display:none!important}
      body.storefront-grid-unified .pub-cat-btn{flex:0 0 auto!important;background:#fff!important;color:var(--store-cat,var(--store-main,#c2185b))!important;border:0!important;border-radius:999px!important;padding:9px 15px!important;font-size:12px!important;font-weight:900!important;box-shadow:0 2px 7px rgba(0,0,0,.11)!important;white-space:nowrap!important}
      body.storefront-grid-unified .pub-cat-btn.active{background:var(--store-cat,var(--store-main,#c2185b))!important;color:#fff!important}
      body.storefront-grid-unified #pubChatToggle.seller-cta{bottom:18px!important}
      @media(max-width:560px){
        #pubFeed.storefront-grid-unified-feed{gap:8px!important;padding:70px 8px 160px!important}
        .sg-info{padding:9px 9px 10px!important}.sg-cat{font-size:9.5px!important;padding:4px 8px!important;margin-bottom:6px!important}
        .sg-name{font-size:13px!important;min-height:34px!important;margin-bottom:5px!important}.sg-desc{font-size:10.8px!important;min-height:29px!important;margin-bottom:7px!important}.sg-price{font-size:18px!important;margin-bottom:9px!important}.sg-buy{font-size:12px!important;padding:10px 6px!important}
        .sg-detail-wrap{padding:0 1px 18px!important}.sg-detail-wrap .sg-image{aspect-ratio:1/1.08!important;max-height:none!important}.sg-detail-wrap .sg-name{font-size:18px!important}.sg-detail-wrap .sg-desc{font-size:13px!important}.sg-detail-wrap .sg-price{font-size:24px!important}.sg-detail-wrap .sg-buy{font-size:15px!important;padding:14px 9px!important}
      }
    `;
    document.head.appendChild(style);

    function productIndex(p){ return products.indexOf(p); }
    function card(p,clickable=true){
      const img=safeImage(p?.image); const cat=String(p?.category||'').trim(); const name=String(p?.name||'Produto').trim()||'Produto';
      const href=safeUrl(p?.link); const btn=String(p?.buttonText||'Comprar agora').trim()||'Comprar agora';
      const idx=productIndex(p);
      return `<article class="sg-card"${clickable?` data-product-index="${idx}" role="button" tabindex="0" aria-label="Ver detalhes de ${esc(name)}"`:''}><div class="sg-image">${img?`<img src="${esc(img)}" alt="${esc(name)}">`:'<div class="sg-noimg">🛍️</div>'}${p?.promo?'<span class="sg-offer">🔥 OFERTA</span>':''}</div><div class="sg-info">${cat?`<span class="sg-cat">${esc(cat)}</span>`:''}<div class="sg-name">${esc(name)}</div><div class="sg-desc">${esc(description(p))}</div><div class="sg-price">${esc(price(p?.price))}</div><a class="sg-buy" href="${esc(href)}" target="_blank" rel="noopener" style="background:${esc(buttonColor(p))}">${esc(btn)}</a></div></article>`;
    }

    function listFor(cat){ return cat?products.filter(p=>norm(p?.category)===norm(cat)):products; }
    function ensureMenu(){
      let menu=document.querySelector('.pub-cat-menu');
      if(data.showCategoryMenu===false){ if(menu) menu.remove(); return; }
      if(!menu){ menu=document.createElement('div'); document.body.appendChild(menu); }
      const clean=menu.cloneNode(false); clean.className='pub-cat-menu';
      clean.innerHTML=`<button type="button" class="pub-cat-btn${!active?' active':''}" data-cat="">Todas</button>`+categories.map(c=>`<button type="button" class="pub-cat-btn${norm(c)===norm(active)?' active':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
      menu.replaceWith(clean);
      clean.addEventListener('click',e=>{
        const b=e.target.closest('.pub-cat-btn'); if(!b)return;
        e.preventDefault(); e.stopPropagation();
        detailOpen=false;
        render(b.dataset.cat||'');
      });
    }

    function bindFeedClicks(feed){
      feed.onclick=e=>{
        const buy=e.target.closest('.sg-buy');
        if(buy){ e.stopPropagation(); return; }
        const back=e.target.closest('.sg-detail-back');
        if(back){ e.preventDefault(); detailOpen=false; render(active); return; }
        const c=e.target.closest('.sg-card[data-product-index]');
        if(!c) return;
        const idx=Number(c.dataset.productIndex);
        if(Number.isInteger(idx)&&products[idx]) showDetail(idx);
      };
      feed.onkeydown=e=>{
        if(e.key!=='Enter'&&e.key!==' ') return;
        if(e.target.closest('.sg-buy')) return;
        const c=e.target.closest('.sg-card[data-product-index]');
        if(!c) return;
        e.preventDefault();
        const idx=Number(c.dataset.productIndex);
        if(Number.isInteger(idx)&&products[idx]) showDetail(idx);
      };
    }

    function showDetail(idx){
      const feed=document.getElementById('pubFeed');
      const p=products[idx];
      if(!feed||!p) return;
      rendering=true; detailOpen=true;
      feed.className='pub-feed storefront-grid-unified-feed';
      feed.innerHTML=`<div class="sg-detail-wrap"><button type="button" class="sg-detail-back">← Voltar aos produtos</button>${card(p,false)}</div>`;
      feed.scrollTop=0;
      document.body.classList.add('storefront-grid-unified');
      bindFeedClicks(feed);
      ensureMenu();
      rendering=false;
    }

    function render(cat){
      if(rendering) return;
      const feed=document.getElementById('pubFeed'); if(!feed) return;
      rendering=true; active=cat||''; detailOpen=false;
      const list=listFor(active);
      feed.className='pub-feed storefront-grid-unified-feed';
      feed.innerHTML=list.length?list.map(p=>card(p,true)).join(''):'<div class="sg-empty">Nenhum produto nessa categoria.</div>';
      feed.scrollTop=0;
      document.body.classList.add('storefront-grid-unified');
      bindFeedClicks(feed);
      ensureMenu();
      rendering=false;
    }

    for(let i=0;i<60;i++){
      if(document.getElementById('pubFeed')){ render(''); break; }
      await new Promise(r=>setTimeout(r,100));
    }

    const root=document.getElementById('storefrontScreen');
    if(root){
      const obs=new MutationObserver(()=>{
        if(rendering||detailOpen) return;
        const feed=document.getElementById('pubFeed');
        if(feed && (!feed.classList.contains('storefront-grid-unified-feed') || feed.querySelector('.pub-slide'))){
          setTimeout(()=>render(active),0);
        }
      });
      obs.observe(root,{childList:true,subtree:true});
    }
  });
})();
