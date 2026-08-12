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

      body.store-grid-layout{background:#f3f4f6!important}
      body.store-grid-layout #storefrontScreen,
      body.store-grid-layout #storefrontScreen #liveApp{background:#f3f4f6!important}
      #pubFeed.catalog-grid{
        height:100dvh!important;overflow-y:auto!important;overflow-x:hidden!important;
        display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:8px!important;align-content:start!important;padding:58px 8px 92px!important;
        background:#f3f4f6!important;scroll-snap-type:none!important;
      }
      #pubFeed.catalog-grid .pub-swipe-hint{display:none!important}
      #pubFeed.catalog-grid .pub-slide{
        height:auto!important;min-height:0!important;display:block!important;position:relative!important;
        background:#fff!important;border-radius:12px!important;overflow:hidden!important;
        scroll-snap-align:none!important;box-shadow:0 1px 5px rgba(0,0,0,.10)!important;
      }
      #pubFeed.catalog-grid .pub-slide > img{
        position:relative!important;inset:auto!important;width:100%!important;height:auto!important;
        aspect-ratio:1/1!important;object-fit:contain!important;background:#fff!important;display:block!important;
      }
      #pubFeed.catalog-grid .pub-slide > .pub-noimg{
        position:relative!important;inset:auto!important;width:100%!important;height:auto!important;
        aspect-ratio:1/1!important;background:#f9fafb!important;font-size:38px!important;
      }
      #pubFeed.catalog-grid .pub-slide-overlay{
        position:static!important;width:100%!important;padding:8px!important;background:none!important;
      }
      #pubFeed.catalog-grid .pub-slide-textbox{
        display:block!important;max-width:none!important;background:transparent!important;border-radius:0!important;
        padding:0!important;box-shadow:none!important;
      }
      #pubFeed.catalog-grid .pub-slide-textbox b{
        color:var(--store-card-text,#1a1a1a)!important;font-size:13px!important;line-height:1.25!important;
        text-shadow:none!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
        min-height:32px;
      }
      #pubFeed.catalog-grid .pub-slide-cat{font-size:9px!important;padding:3px 7px!important;margin-bottom:5px!important}
      #pubFeed.catalog-grid .pub-slide-price{
        color:var(--store-price,var(--store-main,#7A2E3B))!important;font-size:15px!important;
        margin:5px 0 8px!important;text-shadow:none!important;
      }
      #pubFeed.catalog-grid .pub-slide-buy{
        display:block!important;width:100%!important;text-align:center!important;padding:9px 6px!important;
        border-radius:8px!important;font-size:12px!important;
      }
      body.store-grid-layout .pub-cat-menu{
        position:fixed!important;top:8px!important;left:8px!important;right:8px!important;transform:none!important;
        z-index:22!important;display:flex!important;flex-direction:row!important;gap:6px!important;
        max-height:none!important;overflow-x:auto!important;overflow-y:hidden!important;align-items:center!important;
        padding:2px 0 7px!important;white-space:nowrap!important;
      }
      body.store-grid-layout .pub-cat-btn{flex:0 0 auto!important;font-size:11px!important;padding:7px 11px!important}
      @media(max-width:560px){
        .home-layout-options{grid-template-columns:1fr}
        #pubFeed.catalog-grid{gap:7px!important;padding-left:7px!important;padding-right:7px!important}
      }
    `;
    document.head.appendChild(style);

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
            <span><b>Catálogo 2 colunas</b><small>Dois produtos lado a lado, no estilo de lojas e marketplaces.</small></span>
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

    // Salva a escolha junto com os demais dados de cada ChatShop.
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

    // Ao editar uma loja existente, restaura a opção salva.
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

    function applyStoreLayout(value){
      const mode = value === 'grid' ? 'grid' : 'single';
      const feed = document.getElementById('pubFeed');
      if(!feed) return false;
      feed.classList.toggle('catalog-grid', mode === 'grid');
      document.body.classList.toggle('store-grid-layout', mode === 'grid');
      return true;
    }

    // Aplica a opção no momento em que a loja é renderizada.
    try{
      if(typeof renderPublishedStore === 'function' && !renderPublishedStore.__homeLayoutWrapped){
        const originalRenderPublishedStore = renderPublishedStore;
        const wrappedRenderPublishedStore = function(data, ref){
          const result = originalRenderPublishedStore(data, ref);
          requestAnimationFrame(()=>applyStoreLayout(data?.homeLayout || 'single'));
          return result;
        };
        wrappedRenderPublishedStore.__homeLayoutWrapped = true;
        renderPublishedStore = wrappedRenderPublishedStore;
      }
    }catch(e){ console.warn('Não foi possível ampliar renderPublishedStore para homeLayout:', e); }

    // Segurança contra corrida de carregamento: se a loja já começou a abrir antes
    // deste arquivo executar, buscamos apenas a preferência e aplicamos depois.
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
        const mode = data.homeLayout || 'single';
        let tries = 0;
        const timer = setInterval(()=>{
          tries++;
          if(applyStoreLayout(mode) || tries > 30) clearInterval(timer);
        },100);
      }catch(e){ console.warn('Não foi possível carregar preferência de layout:', e); }
    }

    const isPublished = (typeof STOREFRONT_MODE !== 'undefined' && STOREFRONT_MODE) || (typeof CUSTOM_DOMAIN_MODE !== 'undefined' && CUSTOM_DOMAIN_MODE);
    if(isPublished) loadLayoutPreference();
  });
})();
