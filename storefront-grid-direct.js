(function(){
  'use strict';

  const data = window.__CHATSHOP_STORE_DATA || null;
  if(!data || data.homeLayout !== 'grid'){
    document.documentElement.classList.remove('chatshop-grid-pending');
    return;
  }

  const products = Array.isArray(data.products) ? data.products : [];
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/s$/,'');

  function safeUrl(v){
    try{ const u = new URL(String(v || ''), location.origin); return /^(https?):$/.test(u.protocol) ? u.href : '#'; }
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
    const values = [p && p.cardDescription, p && p.displayText, p && p.voiceText];
    for(const value of values){
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
  let ownedFeed = null;

  const style = document.createElement('style');
  style.id = 'chatshopGridDirectStyleV11';
  style.textContent = `
    html.chatshop-grid-pending #storefrontScreen{visibility:hidden!important}
    body.chatshop-grid-direct{margin:0!important;background:#f5f5f5!important;overflow:hidden!important}
    body.chatshop-grid-direct #storefrontScreen,
    body.chatshop-grid-direct #storefrontScreen #liveApp{background:#f5f5f5!important}
    body.chatshop-grid-direct .promo-badge,
    body.chatshop-grid-direct .pub-swipe-hint{display:none!important}

    #pubFeed.chatshop-grid-feed{
      position:relative!important;z-index:1!important;width:100%!important;height:100dvh!important;
      margin:0!important;overflow-y:auto!important;overflow-x:hidden!important;
      display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
      grid-auto-flow:row!important;grid-auto-rows:auto!important;align-items:stretch!important;align-content:start!important;
      gap:10px!important;padding:74px 10px 165px!important;background:#f5f5f5!important;
      scroll-snap-type:none!important;-webkit-overflow-scrolling:touch!important;pointer-events:auto!important;
    }
    #pubFeed.chatshop-grid-feed > *{scroll-snap-align:none!important}

    .cgd-card{
      position:relative!important;z-index:2!important;min-width:0!important;width:100%!important;height:100%!important;
      display:flex!important;flex-direction:column!important;background:#fff!important;border:1px solid #ececec!important;
      border-radius:15px!important;overflow:hidden!important;box-shadow:0 3px 12px rgba(0,0,0,.10)!important;
      cursor:pointer!important;-webkit-tap-highlight-color:transparent!important;pointer-events:auto!important;
    }
    .cgd-card:active{transform:scale(.988)!important}
    .cgd-image{
      position:relative!important;width:100%!important;aspect-ratio:1/1!important;flex:0 0 auto!important;
      background:#fff!important;overflow:hidden!important;border-bottom:1px solid #f0f0f0!important;pointer-events:auto!important;
    }
    .cgd-image img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;background:#fff!important;pointer-events:none!important}
    .cgd-noimg{position:absolute!important;inset:0!important;display:grid!important;place-items:center!important;background:#fafafa!important;font-size:42px!important;color:#aaa!important;pointer-events:none!important}
    .cgd-offer{position:absolute!important;top:9px!important;left:9px!important;z-index:3!important;background:#ee4d2d!important;color:#fff!important;border-radius:8px!important;padding:6px 9px!important;font-size:10px!important;font-weight:900!important;box-shadow:0 2px 7px rgba(0,0,0,.18)!important;pointer-events:none!important}
    .cgd-info{display:flex!important;flex-direction:column!important;flex:1 1 auto!important;min-height:148px!important;padding:10px!important;background:#fff!important;pointer-events:auto!important}
    .cgd-cat{display:inline-flex!important;align-self:flex-start!important;max-width:100%!important;margin-bottom:7px!important;padding:4px 9px!important;border-radius:999px!important;background:#fff1f5!important;border:1px solid #ffd5e2!important;color:var(--store-cat,var(--store-main,#c2185b))!important;font-size:10px!important;line-height:1!important;font-weight:900!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    .cgd-name{color:#222!important;font-size:14px!important;line-height:1.28!important;font-weight:900!important;margin:0 0 6px!important;min-height:36px!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
    .cgd-desc{color:#626262!important;font-size:11.5px!important;line-height:1.35!important;font-weight:600!important;margin:0 0 8px!important;min-height:31px!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
    .cgd-price{color:var(--store-price,var(--store-main,#ee4d2d))!important;font-size:19px!important;line-height:1.1!important;font-weight:900!important;margin:2px 0 10px!important}
    .cgd-buy{display:block!important;position:relative!important;z-index:4!important;width:100%!important;margin-top:auto!important;padding:11px 7px!important;border-radius:9px!important;text-align:center!important;text-decoration:none!important;color:#fff!important;font-size:12px!important;line-height:1.1!important;font-weight:900!important;box-shadow:0 2px 6px rgba(0,0,0,.14)!important;pointer-events:auto!important}
    .cgd-empty{grid-column:1/-1!important;background:#fff!important;border-radius:14px!important;padding:28px 18px!important;text-align:center!important;color:#666!important;box-shadow:0 2px 8px rgba(0,0,0,.07)!important}

    .cgd-detail{grid-column:1/-1!important;padding:0 4px 20px!important;pointer-events:auto!important}
    .cgd-back{position:relative!important;z-index:4!important;border:0!important;background:#fff!important;color:var(--store-main,#c2185b)!important;border-radius:999px!important;padding:10px 15px!important;margin:0 0 10px!important;font-size:13px!important;font-weight:900!important;box-shadow:0 2px 8px rgba(0,0,0,.10)!important;cursor:pointer!important;pointer-events:auto!important}
    .cgd-detail .cgd-card{width:min(100%,420px)!important;height:auto!important;margin:0 auto!important;cursor:default!important;transform:none!important}
    .cgd-detail .cgd-image{aspect-ratio:4/5!important}
    .cgd-detail .cgd-info{min-height:0!important;padding:13px 14px 14px!important}
    .cgd-detail .cgd-name{font-size:19px!important;min-height:0!important;display:block!important;overflow:visible!important}
    .cgd-detail .cgd-desc{font-size:14px!important;min-height:0!important;display:block!important;overflow:visible!important;font-weight:500!important}
    .cgd-detail .cgd-price{font-size:25px!important;margin:4px 0 14px!important}
    .cgd-detail .cgd-buy{font-size:15px!important;padding:14px 10px!important}

    #chatshopGridMenu{
      position:fixed!important;top:0!important;left:0!important;right:0!important;z-index:80!important;
      display:flex!important;gap:8px!important;align-items:center!important;overflow-x:auto!important;overflow-y:hidden!important;
      padding:10px!important;white-space:nowrap!important;background:rgba(245,245,245,.98)!important;
      border-bottom:1px solid #e5e7eb!important;box-shadow:0 2px 8px rgba(0,0,0,.07)!important;
      scrollbar-width:none!important;pointer-events:auto!important;touch-action:pan-x!important;
    }
    #chatshopGridMenu::-webkit-scrollbar{display:none!important}
    .cgd-menu-btn{position:relative!important;z-index:81!important;flex:0 0 auto!important;background:#fff!important;color:var(--store-cat,var(--store-main,#c2185b))!important;border:0!important;border-radius:999px!important;padding:10px 16px!important;font-size:12px!important;font-weight:900!important;box-shadow:0 2px 7px rgba(0,0,0,.11)!important;cursor:pointer!important;pointer-events:auto!important}
    .cgd-menu-btn.active{background:var(--store-cat,var(--store-main,#c2185b))!important;color:#fff!important}

    #pubChatToggle.chatshop-seller-cta{width:auto!important;min-width:168px!important;height:52px!important;border-radius:999px!important;padding:0 16px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;font-size:14px!important;font-weight:900!important;white-space:nowrap!important;bottom:18px!important;z-index:90!important;pointer-events:auto!important}
    #pubChatToggle.chatshop-seller-cta .cta-icon{font-size:21px!important}
    #pubMic,#pubRecStatus{display:none!important}

    @media(max-width:560px){
      #pubFeed.chatshop-grid-feed{gap:8px!important;padding:72px 8px 160px!important}
      .cgd-info{min-height:143px!important;padding:9px!important}
      .cgd-cat{font-size:9.5px!important;padding:4px 8px!important;margin-bottom:6px!important}
      .cgd-name{font-size:13px!important;min-height:34px!important;margin-bottom:5px!important}
      .cgd-desc{font-size:10.7px!important;min-height:29px!important;margin-bottom:7px!important}
      .cgd-price{font-size:18px!important;margin-bottom:9px!important}
      .cgd-buy{font-size:12px!important;padding:10px 6px!important}
      .cgd-detail{padding:0 1px 18px!important}
      .cgd-detail .cgd-image{aspect-ratio:1/1.08!important}
      .cgd-detail .cgd-name{font-size:18px!important}
      .cgd-detail .cgd-desc{font-size:13px!important}
      .cgd-detail .cgd-price{font-size:24px!important}
    }
  `;
  document.head.appendChild(style);

  function card(p,index,clickable){
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

  function removeLegacyGridPieces(){
    document.querySelectorAll('.pub-cat-menu').forEach(el => el.remove());
    document.querySelectorAll('.promo-badge').forEach(el => el.remove());
    const oldFeed = document.getElementById('pubFeed');
    if(oldFeed && oldFeed !== ownedFeed){
      const fresh = document.createElement('div');
      fresh.id = 'pubFeed';
      fresh.className = 'pub-feed chatshop-grid-feed';
      fresh.setAttribute('data-chatshop-grid-owned','1');
      oldFeed.replaceWith(fresh);
      ownedFeed = fresh;
    }
  }

  function installMenu(){
    const old = document.getElementById('chatshopGridMenu');
    if(old) old.remove();
    if(data.showCategoryMenu === false) return;
    const menu = document.createElement('nav');
    menu.id = 'chatshopGridMenu';
    menu.setAttribute('aria-label','Categorias de produtos');
    menu.innerHTML = `<button type="button" class="cgd-menu-btn${!activeCategory?' active':''}" data-cat="">Todas</button>` + categories.map(c => `<button type="button" class="cgd-menu-btn${norm(c)===norm(activeCategory)?' active':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    document.body.appendChild(menu);
    menu.addEventListener('click', e => {
      const btn = e.target.closest('.cgd-menu-btn');
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
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
      e.preventDefault();
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
    removeLegacyGridPieces();
    const feed = ownedFeed || document.getElementById('pubFeed');
    if(!feed) return false;
    ownedFeed = feed;
    document.body.classList.add('chatshop-grid-direct');
    feed.className = 'pub-feed chatshop-grid-feed';
    feed.setAttribute('data-chatshop-grid-owned','1');

    if(detailIndex >= 0 && products[detailIndex]){
      feed.innerHTML = `<div class="cgd-detail"><button type="button" class="cgd-back">← Voltar aos produtos</button>${card(products[detailIndex],detailIndex,false)}</div>`;
    }else{
      const list = filteredProducts();
      feed.innerHTML = list.length ? list.map(x=>card(x.p,x.i,true)).join('') : '<div class="cgd-empty">Nenhum produto nessa categoria.</div>';
    }
    feed.scrollTop = 0;
    bindFeed(feed);
    installMenu();
    upgradeChatButton();
    document.documentElement.classList.remove('chatshop-grid-pending');
    return true;
  }

  function makeStoreRef(){
    try{
      if(!window.firebase || typeof firebase.firestore !== 'function') return null;
      const host = location.hostname.toLowerCase().replace(/\.$/,'');
      const suffix = '.alibr.com.br';
      if(!host.endsWith(suffix)) return null;
      const slug = host.slice(0,-suffix.length);
      if(!slug || slug === 'www' || slug.includes('.')) return null;
      return firebase.firestore().collection('chatshops').doc(slug);
    }catch(e){
      console.warn('grid ref:',e);
      return null;
    }
  }

  function initialize(){
    const root = document.getElementById('storefrontScreen');
    if(!root) return false;
    const authScreen = document.getElementById('authScreen');
    const genApp = document.getElementById('genApp');
    if(authScreen) authScreen.style.display = 'none';
    if(genApp) genApp.style.display = 'none';
    root.style.display = 'block';

    try{
      if(typeof renderPublishedStore !== 'function') return false;
      renderPublishedStore(data, makeStoreRef());
    }catch(e){
      console.error('Erro ao preparar grade:',e);
      return false;
    }

    removeLegacyGridPieces();
    return renderGrid();
  }

  let tries = 0;
  function start(){
    tries++;
    if(initialize()) return;
    if(tries < 40){ setTimeout(start,50); return; }
    document.documentElement.classList.remove('chatshop-grid-pending');
  }

  start();
})();