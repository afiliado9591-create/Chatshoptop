(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notify=msg=>{try{if(typeof toast==='function')return toast(msg)}catch(e){} alert(msg)};
const adminOk=()=>{try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}};
const dbRef=()=>{try{return typeof db!=='undefined'&&db?db:null}catch(e){return null}};
let publicPages=[];

async function loadDefaultPublicPages(){
  const response=await fetch('/api/public-page.js?adminDefaults=1',{cache:'no-store'});
  if(!response.ok)throw new Error('Não foi possível carregar as páginas padrão.');
  const data=await response.json();
  return Array.isArray(data.pages)?data.pages:[];
}
async function loadPublicPages(){
  const d=dbRef();if(!d)return[];
  const snap=await d.collection('config').doc('publicPages').get();
  if(snap.exists&&Array.isArray(snap.data()?.pages)&&snap.data().pages.length)return snap.data().pages;
  return loadDefaultPublicPages();
}
function pageUrl(page){return page.slug==='inicio'?'/site':'/p/'+encodeURIComponent(page.slug||'');}

async function showAdminPages(){
  if(!adminOk())return;
  const box=$('#adminConteudo');if(!box)return;
  box.innerHTML='<p class="empty-hint">Carregando páginas oficiais...</p>';
  try{publicPages=await loadPublicPages();renderPageList();}catch(e){console.error(e);box.innerHTML='<p class="empty-hint">Não foi possível carregar as páginas oficiais.</p>';}
}
function renderPageList(){
  const box=$('#adminConteudo');if(!box)return;
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px"><div><h3 style="margin:0">📄 Páginas prontas</h3><small style="color:var(--muted)">Edite as páginas oficiais publicadas pelo ChatShop.</small></div></div><div id="officialPagesList"></div><div id="officialPageEditor" style="display:none"></div>`;
  const list=$('#officialPagesList',box);
  list.innerHTML=publicPages.map((p,i)=>`<div style="border:1px solid var(--line);border-radius:12px;background:#fff;padding:11px;margin-bottom:9px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:190px"><b>${esc(p.title||'Sem título')}</b><div style="font-size:11px;color:var(--muted);margin-top:3px">${esc(pageUrl(p))}</div><div style="font-size:11px;font-weight:800;color:${p.published===false?'#b45309':'#15803d'};margin-top:4px">${p.published===false?'● OCULTA':'● PUBLICADA'}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-page-edit="${i}" type="button">✏️ Editar</button><a class="btn" href="${esc(pageUrl(p))}" target="_blank" rel="noopener" style="text-decoration:none">Abrir</a></div></div></div>`).join('');
  $$('[data-page-edit]',list).forEach(btn=>btn.onclick=()=>openPageEditor(Number(btn.dataset.pageEdit)));
}
function openPageEditor(index){
  const page=publicPages[index];if(!page)return;
  const editor=$('#officialPageEditor');if(!editor)return;
  editor.style.display='block';
  editor.innerHTML=`<div style="border:2px solid #ddd6fe;background:#faf5ff;border-radius:14px;padding:13px;margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>✏️ Editando: ${esc(page.title||'Página')}</b><button class="btn" id="officialPageClose" type="button">Fechar</button></div><div class="field" style="margin-top:12px"><label>Título</label><input id="officialPageTitle" value="${esc(page.title||'')}"></div><div class="field"><label>Texto no menu</label><input id="officialPageMenu" value="${esc(page.menuLabel||'')}"></div><div class="field"><label>Descrição curta / SEO</label><textarea id="officialPageSummary" rows="3">${esc(page.summary||'')}</textarea></div><div class="field"><label>Conteúdo da página (HTML)</label><textarea id="officialPageContent" rows="16" spellcheck="false">${esc(page.content||'')}</textarea><small>Você pode alterar textos, títulos, botões e seções. Não altere o endereço interno (slug) por aqui.</small></div><label style="display:flex;gap:8px;align-items:center;font-weight:800;font-size:13px;margin:8px 0"><input id="officialPagePublished" type="checkbox" ${page.published===false?'':'checked'}> Página publicada</label><label style="display:flex;gap:8px;align-items:center;font-weight:800;font-size:13px;margin:8px 0 12px"><input id="officialPageMenuVisible" type="checkbox" ${page.showInMenu===false?'':'checked'}> Mostrar no menu</label><div class="actions"><button class="btn primary" id="officialPageSave" type="button">💾 Salvar alterações</button><button class="btn" id="officialPageCancel" type="button">Cancelar</button></div></div>`;
  $('#officialPageClose',editor).onclick=$('#officialPageCancel',editor).onclick=()=>{editor.style.display='none';editor.innerHTML='';};
  $('#officialPageSave',editor).onclick=()=>saveOfficialPage(index);
  editor.scrollIntoView({behavior:'smooth',block:'start'});
}
async function saveOfficialPage(index){
  const d=dbRef();if(!d||!publicPages[index])return;
  const btn=$('#officialPageSave');
  const next={...publicPages[index],title:$('#officialPageTitle').value.trim(),menuLabel:$('#officialPageMenu').value.trim(),summary:$('#officialPageSummary').value.trim(),content:$('#officialPageContent').value.trim(),published:$('#officialPagePublished').checked,showInMenu:$('#officialPageMenuVisible').checked};
  if(!next.title||!next.content){notify('Preencha o título e o conteúdo.');return;}
  publicPages[index]=next;btn.disabled=true;btn.textContent='Salvando...';
  try{await d.collection('config').doc('publicPages').set({pages:publicPages,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:(typeof currentUser!=='undefined'&&currentUser?.email)||''},{merge:true});notify('Página atualizada!');renderPageList();}catch(e){console.error(e);notify('Não foi possível salvar a página.');btn.disabled=false;btn.textContent='💾 Salvar alterações';}
}

async function showAdminStores(){
  if(!adminOk())return;
  const box=$('#adminConteudo');if(!box)return;
  box.innerHTML='<p class="empty-hint">Carregando lojas...</p>';
  try{
    const d=dbRef();const [storesSnap,usersSnap]=await Promise.all([d.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').limit(500).get(),d.collection('users').limit(500).get()]);
    const users={};usersSnap.docs.forEach(doc=>users[doc.id]=doc.data());
    const stores=storesSnap.docs.slice().sort((a,b)=>String(a.data().brand||a.id).localeCompare(String(b.data().brand||b.id)));
    box.innerHTML=`<div style="margin-bottom:12px"><h3 style="margin:0">🏪 Lojas</h3><small style="color:var(--muted)">O admin pode abrir ou excluir qualquer loja.</small></div><div id="adminStoresList"></div>`;
    const list=$('#adminStoresList',box);
    if(!stores.length){list.innerHTML='<p class="empty-hint">Nenhuma loja encontrada.</p>';return;}
    list.innerHTML=stores.map(doc=>{const s=doc.data(),owner=users[s.ownerUid]||{},slug=s.slug||doc.id,link='https://'+encodeURIComponent(slug)+'.alibr.com.br/';return `<div style="border:1px solid var(--line);border-radius:12px;background:#fff;padding:11px;margin-bottom:9px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:190px"><b>${esc(s.brand||s.storeName||slug)}</b><div style="font-size:11px;color:var(--muted);margin-top:3px">${esc(slug)} · ${esc(owner.email||s.ownerEmail||s.ownerUid||'sem proprietário identificado')}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><a class="btn" href="${esc(link)}" target="_blank" rel="noopener" style="text-decoration:none">Abrir</a><button class="btn danger" data-admin-store-delete="${esc(doc.id)}" data-store-name="${esc(s.brand||s.storeName||slug)}" type="button">🗑️ Excluir loja</button></div></div></div>`;}).join('');
    $$('[data-admin-store-delete]',list).forEach(btn=>btn.onclick=()=>deleteAdminStore(btn.dataset.adminStoreDelete,btn.dataset.storeName));
  }catch(e){console.error(e);box.innerHTML='<p class="empty-hint">Não foi possível carregar as lojas.</p>';}
}
async function deleteAdminStore(docId,name){
  if(!adminOk()||!docId)return;
  const typed=prompt(`Para excluir definitivamente a loja “${name||docId}”, digite EXCLUIR:`,'');
  if(String(typed||'').trim().toUpperCase()!=='EXCLUIR')return;
  try{const d=dbRef();await d.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').doc(docId).delete();notify('Loja excluída!');showAdminStores();}catch(e){console.error(e);notify('Não foi possível excluir a loja.');}
}

async function deleteCatalogComplete(catalogId){
  if(!adminOk()||!catalogId)return;
  if(!confirm('Excluir este catálogo e TODOS os produtos dele? Esta ação não pode ser desfeita.'))return;
  const d=dbRef();if(!d)return;
  try{
    const products=await d.collection(typeof COLECAO_CATALOGO_GERAL!=='undefined'?COLECAO_CATALOGO_GERAL:'catalogoGeral').where('catalogoId','==',catalogId).get();
    for(let i=0;i<products.docs.length;i+=400){const batch=d.batch();products.docs.slice(i,i+400).forEach(doc=>batch.delete(doc.ref));await batch.commit();}
    await d.collection(typeof COLECAO_CATALOGOS!=='undefined'?COLECAO_CATALOGOS:'catalogos').doc(catalogId).delete();
    notify(`Catálogo excluído com ${products.docs.length} produto(s).`);
    try{if(typeof mostrarAdminCatalogo==='function')mostrarAdminCatalogo();}catch(e){}
  }catch(e){console.error(e);notify('Não foi possível excluir o catálogo completo.');}
}
function installCatalogDeleteOverride(){
  document.addEventListener('click',e=>{
    if(!adminOk())return;
    const btn=e.target.closest?.('#ctgLista button[data-del]');if(!btn)return;
    e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();deleteCatalogComplete(btn.dataset.del);
  },true);
  const decorate=()=>$$('#ctgLista button[data-del]').forEach(btn=>{if(btn.dataset.fullDeleteUi)return;btn.dataset.fullDeleteUi='1';btn.textContent='🗑️ Excluir catálogo';btn.classList.add('danger');});
  const root=$('#adminConteudo');if(root)new MutationObserver(()=>setTimeout(decorate,20)).observe(root,{childList:true,subtree:true});decorate();
}
function installAdminTabs(){
  if(!adminOk())return false;
  const users=$('#adminTabUsuarios'),catalog=$('#adminTabCatalogo');if(!users||!catalog)return false;
  if(!$('#adminTabPaginasProntas')){const b=document.createElement('button');b.className='btn';b.id='adminTabPaginasProntas';b.type='button';b.textContent='📄 Páginas';catalog.insertAdjacentElement('afterend',b);b.onclick=showAdminPages;}
  if(!$('#adminTabLojas')){const b=document.createElement('button');b.className='btn';b.id='adminTabLojas';b.type='button';b.textContent='🏪 Lojas';$('#adminTabPaginasProntas').insertAdjacentElement('afterend',b);b.onclick=showAdminStores;}
  return true;
}
function boot(){
  if(!adminOk())return;
  let tries=0;const timer=setInterval(()=>{tries++;if(installAdminTabs()){clearInterval(timer);installCatalogDeleteOverride();}else if(tries>80)clearInterval(timer);},100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
