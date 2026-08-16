(function(){
'use strict';

const $=id=>document.getElementById(id);
const safe=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const say=m=>{try{if(typeof toast==='function')return toast(m)}catch(e){} alert(m)};
const featureData=window.__CHATSHOP_STORE_FEATURE_DATA||null;
let storagePromise=null,currentPublicAudio=null,currentPublicButton=null,recorderState=null,hydrateTimer=null,lastHydrateKey='';

function adminAllowed(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function currentUid(){try{return (typeof myUid!=='undefined'&&myUid)||firebase.auth().currentUser?.uid||''}catch(e){return''}}
function slugify(v){return String(v||'produto').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)||'produto'}

function loadStorage(){
  if(window.firebase&&firebase.storage)return Promise.resolve(firebase.storage());
  if(storagePromise)return storagePromise;
  storagePromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js';
    s.onload=()=>{try{resolve(firebase.storage())}catch(e){reject(e)}};
    s.onerror=()=>reject(new Error('Não foi possível carregar o Firebase Storage.'));
    document.head.appendChild(s);
  });
  return storagePromise;
}

async function uploadAudio(blob,fileName,card){
  const uid=currentUid();
  if(!uid){say('Entre na sua conta para enviar o áudio.');return''}
  if(!blob||blob.size>8*1024*1024){say('Use um áudio de até 8 MB.');return''}
  const status=card.querySelector('.seller-audio-status');
  if(status)status.textContent='Enviando áudio...';
  try{
    const storage=await loadStorage();
    const ext=(fileName&&fileName.split('.').pop()||'webm').replace(/[^a-z0-9]/ig,'').slice(0,8)||'webm';
    const ref=storage.ref().child(`seller-audio/${uid}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`);
    const snap=await ref.put(blob,{contentType:blob.type||'audio/webm'});
    const url=await snap.ref.getDownloadURL();
    const input=card.querySelector('[data-seller-audio-url]');
    if(input)input.value=url;
    if(status)status.textContent='✅ Áudio salvo';
    say('Áudio enviado!');
    return url;
  }catch(e){
    console.error('seller audio upload',e);
    if(status)status.textContent='Erro ao enviar áudio';
    say('Não foi possível enviar o áudio. Se o Firebase Storage ainda não estiver liberado, precisamos ativar as regras de envio.');
    return'';
  }
}

function stopEditorPreview(){
  try{speechSynthesis.cancel()}catch(e){}
  if(currentPublicAudio){try{currentPublicAudio.pause();currentPublicAudio.currentTime=0}catch(e){}currentPublicAudio=null}
}

function speakText(text){
  const t=String(text||'').trim(); if(!t)return;
  stopEditorPreview();
  try{const u=new SpeechSynthesisUtterance(t);u.lang='pt-BR';speechSynthesis.speak(u)}catch(e){say('Este navegador não conseguiu reproduzir a voz.')}
}

function setModeUI(card){
  const mode=card.querySelector('[data-seller-audio-mode]')?.value||'off';
  card.querySelectorAll('[data-audio-pane]').forEach(p=>p.style.display=p.dataset.audioPane===mode?'block':'none');
}

function audioSection(){
  const wrap=document.createElement('div');
  wrap.className='seller-audio-editor';
  wrap.style.cssText='border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px;padding:11px;margin:10px 0';
  wrap.innerHTML=`<div style="font-weight:900;color:#15803d;font-size:13px;margin-bottom:8px">🎙️ Vendedor da página</div>
  <div class="field"><label>Como o cliente vai ouvir os detalhes?</label><select data-seller-audio-mode style="width:100%;border:1px solid #d1d5db;border-radius:10px;padding:10px;background:#fff;font:inherit"><option value="off">Desativado</option><option value="tts">✍️ Escrever e o navegador falar</option><option value="upload">⬆️ Fazer upload de áudio</option><option value="record">🎙️ Gravar pelo celular</option></select></div>
  <div data-audio-pane="tts" style="display:none"><div class="field"><label>Texto que será falado</label><textarea data-seller-audio-text rows="4" placeholder="Ex: Este vestido é confeccionado em malha canelada, possui tamanhos P ao G2..."></textarea><small>Não precisa aparecer escrito na página. O navegador lê este texto em voz alta.</small></div><button type="button" class="btn seller-audio-preview">🔊 Testar voz</button></div>
  <div data-audio-pane="upload" style="display:none"><div class="field"><label>Enviar arquivo de áudio</label><input type="file" accept="audio/*" class="seller-audio-file"><small>MP3, M4A, WAV, WebM e outros formatos de áudio. Até 8 MB.</small></div></div>
  <div data-audio-pane="record" style="display:none"><button type="button" class="btn success seller-audio-record">🎙️ Começar gravação</button><small style="display:block;margin-top:7px;color:var(--muted)">Grave diretamente pelo microfone do celular. A gravação para automaticamente em 60 segundos.</small></div>
  <input type="hidden" data-seller-audio-url value=""><div class="seller-audio-status" style="font-size:11px;color:#15803d;font-weight:800;margin-top:7px"></div>
  <button type="button" class="btn seller-audio-remove" style="margin-top:8px;padding:7px 10px">Remover áudio</button>`;
  return wrap;
}

function upgradeProductCard(card){
  if(!card||card.dataset.sellerAudioReady==='1')return;
  card.dataset.sellerAudioReady='1';
  const section=audioSection();
  const voice=card.querySelector('[data-k="voiceText"]');
  const anchor=voice?.closest('div[style*="border"]')||card.querySelector('.tabs')||card.lastElementChild;
  if(anchor&&anchor!==card.lastElementChild)anchor.insertAdjacentElement('afterend',section); else card.appendChild(section);
  const mode=section.querySelector('[data-seller-audio-mode]');
  mode.onchange=()=>{setModeUI(card);try{debounce()}catch(e){}};
  section.querySelector('.seller-audio-preview').onclick=()=>speakText(section.querySelector('[data-seller-audio-text]').value);
  section.querySelector('[data-seller-audio-text]').addEventListener('input',()=>{try{debounce()}catch(e){}});
  section.querySelector('.seller-audio-file').onchange=async e=>{
    const f=e.target.files&&e.target.files[0]; if(!f)return;
    mode.value='upload'; setModeUI(card);
    await uploadAudio(f,f.name,card);
  };
  section.querySelector('.seller-audio-remove').onclick=()=>{
    stopEditorPreview();
    section.querySelector('[data-seller-audio-url]').value='';
    section.querySelector('[data-seller-audio-text]').value='';
    section.querySelector('[data-seller-audio-mode]').value='off';
    section.querySelector('.seller-audio-status').textContent='';
    setModeUI(card);try{debounce()}catch(e){}
  };
  section.querySelector('.seller-audio-record').onclick=()=>toggleRecord(card);
  setModeUI(card);
}

async function toggleRecord(card){
  const btn=card.querySelector('.seller-audio-record');
  if(recorderState){
    if(recorderState.card===card){try{recorderState.rec.stop()}catch(e){};return}
    say('Finalize a gravação atual antes de gravar outro produto.');return;
  }
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){say('Este navegador não permite gravação de áudio.');return}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const options={};
    if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))options.mimeType='audio/webm;codecs=opus';
    const rec=new MediaRecorder(stream,options),parts=[];
    rec.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data)};
    rec.onstop=async()=>{
      clearTimeout(recorderState?.timer);stream.getTracks().forEach(t=>t.stop());
      const blob=new Blob(parts,{type:rec.mimeType||'audio/webm'});
      recorderState=null;btn.textContent='🎙️ Começar gravação';btn.classList.add('success');
      card.querySelector('[data-seller-audio-mode]').value='record';setModeUI(card);
      await uploadAudio(blob,'gravacao.webm',card);
    };
    rec.start(500);btn.textContent='⏹️ Parar gravação';btn.classList.remove('success');
    const status=card.querySelector('.seller-audio-status');if(status)status.textContent='🔴 Gravando... máximo 60 segundos';
    recorderState={rec,card,timer:setTimeout(()=>{try{rec.stop()}catch(e){}},60000)};
  }catch(e){console.error(e);say('Não foi possível acessar o microfone. Confira a permissão do navegador.')}
}

function upgradeAllCards(){
  document.querySelectorAll('#products .product').forEach(upgradeProductCard);
  scheduleHydrate();
}

function wrapCollect(){
  if(typeof window.collect!=='function'||window.collect.__sellerAudioWrapped)return;
  const original=window.collect;
  function wrapped(){
    const data=original();
    const cards=[...document.querySelectorAll('#products .product')];
    if(Array.isArray(data.products))data.products.forEach((p,i)=>{
      const c=cards[i];if(!c)return;
      p.sellerAudioMode=c.querySelector('[data-seller-audio-mode]')?.value||'off';
      p.sellerAudioText=c.querySelector('[data-seller-audio-text]')?.value.trim()||'';
      p.sellerAudioUrl=c.querySelector('[data-seller-audio-url]')?.value.trim()||'';
    });
    return data;
  }
  wrapped.__sellerAudioWrapped=true;window.collect=wrapped;
}

function scheduleHydrate(){clearTimeout(hydrateTimer);hydrateTimer=setTimeout(hydrateExisting,500)}
async function hydrateExisting(){
  try{
    if(typeof mySlug==='undefined'||!mySlug||!window.db)return;
    const cards=[...document.querySelectorAll('#products .product')];if(!cards.length)return;
    const key=mySlug+'|'+cards.length;if(key===lastHydrateKey)return;
    const snap=await db.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').doc(mySlug).get();if(!snap.exists)return;
    const ps=Array.isArray(snap.data().products)?snap.data().products:[];
    cards.forEach((c,i)=>{
      const p=ps[i]||{},mode=c.querySelector('[data-seller-audio-mode]');if(!mode)return;
      mode.value=['tts','upload','record'].includes(p.sellerAudioMode)?p.sellerAudioMode:'off';
      c.querySelector('[data-seller-audio-text]').value=p.sellerAudioText||'';
      c.querySelector('[data-seller-audio-url]').value=p.sellerAudioUrl||'';
      const status=c.querySelector('.seller-audio-status');if(status&&p.sellerAudioUrl)status.textContent='✅ Áudio salvo';
      setModeUI(c);
    });
    lastHydrateKey=key;
  }catch(e){console.warn('hydrate seller audio',e)}
}

function installEditor(){
  if(!document.getElementById('products'))return false;
  wrapCollect();upgradeAllCards();
  if(!document.getElementById('products').dataset.sellerAudioObserved){
    document.getElementById('products').dataset.sellerAudioObserved='1';
    new MutationObserver(()=>{upgradeAllCards();wrapCollect()}).observe(document.getElementById('products'),{childList:true,subtree:false});
  }
  return true;
}

function controlsOf(){return featureData?.adminControl||{}}
function publicProducts(){return Array.isArray(featureData?.products)?featureData.products:[]}
function stopPublicPlayback(){
  try{speechSynthesis.cancel()}catch(e){}
  if(currentPublicAudio){try{currentPublicAudio.pause();currentPublicAudio.currentTime=0}catch(e){}currentPublicAudio=null}
  if(currentPublicButton){currentPublicButton.innerHTML=currentPublicButton.classList.contains('seller-audio-single')?'▶ Ouvir descrição':'🔊 Detalhes do produto';currentPublicButton=null}
}
function playSellerAudio(p,btn){
  const mode=String(p?.sellerAudioMode||'off');
  if(currentPublicButton===btn){stopPublicPlayback();return}
  stopPublicPlayback();currentPublicButton=btn;btn.innerHTML='⏹️ Parar áudio';
  if(mode==='tts'){
    const text=String(p?.sellerAudioText||'').trim();if(!text){stopPublicPlayback();return}
    try{const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';u.onend=stopPublicPlayback;u.onerror=stopPublicPlayback;speechSynthesis.speak(u)}catch(e){stopPublicPlayback()}
    return;
  }
  const url=String(p?.sellerAudioUrl||'').trim();if(!url){stopPublicPlayback();return}
  try{const a=new Audio(url);currentPublicAudio=a;a.onended=stopPublicPlayback;a.onerror=stopPublicPlayback;a.play().catch(stopPublicPlayback)}catch(e){stopPublicPlayback()}
}
function hasSellerAudio(p){const m=String(p?.sellerAudioMode||'off');return m==='tts'?!!String(p?.sellerAudioText||'').trim():((m==='upload'||m==='record')&&!!String(p?.sellerAudioUrl||'').trim())}

function productForCard(card){
  const ps=publicProducts();const i=Number(card.dataset.i);if(Number.isInteger(i)&&i>=0&&ps[i])return ps[i];
  const name=card.querySelector('.cgc-name')?.textContent.trim();return ps.find(p=>String(p?.name||'').trim()===name)||null;
}
function addGridAudioButtons(){
  if(controlsOf().sellerAudioPaused)return;
  document.querySelectorAll('.cgc').forEach(card=>{
    if(card.querySelector('.seller-audio-btn'))return;
    const p=productForCard(card);if(!p||!hasSellerAudio(p))return;
    const b=document.createElement('button');b.type='button';b.className='seller-audio-btn';b.innerHTML='🔊 Detalhes do produto';
    b.onclick=e=>{e.preventDefault();e.stopPropagation();playSellerAudio(p,b)};
    const img=card.querySelector('.cgc-img');if(img)img.appendChild(b);
  });
}
function addSingleAudioButtons(){
  if(controlsOf().sellerAudioPaused||document.body.classList.contains('store-grid-layout'))return;
  const ps=publicProducts();
  document.querySelectorAll('.pub-slide').forEach((slide,i)=>{
    if(slide.querySelector('.seller-audio-btn'))return;
    const name=slide.querySelector('.pub-slide-textbox b')?.textContent?.trim();
    const product=ps.find(p=>String(p?.name||'').trim()===name)||ps[i];
    if(!product||!hasSellerAudio(product))return;
    const b=document.createElement('button');b.type='button';b.className='seller-audio-btn seller-audio-single';b.innerHTML='▶ Ouvir descrição';b.setAttribute('aria-label','Ouvir descrição do produto');
    b.onclick=e=>{e.preventDefault();e.stopPropagation();playSellerAudio(product,b)};
    slide.appendChild(b);
  });
}

function pauseWholeStore(){
  const root=$('storefrontScreen');if(!root||root.dataset.adminPaused==='1')return;
  root.dataset.adminPaused='1';root.style.display='block';
  root.innerHTML=`<div style="min-height:100dvh;display:grid;place-items:center;background:#f5f5f5;padding:24px;font-family:Arial,sans-serif"><div style="max-width:430px;background:#fff;border:1px solid #eee;border-radius:18px;padding:28px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.08)"><div style="font-size:44px">⏸️</div><h2 style="margin:10px 0 8px">Loja temporariamente pausada</h2><p style="margin:0;color:#666;line-height:1.5">Esta loja está indisponível no momento. Tente novamente mais tarde.</p></div></div>`;
  document.querySelectorAll('#chatshopGridTop,#pubChatToggle,.pub-chat-overlay').forEach(x=>x.remove());
}
function applyPublicControls(){
  const c=controlsOf();if(c.storePaused){pauseWholeStore();return}
  if(c.chatPaused)document.querySelectorAll('#pubChatToggle,.pub-chat-overlay').forEach(x=>x.style.setProperty('display','none','important'));
  if(c.voicePaused)document.querySelectorAll('.conversation-bar,.listen-btn,#pubMic,#pubRecStatus').forEach(x=>x.style.setProperty('display','none','important'));
  if(c.sellerAudioPaused){stopPublicPlayback();document.querySelectorAll('.seller-audio-btn').forEach(x=>x.remove())}
  if(c.buyPaused)document.querySelectorAll('.cgc-buy,.pub-slide-buy,.live-buy').forEach(x=>{x.style.pointerEvents='none';x.style.opacity='.55';x.setAttribute('aria-disabled','true');x.textContent='Compra temporariamente pausada'});
  if(c.productsPaused){
    const feed=$('pubFeed');if(feed&&!feed.dataset.productsPaused){feed.dataset.productsPaused='1';feed.innerHTML='<div style="grid-column:1/-1;margin:20px;padding:24px;background:#fff;border-radius:14px;text-align:center;font-weight:800">⏸️ Catálogo temporariamente pausado.</div>'}
    document.querySelectorAll('#chatshopGridMenu,.pub-cat-menu').forEach(x=>x.style.setProperty('display','none','important'));
  }
  if(!c.sellerAudioPaused&&!c.productsPaused){addGridAudioButtons();addSingleAudioButtons()}
}
function installPublic(){
  if(!featureData)return false;
  if(!$('sellerAudioPublicStyle')){
    const st=document.createElement('style');st.id='sellerAudioPublicStyle';st.textContent=`.seller-audio-btn{position:absolute!important;left:8px!important;right:8px!important;bottom:8px!important;z-index:6!important;border:0!important;border-radius:999px!important;padding:10px 12px!important;background:#16a34a!important;color:#fff!important;font-size:12px!important;font-weight:900!important;box-shadow:0 3px 12px rgba(0,0,0,.25)!important;cursor:pointer!important;pointer-events:auto!important}.seller-audio-single{position:absolute!important;left:50%!important;right:auto!important;top:50%!important;bottom:auto!important;transform:translate(-50%,-50%)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:max-content!important;max-width:calc(100% - 40px)!important;margin:0!important;padding:14px 20px!important;background:rgba(22,163,74,.94)!important;font-size:14px!important;white-space:nowrap!important;z-index:8!important}`;document.head.appendChild(st)
  }
  applyPublicControls();
  new MutationObserver(()=>applyPublicControls()).observe(document.body,{childList:true,subtree:true});
  return true;
}

async function showAdminStores(){
  if(!adminAllowed()||!window.db)return;
  const box=$('adminConteudo');if(!box)return;
  box.innerHTML='<p class="empty-hint">Carregando lojas...</p>';
  try{
    const [storesSnap,usersSnap]=await Promise.all([db.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').limit(300).get(),db.collection('users').limit(300).get()]);
    const emails={};usersSnap.docs.forEach(d=>emails[d.id]=d.data().email||'');
    const stores=storesSnap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.slug||s.brand).sort((a,b)=>String(a.brand||a.slug).localeCompare(String(b.brand||b.slug),'pt-BR'));
    box.innerHTML=`<div style="margin-bottom:12px"><h3 style="margin:0 0 4px">🏪 Lojas dos lojistas e afiliados</h3><small style="color:var(--muted)">Veja a loja e pause somente a função que desejar.</small></div><div id="adminStoresList"></div>`;
    const list=$('adminStoresList');
    if(!stores.length){list.innerHTML='<p class="empty-hint">Nenhuma loja encontrada.</p>';return}
    list.innerHTML=stores.map(s=>{
      const c=s.adminControl||{},host=s.customDomain||`${s.slug||s.id}.alibr.com.br`,url=`https://${host}/`,email=emails[s.ownerUid]||'e-mail não encontrado';
      return `<div data-admin-store="${safe(s.id)}" style="border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:11px;background:#fff">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div><b>${safe(s.brand||s.slug||s.id)}</b><div style="font-size:11px;color:var(--muted);margin-top:2px">${safe(email)} · ${safe(host)}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn admin-store-preview" data-url="${safe(url)}" style="padding:7px 9px">👁 Ver loja</button><a class="btn" href="${safe(url)}" target="_blank" rel="noopener" style="padding:7px 9px;text-decoration:none">↗ Abrir</a></div></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:7px;margin-top:11px;font-size:12px">
          <label><input type="checkbox" data-ctrl="storePaused" ${c.storePaused?'checked':''}> ⏸️ Pausar loja inteira</label>
          <label><input type="checkbox" data-ctrl="sellerAudioPaused" ${c.sellerAudioPaused?'checked':''}> 🔊 Pausar vendedor em áudio</label>
          <label><input type="checkbox" data-ctrl="chatPaused" ${c.chatPaused?'checked':''}> 💬 Pausar chat</label>
          <label><input type="checkbox" data-ctrl="voicePaused" ${c.voicePaused?'checked':''}> 🎙️ Pausar conversa por voz</label>
          <label><input type="checkbox" data-ctrl="buyPaused" ${c.buyPaused?'checked':''}> 🛒 Pausar botões de compra</label>
          <label><input type="checkbox" data-ctrl="productsPaused" ${c.productsPaused?'checked':''}> 📦 Pausar catálogo/produtos</label>
        </div>
        <button type="button" class="btn primary admin-store-save" style="margin-top:10px;padding:8px 11px">💾 Salvar controles</button>
        <div class="admin-store-frame" style="display:none;margin-top:11px;border-top:1px solid #eee;padding-top:10px"><iframe title="Prévia da loja" src="about:blank" style="width:100%;height:620px;border:1px solid #ddd;border-radius:12px;background:#fff"></iframe></div>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-admin-store]').forEach(card=>{
      card.querySelector('.admin-store-preview').onclick=()=>{const wrap=card.querySelector('.admin-store-frame'),frame=wrap.querySelector('iframe'),url=card.querySelector('.admin-store-preview').dataset.url;if(wrap.style.display==='none'){frame.src=url;wrap.style.display='block'}else{wrap.style.display='none';frame.src='about:blank'}};
      card.querySelector('.admin-store-save').onclick=async()=>{
        const btn=card.querySelector('.admin-store-save');btn.disabled=true;btn.textContent='Salvando...';
        const ctrl={};card.querySelectorAll('[data-ctrl]').forEach(x=>ctrl[x.dataset.ctrl]=x.checked);
        try{await db.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').doc(card.dataset.adminStore).set({adminControl:ctrl,adminControlUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});say('Controles da loja salvos!')}
        catch(e){console.error(e);say('Não foi possível salvar os controles. Confira as regras do Firestore.')}
        finally{btn.disabled=false;btn.textContent='💾 Salvar controles'}
      };
    });
  }catch(e){console.error(e);box.innerHTML='<p class="empty-hint">Não foi possível carregar as lojas. Confira as regras do Firestore.</p>'}
}

function installAdmin(){
  if(!adminAllowed())return false;
  const videos=$('adminTabVideos'),pages=$('adminTabConteudo');if(!videos||!$('adminConteudo'))return false;
  if($('adminTabLojas'))return true;
  const b=document.createElement('button');b.className='btn';b.id='adminTabLojas';b.type='button';b.textContent='🏪 Lojas';
  (pages||videos).insertAdjacentElement('afterend',b);b.onclick=showAdminStores;return true;
}

let tries=0;(function boot(){
  tries++;
  installEditor();installPublic();installAdmin();
  if(tries<100)setTimeout(boot,120);
})();

})();