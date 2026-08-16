(function(){
  'use strict';

  const PAGE_TYPE = 'contentPage';
  const DOC_PREFIX = 'content_';
  const PUBLIC_BASE = 'https://alibr.com.br/conteudo/';
  const OFFICIAL_PAGES = [
    {title:'Página inicial de apresentação',description:'Apresentação principal do ChatShop.',url:'https://alibr.com.br/site'},
    {title:'Conheça o ChatShop',description:'Recursos, loja virtual e chat vendedor.',url:'https://alibr.com.br/p/chatshop'},
    {title:'Política de Privacidade',description:'Página oficial de privacidade da plataforma.',url:'https://alibr.com.br/p/politica-de-privacidade'}
  ];
  let editingDocId = '';
  let editingCreatedAt = null;
  let uploadedImage = '';
  let slugWasEdited = false;

  const el = id => document.getElementById(id);
  const safe = value => String(value == null ? '' : value)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  function adminAllowed(){
    try { return typeof isAdmin !== 'undefined' && isAdmin === true; }
    catch(e){ return false; }
  }

  function say(message){
    try { if(typeof toast === 'function') return toast(message); } catch(e){}
    alert(message);
  }

  function slugify(value){
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'')
      .slice(0,90);
  }

  function parseLinks(text){
    return String(text || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const parts = line.split('|');
      const label = (parts.shift() || '').trim();
      const url = parts.join('|').trim();
      return label && /^https?:\/\//i.test(url) ? { label, url } : null;
    }).filter(Boolean).slice(0,30);
  }

  function linksToText(links){
    return Array.isArray(links) ? links.map(x => `${x.label || ''} | ${x.url || ''}`).join('\n') : '';
  }

  function renderShell(){
    const box = el('adminConteudo');
    if(!box) return;
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <div>
          <h3 style="margin:0 0 3px">🌐 Landing pages e conteúdos</h3>
          <small style="color:var(--muted)">Acesse as páginas oficiais do ChatShop e crie novas páginas para SEO e divulgação.</small>
        </div>
        <button class="btn" id="contentNewBtn" type="button">+ Nova página</button>
      </div>

      <section style="border:1px solid #ddd6fe;background:#faf5ff;border-radius:14px;padding:12px;margin-bottom:14px">
        <div style="font-weight:950;color:#4c1d95;margin-bottom:3px">🚀 Landing pages oficiais</div>
        <small style="display:block;color:#6b7280;margin-bottom:10px">Estas páginas já estão publicadas. Use “Abrir página” para visualizar ou copiar o endereço.</small>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px">
          ${OFFICIAL_PAGES.map((page,index)=>`<article style="background:#fff;border:1px solid #e9d5ff;border-radius:11px;padding:11px;display:flex;flex-direction:column;gap:7px">
            <b>${safe(page.title)}</b><small style="color:#6b7280;flex:1">${safe(page.description)}</small><small style="word-break:break-all;color:#7c3aed">${safe(page.url.replace(/^https?:\/\//,''))}</small>
            <div style="display:flex;gap:6px;flex-wrap:wrap"><a class="btn primary" href="${safe(page.url)}" target="_blank" rel="noopener" style="padding:7px 9px;text-decoration:none">Abrir página</a><button class="btn" type="button" data-copy-official="${index}" style="padding:7px 9px">Copiar link</button></div>
          </article>`).join('')}
        </div>
      </section>

      <div id="contentEditorBox" style="border:1px solid var(--line);background:#fafafa;border-radius:12px;padding:12px;margin-bottom:14px">
        <div class="field"><label>Título da página</label><input id="contentTitle" maxlength="140" placeholder="Ex: Como criar uma loja virtual grátis"></div>
        <div class="field"><label>Endereço da página</label><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span style="font-size:12px;color:var(--muted)">alibr.com.br/conteudo/</span><input id="contentSlug" maxlength="90" placeholder="como-criar-loja-virtual" style="flex:1;min-width:190px"></div></div>
        <div class="field"><label>Descrição SEO</label><textarea id="contentSeoDescription" rows="2" maxlength="220" placeholder="Resumo curto para Google, redes sociais e mecanismos de IA."></textarea></div>
        <div class="field"><label>Palavras-chave</label><input id="contentKeywords" placeholder="criar loja virtual, vender online, catálogo online"></div>
        <div class="field"><label>Imagem principal por URL</label><input id="contentImageUrl" placeholder="https://site.com/imagem.jpg"><small>Para imagem grande, prefira URL HTTPS. Você também pode enviar uma imagem pequena abaixo.</small></div>
        <div class="field"><label>Ou enviar imagem</label><input id="contentImageFile" type="file" accept="image/*"><small>Até 500 KB para não deixar o banco pesado.</small></div>
        <div id="contentImagePreview" style="display:none;height:150px;border:1px dashed #cbd5e1;border-radius:10px;overflow:hidden;background:#fff;margin-bottom:10px"><img id="contentImagePreviewImg" alt="Prévia" style="width:100%;height:100%;object-fit:contain"></div>
        <div class="field"><label>Conteúdo</label><textarea id="contentBody" rows="14" placeholder="Cole aqui o conteúdo da página. Separe os parágrafos deixando uma linha em branco."></textarea></div>
        <div class="field"><label>Links relacionados</label><textarea id="contentLinks" rows="4" placeholder="Criar meu ChatShop | https://alibr.com.br\nMercado Livre | https://mercadolivre.com.br"></textarea><small>Um por linha, no formato: Texto do link | https://endereco.com</small></div>
        <label style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:13px;margin:8px 0 12px"><input id="contentPublished" type="checkbox" checked> Página publicada</label>
        <div class="actions"><button class="btn primary" id="contentSaveBtn" type="button">💾 Salvar página</button><button class="btn" id="contentCancelBtn" type="button">Limpar</button></div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px"><b>Páginas criadas</b><span id="contentListStatus" style="font-size:12px;color:var(--muted)">Carregando...</span></div>
      <div id="contentPagesList"></div>`;

    el('contentNewBtn').onclick = resetForm;
    el('contentCancelBtn').onclick = resetForm;
    el('contentSaveBtn').onclick = savePage;

    el('contentTitle').addEventListener('input', () => {
      if(!slugWasEdited) el('contentSlug').value = slugify(el('contentTitle').value);
    });
    el('contentSlug').addEventListener('input', () => {
      slugWasEdited = true;
      const pos = el('contentSlug').selectionStart;
      el('contentSlug').value = slugify(el('contentSlug').value);
      try{ el('contentSlug').setSelectionRange(pos,pos); }catch(e){}
    });
    el('contentImageUrl').addEventListener('input', () => {
      if(el('contentImageUrl').value.trim()) uploadedImage = '';
      updateImagePreview();
    });
    el('contentImageFile').addEventListener('change', handleImageFile);
    box.querySelectorAll('[data-copy-official]').forEach(button => button.onclick = async () => {
      const page = OFFICIAL_PAGES[Number(button.dataset.copyOfficial)];
      if(!page) return;
      try{ await navigator.clipboard.writeText(page.url); say('Link copiado!'); }
      catch(e){ prompt('Copie o link da página:', page.url); }
    });
    loadPages();
  }

  function updateImagePreview(){
    const src = uploadedImage || el('contentImageUrl')?.value.trim() || '';
    const wrap = el('contentImagePreview');
    const image = el('contentImagePreviewImg');
    if(!wrap || !image) return;
    if(src){ image.src = src; wrap.style.display = 'block'; }
    else { image.removeAttribute('src'); wrap.style.display = 'none'; }
  }

  function handleImageFile(event){
    const file = event.target.files && event.target.files[0];
    if(!file) return;
    if(file.size > 500 * 1024){
      say('Use uma imagem menor que 500 KB ou cole uma URL HTTPS.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      uploadedImage = String(reader.result || '');
      el('contentImageUrl').value = '';
      updateImagePreview();
    };
    reader.readAsDataURL(file);
  }

  function resetForm(){
    editingDocId = '';
    editingCreatedAt = null;
    uploadedImage = '';
    slugWasEdited = false;
    ['contentTitle','contentSlug','contentSeoDescription','contentKeywords','contentImageUrl','contentBody','contentLinks'].forEach(id => { if(el(id)) el(id).value = ''; });
    if(el('contentImageFile')) el('contentImageFile').value = '';
    if(el('contentPublished')) el('contentPublished').checked = true;
    if(el('contentSaveBtn')) el('contentSaveBtn').textContent = '💾 Salvar página';
    updateImagePreview();
    el('contentTitle')?.focus();
  }

  async function savePage(){
    if(!adminAllowed()) return;
    const title = el('contentTitle').value.trim();
    const slug = slugify(el('contentSlug').value || title);
    const body = el('contentBody').value.trim();
    if(!title){ say('Preencha o título da página.'); return; }
    if(!slug){ say('Preencha o endereço da página.'); return; }
    if(!body){ say('Coloque algum conteúdo na página.'); return; }

    const btn = el('contentSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Salvando...';
    const docId = DOC_PREFIX + slug;
    const image = uploadedImage || el('contentImageUrl').value.trim();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const payload = {
      type: PAGE_TYPE,
      title,
      slug,
      seoDescription: el('contentSeoDescription').value.trim(),
      keywords: el('contentKeywords').value.split(',').map(x => x.trim()).filter(Boolean).slice(0,50),
      image,
      body,
      links: parseLinks(el('contentLinks').value),
      published: el('contentPublished').checked,
      authorEmail: (typeof currentUser !== 'undefined' && currentUser && currentUser.email) ? currentUser.email : '',
      updatedAt: now,
      createdAt: editingCreatedAt || now
    };

    try{
      await db.collection('config').doc(docId).set(payload);
      if(editingDocId && editingDocId !== docId){
        await db.collection('config').doc(editingDocId).delete();
      }
      say('Página salva!');
      resetForm();
      await loadPages();
    }catch(error){
      console.error('Erro ao salvar página:', error);
      say('Não foi possível salvar. Se aparecer erro de permissão, precisamos liberar as páginas de conteúdo nas regras do Firebase.');
    }finally{
      btn.disabled = false;
      btn.textContent = '💾 Salvar página';
    }
  }

  async function loadPages(){
    const list = el('contentPagesList');
    const status = el('contentListStatus');
    if(!list) return;
    list.innerHTML = '<p class="empty-hint">Carregando...</p>';
    try{
      const snap = await db.collection('config').where('type','==',PAGE_TYPE).limit(200).get();
      const docs = snap.docs.slice().sort((a,b) => {
        const av = a.data().updatedAt?.seconds || a.data().createdAt?.seconds || 0;
        const bv = b.data().updatedAt?.seconds || b.data().createdAt?.seconds || 0;
        return bv-av;
      });
      status.textContent = docs.length + (docs.length === 1 ? ' página' : ' páginas');
      if(!docs.length){ list.innerHTML = '<p class="empty-hint">Nenhuma página criada ainda.</p>'; return; }
      list.innerHTML = docs.map(doc => {
        const p = doc.data();
        const url = PUBLIC_BASE + encodeURIComponent(p.slug || '');
        return `<div style="border:1px solid var(--line);background:#fff;border-radius:11px;padding:11px;margin-bottom:9px">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap">
            <div style="min-width:0;flex:1"><b style="display:block">${safe(p.title || 'Sem título')}</b><small style="color:var(--muted);word-break:break-all">/conteudo/${safe(p.slug || '')}</small><div style="margin-top:5px;font-size:11px;font-weight:800;color:${p.published ? '#15803d' : '#b45309'}">${p.published ? '● PUBLICADA' : '● RASCUNHO'}</div></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-content-edit="${safe(doc.id)}" type="button" style="padding:7px 9px">Editar</button><a class="btn" href="${safe(url)}" target="_blank" rel="noopener" style="padding:7px 9px;text-decoration:none">Abrir</a><button class="btn danger" data-content-delete="${safe(doc.id)}" type="button" style="padding:7px 9px">Excluir</button></div>
          </div>
        </div>`;
      }).join('');

      list.querySelectorAll('[data-content-edit]').forEach(button => {
        button.onclick = () => editPage(docs.find(d => d.id === button.dataset.contentEdit));
      });
      list.querySelectorAll('[data-content-delete]').forEach(button => {
        button.onclick = () => deletePage(button.dataset.contentDelete);
      });
    }catch(error){
      console.error('Erro ao listar páginas:', error);
      status.textContent = 'erro';
      list.innerHTML = '<p class="empty-hint">Não foi possível carregar as páginas. Se for erro de permissão, precisamos ajustar as regras do Firebase para os documentos de conteúdo.</p>';
    }
  }

  function editPage(doc){
    if(!doc) return;
    const p = doc.data();
    editingDocId = doc.id;
    editingCreatedAt = p.createdAt || null;
    slugWasEdited = true;
    el('contentTitle').value = p.title || '';
    el('contentSlug').value = p.slug || '';
    el('contentSeoDescription').value = p.seoDescription || '';
    el('contentKeywords').value = Array.isArray(p.keywords) ? p.keywords.join(', ') : '';
    if(String(p.image || '').startsWith('data:image/')){
      uploadedImage = p.image;
      el('contentImageUrl').value = '';
    }else{
      uploadedImage = '';
      el('contentImageUrl').value = p.image || '';
    }
    el('contentBody').value = p.body || '';
    el('contentLinks').value = linksToText(p.links);
    el('contentPublished').checked = p.published !== false;
    el('contentSaveBtn').textContent = '💾 Salvar alterações';
    updateImagePreview();
    el('adminConteudo')?.scrollTo({top:0,behavior:'smooth'});
  }

  async function deletePage(docId){
    if(!adminAllowed() || !docId) return;
    if(!confirm('Excluir esta página de conteúdo?')) return;
    try{
      await db.collection('config').doc(docId).delete();
      if(editingDocId === docId) resetForm();
      say('Página excluída.');
      await loadPages();
    }catch(error){
      console.error('Erro ao excluir página:', error);
      say('Não foi possível excluir esta página.');
    }
  }

  function install(){
    const videosTab = el('adminTabVideos');
    const contentBox = el('adminConteudo');
    if(!videosTab || !contentBox) return false;
    if(el('adminTabConteudo')) return true;
    const button = document.createElement('button');
    button.className = 'btn';
    button.id = 'adminTabConteudo';
    button.type = 'button';
    button.textContent = '🌐 Landing pages';
    videosTab.insertAdjacentElement('afterend', button);
    button.onclick = () => { if(adminAllowed()) renderShell(); };
    return true;
  }

  let attempts = 0;
  (function waitForAdmin(){
    attempts++;
    if(install()) return;
    if(attempts < 80) setTimeout(waitForAdmin,100);
  })();
})();
