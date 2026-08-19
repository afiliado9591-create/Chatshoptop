/* ChatShop - corrige SuperFrete em dominios proprios com/sem www. */
(function(){
'use strict';

const originalFetch = window.fetch.bind(window);

function cleanHost(value){
  return String(value || '').trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}
function alternateHost(host){
  const h = cleanHost(host);
  if(!h) return '';
  return h.startsWith('www.') ? h.slice(4) : 'www.' + h;
}
function isCustomDomainQuery(url, body){
  if(!String(url || '').includes('firestore.googleapis.com')) return false;
  if(!String(url || '').includes('/documents:runQuery')) return false;
  try{
    const ff = body?.structuredQuery?.where?.fieldFilter;
    return ff?.field?.fieldPath === 'customDomain' && ff?.op === 'EQUAL';
  }catch(e){ return false; }
}
function extractSlug(rows){
  try{
    const doc = Array.isArray(rows) ? rows.find(x => x && x.document)?.document : null;
    if(!doc) return '';
    const fieldSlug = doc.fields?.slug?.stringValue;
    if(fieldSlug) return String(fieldSlug).trim();
    return String(doc.name || '').split('/').pop() || '';
  }catch(e){ return ''; }
}
function hasDocument(rows){
  return !!(Array.isArray(rows) && rows.some(x => x && x.document));
}

window.fetch = async function(input, init){
  const url = typeof input === 'string' ? input : String(input?.url || '');
  let nextInit = init ? { ...init } : {};

  if(url.includes('/api/superfrete-quote.js') && nextInit.body){
    try{
      const body = JSON.parse(nextInit.body);
      if(!body.storeSlug){
        body.storeSlug = String(
          window.__CHATSHOP_SUPERFRETE_SLUG ||
          window.__CHATSHOP_STORE_DATA?.slug ||
          ''
        ).trim();
      }
      body.host = cleanHost(body.host || location.hostname);
      nextInit.body = JSON.stringify(body);
    }catch(e){}
  }

  let parsedBody = null;
  try{ parsedBody = nextInit.body ? JSON.parse(nextInit.body) : null; }catch(e){}
  const customQuery = isCustomDomainQuery(url, parsedBody);
  let response = await originalFetch(input, nextInit);

  if(customQuery && response.ok){
    try{
      const rows = await response.clone().json();
      const slug = extractSlug(rows);
      if(slug) window.__CHATSHOP_SUPERFRETE_SLUG = slug;
      if(!hasDocument(rows)){
        const ff = parsedBody?.structuredQuery?.where?.fieldFilter;
        const current = cleanHost(ff?.value?.stringValue || location.hostname);
        const alt = alternateHost(current);
        if(alt && alt !== current){
          const retryBody = JSON.parse(JSON.stringify(parsedBody));
          retryBody.structuredQuery.where.fieldFilter.value.stringValue = alt;
          const retryInit = { ...nextInit, body: JSON.stringify(retryBody) };
          const retry = await originalFetch(input, retryInit);
          if(retry.ok){
            try{
              const retryRows = await retry.clone().json();
              const retrySlug = extractSlug(retryRows);
              if(retrySlug) window.__CHATSHOP_SUPERFRETE_SLUG = retrySlug;
            }catch(e){}
          }
          response = retry;
        }
      }
    }catch(e){}
  }
  return response;
};

/* Republicação segura da própria loja. */
let republishGuard = false;
document.addEventListener('click', async function(e){
  const btn = e.target?.closest?.('#publishBtn');
  if(!btn || republishGuard) return;
  const slugInput = document.getElementById('slug');
  const slug = String(slugInput?.value || '').trim().toLowerCase();
  const editingExisting = !!slugInput?.disabled;
  const user = window.firebase?.auth?.().currentUser;
  const firestore = window.firebase?.firestore?.();
  if(!editingExisting || !slug || !user || !firestore) return;

  e.preventDefault();
  e.stopPropagation();
  if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  try{
    const ref = firestore.collection('chatshops').doc(slug);
    const snap = await ref.get();
    if(snap.exists){
      const data = snap.data() || {};
      if(!data.ownerUid || data.ownerUid !== user.uid){
        await ref.set({ownerUid:user.uid, ownerEmail:String(user.email||data.ownerEmail||'').toLowerCase()},{merge:true});
      }
    }
  }catch(err){
    console.warn('Não foi possível normalizar o dono da loja antes de republicar:', err);
  }
  republishGuard = true;
  try{ btn.click(); } finally { setTimeout(()=>{republishGuard=false},0); }
}, true);

function fixPublishButtonLabel(){
  const btn = document.getElementById('publishBtn');
  if(btn && btn.textContent !== '🚀 Publicar ChatShop') btn.textContent = '🚀 Publicar ChatShop';
}

function fixVisibleShippingText(){
  const store = window.__CHATSHOP_STORE_DATA;
  if(store?.shipping?.mode !== 'superfrete') return;
  document.querySelectorAll('.csv-shiptag').forEach(el => {
    if(/frete a combinar/i.test(el.textContent || '')) el.textContent = '🚚 Frete calculado pelo CEP';
  });
  const freight = document.querySelector('#csvFreight');
  if(freight && (/a combinar/i.test(freight.textContent || '') || /R\$\s*0,00/.test(freight.textContent || ''))){
    freight.textContent = 'Calcule pelo CEP';
  }
}

fixPublishButtonLabel();
fixVisibleShippingText();
const observer = new MutationObserver(()=>{
  fixPublishButtonLabel();
  fixVisibleShippingText();
});
observer.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
})();
