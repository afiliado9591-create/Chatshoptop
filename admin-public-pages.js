/* ChatShop — Gerenciador de páginas públicas do Admin */
(function(){
'use strict';

const CONFIG_DOC='publicPages';
const SITE_BASE='https://alibr.com.br';
let pages=[];
let editingId='';

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function slugify(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)}
function uid(){return 'pg_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
function pageUrl(p){return p.slug==='inicio'?SITE_BASE+'/site':SITE_BASE+'/p/'+encodeURIComponent(p.slug)}
function defaultPages(){return [
  {
    id:'inicio',slug:'inicio',title:'ChatShop — sua loja dentro do chat',menuLabel:'Início',summary:'Apresentação oficial do ChatShop.',published:true,showInMenu:true,
    content:`<section class="hero"><span class="eyebrow">CHATSHOP</span><h1>Sua loja, seus produtos e um vendedor virtual no mesmo lugar.</h1><p>O ChatShop une catálogo, loja virtual e atendimento por chat para ajudar lojistas e afiliados a apresentar produtos e conversar com clientes de forma simples.</p><div class="actions"><a class="primary" href="/">Criar ou entrar no ChatShop</a><a class="secondary" href="/p/chatshop">Conhecer recursos</a></div></section><section class="cards"><article><h2>🛍️ Loja virtual</h2><p>Cadastre produtos, imagens, cores, quantidade e organize sua vitrine para vender pelo celular.</p></article><article><h2>💬 Chat vendedor</h2><p>Cadastre perguntas e respostas para ajudar o visitante a encontrar produtos e tirar dúvidas.</p></article><article><h2>📊 Painel</h2><p>Acompanhe lojas, produtos, mensagens e outras métricas do seu ChatShop.</p></article></section><section class="content-section"><h2>Feito para vender de forma simples</h2><p>O ChatShop pode ser usado por lojistas, afiliados, vendedores de produtos físicos, digitais e serviços. Cada loja pode ter seu próprio endereço e, nos planos compatíveis, domínio próprio.</p><a class="primary" href="/">Acessar o ChatShop</a></section>`
  },
  {
    id:'chatshop',slug:'chatshop',title:'Conheça o ChatShop',menuLabel:'Conheça o ChatShop',summary:'Veja como funciona a plataforma ChatShop.',published:true,showInMenu:true,
    content:`<section class="hero compact"><span class="eyebrow">APRESENTAÇÃO</span><h1>Conheça o ChatShop</h1><p>Uma solução para criar uma experiência de compra em que catálogo e conversa ficam juntos.</p></section><section class="content-section"><h2>O que você pode fazer</h2><p>Crie sua vitrine, cadastre produtos, imagens, preços, categorias, perguntas e respostas, configure o chat vendedor e publique sua loja em um endereço próprio do ChatShop.</p><h2>Loja virtual</h2><p>No modo Loja Virtual, o cliente pode visualizar produtos, escolher opções, adicionar itens à sacola e seguir o fluxo de compra configurado pela loja.</p><h2>Chat vendedor</h2><p>O visitante pode conversar com o ChatShop, procurar produtos, ouvir respostas em voz e acessar informações cadastradas pelo lojista.</p><h2>Para quem serve</h2><p>O ChatShop foi pensado para lojistas, afiliados, pequenos negócios, prestadores de serviços e criadores que precisam apresentar ofertas e atender clientes de forma prática.</p><div class="actions"><a class="primary" href="/">Criar meu ChatShop</a><a class="secondary" href="/p/politica-de-privacidade">Política de Privacidade</a></div></section>`
  },
  {
    id:'politica-de-privacidade',slug:'politica-de-privacidade',title:'Política de Privacidade',menuLabel:'Privacidade',summary:'Política de privacidade do ChatShop.',published:true,showInMenu:true,
    content:`<section class="hero compact"><span class="eyebrow">PRIVACIDADE</span><h1>Política de Privacidade</h1><p>Última atualização: 14 de agosto de 2026.</p></section><section class="content-section policy"><h2>1. Sobre esta política</h2><p>Esta Política de Privacidade explica, de forma geral, como o ChatShop trata informações necessárias para disponibilizar a plataforma, manter contas, publicar lojas e permitir recursos de atendimento e venda.</p><h2>2. Informações que podem ser tratadas</h2><p>Podem ser tratados dados de cadastro do usuário, como e-mail e identificadores de conta; configurações da loja e dos produtos; informações fornecidas voluntariamente por visitantes em conversas ou formulários; dados técnicos necessários ao funcionamento e à segurança; e informações de status recebidas de serviços integrados quando aplicável.</p><h2>3. Pagamentos</h2><p>Quando houver integração com provedores de pagamento, dados sensíveis de cartão ou credenciais bancárias devem ser processados pelo próprio provedor. O ChatShop pode armazenar identificadores e estados de transação necessários para relacionar um pagamento a um pedido, sem precisar armazenar os dados completos do meio de pagamento.</p><h2>4. Uso das informações</h2><p>As informações podem ser utilizadas para autenticação, funcionamento da loja, atendimento, prevenção de abuso, melhoria do serviço, métricas e cumprimento de obrigações aplicáveis.</p><h2>5. Compartilhamento</h2><p>Dados podem ser compartilhados com fornecedores técnicos estritamente necessários ao funcionamento da plataforma, como hospedagem, banco de dados, autenticação e meios de pagamento, respeitando as finalidades do serviço.</p><h2>6. Responsabilidade dos lojistas</h2><p>Cada lojista é responsável pelo conteúdo que publica e pelos dados de clientes que decide coletar por meio de sua loja, devendo utilizá-los de forma adequada e de acordo com a legislação aplicável.</p><h2>7. Segurança</h2><p>O ChatShop utiliza medidas técnicas para reduzir riscos de acesso indevido. Nenhum sistema, porém, pode garantir segurança absoluta.</p><h2>8. Direitos e contato</h2><p>Solicitações relacionadas a dados pessoais podem ser encaminhadas pelos canais oficiais informados pelo ChatShop. Pedidos poderão exigir confirmação de identidade antes do atendimento.</p><h2>9. Alterações</h2><p>Esta política pode ser atualizada quando houver mudanças relevantes no serviço, nas integrações ou nas exigências aplicáveis.</p></section>`
  }
]}

async function loadPages(){
  try{
    if(typeof db==='undefined'||!db) throw new Error('Banco indisponível');
    const snap=await db.collection('config').doc(CONFIG_DOC).get();
    const data=snap.exists?snap.data():null;
    pages=Array.isArray(data?.pages)&&data.pages.length?data.pages:defaultPages();
  }catch(e){
    console.warn('Páginas públicas: usando modelos padrão.',e);
    pages=defaultPages();
  }
  pages=pages.map((p,i)=>({id:p.id||uid(),slug:slugify(p.slug||p.title)||('pagina-'+(i+1)),title:p.title||'Página',menuLabel:p.menuLabel||p.title||'Página',summary:p.summary||'',content:p.content||'',published:p.published!==false,showInMenu:p.showInMenu!==false}));
}

async function persist(){
  if(typeof db==='undefined'||!db) throw new Error('Banco indisponível');
  await db.collection('config').doc(CONFIG_DOC).set({pages,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
}

function box(){return document.querySelector('#adminConteudo')}
function styleOnce(){
  if(document.querySelector('#adminPagesStyle'))return;
  const s=document.createElement('style');s.id='adminPagesStyle';s.textContent=`
  .ap-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.ap-list{display:flex;flex-direction:column;gap:9px}.ap-card{border:1px solid #e5e7eb;border-radius:10px;padding:10px;background:#fff}.ap-title{font-weight:900;font-size:14px}.ap-url{font-size:11px;color:#6b7280;word-break:break-all;margin:3px 0 8px}.ap-actions{display:flex;gap:6px;flex-wrap:wrap}.ap-actions button,.ap-actions a{border:0;border-radius:8px;padding:7px 9px;font-weight:800;font-size:11px;text-decoration:none;cursor:pointer}.ap-edit{background:#6d28d9;color:#fff}.ap-view{background:#eef2ff;color:#4338ca}.ap-del{background:#fee2e2;color:#b91c1c}.ap-form .field{margin-bottom:10px}.ap-form textarea{min-height:220px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.45}.ap-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ap-checks{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;margin:8px 0 12px}.ap-note{font-size:11px;color:#6b7280;line-height:1.45;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:8px}@media(max-width:520px){.ap-row{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}

function renderList(){
  const el=box();if(!el)return;
  editingId='';
  el.innerHTML=`<div class="ap-head"><div><b>📝 Páginas públicas</b><div style="font-size:11px;color:#6b7280">Crie páginas com URL própria e escolha quais aparecem no menu público.</div></div><button class="btn primary" id="apNew" type="button">+ Criar página</button></div><div class="ap-list">${pages.map(p=>`<div class="ap-card"><div class="ap-title">${esc(p.title)} ${p.published?'':'<span style="color:#b45309;font-size:10px">(rascunho)</span>'}</div><div class="ap-url">${esc(pageUrl(p))}</div><div class="ap-actions"><button class="ap-edit" data-edit="${esc(p.id)}">✏️ Editar</button><a class="ap-view" href="${esc(pageUrl(p))}" target="_blank" rel="noopener">👁️ Ver página</a><button class="ap-del" data-del="${esc(p.id)}">🗑️ Excluir</button></div></div>`).join('')}</div><div class="ap-note" style="margin-top:12px"><b>Página principal pública:</b> ${SITE_BASE}/site<br><b>Outras páginas:</b> ${SITE_BASE}/p/nome-da-pagina</div>`;
  document.querySelector('#apNew').onclick=()=>renderEditor(null);
  el.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>renderEditor(pages.find(p=>p.id===b.dataset.edit)||null));
  el.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{const p=pages.find(x=>x.id===b.dataset.del);if(!p)return;if(!confirm('Excluir a página "'+p.title+'"?'))return;pages=pages.filter(x=>x.id!==p.id);try{await persist();renderList();if(typeof toast==='function')toast('Página excluída.')}catch(e){alert('Não foi possível excluir: '+e.message)}});
}

function renderEditor(page){
  const isNew=!page;
  const p=page?{...page}:{id:uid(),slug:'',title:'',menuLabel:'',summary:'',content:'',published:true,showInMenu:true};
  editingId=p.id;
  const el=box();if(!el)return;
  el.innerHTML=`<button class="btn" id="apBack" type="button" style="margin-bottom:10px">← Voltar às páginas</button><div class="ap-form"><div class="field"><label>Título da página</label><input id="apTitle" value="${esc(p.title)}" placeholder="Ex: Como funciona o ChatShop"></div><div class="ap-row"><div class="field"><label>URL / slug</label><input id="apSlug" value="${esc(p.slug)}" placeholder="como-funciona"><small>Somente letras, números e hífen.</small></div><div class="field"><label>Nome no menu</label><input id="apMenu" value="${esc(p.menuLabel)}" placeholder="Como funciona"></div></div><div class="field"><label>Resumo</label><input id="apSummary" value="${esc(p.summary)}" placeholder="Uma frase sobre esta página"></div><div class="field"><label>Conteúdo da página</label><textarea id="apContent" placeholder="Digite o conteúdo. Você também pode usar HTML simples.">${esc(p.content)}</textarea><small>Você pode usar parágrafos, títulos e HTML simples. O conteúdo aparece dentro do modelo visual do site.</small></div><div class="ap-checks"><label><input type="checkbox" id="apPublished" ${p.published?'checked':''}> Página publicada</label><label><input type="checkbox" id="apShowMenu" ${p.showInMenu?'checked':''}> Mostrar no menu público</label></div><div class="ap-note">URL pública: <b id="apUrlPreview"></b>${p.slug==='inicio'?'<br>O slug <b>inicio</b> é a página principal em /site.':''}</div><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn primary" id="apSave" type="button">💾 Salvar e publicar</button>${!isNew?`<a class="btn" id="apOpen" href="${esc(pageUrl(p))}" target="_blank" rel="noopener" style="text-decoration:none">👁️ Abrir página</a>`:''}</div><div id="apStatus" style="font-size:12px;margin-top:9px"></div></div>`;
  const title=document.querySelector('#apTitle'),slug=document.querySelector('#apSlug'),menu=document.querySelector('#apMenu'),preview=document.querySelector('#apUrlPreview');
  function sync(){if(!slug.dataset.touched&&title.value.trim())slug.value=slugify(title.value);slug.value=slugify(slug.value);if(!menu.dataset.touched)menu.value=title.value;const tmp={slug:slug.value||'nova-pagina'};preview.textContent=pageUrl(tmp)}
  title.addEventListener('input',sync);slug.addEventListener('focus',()=>slug.dataset.touched='1');slug.addEventListener('input',sync);menu.addEventListener('focus',()=>menu.dataset.touched='1');sync();
  document.querySelector('#apBack').onclick=renderList;
  document.querySelector('#apSave').onclick=async()=>{
    const status=document.querySelector('#apStatus');
    const titleV=title.value.trim(),slugV=slugify(slug.value);
    if(!titleV||!slugV){status.textContent='⚠️ Preencha título e URL.';status.style.color='#b91c1c';return}
    if(pages.some(x=>x.id!==p.id&&x.slug===slugV)){status.textContent='⚠️ Já existe outra página com esta URL.';status.style.color='#b91c1c';return}
    const saved={id:p.id,title:titleV,slug:slugV,menuLabel:menu.value.trim()||titleV,summary:document.querySelector('#apSummary').value.trim(),content:document.querySelector('#apContent').value,published:document.querySelector('#apPublished').checked,showInMenu:document.querySelector('#apShowMenu').checked};
    const i=pages.findIndex(x=>x.id===p.id);if(i>=0)pages[i]=saved;else pages.push(saved);
    const btn=document.querySelector('#apSave');btn.disabled=true;btn.textContent='Salvando…';
    try{await persist();status.textContent='✅ Página salva. URL: '+pageUrl(saved);status.style.color='#15803d';if(typeof toast==='function')toast('Página salva!');setTimeout(renderList,500)}catch(e){console.error(e);status.textContent='❌ Não foi possível salvar. Confira as regras do Firestore para config/publicPages.';status.style.color='#b91c1c';btn.disabled=false;btn.textContent='💾 Salvar e publicar'}
  };
}

async function openPages(){
  styleOnce();
  const el=box();if(el)el.innerHTML='<p class="empty-hint">Carregando páginas...</p>';
  await loadPages();renderList();
}

function install(){
  const anchor=document.querySelector('#adminTabVideos');
  const adminBox=document.querySelector('#adminModal');
  if(!anchor||!adminBox)return false;
  if(document.querySelector('#adminTabPaginas'))return true;
  const b=document.createElement('button');b.className='btn';b.id='adminTabPaginas';b.type='button';b.textContent='📝 Páginas';
  anchor.insertAdjacentElement('afterend',b);
  b.onclick=openPages;
  return true;
}

let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},100);
})();
