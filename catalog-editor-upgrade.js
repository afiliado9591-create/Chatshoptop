(function(){
  'use strict';

  const ready = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once:true });
    else fn();
  };

  ready(function(){
    // Cor do cabeçalho do catálogo em 2 colunas.
    function installHeaderColorControl(){
      if(document.getElementById('headerColor')) return;
      const categoryColor = document.getElementById('categoryColor');
      const grid = categoryColor?.closest('.grid2');
      if(!grid) return;
      const field = document.createElement('div');
      field.className = 'field';
      field.id = 'headerColorField';
      field.innerHTML = '<label>Cor do cabeçalho (catálogo 2 colunas)</label><input type="color" id="headerColor" value="#FFFFFF"><small>Altera somente a barra com logo e nome da loja no modo 2 colunas.</small>';
      grid.appendChild(field);
      const input = document.getElementById('headerColor');
      input.addEventListener('input', ()=>{ try{ if(typeof debounce==='function') debounce(); }catch(e){} });

      // As paletas prontas também passam a definir a cor do cabeçalho.
      document.querySelectorAll('.paleta-btn').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          setTimeout(()=>{
            const main = document.getElementById('mainColor');
            if(main && input) input.value = main.value || '#FFFFFF';
          },0);
        });
      });
    }
    installHeaderColorControl();

    try{
      if(typeof collect === 'function' && !collect.__headerColorWrapped){
        const originalCollect = collect;
        const wrappedCollect = function(){
          const data = originalCollect();
          data.headerColor = document.getElementById('headerColor')?.value || '#FFFFFF';
          return data;
        };
        wrappedCollect.__headerColorWrapped = true;
        collect = wrappedCollect;
      }
    }catch(e){ console.warn('headerColor collect:',e); }

    try{
      if(typeof populateForm === 'function' && !populateForm.__headerColorWrapped){
        const originalPopulateForm = populateForm;
        const wrappedPopulateForm = async function(data){
          const result = await originalPopulateForm(data);
          installHeaderColorControl();
          const input = document.getElementById('headerColor');
          if(input) input.value = /^#[0-9a-f]{6}$/i.test(String(data?.headerColor||'')) ? data.headerColor : '#FFFFFF';
          return result;
        };
        wrappedPopulateForm.__headerColorWrapped = true;
        populateForm = wrappedPopulateForm;
      }
    }catch(e){ console.warn('headerColor populate:',e); }

    try{
      if(typeof clearForm === 'function' && !clearForm.__headerColorWrapped){
        const originalClearForm = clearForm;
        const wrappedClearForm = function(){
          const result = originalClearForm();
          installHeaderColorControl();
          const input = document.getElementById('headerColor');
          if(input) input.value = '#FFFFFF';
          return result;
        };
        wrappedClearForm.__headerColorWrapped = true;
        clearForm = wrappedClearForm;
      }
    }catch(e){ console.warn('headerColor clear:',e); }

    // Descrição completa do produto: aparece inteira na página individual.
    function ensureProductDescriptionFields(){
      const cards = [...document.querySelectorAll('#products .product')];
      cards.forEach(card=>{
        if(card.querySelector('[data-k="cardDescription"]')) return;
        const field = document.createElement('div');
        field.className = 'field product-page-description-field';
        field.style.cssText = 'margin-top:10px;border:1px solid #e9d5ff;background:#faf5ff;border-radius:12px;padding:11px';
        field.innerHTML = '<label>📝 Descrição do produto (página do produto)</label><textarea data-k="cardDescription" rows="5" maxlength="3000" placeholder="Ex: Blusa feminina em malha canelada, gola alta, toque macio, ótima para cultos, trabalho e ocasiões especiais. Informe tecido, modelagem, tamanhos, medidas, cuidados e outros detalhes."></textarea><small>Este texto aparece completo quando o cliente abre a página do produto. No catálogo de 2 colunas aparece apenas um resumo.</small>';
        const promo = card.querySelector('[data-k="promo"]')?.closest('label');
        if(promo) promo.insertAdjacentElement('beforebegin', field);
        else card.appendChild(field);
        field.querySelector('textarea').addEventListener('input', ()=>{
          try{ if(typeof debounce === 'function') debounce(); }catch(e){}
        });
      });
    }

    function fillProductDescriptions(products){
      ensureProductDescriptionFields();
      const cards = [...document.querySelectorAll('#products .product')];
      cards.forEach((card,i)=>{
        const input = card.querySelector('[data-k="cardDescription"]');
        if(input) input.value = String(products?.[i]?.cardDescription || '');
      });
    }

    ensureProductDescriptionFields();
    const productsRoot = document.getElementById('products');
    if(productsRoot){
      const descriptionObserver = new MutationObserver(()=>ensureProductDescriptionFields());
      descriptionObserver.observe(productsRoot,{childList:true,subtree:false});
    }

    try{
      if(typeof collect === 'function' && !collect.__productDescriptionWrapped){
        const originalCollect = collect;
        const wrappedCollect = function(){
          ensureProductDescriptionFields();
          const data = originalCollect();
          const cards = [...document.querySelectorAll('#products .product')];
          if(Array.isArray(data.products)){
            data.products.forEach((p,i)=>{
              p.cardDescription = cards[i]?.querySelector('[data-k="cardDescription"]')?.value.trim() || '';
            });
          }
          return data;
        };
        wrappedCollect.__productDescriptionWrapped = true;
        collect = wrappedCollect;
      }
    }catch(e){ console.warn('productDescription collect:',e); }

    try{
      if(typeof populateForm === 'function' && !populateForm.__productDescriptionWrapped){
        const originalPopulateForm = populateForm;
        const wrappedPopulateForm = async function(data){
          const result = await originalPopulateForm(data);
          requestAnimationFrame(()=>fillProductDescriptions(Array.isArray(data?.products) ? data.products : []));
          return result;
        };
        wrappedPopulateForm.__productDescriptionWrapped = true;
        populateForm = wrappedPopulateForm;
      }
    }catch(e){ console.warn('productDescription populate:',e); }

    // Na loja publicada, transforma a bolinha do chat em uma chamada clara de venda.
    const sellerStyle = document.createElement('style');
    sellerStyle.id = 'sellerCtaStyle';
    sellerStyle.textContent = `
      #pubChatToggle.seller-cta{
        width:auto!important;min-width:168px!important;height:52px!important;
        border-radius:999px!important;padding:0 16px!important;
        display:flex!important;align-items:center!important;justify-content:center!important;
        gap:8px!important;font-size:14px!important;font-weight:900!important;
        white-space:nowrap!important;line-height:1!important;
      }
      #pubChatToggle.seller-cta .seller-cta-icon{font-size:21px;line-height:1}
      #pubChatToggle.seller-cta .seller-cta-text{font-size:14px;line-height:1}
      #pubMic,#pubRecStatus{display:none!important}
      #pubInput{min-width:0!important}
      @media(max-width:390px){
        #pubChatToggle.seller-cta{min-width:156px!important;height:50px!important;padding:0 13px!important;right:10px!important;bottom:18px!important}
        #pubChatToggle.seller-cta .seller-cta-text{font-size:13px}
      }
    `;
    document.head.appendChild(sellerStyle);

    function syncSellerButtonWithChat(btn){
      const overlay = document.getElementById('pubChatOverlay');
      if(!btn || !overlay) return;
      const sync = ()=>{
        btn.style.setProperty('display', overlay.classList.contains('open') ? 'none' : 'flex', 'important');
      };
      if(btn.__sellerChatOverlay !== overlay){
        btn.__sellerChatOverlay = overlay;
        new MutationObserver(sync).observe(overlay,{attributes:true,attributeFilter:['class']});
      }
      sync();
    }

    function upgradeSellerButton(){
      const btn = document.getElementById('pubChatToggle');
      if(!btn) return;
      if(btn.dataset.sellerCta !== '1'){
        btn.dataset.sellerCta = '1';
        btn.classList.add('seller-cta');
        btn.innerHTML = '<span class="seller-cta-icon">💬</span><span class="seller-cta-text">Fale com o vendedor</span>';
        btn.title = 'Fale com o vendedor';
        btn.setAttribute('aria-label','Fale com o vendedor');
      }
      syncSellerButtonWithChat(btn);
    }
    upgradeSellerButton();
    const sellerObserver = new MutationObserver(upgradeSellerButton);
    sellerObserver.observe(document.body, { childList:true, subtree:true });

    const openCatalogBtn = document.getElementById('usarCatalogoBtn');
    const modal = document.getElementById('catalogoModal');
    const detailView = document.getElementById('catalogoDetalheView');
    const pickerView = document.getElementById('catalogoPickerView');
    const list = document.getElementById('catalogoLista');
    if (!openCatalogBtn || !modal || !detailView || !pickerView || !list) return;

    const style = document.createElement('style');
    style.textContent = `
      #catalogoModal{
        position:fixed!important;inset:0!important;z-index:90!important;
        align-items:center!important;justify-content:center!important;
        padding:14px!important;
      }
      #catalogoModal .plans-overlay{position:absolute!important;inset:0!important}
      #catalogoModal .plans-box{
        position:relative!important;z-index:1!important;width:min(720px,100%)!important;
        max-width:720px!important;max-height:92vh!important;overflow:auto!important;
        margin:0!important;
      }
      #catalogoLista{max-height:56vh!important;overflow-y:auto!important;overscroll-behavior:contain}
      .catalog-editor-tabs{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
      .catalog-editor-tab{
        border:1px solid #c4b5fd;background:#fff;color:#5b21b6;border-radius:999px;
        padding:8px 13px;font-weight:900;font-size:13px;cursor:pointer;
      }
      .catalog-editor-tab.active{background:#6d28d9;color:#fff;border-color:#6d28d9}
      .catalog-multi-bar{
        position:sticky;top:-1px;z-index:4;display:flex;align-items:center;justify-content:space-between;
        gap:10px;flex-wrap:wrap;background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;
        padding:9px 10px;margin:8px 0 12px;
      }
      .catalog-multi-bar small{color:#3730a3;line-height:1.35;flex:1;min-width:190px}
      .catalog-multi-count{font-weight:900;color:#15803d;white-space:nowrap}
      .catalog-done-btn{border:0;background:#111827;color:#fff;border-radius:8px;padding:8px 11px;font-weight:800;cursor:pointer}
      #catalogoLista button[data-id].catalog-added{background:#16a34a!important;color:#fff!important;opacity:1!important}
      @media(max-width:700px){
        #catalogoModal{padding:0!important;align-items:flex-end!important}
        #catalogoModal .plans-box{width:100%!important;max-width:none!important;max-height:94dvh!important;border-radius:18px 18px 0 0!important}
        #catalogoLista{max-height:60dvh!important}
      }
    `;
    document.head.appendChild(style);

    const section = openCatalogBtn.closest('.section');
    const sectionHeader = section && section.querySelector(':scope > div');
    const title = sectionHeader && sectionHeader.querySelector('h2');
    const oldActions = openCatalogBtn.parentElement;
    let productsTab = null;

    if (sectionHeader && title && oldActions && !document.querySelector('.catalog-editor-tabs')) {
      title.style.display = 'none';
      const tabs = document.createElement('div');
      tabs.className = 'catalog-editor-tabs';

      productsTab = document.createElement('button');
      productsTab.type = 'button';
      productsTab.className = 'catalog-editor-tab active';
      productsTab.textContent = '🛍️ Produtos';

      openCatalogBtn.textContent = '📦 Catálogos';
      openCatalogBtn.className = 'catalog-editor-tab';
      openCatalogBtn.title = 'Escolher vários produtos do catálogo';

      tabs.appendChild(productsTab);
      tabs.appendChild(openCatalogBtn);
      sectionHeader.insertBefore(tabs, sectionHeader.firstChild);
    } else {
      productsTab = document.querySelector('.catalog-editor-tab:not(#usarCatalogoBtn)');
    }

    const selectedIds = new Set();
    let addedThisSession = 0;
    let catalogSessionOpen = false;
    let closeRequested = false;

    function setProductsTabActive(){
      openCatalogBtn.classList.remove('active');
      productsTab?.classList.add('active');
    }

    function closeCatalog(scrollToProducts){
      catalogSessionOpen = false;
      closeRequested = true;
      modal.style.display = 'none';
      setProductsTabActive();

      requestAnimationFrame(function(){
        if (closeRequested) modal.style.display = 'none';
      });
      setTimeout(function(){
        if (closeRequested) modal.style.display = 'none';
        closeRequested = false;
      }, 120);

      if (scrollToProducts && section) {
        setTimeout(function(){ section.scrollIntoView({ behavior:'smooth', block:'start' }); }, 0);
      }
    }

    if (productsTab) {
      productsTab.onclick = function(e){
        e?.preventDefault?.();
        closeCatalog(true);
      };
    }

    function ensureMultiBar(){
      let bar = document.getElementById('catalogMultiBar');
      if (bar) return bar;
      bar = document.createElement('div');
      bar.id = 'catalogMultiBar';
      bar.className = 'catalog-multi-bar';
      bar.innerHTML = '<small><b>Escolha vários produtos.</b> Toque no botão azul de cada produto. O catálogo continuará aberto para você escolher o próximo.</small><span class="catalog-multi-count" id="catalogMultiCount">0 adicionados</span><button type="button" class="catalog-done-btn" id="catalogDoneBtn">Concluir</button>';
      detailView.insertBefore(bar, detailView.firstChild);
      bar.querySelector('#catalogDoneBtn').onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        closeCatalog(true);
      };
      return bar;
    }

    function updateCount(){
      const el = document.getElementById('catalogMultiCount');
      if (el) el.textContent = addedThisSession + (addedThisSession === 1 ? ' adicionado' : ' adicionados');
    }

    function markButtons(){
      list.querySelectorAll('button[data-id]').forEach(function(btn){
        const id = btn.dataset.id;
        if (selectedIds.has(id)) {
          if (!btn.disabled) btn.disabled = true;
          if (btn.textContent !== '✅ Adicionado') btn.textContent = '✅ Adicionado';
          if (!btn.classList.contains('catalog-added')) btn.classList.add('catalog-added');
        } else if (!btn.disabled) {
          if (btn.textContent !== '+ Adicionar') btn.textContent = '+ Adicionar';
          if (btn.classList.contains('catalog-added')) btn.classList.remove('catalog-added');
        }
      });
    }

    let observerQueued = false;
    const observer = new MutationObserver(function(){
      if (observerQueued) return;
      observerQueued = true;
      requestAnimationFrame(function(){
        observerQueued = false;
        ensureMultiBar();
        markButtons();
      });
    });
    observer.observe(list, { childList:true, subtree:true });

    document.addEventListener('click', function(e){
      const btn = e.target.closest('#catalogoLista button[data-id]');
      if (!btn) return;
      btn.dataset.catalogBeforeCount = String(document.querySelectorAll('#products .product').length);
      btn.dataset.catalogScrollTop = String(list.scrollTop);
    }, true);

    document.addEventListener('click', function(e){
      const btn = e.target.closest('#catalogoLista button[data-id]');
      if (!btn) return;

      const before = Number(btn.dataset.catalogBeforeCount || 0);
      const after = document.querySelectorAll('#products .product').length;
      const savedScroll = Number(btn.dataset.catalogScrollTop || 0);
      const plansModal = document.getElementById('plansModal');
      const plansOpen = plansModal && getComputedStyle(plansModal).display !== 'none';

      if (after > before) {
        selectedIds.add(btn.dataset.id);
        addedThisSession += (after - before);
        updateCount();
        if (!btn.disabled) btn.disabled = true;
        if (btn.textContent !== '✅ Adicionado') btn.textContent = '✅ Adicionado';
        if (!btn.classList.contains('catalog-added')) btn.classList.add('catalog-added');

        if (!plansOpen && catalogSessionOpen && !closeRequested) {
          modal.style.display = 'flex';
          pickerView.style.display = 'none';
          detailView.style.display = 'block';
          ensureMultiBar();
          list.scrollTop = savedScroll;
        }
      }
    }, false);

    openCatalogBtn.addEventListener('click', function(){
      catalogSessionOpen = true;
      closeRequested = false;
      addedThisSession = 0;
      updateCount();
      document.querySelectorAll('.catalog-editor-tab').forEach(b => b.classList.remove('active'));
      openCatalogBtn.classList.add('active');
      setTimeout(function(){
        if (!catalogSessionOpen || closeRequested) return;
        modal.style.display = 'flex';
        ensureMultiBar();
        markButtons();
      }, 0);
    });

    const closeBtn = document.getElementById('fecharCatalogo');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(){
        closeCatalog(true);
      }, true);
    }

    const overlay = document.querySelector('#catalogoModal .plans-overlay');
    if (overlay) {
      overlay.addEventListener('click', function(){
        closeCatalog(true);
      }, true);
    }

    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && getComputedStyle(modal).display !== 'none') {
        e.preventDefault();
        closeCatalog(true);
      }
    });

    ensureMultiBar();
  });
})();
