(function(){
  'use strict';

  const data = window.__CHATSHOP_STORE_DATA || null;
  if(!data || data.homeLayout !== 'grid') {
    document.documentElement.classList.remove('chatshop-grid-pending');
    return;
  }

  const products = Array.isArray(data.products) ? data.products : [];
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/s$/,'');

  function safeUrl(v){
    try { const u = new URL(String(v || ''), location.origin); return /^(https?):$/.test(u.protocol) ? u.href : '#'; }
    catch(e){ return '#'; }
  }
  function safeImage(v){
    const s = String(v || '').trim();
    if(/^data:image\//i.test(s)) return s;
    const u = safeUrl(s);
    return u === '#' ? '' : u;
  }
  function price(v){
    const s = String(v || '').trim();
    if(!s) return 'Consulte';
    return /r\$/i.test(s) ? s : 'R$ ' + s;
  }
  function description(p){
    const candidates = [p && p.cardDescription, p && p.displayText, p && p.voiceText];
    for(const value of candidates){
      const s = String(value || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
      if(s) return s;
    }
    if(Array.isArray(p && p.keywords) && p.keywords.length) return p.keywords.filter(Boolean).slice(0,5).join(' • ');
    return p && p.category ? 'Confira os detalhes deste produto em ' + p.category + '.' : 'Confira os detalhes deste produto.';
  }
  function buttonColor(p){
    const c = String(p && p.buttonColor || '').trim();
    return /^#[0-9a-f]{6}$/i.test(c) ? c : 'var(--store-buy,var(--store-main,#c2185b))';
  }

  const categories = [];
  const seen = new Set();
  products.forEach(p => {
    const c = String(p && p.category || '').trim();
    const n = norm(c);
    if(c && n && !seen.has(n)){ seen.add(n); categories.push(c); }
  });

  let activeCategory = '';
  let detailIndex = -1;
  let rendering = false;
  let observer = null;

  const style = document.createElement('style');
  style.id = 'chatshopGridDirectStyle';
  style.textContent = `
    html.chatshop-grid-pending #storefrontScreen{visibility:hidden!important}
    body.chatshop-grid-direct{background:#f5f5f5!important;overflow:hidden!important}
    body.chatshop-grid-direct #storefrontScreen,
    body.chatshop-grid-direct #storefrontScreen #liveApp{background:#f5f5f5!important}
    body.chatshop-grid-direct .promo-badge{display:none!important}
    body.chatshop-grid-direct .pub-swipe-hint{display:none!important}

    #pubFeed.chatshop-grid-feed{
      height:100dvh!important;overflow-y:auto!important;overflow-x:hidden!important;
      display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:9px!important;align-content:start!important;padding:72px 9px 165px!important;
      background:#f5f5f5!important;scroll-snap-type:none!important;-webkit-overflow-scrolling:touch!important;
    }
    .cgd-card{
      min-width:0!important;height:auto!important;display:flex!important;flex-direction:column!important;
      background:#fff!important;border:1px solid #ececec!important;border-radius:14px!important;
      overflow:hidden!important;box-shadow:0 2px 9px rgba(0,0,0,.10)!important;
      cursor:pointer!important;-webkit-tap-highlight-color:transparent!important;
    }
    .cgd-card:active{transform:scale(.987)!important}
    .cgd-image{position:relative!important;width:100%!important;aspect-ratio:1/1!important;flex:0 0 auto!important;background:#fff!important;overflow:hidden!important;border-bottom:1px solid #f0f0f0!important}
    .cgd-image img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;background:#fff!important}
    .cgd-noimg{position:absolute!important;inset:0!important;display:grid!important;place-items:center!important;background:#fafafa!important;font-size:42px!important;color:#aaa!important}
    .cgd-offer{position:absolute!important;top:9px!important;left:9px!important;z-index:2!important;background:#ee4d2d!important;color:#fff!important;border-radius:7px!important;padding:6px 9px!important;font-size:10px!important;font-weight:900!important;box-shadow:0 2px 7px rgba(0,0,0,.18)!important}
    .cgd-info{display:flex!important;flex-direction:column!important;flex:1 0 auto!important;padding:10px 10px 11px!important;background:#fff!important}
    .cgd-cat{display:inline-flex!important;align-self:flex-start!important;max-width:100%!important;margin-bottom:7px!important;padding:4px 9px!important;border-radius:999px!important;background:#fff1f5!important;border:1px solid #ffd5e2!important;color:var(--store-cat,var(--store-main,#c2185b))!important;font-size:10px!important;line-height:1!important;font-weight:900!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    .cgd-name{color:#222!important;font-size:14px!important;line-height:1.3!important;font-weight:900!important;margin:0 0 6px!important;min-height:36px!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
    .cgd-desc{color:#626262!important;font-size:11.4px!important;line-height:1.35!important;font-weight:600!important;margin:0 0 8px!important;min-height:31px!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
    .cgd-price{color:var(--store-price,var(--store-main,#ee4d2d))!important;font-size:19px!important;line-height:1.1!important;font-weight:900!important;margin:2px 0 10px!important}
    .cgd-buy{display:block!important;width:100%!important;margin-top:auto!important;padding:11px 7px!important;border-radius:9px!important;text-align:center!important;text-decoration:none!important;color:#fff!important;font-size:12px!important;line-height:1.1!important;font-weight:900!important;box-shadow:0 2px 6px rgba(0,0,0,.14)!important}
    .cgd-empty{grid-column:1/-1!important;background:#fff!important;border-radius:14px!important;padding:28px 18px!important;text-align:center!important;color:#666!important;box-shadow:0 2px 8px rgba(0,0,0,.07)!important}

    .cgd-detail{grid-column:1/-1!important;padding:0 4px 20px!important}
    .cgd-back{border:0!important;background:#fff!important;color:var(--store-main,#c2185b)!important;border-radius:999px!important;padding:10px 15px!important;margin:0 0 10px!important;font-size:13px!important;font-weight:900!important;box-shadow:0 2px 8px rgba(0,0,0,.10)!important;cursor:pointer!important}
    .cgd-detail .cgd-card{width:min(100%,420px)!important;margin:0 auto!important;cursor:default!important;transform:none!important}
    .cgd-detail .cgd-image{aspect-ratio:4/5!important}
    .cgd-detail .cgd-info{padding:12px 14px 14px!important}
    .cgd-detail .cgd-name{font-size:19px!important;min-height:0!important;display:block!important;overflow:visible!important}
    .cgd-detail .cgd-desc{font-size:14px!important;min-height:0!important;display:block!important;overflow:visible!important;font-weight:500!important}
    .cgd-detail .cgd-price{font-size:25px!important;margin:4px 0 14px!important}
    .cgd-detail .cgd-buy{font-size:15px!important;padding:14px 10px!important}

    body.chatshop-grid-direct .pub-cat-menu{
      position:fixed!important;top:0!important;left:0!important;right:0!important;transform:none!important;
      z-index:25!important;display:flex!important;flex-direction:row!important;gap:8px!important;
      max-height:none!important;overflow-x:auto!important;overflow-y:hidden!important;align-items:center!important;
      padding:10px!important;white-space:nowrap!important;background:rgba(245,245,245,.98)!important;
      border-bottom:1px solid #e5e7eb!important;box-shadow:0 2px 8px rgba(0,0,0,.07)!important;scrollbar-width:none!important;
    }
    body.chatshop-grid-direct .pub-cat-menu::-webkit-scrollbar{display:none!important}
    body.chatshop-grid-direct .pub-cat-btn{flex:0 0 auto!important;background:#fff!important;color:var(--store-cat,var(--store-main,#c2185b))!important;border:0!important;border-radius:999px!important;padding:9px 15px!important;font-size:12px!important;font-weight:900!important;box-shadow:0 2px 7px rgba(0,0,0,.11)!important}
    body.chatshop-grid-direct .pub-cat-btn.active{background:var(--store-cat,var(--store-main,#c2185b))!important;color:#fff!important}

    #pubChatToggle.chatshop-seller-cta{width:auto!important;min-width:168px!important;height:52px!important;border-radius:999px!important;padding:0 16px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;font-size:14px!important;font-weight:900!important;white-space:nowrap!important;bottom:18px!important}
    #pubChatToggle.chatshop-seller-cta .cta-icon{font-size:21px!important}
    #pubMic,#pubRecStatus{display:none!important}

    @media(max-width:560px){
      #pubFeed.chatshop-grid-feed{gap:8px!important;padding:70px 8px 160px!important}
      .cgd-info{padding:9px 9px 10px!important}.cgd-cat{font-size:9.5px!important;padding:4px 8px!important}
      .cgd-name{font-size:13px!important;min-height:34px!important}.cgd-desc{font-size:10.7px!important;min-height:29px!important}.cgd-price{font-size:18px!important}.cgd-buy{font-size:12px!important;padding:10px 6px!important}
      .cgd-detail{padding:0 1px 18px!important}.cgd-detail .cgd-image{aspect-ratio:1/1.08!important}.cgd-detail .cgd-name{font-size:18px!important}.cgd-detail .cgd-desc{font-size:13px!important}.cgd-detail .cgd-price{font-size:24px!important}
    }
  `;
  document.head.appendChild(style);

  function card(p, index, clickable){
    const img = safeImage(p && p.image);
    const cat = String(p && p.category || '').trim();
    const name = String(p && p.name || 'Produto').trim() || 'Produto';
    const href = safeUrl(p && p.link);
    const btn = String(p && p.buttonText || 'Comprar agora').trim() || 'Comprar agora';
    const attrs = clickable ? ` data-product-index="${index}" role="button" tabindex="0" aria-label="Ver detalhes de ${esc(name)}"` : '';
    return `<article class="cgd-card"${attrs}><div class="cgd-image">${img ? `<img src="${esc(img)}" alt="${esc(name)}">` : '<div class="cgd-noimg">🛍️</div>'}${p && p.promo ? '<span class="cgd-offer">🔥 OFERTA</span>' : ''}</div><div class="cgd-info">${cat ? `<span class="cgd-cat">${esc(cat)}</span>` : ''}<div class="cgd-name">${esc(name)}</div><div class="cgd-desc">${esc(description(p))}</div><div class="cgd-price">${esc(price(p && p.price))}</div><a class="cgd-buy" href="${esc(href)}" target="_blank" rel="noopener" style="background:${esc(buttonColor(p))}">${esc(btn)}</a></div></article>`;
  }

  function filteredProducts(){
    return activeCategory ? products.map((p,i)=>({p,i})).filter(x=>norm(x.p && x.p.category)===norm(activeCategory)) : products.map((p,i)=>({p,i}));
  }

  function installMenu(){
    let menu = document.querySelector('.pub-cat-menu');
    if(data.showCategoryMenu === false){ if(menu) menu.remove(); return; }
    if(!menu){ menu = document.createElement('div'); document.body.appendChild(menu); }
    const clean = menu.cloneNode(false);
    clean.className = 'pub-cat-menu';
    clean.innerHTML = `<button type="button" class="pub-cat-btn${!activeCategory?' active':''}" data-cat="">Todas</button>` + categories.map(c => `<button type="button" class="pub-cat-btn${norm(c)===norm(activeCategory)?' active':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    menu.replaceWith(clean);
    clean.addEventListener('click', e => {
      const btn = e.target.closest('.pub-cat-btn');
      if(!btn) return;
      e.preventDefault(); e.stopPropagation();
      activeCategory = btn.dataset.cat || '';
      detailIndex = -1;
      renderGrid();
    });
  }

  function bindFeed(feed){
    feed.onclick = e => {
      const buy = e.target.closest('.cgd-buy');
      if(buy){ e.stopPropagation(); return; }
      const back = e.target.closest('.cgd-back');
      if(back){ e.preventDefault(); detailIndex = -1; renderGrid(); return; }
      const cardEl = e.target.closest('.cgd-card[data-product-index]');
      if(!cardEl) return;
      const idx = Number(cardEl.dataset.productIndex);
      if(Number.isInteger(idx) && products[idx]){ detailIndex = idx; renderGrid(); }
    };
    feed.onkeydown = e => {
      if(e.key !== 'Enter' && e.key !== ' ') return;
      if(e.target.closest('.cgd-buy')) return;
      const cardEl = e.target.closest('.cgd-card[data-product-index]');
      if(!cardEl) return;
      e.preventDefault();
      const idx = Number(cardEl.dataset.productIndex);
      if(Number.isInteger(idx) && products[idx]){ detailIndex = idx; renderGrid(); }
    };
  }

  function upgradeChatButton(){
    const btn = document.getElementById('pubChatToggle');
    if(!btn) return;
    btn.classList.add('chatshop-seller-cta');
    btn.innerHTML = '<span class="cta-icon">💬</span><span>Fale com o vendedor</span>';
    btn.title = 'Fale com o vendedor';
    btn.setAttribute('aria-label','Fale com o vendedor');
  }

  function renderGrid(){
    const feed = document.getElementById('pubFeed');
    if(!feed || rendering) return false;
    rendering = true;
    document.body.classList.add('chatshop-grid-direct');
    feed.className = 'pub-feed chatshop-grid-feed';

    if(detailIndex >= 0 && products[detailIndex]){
      feed.innerHTML = `<div class="cgd-detail"><button type="button" class="cgd-back">← Voltar aos produtos</button>${card(products[detailIndex], detailIndex, false)}</div>`;
    } else {
      const list = filteredProducts();
      feed.innerHTML = list.length ? list.map(x => card(x.p, x.i, true)).join('') : '<div class="cgd-empty">Nenhum produto nessa categoria.</div>';
    }
    feed.scrollTop = 0;
    bindFeed(feed);
    installMenu();
    upgradeChatButton();
    document.documentElement.classList.remove('chatshop-grid-pending');
    rendering = false;
    return true;
  }

  function stabilize(){
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      const feed = document.getElementById('pubFeed');
      if(feed){
        renderGrid();
        if(!observer){
          const root = document.getElementById('storefrontScreen');
          if(root){
            observer = new MutationObserver(() => {
              if(rendering) return;
              const currentFeed = document.getElementById('pubFeed');
              if(!currentFeed) return;
              const oldLayoutReturned = currentFeed.querySelector('.pub-slide') || !currentFeed.classList.contains('chatshop-grid-feed');
              if(oldLayoutReturned) setTimeout(renderGrid, 0);
              upgradeChatButton();
            });
            observer.observe(root,{childList:true,subtree:true});
          }
        }
      }
      if(attempts >= 25){ clearInterval(timer); document.documentElement.classList.remove('chatshop-grid-pending'); }
    },120);

    [350,700,1200,2000].forEach(ms => setTimeout(() => { renderGrid(); upgradeChatButton(); }, ms));
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stabilize, {once:true});
  else stabilize();
})();