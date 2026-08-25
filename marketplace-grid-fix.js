(function(){
  'use strict';

  const ready = fn => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, {once:true})
    : fn();

  ready(async function(){
    const style = document.createElement('style');
    style.id = 'marketplaceGridFinalStyle';
    style.textContent = `
      body.marketplace-final-mode{background:#f5f5f5!important}
      body.marketplace-final-mode #storefrontScreen,
      body.marketplace-final-mode #storefrontScreen #liveApp{background:#f5f5f5!important}
      body.marketplace-final-mode .promo-badge{display:none!important}

      #pubFeed.marketplace-final{
        height:100dvh!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:10px!important;
        align-content:start!important;
        padding:10px 10px 34px!important;
        background:#f5f5f5!important;
        scroll-snap-type:none!important;
        -webkit-overflow-scrolling:touch;
      }
      #pubFeed.marketplace-final .pub-swipe-hint{display:none!important}
      body.marketplace-final-mode.marketplace-has-category-menu #pubFeed.marketplace-final{
        padding-top:72px!important;
      }

      .mp-card{
        min-width:0;
        display:flex;
        flex-direction:column;
        position:relative;
        overflow:hidden;
        background:#fff;
        border:1px solid #ececec;
        border-radius:14px;
        box-shadow:0 2px 9px rgba(0,0,0,.10);
      }
      .mp-image-wrap{
        width:100%;
        aspect-ratio:1/1;
        position:relative;
        background:#fff;
        overflow:hidden;
        border-bottom:1px solid #f0f0f0;
      }
      .mp-image-wrap img{
        width:100%;
        height:100%;
        object-fit:contain;
        display:block;
        background:#fff;
      }
      .mp-noimg{
        width:100%;height:100%;display:grid;place-items:center;
        background:#fafafa;font-size:42px;color:#aaa;
      }
      .mp-offer{
        position:absolute;top:10px;left:10px;z-index:2;
        background:#ee4d2d;color:#fff;border-radius:7px;
        padding:6px 9px;font-size:10px;font-weight:900;
        box-shadow:0 2px 7px rgba(0,0,0,.18);
      }
      .mp-info{
        display:flex;
        flex-direction:column;
        flex:1;
        padding:10px 11px 11px;
      }
      .mp-category{
        display:inline-flex;
        align-self:flex-start;
        max-width:100%;
        margin-bottom:7px;
        padding:4px 9px;
        border-radius:999px;
        border:1px solid color-mix(in srgb,var(--store-cat,var(--store-main,#c2185b)) 20%,white);
        background:color-mix(in srgb,var(--store-cat,var(--store-main,#c2185b)) 8%,white);
        color:var(--store-cat,var(--store-main,#c2185b));
        font-size:10px;
        line-height:1;
        font-weight:900;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .mp-name{
        color:#222;
        font-size:14px;
        line-height:1.3;
        font-weight:900;
        margin:0 0 6px;
        min-height:36px;
        display:-webkit-box;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
        overflow:hidden;
      }
      .mp-description{
        color:#626262;
        font-size:11.7px;
        line-height:1.35;
        font-weight:600;
        margin:0 0 8px;
        min-height:32px;
        display:-webkit-box;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
        overflow:hidden;
      }
      .mp-price{
        color:var(--store-price,var(--store-main,#ee4d2d));
        font-size:20px;
        line-height:1.1;
        font-weight:900;
        letter-spacing:-.3px;
        margin:2px 0 10px;
      }
      .mp-buy{
        display:block;
        width:100%;
        margin-top:auto;
        padding:11px 8px;
        border-radius:9px;
        text-align:center;
        text-decoration:none;
        color:#fff!important;
        font-size:12.5px;
        line-height:1.1;
        font-weight:900;
        box-shadow:0 2px 6px rgba(0,0,0,.14);
      }
      .mp-store-header{
        grid-column:1/-1;
        display:flex;
        align-items:center;
        gap:12px;
        padding:14px 15px;
        background:#fff;
        border:1px solid #ececec;
        border-radius:14px;
        box-shadow:0 2px 9px rgba(0,0,0,.09);
      }
      .mp-store-logo{
        width:52px;
        height:52px;
        flex:0 0 52px;
        display:grid;
        place-items:center;
        overflow:hidden;
        border-radius:50%;
        background:var(--store-main,#c2185b);
        color:#fff;
        font-size:22px;
        font-weight:900;
      }
      .mp-store-logo img{width:100%;height:100%;object-fit:cover;display:block}
      .mp-store-title{min-width:0}
      .mp-store-title h1{
        margin:0 0 3px;
        color:#222;
        font-size:19px;
        line-height:1.2;
        font-weight:950;
        overflow-wrap:anywhere;
      }
      .mp-store-title p{margin:0;color:#666;font-size:12px;font-weight:650}
      .mp-empty{
        grid-column:1/-1;
        background:#fff;
        border-radius:14px;
        padding:28px 18px;
        text-align:center;
        color:#666;
        box-shadow:0 2px 8px rgba(0,0,0,.07);
      }

      body.marketplace-final-mode .pub-cat-menu{
        position:fixed!important;
        top:0!important;left:0!important;right:0!important;
        transform:none!important;
        z-index:25!important;
        display:flex!important;
        flex-direction:row!important;
        gap:8px!important;
        max-height:none!important;
        overflow-x:auto!important;
        overflow-y:hidden!important;
        align-items:center!important;
        padding:10px 10px 10px!important;
        white-space:nowrap!important;
        background:rgba(245,245,245,.98)!important;
        border-bottom:1px solid #e5e7eb!important;
        box-shadow:0 2px 8px rgba(0,0,0,.07)!important;
        scrollbar-width:none!important;
      }
      body.marketplace-final-mode .pub-cat-menu::-webkit-scrollbar{display:none!important}
      body.marketplace-final-mode .pub-cat-btn{
        flex:0 0 auto!important;
        background:#fff!important;
        color:var(--store-cat,var(--store-main,#c2185b))!important;
        border:0!important;
        border-radius:999px!important;
        padding:9px 15px!important;
        font-size:12px!important;
        font-weight:900!important;
        box-shadow:0 2px 7px rgba(0,0,0,.11)!important;
      }
      body.marketplace-final-mode .pub-cat-btn.active{
        background:var(--store-cat,var(--store-main,#c2185b))!important;
        color:#fff!important;
      }
      body.marketplace-final-mode #pubChatToggle.seller-cta{bottom:18px!important}
      body.marketplace-final-mode #pubFeed>.vst-footer{
        min-height:0!important;
        height:auto!important;
        flex:initial!important;
        margin:16px 0 0!important;
        padding:22px 14px 26px!important;
        border-radius:14px!important;
      }
      body.marketplace-final-mode #pubFeed>.vst-footer .vst-footer-inner{gap:7px!important}
      body.marketplace-final-mode #pubFeed>.vst-footer .vst-footer-logo{width:50px!important;height:50px!important}
      body.marketplace-final-mode #pubFeed>.vst-footer .vst-footer-links{gap:7px 14px!important;margin:5px 0 2px!important}

      @media(max-width:560px){
        #pubFeed.marketplace-final{gap:8px!important;padding:8px 8px 28px!important}
        body.marketplace-final-mode.marketplace-has-category-menu #pubFeed.marketplace-final{padding-top:70px!important}
        .mp-info{padding:9px 9px 10px}
        .mp-category{font-size:9.5px;padding:4px 8px;margin-bottom:6px}
        .mp-name{font-size:13px;min-height:34px;margin-bottom:5px}
        .mp-description{font-size:10.8px;min-height:29px;margin-bottom:7px}
        .mp-price{font-size:18px;margin-bottom:9px}
        .mp-buy{font-size:12px;padding:10px 6px}
      }
    `;
    document.head.appendChild(style);

    function esc(v){
      return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    function norm(v){
      return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/s$/,'');
    }
    function safeUrl(v){
      try{
        const u = new URL(String(v || ''), window.location.origin);
        return ['http:','https:'].includes(u.protocol) ? u.href : '#';
      }catch(e){ return '#'; }
    }
    function safeImage(v){
      const s = String(v || '').trim();
      if(/^data:image\//i.test(s)) return s;
      return safeUrl(s) === '#' ? '' : safeUrl(s);
    }
    function price(v){
      const s = String(v || '').trim();
      if(!s) return 'Consulte';
      return /r\$/i.test(s) ? s : 'R$ ' + s;
    }
    function description(p){
      const options = [p?.cardDescription, p?.displayText, p?.voiceText];
      for(const x of options){
        const s = String(x || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
        if(s) return s;
      }
      if(Array.isArray(p?.keywords) && p.keywords.length) return p.keywords.filter(Boolean).slice(0,5).join(' • ');
      if(p?.category) return 'Confira os detalhes deste produto na categoria ' + p.category + '.';
      return 'Confira os detalhes deste produto e escolha a melhor opção para você.';
    }
    function buttonColor(p){
      const c = String(p?.buttonColor || '').trim();
      return /^#[0-9a-f]{6}$/i.test(c) ? c : 'var(--store-buy,var(--store-main,#c2185b))';
    }

    async function loadData(){
      try{
        if(typeof db === 'undefined' || !db) return null;
        const collection = typeof COLECAO !== 'undefined' ? COLECAO : 'chatshops';
        if(typeof STOREFRONT_MODE !== 'undefined' && STOREFRONT_MODE && typeof STOREFRONT_SLUG !== 'undefined' && STOREFRONT_SLUG){
          const snap = await db.collection(collection).doc(STOREFRONT_SLUG).get();
          return snap.exists ? snap.data() : null;
        }
        if(typeof CUSTOM_DOMAIN_MODE !== 'undefined' && CUSTOM_DOMAIN_MODE && typeof HOST_ATUAL !== 'undefined'){
          const q = await db.collection(collection).where('customDomain','==',HOST_ATUAL).limit(1).get();
          return q.empty ? null : q.docs[0].data();
        }
      }catch(e){ console.warn('marketplace grid load:',e); }
      return null;
    }

    let data = null;
    for(let i=0;i<20 && !data;i++){
      data = await loadData();
      if(!data) await new Promise(r=>setTimeout(r,150));
    }
    if(!data || data.homeLayout !== 'grid') return;

    const products = Array.isArray(data.products) ? data.products : [];
    let activeCategory = '';

    function headerHtml(){
      const brand = String(data.brand || 'Minha Loja').trim() || 'Minha Loja';
      const logo = safeImage(data.logo);
      const initial = brand.charAt(0).toUpperCase();
      return `<header class="mp-store-header">
        <div class="mp-store-logo">${logo ? `<img src="${esc(logo)}" alt="Logo de ${esc(brand)}">` : esc(initial)}</div>
        <div class="mp-store-title">
          <h1>${esc(brand)}</h1>
          <p>Catálogo de produtos</p>
        </div>
      </header>`;
    }

    function cardHtml(p){
      const img = safeImage(p.image);
      const cat = String(p.category || '').trim();
      const name = String(p.name || 'Produto').trim() || 'Produto';
      const desc = description(p);
      const href = safeUrl(p.link);
      const btn = String(p.buttonText || 'Comprar agora').trim() || 'Comprar agora';
      return `<article class="mp-card">
        <div class="mp-image-wrap">
          ${img ? `<img src="${esc(img)}" alt="${esc(name)}">` : '<div class="mp-noimg">🛍️</div>'}
          ${p.promo ? '<span class="mp-offer">🔥 OFERTA</span>' : ''}
        </div>
        <div class="mp-info">
          ${cat ? `<span class="mp-category">${esc(cat)}</span>` : ''}
          <div class="mp-name">${esc(name)}</div>
          <div class="mp-description">${esc(desc)}</div>
          <div class="mp-price">${esc(price(p.price))}</div>
          <a class="mp-buy" href="${esc(href)}" target="_blank" rel="noopener" style="background:${esc(buttonColor(p))}">${esc(btn)}</a>
        </div>
      </article>`;
    }

    function render(category){
      activeCategory = category || '';
      const feed = document.getElementById('pubFeed');
      if(!feed) return false;
      const list = activeCategory ? products.filter(p=>norm(p.category) === norm(activeCategory)) : products;
      feed.classList.add('marketplace-final');
      feed.classList.remove('catalog-grid');
      feed.innerHTML = headerHtml() + (list.length ? list.map(cardHtml).join('') : '<div class="mp-empty">Nenhum produto nessa categoria.</div>');
      feed.scrollTop = 0;
      document.body.classList.add('marketplace-final-mode');
      document.body.classList.remove('store-grid-layout');
      const hasCategoryMenu = data.showCategoryMenu !== false && Boolean(document.querySelector('.pub-cat-menu'));
      document.body.classList.toggle('marketplace-has-category-menu', hasCategoryMenu);
      setTimeout(()=>{
        document.body.classList.toggle('marketplace-has-category-menu', data.showCategoryMenu !== false && Boolean(document.querySelector('.pub-cat-menu')));
      }, 250);
      document.querySelectorAll('.pub-cat-btn').forEach(btn=>{
        const cat = btn.dataset.cat || '';
        btn.classList.toggle('active', norm(cat) === norm(activeCategory));
      });
      return true;
    }

    // Captura o clique antes do renderizador antigo para a tela principal nunca voltar ao layout bagunçado.
    document.addEventListener('click', function(e){
      const btn = e.target.closest && e.target.closest('.pub-cat-btn');
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      render(btn.dataset.cat || '');
    }, true);

    // Aguarda a loja principal terminar de montar e então substitui pela grade final.
    for(let i=0;i<50;i++){
      if(render('')) break;
      await new Promise(r=>setTimeout(r,100));
    }

    // Se algum script antigo tentar reconstruir o feed, restaura a grade definitiva.
    const root = document.getElementById('storefrontScreen');
    if(root){
      let restoring = false;
      const observer = new MutationObserver(()=>{
        const feed = document.getElementById('pubFeed');
        if(!feed || restoring) return;
        if(!feed.classList.contains('marketplace-final') || feed.querySelector('.pub-slide')){
          restoring = true;
          requestAnimationFrame(()=>{
            render(activeCategory);
            restoring = false;
          });
        }
      });
      observer.observe(root,{childList:true,subtree:true});
    }
  });
})();
