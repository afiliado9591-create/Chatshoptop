/* ChatShop — acesso aos catálogos para afiliados.
   - Dridália Modas: catálogo completo liberado no Aprendiz.
   - Outros catálogos: seguem a flag liberadoGratis definida pelo admin.
   - Administrador: pode testar/usar qualquer catálogo, independentemente do plano.
   - Botão de afiliação usa o link cadastrado no catálogo.
*/
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function isDridalia(name){const n=norm(name);return n.includes('dridalia')||n.includes('didalia')||n.includes('dritalia')}
function isAdminUser(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function notify(msg){try{if(typeof toast==='function')return toast(msg)}catch(e){};alert(msg)}

function decorateAffiliateButton(){
  const a=$('#linkAfiliacaoParceiro');if(!a)return;
  a.textContent='🤝 Afiliar-se a este catálogo';
  a.title='Abrir cadastro de afiliado deste parceiro';
}
function unlockDridaliaForFree(){
  const list=$('#catalogoPickerLista');if(!list)return;
  $$('button[data-id]',list).forEach(btn=>{
    const name=btn.querySelector('span')?.textContent||btn.textContent||'';
    if(!isDridalia(name))return;
    btn.dataset.bloqueado='';btn.style.opacity='1';
    const spans=btn.querySelectorAll('span'),status=spans[spans.length-1];
    if(status){status.textContent='🎁 catálogo completo grátis';status.style.color='#15803d';status.style.fontWeight='800'}
    btn.dataset.catalogoDridalia='1';
  });
}
function unlockAllCatalogsForAdmin(){
  if(!isAdminUser())return;const list=$('#catalogoPickerLista');if(!list)return;
  $$('button[data-id]',list).forEach(btn=>{btn.dataset.bloqueado='';btn.style.opacity='1';const spans=btn.querySelectorAll('span'),status=spans[spans.length-1];if(status){status.textContent='🔓 liberado para administrador';status.style.color='#15803d';status.style.fontWeight='800'}btn.dataset.catalogoAdmin='1'});
}
async function ensureDridaliaDatabaseFlag(){
  if(!isAdminUser())return;try{if(typeof db==='undefined'||!db)return;const snap=await db.collection('catalogos').limit(100).get();await Promise.all(snap.docs.filter(d=>isDridalia(d.data()?.nome)).map(d=>{if(d.data()?.liberadoGratis===true)return Promise.resolve();return d.ref.set({liberadoGratis:true,catalogoGratisPrincipal:true},{merge:true})}))}catch(e){console.warn('Não consegui marcar Dridália como catálogo grátis:',e)}
}
function decorateAdminCatalogs(){
  if(!isAdminUser())return;const list=$('#ctgLista');if(!list)return;
  $$('[data-ver]',list).forEach(ver=>{const row=ver.closest('div');if(!row)return;const name=row.querySelector('b')?.textContent||'',id=ver.dataset.ver,toggle=row.querySelector('[data-toggle]');
    if(toggle){toggle.textContent=/liberado pro plano grátis/i.test(row.textContent||'')?'Bloquear catálogo grátis':'Liberar catálogo grátis';toggle.title='Controle manual: define se o plano Grátis/Aprendiz pode usar este catálogo inteiro.'}
    if(isDridalia(name)){const status=row.querySelector('span');if(status){status.textContent='🎁 Catálogo grátis principal · Dridália';status.style.color='#15803d'}if(toggle){toggle.textContent='Dridália: grátis';toggle.disabled=true}}
    if(!row.querySelector('[data-edit-affiliate-link]')){const b=document.createElement('button');b.type='button';b.className='btn';b.dataset.editAffiliateLink=id;b.style.cssText='font-size:11px;white-space:nowrap;background:#ecfdf5;color:#047857';b.textContent='🤝 Link de afiliação';b.onclick=async e=>{e.preventDefault();e.stopPropagation();try{const ref=db.collection('catalogos').doc(id),snap=await ref.get(),old=String(snap.data()?.linkAfiliacao||''),value=prompt('Cole o link para o afiliado se cadastrar neste parceiro:',old);if(value===null)return;const link=String(value||'').trim();if(link&&!/^https?:\/\//i.test(link)){notify('O link precisa começar com http:// ou https://');return}await ref.set({linkAfiliacao:link},{merge:true});notify(link?'Link de afiliação salvo!':'Link de afiliação removido.')}catch(err){console.error(err);notify('Não foi possível salvar o link de afiliação.')}};ver.insertAdjacentElement('afterend',b)}});
}

/* Correção do erro "Missing or insufficient permissions".
   O catálogo é lido por uma API autenticada com Firebase Admin SDK. Assim as
   regras de leitura do Firestore não bloqueiam o usuário, mas a API mantém
   exatamente o mesmo controle de plano: admin/todos os pagos ou catálogo grátis. */
async function catalogApi(action, catalogId){
  const user=firebase?.auth?.()?.currentUser;
  if(!user)throw new Error('Faça login no ChatShop para usar o catálogo.');
  const token=await user.getIdToken();
  const url='/api/catalog-access.js?action='+encodeURIComponent(action)+(catalogId?'&catalogId='+encodeURIComponent(catalogId):'');
  const r=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  let data={};try{data=await r.json()}catch(e){}
  if(!r.ok)throw new Error(data.message||data.error||'Não foi possível carregar o catálogo.');
  return data;
}
function escCat(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function moneyCat(v){const n=Number(v);return Number.isFinite(n)&&n>0?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):''}
function installCatalogApi(){
  if(window.__chatshopCatalogApiInstalled)return;window.__chatshopCatalogApiInstalled=true;
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(typeof window.abrirCatalogoGeral==='function'&&typeof window.abrirCatalogoDetalhe==='function'){
      clearInterval(timer);
      const originalOpen=window.abrirCatalogoGeral;
      const originalDetail=window.abrirCatalogoDetalhe;
      window.abrirCatalogoGeral=async function(){
        $('#catalogoModal').style.display='flex';$('#catalogoModalTitulo').textContent='📦 Catálogos Alibr';$('#catalogoPickerView').style.display='block';$('#catalogoDetalheView').style.display='none';
        const lista=$('#catalogoPickerLista');lista.innerHTML='<p class="empty-hint">Carregando catálogos...</p>';
        try{
          const data=await catalogApi('list');window.__chatshopCatalogCache={};
          (data.catalogs||[]).forEach(c=>window.__chatshopCatalogCache[c.id]=c);
          if(!data.catalogs?.length){lista.innerHTML='<p class="empty-hint">Nenhum catálogo disponível ainda.</p>';return}
          lista.innerHTML=data.catalogs.map(c=>{const blocked=!c.allowed;return `<button type="button" class="btn" data-id="${escCat(c.id)}" data-bloqueado="${blocked?'1':''}" style="width:100%;text-align:left;display:flex;justify-content:space-between;align-items:center;${blocked?'opacity:.6':''}"><span>📦 ${escCat(c.nome)}</span><span style="font-size:11px;color:${blocked?'#dc2626':'var(--muted)'}">${blocked?'🔒 assine pra usar':(c.liberadoGratis?'🎁 grátis':'ver produtos →')}</span></button>`}).join('');
          lista.querySelectorAll('button[data-id]').forEach(btn=>{btn.onclick=()=>{if(btn.dataset.bloqueado){$('#catalogoModal').style.display='none';abrirPlanos();return}const c=window.__chatshopCatalogCache?.[btn.dataset.id];if(c)window.abrirCatalogoDetalhe(c.id,c.nome,c.linkAfiliacao||'')}});
          setTimeout(()=>{unlockDridaliaForFree();unlockAllCatalogsForAdmin();},0);
        }catch(e){console.error(e);lista.innerHTML='<p class="empty-hint">Não foi possível carregar os catálogos.<br><small style="color:#dc2626">Erro técnico: '+escCat(e.message||String(e))+'</small></p>'}
      };
      window.abrirCatalogoDetalhe=async function(catalogoId,catalogoNome,linkAfiliacao){
        $('#catalogoModalTitulo').textContent='📦 '+catalogoNome;$('#catalogoPickerView').style.display='none';$('#catalogoDetalheView').style.display='block';$('#linkAfiliacaoParceiro').href=linkAfiliacao||'#';$('#linkAfiliacaoParceiro').style.display=linkAfiliacao?'inline-block':'none';decorateAffiliateButton();
        const lista=$('#catalogoLista');lista.innerHTML='<p class="empty-hint">Carregando produtos...</p>';
        try{
          const data=await catalogApi('products',catalogoId);const products=data.products||[];window.__chatshopCatalogProducts={};products.forEach(p=>window.__chatshopCatalogProducts[p.id]=p);
          if(!products.length){lista.innerHTML='<p class="empty-hint">Nenhum produto disponível neste catálogo ainda.</p>';return}
          lista.innerHTML=products.map(p=>{const img=p.image||((p.images||[])[0])||'';const price=moneyCat(p.price);return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:10px;background:#fff;display:grid;grid-template-columns:78px 1fr;gap:10px;align-items:center"><div style="width:78px;height:78px;border-radius:10px;background:#f3f4f6;overflow:hidden;display:grid;place-items:center">${img?`<img src="${escCat(img)}" style="width:100%;height:100%;object-fit:contain">`:'📦'}</div><div><b style="display:block;font-size:14px">${escCat(p.name||'Produto')}</b>${p.category?`<small style="color:var(--muted)">${escCat(p.category)}</small>`:''}${price?`<div style="font-weight:800;color:#6d28d9;margin:4px 0">${escCat(price)}</div>`:''}<button type="button" class="btn primary" data-id="${escCat(p.id)}" style="padding:8px 11px;font-size:12px">+ Adicionar</button></div></div>`}).join('');
          lista.querySelectorAll('button[data-id]').forEach(btn=>{btn.onclick=()=>{const p=window.__chatshopCatalogProducts?.[btn.dataset.id];if(!p)return;try{const atual=document.querySelectorAll('#products .product').length;if(typeof myProductLimit!=='undefined'&&atual>=myProductLimit){$('#catalogoModal').style.display='none';abrirPlanos();return}if(typeof addProduct!=='function')throw new Error('Editor de produtos indisponível.');addProduct({name:p.name,imageUrl:p.image||((p.images||[])[0])||'',category:p.category||'',keywords:Array.isArray(p.keywords)?p.keywords.join(', '):(p.keywords||''),price:p.price||'',link:'https://',fromCatalog:true,qna:p.qna||[],buttonText:p.buttonText||'Comprar agora',buttonColor:p.buttonColor||'#7A2E3B',displayText:p.displayText||'',voiceText:p.voiceText||''},{prepend:true,focus:false});if(typeof renderLive==='function')renderLive();if(typeof atualizarAvisoLimite==='function')atualizarAvisoLimite();btn.textContent='✅ Adicionado';btn.disabled=true;btn.classList.add('catalog-added');notify('Produto adicionado! Agora cole o link completo dele no campo destacado.')}catch(e){console.error(e);notify(e.message||'Não foi possível adicionar o produto.')}}});
        }catch(e){console.error(e);lista.innerHTML='<p class="empty-hint">Não foi possível carregar os produtos.<br><small style="color:#dc2626">Erro técnico: '+escCat(e.message||String(e))+'</small></p>'}
      };
      console.info('ChatShop: acesso aos catálogos corrigido via API autenticada.');
    }
    if(tries>120)clearInterval(timer);
  },100);
}

function refresh(){decorateAffiliateButton();unlockDridaliaForFree();unlockAllCatalogsForAdmin();decorateAdminCatalogs()}
function boot(){decorateAffiliateButton();ensureDridaliaDatabaseFlag().finally(()=>setTimeout(refresh,100));refresh();installCatalogApi();const root=document.body;if(root&&!root.dataset.catalogAffiliateAccessObserved){root.dataset.catalogAffiliateAccessObserved='1';let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(refresh,70)}).observe(root,{childList:true,subtree:true})}document.addEventListener('click',e=>{if(e.target.closest?.('#usarCatalogoBtn,#voltarCatalogos,#adminTabCatalogo,#ctgLista [data-ver]'))setTimeout(refresh,120)},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
