/* ChatShop - upgrade de frete para Loja Virtual
   Frete grátis ou frete por km, com endereço de origem, valor/km,
   valor mínimo e limite de distância. Funciona sem API paga de mapas:
   o cliente informa a distância e pode abrir a rota no Google Maps. */
(function(){
'use strict';

function qs(s,root){return (root||document).querySelector(s)}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function num(v){
  let x=String(v??'').trim().replace(/[^0-9,.-]/g,'');
  if(!x)return 0;
  if(x.includes(','))x=x.replace(/\./g,'').replace(',','.');
  const n=Number(x);return Number.isFinite(n)?n:0;
}
function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function priceText(v){const n=num(v);return n?money(n):(String(v||'').trim()||'Consulte')}
function safeUrl(value,fallback=''){
  try{const u=new URL(String(value||''),location.origin);return ['http:','https:'].includes(u.protocol)?u.href:fallback}catch(e){return fallback}
}
function safeImage(value){const v=String(value||'');if(/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v))return v;return safeUrl(v,'')}
function imagesOf(p){
  const arr=Array.isArray(p.images)?p.images:[p.image],out=[];
  arr.forEach(v=>{const x=safeImage(v);if(x&&!out.includes(x))out.push(x)});
  const f=safeImage(p.image);if(f&&!out.includes(f))out.unshift(f);
  return out.slice(0,4);
}
function colorsOf(p){return (Array.isArray(p.colors)?p.colors:String(p.colors||'').split(',')).map(x=>String(x).trim()).filter(Boolean)}
function normalizeShipping(raw){
  raw=raw&&typeof raw==='object'?raw:{};
  const valid=['free','per_km','none'];
  return {
    mode:valid.includes(raw.mode)?raw.mode:'none',
    origin:String(raw.origin||'').trim(),
    ratePerKm:Math.max(0,num(raw.ratePerKm)),
    minimum:Math.max(0,num(raw.minimum)),
    maxKm:Math.max(0,num(raw.maxKm))
  };
}
function freightFor(shipping,km){
  if(shipping.mode==='free')return 0;
  if(shipping.mode!=='per_km')return 0;
  const d=Math.max(0,num(km));
  if(!d)return 0;
  return Math.max(shipping.minimum||0,d*(shipping.ratePerKm||0));
}

function installEditorShipping(){
  const storeType=qs('#storeType');
  if(!storeType||qs('#shippingSettings'))return;
  const anchor=storeType.closest('.field');
  if(!anchor)return;
  const box=document.createElement('div');
  box.id='shippingSettings';
  box.className='field';
  box.style.cssText='border:1px solid #bae6fd;background:#f0f9ff;border-radius:12px;padding:12px;margin:10px 0 14px';
  box.innerHTML=`
    <label style="font-size:14px">🚚 Configuração de entrega</label>
    <div class="field" style="margin-top:8px"><label>Tipo de frete</label>
      <select id="shippingMode">
        <option value="free">🎁 Frete grátis</option>
        <option value="per_km">📍 Frete por km</option>
      </select>
      <small>Essa opção aparece na sacola da Loja Virtual.</small>
    </div>
    <div id="shippingKmFields" style="display:none">
      <div class="field"><label>Endereço de saída / origem da loja</label><input id="shippingOrigin" placeholder="Ex: Rua Exemplo, 100 - São Paulo - SP"><small>O cliente poderá abrir uma rota no Google Maps para conferir a distância.</small></div>
      <div class="grid2">
        <div class="field"><label>Valor por km (R$)</label><input id="shippingRate" inputmode="decimal" placeholder="Ex: 2,50" value="2,50"></div>
        <div class="field"><label>Frete mínimo (R$)</label><input id="shippingMinimum" inputmode="decimal" placeholder="Ex: 8,00" value="0"></div>
      </div>
      <div class="field"><label>Distância máxima de entrega (km)</label><input id="shippingMaxKm" inputmode="decimal" placeholder="Ex: 30"><small>Deixe 0 ou vazio para não limitar a distância.</small></div>
      <div style="font-size:11px;color:#0369a1;line-height:1.45">ℹ️ Nesta versão, o cliente informa a distância em km. O botão “Ver rota no Google Maps” ajuda a conferir a distância sem precisar contratar uma API de mapas.</div>
    </div>`;
  anchor.insertAdjacentElement('afterend',box);
  const mode=qs('#shippingMode');
  function updateFields(){
    qs('#shippingKmFields').style.display=mode.value==='per_km'?'block':'none';
    if(typeof window.debounce==='function')window.debounce();
  }
  mode.addEventListener('change',updateFields);
  ['shippingOrigin','shippingRate','shippingMinimum','shippingMaxKm'].forEach(id=>qs('#'+id)?.addEventListener('input',()=>{if(typeof window.debounce==='function')window.debounce()}));
  updateFields();

  const oldCollect=window.collect;
  if(typeof oldCollect==='function'){
    window.collect=function(){
      const d=oldCollect();
      d.shipping={
        mode:qs('#shippingMode')?.value||'free',
        origin:qs('#shippingOrigin')?.value.trim()||'',
        ratePerKm:num(qs('#shippingRate')?.value),
        minimum:num(qs('#shippingMinimum')?.value),
        maxKm:num(qs('#shippingMaxKm')?.value)
      };
      return d;
    };
  }

  const oldPopulate=window.populateForm;
  if(typeof oldPopulate==='function'){
    window.populateForm=async function(data){
      const r=await oldPopulate(data);
      const s=normalizeShipping(data?.shipping);
      qs('#shippingMode').value=s.mode==='none'?'free':s.mode;
      qs('#shippingOrigin').value=s.origin||'';
      qs('#shippingRate').value=s.ratePerKm?String(s.ratePerKm).replace('.',','):'2,50';
      qs('#shippingMinimum').value=s.minimum?String(s.minimum).replace('.',','):'0';
      qs('#shippingMaxKm').value=s.maxKm?String(s.maxKm).replace('.',','):'0';
      updateFields();
      window.updateStoreTypeUI?.();
      return r;
    };
  }

  const oldClear=window.clearForm;
  if(typeof oldClear==='function'){
    window.clearForm=function(){
      const r=oldClear();
      qs('#shippingMode').value='free';qs('#shippingOrigin').value='';qs('#shippingRate').value='2,50';qs('#shippingMinimum').value='0';qs('#shippingMaxKm').value='0';
      updateFields();window.updateStoreTypeUI?.();return r;
    };
  }

  const oldUpdate=window.updateStoreTypeUI;
  if(typeof oldUpdate==='function'){
    window.updateStoreTypeUI=function(){
      const r=oldUpdate();
      box.style.display=(qs('#storeType')?.value==='virtual')?'block':'none';
      return r;
    };
  }

  const oldRender=window.renderLive;
  if(typeof oldRender==='function'){
    window.renderLive=function(){
      const r=oldRender();
      if(qs('#storeType')?.value==='virtual'){
        const vp=qs('#virtualPreview');
        if(vp&&!qs('#shippingPreviewBadge',vp)){
          const s=normalizeShipping(window.collect?.().shipping);
          const b=document.createElement('div');b.id='shippingPreviewBadge';
          b.style.cssText='margin:10px 12px 0;padding:9px 11px;border-radius:10px;background:#ecfeff;border:1px solid #a5f3fc;font-size:12px;font-weight:800;color:#155e75';
          b.textContent=s.mode==='free'?'🚚 Frete grátis':`🚚 Frete por km · ${money(s.ratePerKm)}/km${s.maxKm?` · até ${s.maxKm} km`:''}`;
          const first=vp.children[0];first?.insertAdjacentElement('afterend',b);
        }
      }
      return r;
    };
  }
  window.updateStoreTypeUI?.();
  window.renderLive?.();
}

function renderVirtualStore(data,root){
  if(!root)return;
  const products=Array.isArray(data.products)?data.products:[];
  const shipping=normalizeShipping(data.shipping);
  const main=/^#[0-9a-f]{6}$/i.test(data.mainColor||'')?data.mainColor:'#7A2E3B';
  const accent=/^#[0-9a-f]{6}$/i.test(data.accentColor||'')?data.accentColor:'#C9A24B';
  const priceColor=/^#[0-9a-f]{6}$/i.test(data.priceColor||'')?data.priceColor:main;
  document.title=(data.brand||'Loja virtual')+' · ChatShop';
  const shippingLabel=shipping.mode==='free'?'Frete grátis':shipping.mode==='per_km'?`${money(shipping.ratePerKm)}/km`:'Frete a combinar';
  root.innerHTML=`<style>
  .csv-page{min-height:100dvh;background:#f8fafc;color:#111827;font-family:Arial,sans-serif}.csv-head{position:sticky;top:0;z-index:12;background:#fff;border-bottom:1px solid #e5e7eb;padding:11px 14px;display:flex;align-items:center;gap:10px}.csv-logo{width:42px;height:42px;border-radius:50%;background:${accent};display:grid;place-items:center;overflow:hidden;font-weight:900}.csv-logo img{width:100%;height:100%;object-fit:cover}.csv-title{flex:1;min-width:0}.csv-title b{display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.csv-title small{color:#6b7280}.csv-bag{border:0;background:${main};color:#fff;border-radius:999px;padding:10px 14px;font-weight:900;cursor:pointer;white-space:nowrap}.csv-hero{padding:18px 14px 6px;max-width:1100px;margin:auto}.csv-hero h1{font-size:21px;margin:0 0 5px}.csv-hero p{margin:0;color:#6b7280;font-size:13px}.csv-shiptag{display:inline-block;margin-top:9px;background:#ecfeff;border:1px solid #a5f3fc;color:#155e75;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:900}.csv-grid{max-width:1100px;margin:0 auto;padding:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}.csv-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06)}.csv-photo{aspect-ratio:1/1;background:#f3f4f6;display:grid;place-items:center;overflow:hidden}.csv-photo img{width:100%;height:100%;object-fit:cover}.csv-body{padding:11px}.csv-name{font-size:14px;font-weight:800;line-height:1.25;min-height:35px}.csv-price{font-weight:900;color:${priceColor};margin:6px 0 9px}.csv-open{width:100%;border:0;background:${main};color:#fff;padding:10px;border-radius:9px;font-weight:900;cursor:pointer}.csv-modal{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.55);display:none;align-items:flex-end;justify-content:center}.csv-modal.on{display:flex}.csv-sheet{background:#fff;width:100%;max-width:620px;max-height:94dvh;overflow:auto;border-radius:20px 20px 0 0;padding:16px;position:relative}.csv-close{position:absolute;right:12px;top:10px;width:36px;height:36px;border:0;border-radius:50%;background:#f3f4f6;font-size:22px;cursor:pointer;z-index:2}.csv-mainimg{width:100%;aspect-ratio:1/1;object-fit:contain;background:#f8fafc;border-radius:14px}.csv-thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:8px 0}.csv-thumb{border:2px solid transparent;border-radius:9px;overflow:hidden;background:#f3f4f6;aspect-ratio:1/1;padding:0;cursor:pointer}.csv-thumb.active{border-color:${main}}.csv-thumb img{width:100%;height:100%;object-fit:cover}.csv-dname{font-size:20px;font-weight:900;margin-top:10px}.csv-dprice{font-size:18px;font-weight:900;color:${priceColor};margin:6px 0 12px}.csv-label{font-size:12px;font-weight:900;margin:12px 0 7px}.csv-colors{display:flex;gap:7px;flex-wrap:wrap}.csv-color{border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:8px 11px;font-weight:800;font-size:12px;cursor:pointer}.csv-color.active{background:${main};color:#fff;border-color:${main}}.csv-qty{display:flex;align-items:center;gap:12px}.csv-qty button{width:38px;height:38px;border:1px solid #d1d5db;background:#fff;border-radius:10px;font-size:20px;cursor:pointer}.csv-qty b{min-width:24px;text-align:center}.csv-add{width:100%;border:0;background:${main};color:#fff;padding:13px;border-radius:12px;font-weight:900;font-size:15px;margin-top:16px;cursor:pointer}.csv-cartlist{display:flex;flex-direction:column;gap:10px;margin-top:36px}.csv-item{display:grid;grid-template-columns:66px 1fr auto;gap:10px;border-bottom:1px solid #eee;padding-bottom:10px}.csv-item img,.csv-noimg{width:66px;height:66px;border-radius:10px;object-fit:cover;background:#f3f4f6}.csv-item b{font-size:13px}.csv-item small{display:block;color:#6b7280;margin-top:3px}.csv-remove{border:0;background:#fee2e2;color:#b91c1c;border-radius:8px;padding:6px 8px;height:max-content;cursor:pointer}.csv-delivery{margin-top:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px}.csv-delivery label{display:block;font-size:12px;font-weight:900;margin:7px 0 5px}.csv-delivery input{width:100%;border:1px solid #cbd5e1;border-radius:9px;padding:10px;font:inherit}.csv-route{margin-top:8px;border:1px solid #0ea5e9;background:#fff;color:#0369a1;border-radius:9px;padding:9px 11px;font-weight:800;cursor:pointer;width:100%}.csv-help{font-size:11px;color:#64748b;line-height:1.4;margin-top:6px}.csv-summary{margin-top:15px;border-top:1px solid #e5e7eb;padding-top:10px}.csv-srow{display:flex;justify-content:space-between;gap:10px;padding:4px 0;font-size:14px}.csv-srow.total{font-size:18px;font-weight:900}.csv-error{display:none;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:9px;padding:8px 10px;font-size:12px;margin-top:9px}.csv-checkout{width:100%;border:0;background:#25D366;color:#fff;padding:13px;border-radius:12px;font-weight:900;font-size:15px;margin-top:12px;cursor:pointer}.csv-empty{text-align:center;color:#6b7280;padding:45px 10px}.csv-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;background:#111827;color:#fff;padding:10px 14px;border-radius:999px;font-size:13px;z-index:70;display:none}.csv-toast.show{display:block}@media(max-width:520px){.csv-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:10px}.csv-body{padding:9px}.csv-name{font-size:13px}.csv-hero{padding:14px 10px 4px}.csv-sheet{padding:14px}.csv-mainimg{aspect-ratio:4/5}}
  </style>
  <div class="csv-page"><header class="csv-head"><div class="csv-logo" id="csvLogo"></div><div class="csv-title"><b>${esc(data.brand||'Minha Loja')}</b><small>Loja virtual</small></div><button class="csv-bag" id="csvBag">🛍️ Sacola <span id="csvCount">0</span></button></header><section class="csv-hero"><h1>Escolha seus produtos</h1><p>Selecione cor e quantidade e adicione à sacola.</p><span class="csv-shiptag">🚚 ${esc(shippingLabel)}</span></section><main class="csv-grid" id="csvGrid"></main></div>
  <div class="csv-modal" id="csvProduct"><div class="csv-sheet"><button class="csv-close" data-close="product">×</button><div id="csvProductBody"></div></div></div>
  <div class="csv-modal" id="csvCart"><div class="csv-sheet"><button class="csv-close" data-close="cart">×</button><h2 style="margin:4px 0 0">🛍️ Sua sacola</h2><div id="csvCartBody"></div></div></div><div class="csv-toast" id="csvToast"></div>`;
  const logo=safeImage(data.logo),logoEl=qs('#csvLogo',root);if(logo)logoEl.innerHTML=`<img src="${esc(logo)}" alt="">`;else logoEl.textContent=(data.brand||'L').charAt(0).toUpperCase();
  const grid=qs('#csvGrid',root);
  grid.innerHTML=products.length?products.map((p,i)=>{const img=imagesOf(p)[0];return `<article class="csv-card"><div class="csv-photo">${img?`<img src="${esc(img)}" alt="${esc(p.name)}">`:'🛍️'}</div><div class="csv-body"><div class="csv-name">${esc(p.name||'Produto')}</div><div class="csv-price">${esc(priceText(p.price))}</div><button class="csv-open" data-product="${i}" type="button">Ver produto</button></div></article>`}).join(''):'<div class="csv-empty" style="grid-column:1/-1">Nenhum produto cadastrado ainda.</div>';
  let cart=[],activeIndex=0,selectedColor='',qty=1,lastAddress='',lastKm='';
  const productModal=qs('#csvProduct',root),cartModal=qs('#csvCart',root);
  function toast(t){const el=qs('#csvToast',root);el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1600)}
  function updateCount(){qs('#csvCount',root).textContent=cart.reduce((a,x)=>a+x.qty,0)}
  function openProduct(i){
    activeIndex=Number(i);const p=products[activeIndex];if(!p)return;const imgs=imagesOf(p),colors=colorsOf(p);selectedColor=colors[0]||'';qty=1;
    qs('#csvProductBody',root).innerHTML=`${imgs[0]?`<img class="csv-mainimg" id="csvMainImg" src="${esc(imgs[0])}" alt="${esc(p.name)}">`:'<div class="csv-mainimg" style="display:grid;place-items:center;font-size:60px">🛍️</div>'}${imgs.length>1?`<div class="csv-thumbs">${imgs.map((im,j)=>`<button class="csv-thumb ${j===0?'active':''}" data-img="${j}" type="button"><img src="${esc(im)}" alt=""></button>`).join('')}</div>`:''}<div class="csv-dname">${esc(p.name||'Produto')}</div><div class="csv-dprice">${esc(priceText(p.price))}</div>${colors.length?`<div class="csv-label">Escolha a cor</div><div class="csv-colors">${colors.map((c,j)=>`<button class="csv-color ${j===0?'active':''}" data-color="${esc(c)}" type="button">${esc(c)}</button>`).join('')}</div>`:''}<div class="csv-label">Quantidade</div><div class="csv-qty"><button type="button" id="csvMinus">−</button><b id="csvQty">1</b><button type="button" id="csvPlus">+</button></div><button class="csv-add" id="csvAdd" type="button">Adicionar à sacola</button>`;
    productModal.classList.add('on');
  }
  grid.addEventListener('click',e=>{const b=e.target.closest('[data-product]');if(b)openProduct(b.dataset.product)});
  qs('#csvProductBody',root).addEventListener('click',e=>{
    const p=products[activeIndex];if(!p)return;const imgs=imagesOf(p);
    const th=e.target.closest('.csv-thumb');if(th){const mi=qs('#csvMainImg',root);if(mi)mi.src=imgs[Number(th.dataset.img)];root.querySelectorAll('.csv-thumb').forEach(x=>x.classList.remove('active'));th.classList.add('active');return}
    const c=e.target.closest('.csv-color');if(c){selectedColor=c.dataset.color||'';root.querySelectorAll('.csv-color').forEach(x=>x.classList.remove('active'));c.classList.add('active');return}
    if(e.target.id==='csvMinus'){qty=Math.max(1,qty-1);qs('#csvQty',root).textContent=qty;return}
    if(e.target.id==='csvPlus'){qty++;qs('#csvQty',root).textContent=qty;return}
    if(e.target.id==='csvAdd'){const key=activeIndex+'|'+selectedColor,hit=cart.find(x=>x.key===key);if(hit)hit.qty+=qty;else cart.push({key,index:activeIndex,color:selectedColor,qty,price:num(p.price)});updateCount();productModal.classList.remove('on');toast('Produto adicionado à sacola')}
  });
  function shippingForm(){
    const kmBlock=shipping.mode==='per_km'?`<label>Distância até a entrega (km)</label><input id="csvKm" inputmode="decimal" placeholder="Ex: 8,5" value="${esc(lastKm)}"><button class="csv-route" id="csvRoute" type="button">🗺️ Ver rota no Google Maps</button><div class="csv-help">Origem: ${esc(shipping.origin||'endereço da loja não informado')}. Confira a distância no Maps e informe os km acima.</div>`:'';
    const info=shipping.mode==='free'?'<div class="csv-help" style="color:#15803d;font-weight:900">🎁 Esta loja oferece frete grátis.</div>':shipping.mode==='none'?'<div class="csv-help">O valor do frete será combinado com a loja pelo WhatsApp.</div>':'';
    return `<div class="csv-delivery"><b>🚚 Entrega</b><label>Endereço de entrega</label><input id="csvAddress" placeholder="Rua, número, bairro, cidade" value="${esc(lastAddress)}">${kmBlock}${info}<div class="csv-error" id="csvShipError"></div></div>`;
  }
  function renderCart(){
    const body=qs('#csvCartBody',root);if(!cart.length){body.innerHTML='<div class="csv-empty">Sua sacola está vazia.</div>';return}
    const subtotal=cart.reduce((a,x)=>a+x.price*x.qty,0);
    body.innerHTML=`<div class="csv-cartlist">${cart.map((x,i)=>{const p=products[x.index],img=imagesOf(p)[0];return `<div class="csv-item">${img?`<img src="${esc(img)}" alt="">`:'<div class="csv-noimg"></div>'}<div><b>${esc(p.name||'Produto')}</b><small>${x.color?'Cor: '+esc(x.color)+' · ':''}Qtd: ${x.qty}</small><small>${esc(priceText(p.price))} cada</small></div><button class="csv-remove" data-remove="${i}" type="button">Remover</button></div>`}).join('')}</div>${shippingForm()}<div class="csv-summary"><div class="csv-srow"><span>Subtotal</span><b>${money(subtotal)}</b></div><div class="csv-srow"><span>Frete</span><b id="csvFreight">${shipping.mode==='free'?'Grátis':shipping.mode==='none'?'A combinar':money(freightFor(shipping,lastKm))}</b></div><div class="csv-srow total"><span>Total</span><span id="csvTotal">${money(subtotal+(shipping.mode==='per_km'?freightFor(shipping,lastKm):0))}</span></div></div><button class="csv-checkout" id="csvCheckout" type="button">Finalizar pedido no WhatsApp</button>`;
    const addr=qs('#csvAddress',root);if(addr)addr.addEventListener('input',()=>lastAddress=addr.value);
    const km=qs('#csvKm',root);if(km){km.addEventListener('input',()=>{lastKm=km.value;updateFreight(subtotal)})}
    const route=qs('#csvRoute',root);if(route)route.onclick=()=>openRoute();
  }
  function updateFreight(subtotal){
    const d=num(qs('#csvKm',root)?.value),f=freightFor(shipping,d);lastKm=qs('#csvKm',root)?.value||'';
    const fr=qs('#csvFreight',root),tt=qs('#csvTotal',root);if(fr)fr.textContent=money(f);if(tt)tt.textContent=money(subtotal+f);
    const er=qs('#csvShipError',root);if(er){if(shipping.maxKm&&d>shipping.maxKm){er.style.display='block';er.textContent=`A entrega desta loja vai até ${shipping.maxKm} km. A distância informada foi ${d} km.`}else er.style.display='none'}
  }
  function openRoute(){
    const destination=qs('#csvAddress',root)?.value.trim()||lastAddress;lastAddress=destination;
    if(!shipping.origin){alert('A loja ainda não cadastrou o endereço de origem.');return}
    if(!destination){alert('Digite primeiro o endereço de entrega.');return}
    const u='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(shipping.origin)+'&destination='+encodeURIComponent(destination);window.open(u,'_blank','noopener');
  }
  qs('#csvBag',root).onclick=()=>{renderCart();cartModal.classList.add('on')};
  qs('#csvCartBody',root).addEventListener('click',e=>{
    const r=e.target.closest('[data-remove]');if(r){lastAddress=qs('#csvAddress',root)?.value||lastAddress;lastKm=qs('#csvKm',root)?.value||lastKm;cart.splice(Number(r.dataset.remove),1);updateCount();renderCart();return}
    if(e.target.id!=='csvCheckout')return;
    const phone=String(data.whatsapp||'').replace(/\D/g,'');if(!phone){alert('A loja ainda não cadastrou um WhatsApp.');return}
    const address=qs('#csvAddress',root)?.value.trim()||'';lastAddress=address;
    const er=qs('#csvShipError',root);if(!address){if(er){er.style.display='block';er.textContent='Digite o endereço de entrega antes de finalizar.'}return}
    const km=num(qs('#csvKm',root)?.value);lastKm=qs('#csvKm',root)?.value||'';
    if(shipping.mode==='per_km'){
      if(!km){if(er){er.style.display='block';er.textContent='Informe a distância em km para calcular o frete.'}return}
      if(shipping.maxKm&&km>shipping.maxKm){if(er){er.style.display='block';er.textContent=`Esta loja entrega até ${shipping.maxKm} km.`}return}
    }
    const subtotal=cart.reduce((a,x)=>a+x.price*x.qty,0),freight=shipping.mode==='per_km'?freightFor(shipping,km):0,total=subtotal+freight;
    const lines=['Olá! Quero fazer este pedido:',''];
    cart.forEach(x=>{const p=products[x.index],sub=x.price*x.qty;lines.push('• '+(p.name||'Produto')+(x.color?' | Cor: '+x.color:'')+' | Qtd: '+x.qty+' | '+money(sub))});
    lines.push('','Subtotal: '+money(subtotal));
    if(shipping.mode==='free')lines.push('Frete: GRÁTIS');
    else if(shipping.mode==='per_km'){lines.push('Distância: '+String(km).replace('.',',')+' km');lines.push('Frete: '+money(freight)+' ('+money(shipping.ratePerKm)+'/km)')}
    else lines.push('Frete: a combinar');
    lines.push('Total: '+money(total),'','Endereço de entrega: '+address);
    if(shipping.origin)lines.push('Origem da entrega: '+shipping.origin);
    window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(lines.join('\n')),'_blank','noopener');
  });
  root.addEventListener('click',e=>{if(e.target.dataset.close==='product'||e.target===productModal)productModal.classList.remove('on');if(e.target.dataset.close==='cart'||e.target===cartModal)cartModal.classList.remove('on')});
  updateCount();
}
window.ChatShopRenderVirtualStore=renderVirtualStore;
window.renderVirtualPublished=function(data,ref){renderVirtualStore(data,qs('#storefrontScreen'))};
window.generateVirtualHTML=function(d){
  const data=JSON.stringify(d).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.brand||'Loja virtual')} · Loja virtual</title></head><body style="margin:0"><div id="storefrontScreen"></div><script>window.CHATSHOP_EXPORT_DATA=${data};<\/script><script src="https://alibr.com.br/virtual-shipping-upgrade.js?v=20260813-1707"><\/script><script>window.ChatShopRenderVirtualStore(window.CHATSHOP_EXPORT_DATA,document.getElementById('storefrontScreen'));<\/script></body></html>`;
};
if(qs('#storeType'))installEditorShipping();
})();