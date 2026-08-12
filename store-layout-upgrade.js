(function(){
  'use strict';

  const ready = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once:true });
    else fn();
  };

  ready(function(){
    const style = document.createElement('style');
    style.id = 'storeLayoutUpgradeStyle';
    style.textContent = `
      .home-layout-field{margin-top:14px;padding:12px;border:1px solid #ddd6fe;background:#faf5ff;border-radius:12px}
      .home-layout-title{display:block;font-size:13px;font-weight:900;color:#4c1d95;margin-bottom:8px}
      .home-layout-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .home-layout-option{display:flex;gap:8px;align-items:flex-start;border:1px solid #ddd6fe;background:#fff;border-radius:10px;padding:10px;cursor:pointer;font-size:12px;line-height:1.3}
      .home-layout-option input{margin-top:2px;flex-shrink:0}
      .home-layout-option b{display:block;font-size:12.5px;color:#312e81;margin-bottom:2px}
      .home-layout-option small{display:block;color:#6b7280;font-size:11px}

      body.store-grid-layout{background:#f5f5f5!important}
      body.store-grid-layout #storefrontScreen,
      body.store-grid-layout #storefrontScreen #liveApp{background:#f5f5f5!important}

      #pubFeed.catalog-grid{
        height:100dvh!important;overflow-y:auto!important;overflow-x:hidden!important;
        display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:8px!important;align-content:start!important;padding:68px 8px 150px!important;
        background:#f5f5f5!important;scroll-snap-type:none!important;
      }
      #pubFeed.catalog-grid .pub-swipe-hint{display:none!important}

      #pubFeed.catalog-grid .pub-slide{
        height:auto!important;min-height:0!important;display:flex!important;flex-direction:column!important;
        position:relative!important;background:#fff!important;border:1px solid #ececec!important;
        border-radius:12px!important;overflow:hidden!important;scroll-snap-align:none!important;
        box-shadow:0 2px 8px rgba(0,0,0,.08)!important;
      }
      #pubFeed.catalog-grid .pub-slide > img{
        position:relative!important;inset:auto!important;width:100%!important;height:auto!important;
        aspect-ratio:1/1!important;object-fit:contain!important;background:#fff!important;display:block!important;
        border-bottom:1px solid #f1f1f1!important;
      }
      #pubFeed.catalog-grid .pub-slide > .pub-noimg{
        position:relative!important;inset:auto!important;width:100%!important;height:auto!important;
        aspect-ratio:1/1!important;background:#fafafa!important;font-size:38px!important;
        border-bottom:1px solid #f1f1f1!important;
      }

      /* No modo 2 colunas usamos um card próprio e organizado. */
      #pubFeed.catalog-grid .pub-slide-overlay{display:none!important}
      .catalog-grid-info{display:none}
      #pubFeed.catalog-grid .catalog-grid-info{
        display:flex!important;flex-direction:column!important;flex:1!important;
        padding:10px 10px 11px!important;min-height:158px!important;background:#fff!important;
      }
      #pubFeed.catalog-grid .catalog-grid-category{
        display:inline-flex!important;align-self:flex-start!important;max-width:100%!important;
        background:#fff0f4!important;color:var(--store-cat,var(--store-main,#c2185b))!important;
        border:1px solid #ffd5e2!important;border-radius:999px!important;
        padding:3px 8px!important;margin-bottom:6px!important;font-size:9.5px!important;
        font-weight:800!important;line-height:1.1!important;overflow:hidden!important;
        text-overflow:ellipsis!important;white-space:nowrap!important;
      }
      #pubFeed.catalog-grid .catalog-grid-name{
        color:#222!important;font-size:13.5px!important;font-weight:800!important;line-height:1.28!important;
        display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;
        overflow:hidden!important;min-height:35px!important;margin:0 0 5px!important;
      }
      #pubFeed.catalog-grid .catalog-grid-description{
        color:#666!important;font-size:11.5px!important;font-weight:500!important;line-height:1.32!important;
        display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;
        overflow:hidden!important;min-height:31px!important;margin:0 0 7px!important;
      }
      #pubFeed.catalog-grid .catalog-grid-price{
        color:var(--store-price,var(--store-main,#ee4d2d))!important;font-size:19px!important;
        line-height:1.1!important;font-weight:900!important;margin:2px 0 9px!important;
        letter-spacing:-.2px!important;
      }
      #pubFeed.catalog-grid .catalog-grid-buy{
        display:block!important;width:100%!important;text-align:center!important;
        padding:10px 7px!important;border-radius:8px!important;font-size:12.5px!important;
        font-weight:900!important;text-decoration:none!important;color:#fff!important;
        margin-top:auto!important;box-shadow:0 2px 5px rgba(0,0,0,.12)!important;
      }
      #pubFeed.catalog-grid .catalog-grid-offer{
        position:absolute!important;top:8px!important;left:8px!important;z-index:3!important;
        display:inline-flex!important;align-items:center!important;gap:3px!important;
        background:#ee4d2d!important;color:#fff!important;border-radius:6px!important;
        padding:5px 7px!important;font-size:9.5px!important;font-weight:900!important;
        box-shadow:0 2px 6px rgba(0,0,0,.18)!important;
      }

      /* No grid o selo antigo não fica mais flutuando em cima dos produtos. */
      body.store-grid-layout .promo-badge{display:none!important}

      body.store-grid-layout .pub-cat-menu{
        position:fixed!important;top:0!important;left:0!important;right:0!important;transform:none!important;
        z-index:22!important;display:flex!important;flex-direction:row!important;gap:7px!important;
        max-height:none!important;overflow-x:auto!important;overflow-y:hidden!important;align-items:center!important;
        padding:10px 8px 9px!important;white-space:nowrap!important;background:rgba(245,245,245,.97)!important;
        border-bottom:1px solid #e5e7eb!important;box-shadow:0 2px 8px rgba(0,0,0,.06)!important;
        scrollbar-width:none!important;
      }
      body.store-grid-layout .pub-cat-menu::-webkit-scrollbar{display:none!important}
      body.store-grid-layout .pub-cat-btn{
        flex:0 0 auto!important;font-size:11.5px!important;padding:8px 13px!important;
        border-radius:999px!important;background:#fff!important;box-shadow:0 2px 6px rgba(0,0,0,.10)!important;
      }
      body.store-grid-layout .pub-cat-btn.active{
        background:var(--store-cat,var(--store-main,#7A2E3B))!important;color:#fff!important;
      }

      body.store-grid-layout #pubChatToggle.seller-cta{bottom:18px!important}

      @media(max-width:560px){
        .home-layout-options{grid-template-columns:1fr}
        #pubFeed.catalog-grid{gap:7px!important;padding-left:7px!important;padding-right:7px!important;padding-bottom:145px!important}
        #pubFeed.catalog-grid .catalog-grid-info{padding:9px 9px 10px!important;min-height:151px!important}
        #pubFeed.catalog-grid .catalog-grid-name{font-size:12.5px!important;min-height:32px!important}
        #pubFeed.catalog-grid .catalog-grid-description{font-size:10.8px!important;min-height:29px!important}
        #pubFeed.catalog-grid .catalog-grid-price{font-size:17px!important}
        #pubFeed.catalog-grid .catalog-grid-buy{font-size:11.5px!important;padding:9px 5px!important}
      }
    `;
    document.head.appendChild(style);

    function escText(value){
      return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      }[c]));
    }

    function safeLink(value){
      try{
        const u = new URL(String(value || ''), window.location.origin);
        return ['http:','https:'].includes(u.protocol) ? u.href : '#';
      }catch(e){ return '#'; }
    }

    function formatPrice(value){
      const v = String(value || '').trim();
      if(!v) return 'Consulte';
      if(/r\$/i.test(v)) return v;
      return 'R$ ' + v;
    }

    function shortDescription(p){
      const custom = String(p && p.cardDescription || '').trim();
      if(custom) return custom;
      const written = String(p && p.displayText || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
      if(written) return written;
      const voice = String(p && p.voiceText || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
      if(voice) return voice;
      const keys = Array.isArray(p && p.keywords) ? p.keywords.filter(Boolean).slice(0,4) : [];
      if(keys.length) return keys.join(' • ');
      return String(p && p.category || '').trim();
    }

    function getSelectedLayout(){
      return document.querySelector('input[name="homeLayout"]:checked')?.value || 'single';
    }

    function setSelectedLayout(value){
      const mode = value === 'grid' ? 'grid' : 'single';
      const radio = document.querySelector(`input[name="homeLayout"][value="${mode}"]`);
      if(radio) radio.checked = true;
    }

    function installEditorControl(){
      if(document.getElementById('homeLayoutField')) return;
      const categoryToggle = document.getElementById('showCategoryMenu');
      const appearanceSection = categoryToggle?.closest('.section');
      if(!appearanceSection) return;

      const box = document.createElement('div');
      box.id = 'homeLayoutField';
      box.className = 'home-layout-field';
      box.innerHTML = `
        <span class="home-layout-title">📱 Formato da página inicial da loja</span>
        <div class="home-layout-options">
          <label class="home-layout-option">
            <input type="radio" name="homeLayout" value="single" checked>
            <span><b>1 produto por tela</b><small>Uma imagem grande por vez. O cliente desliza para ver o próximo produto.</small></span>
          </label>
          <label class="home-layout-option">
            <input type="radio" name="homeLayout" value="grid">
            <span><b>Catálogo 2 colunas</b><small>Dois produtos lado a lado, com nome, descrição, preço e botão de compra.</small></span>
          </label>
        </div>`;
      appearanceSection.appendChild(box);

      box.querySelectorAll('input[name="homeLayout"]').forEach(input=>{
        input.addEventListener('change', ()=>{
          try{ if(typeof debounce === 'function') debounce(); }catch(e){}
        });
      });
    }

    installEditorControl();

    try{
      if(typeof collect === 'function' && !collect.__homeLayoutWrapped){
        const originalCollect = collect;
        const wrappedCollect = function(){
          const data = originalCollect();
          data.homeLayout = getSelectedLayout();
          return data;
        };
        wrappedCollect.__homeLayoutWrapped = true;
        collect = wrappedCollect;
      }
    }catch(e){ console.warn('Não foi possível ampliar collect para homeLayout:', e); }

    try{
      if(typeof populateForm === 'function' && !populateForm.__homeLayoutWrapped){
        const originalPopulateForm = populateForm;
        const wrappedPopulateForm = async function(data){
          const result = await originalPopulateForm(data);
          setSelectedLayout(data?.homeLayout || 'single');
          return result;
        };
        wrappedPopulateForm.__homeLayoutWrapped = true;
        populateForm = wrappedPopulateForm;
      }
    }catch(e){ console.warn('Não foi possível ampliar populateForm para homeLayout:', e); }

    try{
      if(typeof clearForm === 'function' && !clearForm.__homeLayoutWrapped){
        const originalClearForm = clearForm;
        const wrappedClearForm = function(){
          const result = originalClearForm();
          setSelectedLayout('single');
          return result;
        };
        wrappedClearForm.__homeLayoutWrapped = true;
        clearForm = wrappedClearForm;
      }
    }catch(e){ console.warn('Não foi possível ampliar clearForm para homeLayout:', e); }

    let currentProducts = [];
    let feedObserver = null;

    function findProductForSlide(slide, products){
      const name = slide.querySelector('.pub-slide-textbox b')?.textContent?.trim()
        || slide.querySelector('.catalog-grid-name')?.textContent?.trim()
        || '';
      if(!name) return null;
      return (products || []).find(p=>String(p && p.name || '').trim() === name) || null;
    }

    function decorateGridCards(products){
      const feed = document.getElementById('pubFeed');
      if(!feed) return;
      const list = Array.isArray(products) ? products : currentProducts;

      [...feed.querySelectorAll('.pub-slide')].forEach(slide=>{
        const originalName = slide.querySelector('.pub-slide-textbox b')?.textContent?.trim();
        const p = findProductForSlide(slide, list);
        if(!p || !originalName) return;

        let info = slide.querySelector('.catalog-grid-info');
        if(!info){
          info = document.createElement('div');
          info.className = 'catalog-grid-info';
          slide.appendChild(info);
        }

        const category = String(p.category || '').trim();
        const description = shortDescription(p) || 'Veja os detalhes e escolha a melhor opção para você.';
        const buttonText = String(p.buttonText || 'Comprar agora').trim() || 'Comprar agora';
        const buttonColor = /^#[0-9a-f]{6}$/i.test(String(p.buttonColor || '')) ? p.buttonColor : 'var(--store-buy,var(--store-main,#ee4d2d))';
        const originalBuy = slide.querySelector('.pub-slide-buy');
        const href = safeLink(p.link || originalBuy?.getAttribute('href') || '#');

        info.innerHTML = `
          ${category ? `<span class="catalog-grid-category">${escText(category)}</span>` : ''}
          <div class="catalog-grid-name">${escText(p.name || originalName)}</div>
          <div class="catalog-grid-description">${escText(description)}</div>
          <div class="catalog-grid-price">${escText(formatPrice(p.price))}</div>
          <a class="catalog-grid-buy" href="${escText(href)}" target="_blank" rel="noopener" style="background:${escText(buttonColor)}">${escText(buttonText)}</a>`;

        let offer = slide.querySelector('.catalog-grid-offer');
        if(p.promo){
          if(!offer){
            offer = document.createElement('span');
            offer.className = 'catalog-grid-offer';
            slide.appendChild(offer);
          }
          offer.textContent = '🔥 OFERTA';
        } else if(offer){
          offer.remove();
        }
      });
    }

    function observeFeed(products){
      currentProducts = Array.isArray(products) ? products : currentProducts;
      const feed = document.getElementById('pubFeed');
      if(!feed) return;
      if(feedObserver) feedObserver.disconnect();
      feedObserver = new MutationObserver(()=>requestAnimationFrame(()=>decorateGridCards(currentProducts)));
      feedObserver.observe(feed, { childList:true });
      decorateGridCards(currentProducts);
    }

    function applyStoreLayout(value, products){
      const mode = value === 'grid' ? 'grid' : 'single';
      const feed = document.getElementById('pubFeed');
      if(!feed) return false;
      feed.classList.toggle('catalog-grid', mode === 'grid');
      document.body.classList.toggle('store-grid-layout', mode === 'grid');
      if(Array.isArray(products)) currentProducts = products;
      if(mode === 'grid') observeFeed(currentProducts);
      return true;
    }

    try{
      if(typeof renderPublishedStore === 'function' && !renderPublishedStore.__homeLayoutWrapped){
        const originalRenderPublishedStore = renderPublishedStore;
        const wrappedRenderPublishedStore = function(data, ref){
          currentProducts = Array.isArray(data?.products) ? data.products : [];
          const result = originalRenderPublishedStore(data, ref);
          requestAnimationFrame(()=>applyStoreLayout(data?.homeLayout || 'single', currentProducts));
          return result;
        };
        wrappedRenderPublishedStore.__homeLayoutWrapped = true;
        renderPublishedStore = wrappedRenderPublishedStore;
      }
    }catch(e){ console.warn('Não foi possível ampliar renderPublishedStore para homeLayout:', e); }

    async function loadLayoutPreference(){
      try{
        if(typeof db === 'undefined' || !db) return;
        let data = null;
        if(typeof STOREFRONT_MODE !== 'undefined' && STOREFRONT_MODE && typeof STOREFRONT_SLUG !== 'undefined' && STOREFRONT_SLUG){
          const snap = await db.collection(typeof COLECAO !== 'undefined' ? COLECAO : 'chatshops').doc(STOREFRONT_SLUG).get();
          if(snap.exists) data = snap.data();
        } else if(typeof CUSTOM_DOMAIN_MODE !== 'undefined' && CUSTOM_DOMAIN_MODE && typeof HOST_ATUAL !== 'undefined'){
          const snap = await db.collection(typeof COLECAO !== 'undefined' ? COLECAO : 'chatshops').where('customDomain','==',HOST_ATUAL).limit(1).get();
          if(!snap.empty) data = snap.docs[0].data();
        }
        if(!data) return;
        currentProducts = Array.isArray(data.products) ? data.products : [];
        const mode = data.homeLayout || 'single';
        let tries = 0;
        const timer = setInterval(()=>{
          tries++;
          if(applyStoreLayout(mode, currentProducts) || tries > 30) clearInterval(timer);
        },100);
      }catch(e){ console.warn('Não foi possível carregar preferência de layout:', e); }
    }

    const isPublished = (typeof STOREFRONT_MODE !== 'undefined' && STOREFRONT_MODE) || (typeof CUSTOM_DOMAIN_MODE !== 'undefined' && CUSTOM_DOMAIN_MODE);
    if(isPublished) loadLayoutPreference();
  });
})();
