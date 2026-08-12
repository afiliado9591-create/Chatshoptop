(function(){
  'use strict';

  const ready = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once:true });
    else fn();
  };

  ready(function(){
    // Na loja publicada, transforma a bolinha do chat em uma chamada clara de venda.
    // O botão é criado depois que os dados da loja carregam, então observamos o DOM
    // para aplicar a mudança assim que ele aparecer.
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
      @media(max-width:390px){
        #pubChatToggle.seller-cta{min-width:156px!important;height:50px!important;padding:0 13px!important;right:10px!important;bottom:18px!important}
        #pubChatToggle.seller-cta .seller-cta-text{font-size:13px}
      }
    `;
    document.head.appendChild(sellerStyle);

    function upgradeSellerButton(){
      const btn = document.getElementById('pubChatToggle');
      if(!btn || btn.dataset.sellerCta === '1') return;
      btn.dataset.sellerCta = '1';
      btn.classList.add('seller-cta');
      btn.innerHTML = '<span class="seller-cta-icon">💬</span><span class="seller-cta-text">Fale com o vendedor</span>';
      btn.title = 'Fale com o vendedor';
      btn.setAttribute('aria-label','Fale com o vendedor');
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

    // Catálogo vira uma janela fixa. Assim ele abre na tela atual,
    // sem o lojista precisar descer até onde o modal está no HTML.
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

    // Deixa o cabeçalho da seção mais simples: Produtos | Catálogos.
    const section = openCatalogBtn.closest('.section');
    const sectionHeader = section && section.querySelector(':scope > div');
    const title = sectionHeader && sectionHeader.querySelector('h2');
    const oldActions = openCatalogBtn.parentElement;
    if (sectionHeader && title && oldActions && !document.querySelector('.catalog-editor-tabs')) {
      title.style.display = 'none';
      const tabs = document.createElement('div');
      tabs.className = 'catalog-editor-tabs';

      const productsTab = document.createElement('button');
      productsTab.type = 'button';
      productsTab.className = 'catalog-editor-tab active';
      productsTab.textContent = '🛍️ Produtos';
      productsTab.onclick = function(){
        modal.style.display = 'none';
        productsTab.classList.add('active');
        openCatalogBtn.classList.remove('active');
        section.scrollIntoView({ behavior:'smooth', block:'start' });
      };

      openCatalogBtn.textContent = '📦 Catálogos';
      openCatalogBtn.className = 'catalog-editor-tab';
      openCatalogBtn.title = 'Escolher vários produtos do catálogo';

      tabs.appendChild(productsTab);
      tabs.appendChild(openCatalogBtn);
      sectionHeader.insertBefore(tabs, sectionHeader.firstChild);
    }

    const selectedIds = new Set();
    let addedThisSession = 0;

    function ensureMultiBar(){
      let bar = document.getElementById('catalogMultiBar');
      if (bar) return bar;
      bar = document.createElement('div');
      bar.id = 'catalogMultiBar';
      bar.className = 'catalog-multi-bar';
      bar.innerHTML = '<small><b>Escolha vários produtos.</b> Toque no botão azul de cada produto. O catálogo continuará aberto para você escolher o próximo.</small><span class="catalog-multi-count" id="catalogMultiCount">0 adicionados</span><button type="button" class="catalog-done-btn" id="catalogDoneBtn">Concluir</button>';
      detailView.insertBefore(bar, detailView.firstChild);
      bar.querySelector('#catalogDoneBtn').onclick = function(){ modal.style.display = 'none'; };
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
          btn.disabled = true;
          btn.textContent = '✅ Adicionado';
          btn.classList.add('catalog-added');
        } else if (!btn.disabled) {
          btn.textContent = '+ Adicionar';
        }
      });
    }

    // Sempre que a lista de produtos for recriada, mantém os produtos
    // já selecionados marcados e deixa o texto do botão mais claro.
    const observer = new MutationObserver(function(){
      ensureMultiBar();
      markButtons();
    });
    observer.observe(list, { childList:true, subtree:true });

    // Antes do clique, salva a posição e quantos produtos já existiam.
    document.addEventListener('click', function(e){
      const btn = e.target.closest('#catalogoLista button[data-id]');
      if (!btn) return;
      btn.dataset.catalogBeforeCount = String(document.querySelectorAll('#products .product').length);
      btn.dataset.catalogScrollTop = String(list.scrollTop);
    }, true);

    // O código original adiciona o produto e fecha o catálogo.
    // Aqui reabrimos imediatamente a mesma tela quando a adição deu certo.
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
        btn.disabled = true;
        btn.textContent = '✅ Adicionado';
        btn.classList.add('catalog-added');

        // Se o limite do plano não abriu a tela de planos, continua no catálogo.
        if (!plansOpen) {
          modal.style.display = 'flex';
          pickerView.style.display = 'none';
          detailView.style.display = 'block';
          ensureMultiBar();
          list.scrollTop = savedScroll;
        }
      }
    }, false);

    // Quando clicar em Catálogos, destaca a aba e zera só o contador visual
    // da nova sessão. Os itens já escolhidos nesta abertura continuam marcados.
    openCatalogBtn.addEventListener('click', function(){
      addedThisSession = 0;
      updateCount();
      document.querySelectorAll('.catalog-editor-tab').forEach(b => b.classList.remove('active'));
      openCatalogBtn.classList.add('active');
      // O onclick original abre a lista de catálogos.
      setTimeout(function(){
        modal.style.display = 'flex';
        ensureMultiBar();
        markButtons();
      }, 0);
    });

    document.getElementById('fecharCatalogo')?.addEventListener('click', function(){
      openCatalogBtn.classList.remove('active');
      document.querySelector('.catalog-editor-tab')?.classList.add('active');
    });

    ensureMultiBar();
  });
})();
