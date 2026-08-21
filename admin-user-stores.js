/* ChatShop Admin — painel separado para lojas de afiliados/lojistas. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const adminOk=()=>{try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}};
const dbRef=()=>{try{return typeof db!=='undefined'&&db?db:null}catch(e){return null}};
const notify=msg=>{try{if(typeof toast==='function')return toast(msg)}catch(e){} alert(msg)};
function currentAdmin(){try{return typeof currentUser!=='undefined'&&currentUser?currentUser:(firebase?.auth?.()?.currentUser||null)}catch(e){return null}}
function tsValue(v){if(!v)return 0;if(typeof v.toMillis==='function')return v.toMillis();if(v.seconds)return Number(v.seconds)*1000;const n=Date.parse(v);return Number.isFinite(n)?n:0}
function fmtDate(v){const ms=tsValue(v);if(!ms)return 'sem registro';try{return new Date(ms).toLocaleDateString('pt-BR')}catch(e){return 'sem registro'}}
function planName(v){const s=String(v||'aprendiz').toLowerCase();if(s.includes('prof')||s.includes('premium')||s==='pro')return'Profissional';if(s.includes('bas'))return'Básico';return'Grátis/Aprendiz'}
let cached=[];
async function loadUserStores(){
  if(!adminOk())return;
  const box=$('#adminConteudo');if(!box)return;
  box.innerHTML='<p class="empty-hint">Carregando lojas de afiliados e lojistas...</p>';
  try{
    const d=dbRef();if(!d)throw new Error('Banco indisponível');
    const [storesSnap,usersSnap]=await Promise.all([
      d.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').limit(1000).get(),
      d.collection('users').limit(1000).get()
    ]);
    const admin=currentAdmin()||{};
    const adminUid=String(admin.uid||'');
    const adminEmail=String(admin.email||'').trim().toLowerCase();
    const users={};usersSnap.docs.forEach(doc=>users[doc.id]=doc.data()||{});
    cached=storesSnap.docs.map(doc=>{
      const s=doc.data()||{}, owner=users[s.ownerUid]||{};
      const ownerEmail=String(owner.email||s.ownerEmail||'').trim().toLowerCase();
      return {doc,id:doc.id,s,owner,ownerEmail};
    }).filter(x=>{
      const ownerUid=String(x.s.ownerUid||'');
      return !((adminUid&&ownerUid===adminUid)||(adminEmail&&x.ownerEmail===adminEmail));
    }).sort((a,b)=>tsValue(b.s.updatedAt||b.s.createdAt)-tsValue(a.s.updatedAt||a.s.createdAt));
    renderUserStores();
  }catch(e){console.error(e);box.innerHTML='<p class="empty-hint">Não foi possível carregar as lojas dos usuários.</p>';}
}
function renderUserStores(){
  const box=$('#adminConteudo');if(!box)return;
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px"><div><h3 style="margin:0">👥 Lojas de afiliados e lojistas</h3><small style="color:var(--muted)">Aqui aparecem somente lojas de usuários. Suas lojas de admin ficam fora desta lista.</small></div><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="adminUserStoreSearch" placeholder="Buscar loja ou e-mail" style="min-width:220px;border:1px solid var(--line);border-radius:10px;padding:9px 11px"><select id="adminUserStoreAge" style="border:1px solid var(--line);border-radius:10px;padding:9px 11px"><option value="all">Todas</option><option value="30">Sem atualização há 30+ dias</option><option value="60">Sem atualização há 60+ dias</option><option value="90">Sem atualização há 90+ dias</option></select></div></div><div id="adminUserStoreCount" style="font-size:12px;color:var(--muted);margin-bottom:10px"></div><div id="adminUserStoresList"></div>`;
  $('#adminUserStoreSearch').addEventListener('input',drawFiltered);
  $('#adminUserStoreAge').addEventListener('change',drawFiltered);
  drawFiltered();
}
function drawFiltered(){
  const q=String($('#adminUserStoreSearch')?.value||'').trim().toLowerCase();
  const age=$('#adminUserStoreAge')?.value||'all';
  const now=Date.now();
  let items=cached.filter(x=>{
    const s=x.s,slug=s.slug||x.id,name=s.brand||s.storeName||slug,email=x.ownerEmail||String(s.ownerUid||'');
    const text=(name+' '+slug+' '+email).toLowerCase();
    if(q&&!text.includes(q))return false;
    if(age!=='all'){
      const ms=tsValue(s.updatedAt||s.createdAt);
      if(!ms)return true;
      const days=(now-ms)/86400000;
      if(days<Number(age))return false;
    }
    return true;
  });
  $('#adminUserStoreCount').textContent=`${items.length} loja(s) de usuário encontrada(s).`;
  const list=$('#adminUserStoresList');if(!list)return;
  if(!items.length){list.innerHTML='<p class="empty-hint">Nenhuma loja de usuário encontrada com este filtro.</p>';return;}
  list.innerHTML=items.map(x=>{
    const s=x.s,slug=s.slug||x.id,link='https://'+encodeURIComponent(slug)+'.alibr.com.br/';
    const name=s.brand||s.storeName||slug,email=x.ownerEmail||String(s.ownerUid||'sem e-mail'),plan=planName(x.owner.plan||x.owner.plano||s.plan||s.plano),last=s.updatedAt||s.createdAt;
    const products=Array.isArray(s.products)?s.products.length:(Number(s.productCount)||0);
    return `<div style="border:1px solid var(--line);border-radius:12px;background:#fff;padding:12px;margin-bottom:9px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:220px"><b>${esc(name)}</b><div style="font-size:11px;color:var(--muted);margin-top:4px">${esc(email)}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">Plano: ${esc(plan)} · Produtos: ${products} · Última atualização: ${esc(fmtDate(last))}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">${esc(slug)}.alibr.com.br</div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><a class="btn" href="${esc(link)}" target="_blank" rel="noopener" style="text-decoration:none">Abrir</a><button class="btn danger" data-user-store-delete="${esc(x.id)}" data-user-store-name="${esc(name)}" data-user-store-owner="${esc(email)}" type="button">🗑️ Excluir loja do usuário</button></div></div></div>`;
  }).join('');
  $$('[data-user-store-delete]',list).forEach(btn=>btn.onclick=()=>deleteUserStore(btn.dataset.userStoreDelete,btn.dataset.userStoreName,btn.dataset.userStoreOwner));
}
async function deleteUserStore(docId,name,owner){
  if(!adminOk()||!docId)return;
  const typed=prompt(`Excluir definitivamente a loja “${name||docId}” de ${owner||'este usuário'}?\n\nDigite EXCLUIR para confirmar:`,'');
  if(String(typed||'').trim().toUpperCase()!=='EXCLUIR')return;
  try{
    const d=dbRef();await d.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').doc(docId).delete();
    cached=cached.filter(x=>x.id!==docId);notify('Loja do usuário excluída.');drawFiltered();
  }catch(e){console.error(e);notify('Não foi possível excluir esta loja.');}
}
function installTab(){
  if(!adminOk())return false;
  if($('#adminTabUserStores'))return true;
  const anchor=$('#adminTabLojas')||$('#adminTabCatalogo')||$('#adminTabUsuarios');if(!anchor)return false;
  const b=document.createElement('button');b.className='btn';b.id='adminTabUserStores';b.type='button';b.textContent='👥 Lojas de usuários';anchor.insertAdjacentElement('afterend',b);b.onclick=loadUserStores;return true;
}
function boot(){let tries=0;const t=setInterval(()=>{tries++;if(installTab()||tries>100)clearInterval(t)},100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
