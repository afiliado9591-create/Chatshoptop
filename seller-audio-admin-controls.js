(function(){
'use strict';

const $=id=>document.getElementById(id);
const safe=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const say=m=>{try{if(typeof toast==='function')return toast(m)}catch(e){} try{alert(m)}catch(e){}};
let featureData=window.__CHATSHOP_STORE_FEATURE_DATA||window.__CHATSHOP_STORE_DATA||null;
let storagePromise=null,currentPublicAudio=null,currentPublicButton=null,recorderState=null,hydrateTimer=null,lastHydrateKey='';

function liveData(){return window.__CHATSHOP_STORE_FEATURE_DATA||window.__CHATSHOP_STORE_DATA||featureData||null}
function adminAllowed(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function currentUid(){try{return (typeof myUid!=='undefined'&&myUid)||firebase.auth().currentUser?.uid||''}catch(e){return''}}
function controlsOf(){return liveData()?.adminControl||{}}
function publicProducts(){const d=liveData();return Array.isArray(d?.products)?d.products:[]}

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
  const uid=currentUid();if(!uid){say('Entre na sua conta para enviar o áudio.');return''}
  if(!blob||blob.size>8*1024*1024){say('Use um áudio de até 8 MB.');return''}
  const status=card.querySelector('.seller-audio-status');if(status)status.textContent='Enviando áudio...';
  try{
    const storage=await loadStorage();
    const ext=(fileName&&fileName.split('.').pop()||'webm').replace(/[^a-z0-9]/ig,'').slice(0,8)||'webm';
    const ref=storage.ref().child(`seller-audio/${uid}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`);
    const snap=await ref.put(blob,{contentType:blob.type||'audio/webm'}),url=await snap.ref.getDownloadURL();
    const input=card.querySelector('[data-seller-audio-url]');if(input)input.value=url;
    if(status)status.textContent='✅ Áudio salvo';say('Áudio enviado!');return url;
  }catch(e){console.error(e);if(status)status.textContent='Erro ao enviar áudio';say('Não foi possível enviar o áudio.');return''}
}
function stopEditorPreview(){try{speechSynthesis.cancel()}catch(e){}if(currentPublicAudio){try{currentPublicAudio.pause();currentPublicAudio.currentTime=0}catch(e){}currentPublicAudio=null}}
function speakText(text){const t=String(text||'').trim();if(!t)return;stopEditorPreview();try{const u=new SpeechSynthesisUtterance(t);u.lang='pt-BR';speechSynthesis.speak(u)}catch(e){}}
function setModeUI(card){const mode=card.querySelector('[data-seller-audio-mode]')?.value||'off';card.querySelectorAll('[data-audio-pane]').forEach(p=>p.style.display=p.dataset.audioPane===mode?'block':'none')}
function audioSection(){
  const wrap=document.createElement('div');wrap.className='seller-audio-editor';wrap.style.cssText='border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px;padding:11px;margin:10px 0';
  wrap.innerHTML=`<div style="font-weight:900;color:#15803d;font-size:13px;margin-bottom:8px">🎙️ Vendedor da página</div>
  <div class="field"><label>Como o cliente vai ouvir os detalhes?</label><select data-seller-audio-mode style="width:100%;border:1px solid #d1d5db;border-radius:10px;padding:10px;background:#fff;font:inherit"><option value="off">Desativado</option><option value="tts">✍️ Escrever e o navegador falar</option><option value="upload">⬆️ Fazer upload de áudio</option><option value="record">🎙️ Gravar pelo celular</option></select></div>
  <div data-audio-pane="tts" style="display:none"><div class="field"><label>Texto que será falado</label><textarea data-seller-audio-text rows="4"></textarea></div><button type="button" class="btn seller-audio-preview">🔊 Testar voz</button></div>
  <div data-audio-pane="upload" style="display:none"><div class="field"><label>Enviar arquivo de áudio</label><input type="file" accept="audio/*" class="seller-audio-file"><small>Até 8 MB.</small></div></div>
  <div data-audio-pane="record" style="display:none"><button type="button" class="btn success seller-audio-record">🎙️ Começar gravação</button></div>
  <input type="hidden" data-seller-audio-url value=""><div class="seller-audio-status" style="font-size:11px;color:#15803d;font-weight:800;margin-top:7px"></div>
  <button type="button" class="btn seller-audio-remove" style="margin-top:8px;padding:7px 10px">Remover áudio</button>
  <div style="border-top:1px solid #86efac;margin:14px 0 10px;padding-top:12px"><div style="font-weight:900;color:#15803d;font-size:13px;margin-bottom:7px">🛒 Áudio da página de venda</div><div class="field"><label>Chamada da página de venda</label><textarea data-sales-audio-text rows="4"></textarea><small>Este texto pertence somente a este produto.</small></div><button type="button" class="btn seller-sales-audio-preview">🔊 Testar chamada</button></div>`;
  return wrap;
}
function upgradeProductCard(card){
  if(!card||card.dataset.sellerAudioReady==='1')return;card.dataset.sellerAudioReady='1';
  const section=audioSection(),voice=card.querySelector('[data-k="voiceText"]'),anchor=voice?.closest('div[style*="border"]')||card.querySelector('.tabs')||card.lastElementChild;
  if(anchor&&anchor!==card.lastElementChild)anchor.insertAdjacentElement('afterend',section);else card.appendChild(section);
  const mode=section.querySelector('[data-seller-audio-mode]');
  mode.onchange=()=>{setModeUI(card);try{debounce()}catch(e){}};
  section.querySelector('.seller-audio-preview').onclick=()=>speakText(section.querySelector('[data-seller-audio-text]').value);
  section.querySelector('.seller-sales-audio-preview').onclick=()=>speakText(section.querySelector('[data-sales-audio-text]').value);
  section.querySelector('[data-seller-audio-text]').addEventListener('input',()=>{try{debounce()}catch(e){}});
  section.querySelector('[data-sales-audio-text]').addEventListener('input',()=>{try{debounce()}catch(e){}});
  section.querySelector('.seller-audio-file').onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;mode.value='upload';setModeUI(card);await uploadAudio(f,f.name,card)};
  section.querySelector('.seller-audio-remove').onclick=()=>{stopEditorPreview();section.querySelector('[data-seller-audio-url]').value='';section.querySelector('[data-seller-audio-text]').value='';section.querySelector('[data-sales-audio-text]').value='';mode.value='off';section.querySelector('.seller-audio-status').textContent='';setModeUI(card);try{debounce()}catch(e){}};
  section.querySelector('.seller-audio-record').onclick=()=>toggleRecord(card);setModeUI(card);
}
async function toggleRecord(card){
  const btn=card.querySelector('.seller-audio-record');
  if(recorderState){if(recorderState.card===card){try{recorderState.rec.stop()}catch(e){}}return}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){say('Este navegador não permite gravação de áudio.');return}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true}),parts=[],rec=new MediaRecorder(stream,MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?{mimeType:'audio/webm;codecs=opus'}:{});
    rec.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data)};
    rec.onstop=async()=>{clearTimeout(recorderState?.timer);stream.getTracks().forEach(t=>t.stop());const blob=new Blob(parts,{type:rec.mimeType||'audio/webm'});recorderState=null;btn.textContent='🎙️ Começar gravação';card.querySelector('[data-seller-audio-mode]').value='record';setModeUI(card);await uploadAudio(blob,'gravacao.webm',card)};
    rec.start(500);btn.textContent='⏹️ Parar gravação';recorderState={rec,card,timer:setTimeout(()=>{try{rec.stop()}catch(e){}},60000)};
  }catch(e){say('Não foi possível acessar o microfone.')}
}
function upgradeAllCards(){document.querySelectorAll('#products .product').forEach(upgradeProductCard);scheduleHydrate()}
function wrapCollect(){
  if(typeof window.collect!=='function'||window.collect.__sellerAudioWrapped)return;
  const original=window.collect;function wrapped(){const data=original(),cards=[...document.querySelectorAll('#products .product')];if(Array.isArray(data.products))data.products.forEach((p,i)=>{const c=cards[i];if(!c)return;p.sellerAudioMode=c.querySelector('[data-seller-audio-mode]')?.value||'off';p.sellerAudioText=c.querySelector('[data-seller-audio-text]')?.value.trim()||'';p.sellerAudioUrl=c.querySelector('[data-seller-audio-url]')?.value.trim()||'';p.sellerSalesAudioText=c.querySelector('[data-sales-audio-text]')?.value.trim()||''});return data}
  wrapped.__sellerAudioWrapped=true;window.collect=wrapped;try{collect=wrapped}catch(e){}
}
function scheduleHydrate(){clearTimeout(hydrateTimer);hydrateTimer=setTimeout(hydrateExisting,450)}
async function hydrateExisting(){
  try{if(typeof mySlug==='undefined'||!mySlug||!window.db)return;const cards=[...document.querySelectorAll('#products .product')];if(!cards.length)return;const key=mySlug+'|'+cards.length;if(key===lastHydrateKey)return;const snap=await db.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').doc(mySlug).get();if(!snap.exists)return;const ps=Array.isArray(snap.data().products)?snap.data().products:[];cards.forEach((c,i)=>{const p=ps[i]||{},mode=c.querySelector('[data-seller-audio-mode]');if(!mode)return;mode.value=['tts','upload','record'].includes(p.sellerAudioMode)?p.sellerAudioMode:'off';c.querySelector('[data-seller-audio-text]').value=p.sellerAudioText||'';c.querySelector('[data-seller-audio-url]').value=p.sellerAudioUrl||'';c.querySelector('[data-sales-audio-text]').value=p.sellerSalesAudioText||'';const status=c.querySelector('.seller-audio-status');if(status&&p.sellerAudioUrl)status.textContent='✅ Áudio salvo';setModeUI(c)});lastHydrateKey=key}catch(e){console.warn(e)}
}
function installEditor(){const root=document.getElementById('products');if(!root)return false;wrapCollect();upgradeAllCards();if(!root.dataset.sellerAudioObserved){root.dataset.sellerAudioObserved='1';new MutationObserver(()=>{upgradeAllCards();wrapCollect()}).observe(root,{childList:true,subtree:false})}return true}

function stopPublicPlayback(){try{speechSynthesis.cancel()}catch(e){}if(currentPublicAudio){try{currentPublicAudio.pause();currentPublicAudio.currentTime=0}catch(e){}currentPublicAudio=null}if(currentPublicButton){currentPublicButton.innerHTML=currentPublicButton.classList.contains('seller-audio-single')?'▶ Ouvir descrição':'🔊 Detalhes do produto';currentPublicButton=null}}
function explicitMode(p){return ['tts','upload','record'].includes(String(p?.sellerAudioMode||''))?String(p.sellerAudioMode):'off'}
function hasSellerAudio(p){const m=explicitMode(p);if(m==='tts')return !!String(p?.sellerAudioText||'').trim();return (m==='upload'||m==='record')&&!!String(p?.sellerAudioUrl||'').trim()}
function playSellerAudio(p,btn,context='card'){
  if(!p||explicitMode(p)==='off'){stopPublicPlayback();return}
  if(currentPublicButton===btn){stopPublicPlayback();return}stopPublicPlayback();currentPublicButton=btn;btn.innerHTML='⏹️ Parar áudio';
  const m=explicitMode(p);
  if(m==='tts'){
    const text=context==='sale'?(String(p?.sellerSalesAudioText||'').trim()||String(p?.sellerAudioText||'').trim()):String(p?.sellerAudioText||'').trim();
    if(!text){stopPublicPlayback();return}try{const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';u.onend=stopPublicPlayback;u.onerror=stopPublicPlayback;speechSynthesis.speak(u)}catch(e){stopPublicPlayback()}return;
  }
  const url=String(p?.sellerAudioUrl||'').trim();if(!url){stopPublicPlayback();return}try{const a=new Audio(url);currentPublicAudio=a;a.onended=stopPublicPlayback;a.onerror=stopPublicPlayback;a.play().catch(stopPublicPlayback)}catch(e){stopPublicPlayback()}
}
function productByVisibleName(name){const n=norm(name);return n?publicProducts().find(p=>norm(p?.name)===n)||null:null}
function productForCard(card){
  const name=card.querySelector('.cgc-name,.csv-name,.vs-card-name')?.textContent||'';
  const byName=productByVisibleName(name);if(byName)return byName;
  const i=Number(card.dataset.i);const ps=publicProducts();return Number.isInteger(i)&&i>=0&&ps[i]?ps[i]:null;
}
function productForDetail(){const body=document.getElementById('csvProductBody')||document.getElementById('vsProductBody');if(!body)return null;const name=body.querySelector('.csv-dname,.vs-detail-name,.csv-detail-name')?.textContent||'';return productByVisibleName(name)}
function suppressLegacyAudioButtons(){
  if(!document.getElementById('chatshopAudioSingleOwnerStyle')){const st=document.createElement('style');st.id='chatshopAudioSingleOwnerStyle';st.textContent='.virtual-seller-audio-btn{display:none!important;pointer-events:none!important}';document.head.appendChild(st)}
}
function addGridAudioButtons(){
  const c=controlsOf();if(c.sellerAudioPaused)return;
  document.querySelectorAll('.cgc,.csv-card,.vs-card').forEach(card=>{
    let b=card.querySelector('.seller-audio-btn');const p=productForCard(card);
    if(!p||!hasSellerAudio(p)){if(b)b.remove();return}
    if(b)return;
    b=document.createElement('button');b.type='button';b.className='seller-audio-btn';b.innerHTML='🔊 Detalhes do produto';
    b.onclick=e=>{e.preventDefault();e.stopPropagation();const current=productForCard(card);if(current)playSellerAudio(current,b,'card')};
    const img=card.querySelector('.cgc-img,.csv-photo,.vs-card-img')||card;img.appendChild(b);
  })
}
function addDetailAudioButton(){
  const c=controlsOf(),body=document.getElementById('csvProductBody')||document.getElementById('vsProductBody');if(!body)return;
  let b=body.querySelector('.seller-audio-detail');const p=productForDetail();
  if(c.sellerAudioPaused||!p||!hasSellerAudio(p)){if(b)b.remove();return}
  if(b)return;b=document.createElement('button');b.type='button';b.className='seller-audio-btn seller-audio-detail';b.innerHTML='🔊 Detalhes do produto';
  b.onclick=e=>{e.preventDefault();e.stopPropagation();const current=productForDetail();if(current)playSellerAudio(current,b,'sale')};
  const price=body.querySelector('.csv-dprice,.vs-detail-price');if(price)price.insertAdjacentElement('afterend',b);else body.appendChild(b)
}
function addSingleAudioButtons(){
  const c=controlsOf();if(c.sellerAudioPaused||document.body.classList.contains('store-grid-layout'))return;const ps=publicProducts();
  document.querySelectorAll('.pub-slide').forEach((slide,i)=>{let b=slide.querySelector('.seller-audio-btn');const name=slide.querySelector('.pub-slide-textbox b')?.textContent||'',product=productByVisibleName(name)||ps[i]||null;if(!product||!hasSellerAudio(product)){if(b)b.remove();return}if(b)return;b=document.createElement('button');b.type='button';b.className='seller-audio-btn seller-audio-single';b.innerHTML='▶ Ouvir descrição';b.onclick=e=>{e.preventDefault();e.stopPropagation();const current=productByVisibleName(slide.querySelector('.pub-slide-textbox b')?.textContent)||product;if(current)playSellerAudio(current,b,'card')};slide.appendChild(b)})
}
function applyPublicControls(){
  featureData=liveData();const c=controlsOf();suppressLegacyAudioButtons();
  if(c.sellerAudioPaused){stopPublicPlayback();document.querySelectorAll('.seller-audio-btn').forEach(x=>x.remove());return}
  addGridAudioButtons();addDetailAudioButton();addSingleAudioButtons();
}
function installPublic(){if(!liveData())return false;if(!document.getElementById('sellerAudioPublicStyle')){const st=document.createElement('style');st.id='sellerAudioPublicStyle';st.textContent='.seller-audio-btn{position:absolute!important;left:8px!important;right:8px!important;bottom:8px!important;z-index:26!important;border:0!important;border-radius:999px!important;padding:10px 12px!important;background:#16a34a!important;color:#fff!important;font-size:12px!important;font-weight:900!important;box-shadow:0 3px 12px rgba(0,0,0,.25)!important;cursor:pointer!important;pointer-events:auto!important}.seller-audio-detail{position:relative!important;width:100%!important;left:auto!important;right:auto!important;bottom:auto!important;margin:0 0 13px!important;font-size:14px!important}.seller-audio-single{left:50%!important;right:auto!important;top:50%!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:max-content!important;max-width:calc(100% - 40px)!important;font-size:14px!important}';document.head.appendChild(st)}applyPublicControls();if(document.body&&!document.body.dataset.sellerAudioUnifiedObserver){document.body.dataset.sellerAudioUnifiedObserver='1';new MutationObserver(()=>requestAnimationFrame(applyPublicControls)).observe(document.body,{childList:true,subtree:true})}return true}

async function adminExportStoreHtml(slug){if(!adminAllowed()||!window.firebase?.auth?.().currentUser)throw new Error('Acesso exclusivo do administrador.');const token=await firebase.auth().currentUser.getIdToken(),response=await fetch('/api/app-superfrete.js?adminExport=1',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({slug})}),text=await response.text();if(!response.ok)throw new Error('Não foi possível gerar o HTML.');return text}
async function showAdminStores(){
  if(!adminAllowed()||!window.db)return;const box=$('adminConteudo');if(!box)return;box.innerHTML='<p class="empty-hint">Carregando lojas...</p>';
  try{const [storesSnap,usersSnap]=await Promise.all([db.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').limit(300).get(),db.collection('users').limit(300).get()]),emails={};usersSnap.docs.forEach(d=>emails[d.id]=d.data().email||'');const stores=storesSnap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.slug||s.brand).sort((a,b)=>String(a.brand||a.slug).localeCompare(String(b.brand||b.slug),'pt-BR'));box.innerHTML='<div style="margin-bottom:12px"><h3 style="margin:0 0 4px">🏪 Lojas</h3></div><div id="adminStoresList"></div>';const list=$('adminStoresList');list.innerHTML=stores.map(s=>{const c=s.adminControl||{},host=s.customDomain||`${s.slug||s.id}.alibr.com.br`,email=emails[s.ownerUid]||'';return `<div data-admin-store="${safe(s.id)}" style="border:1px solid #ddd;border-radius:12px;padding:12px;margin-bottom:10px"><b>${safe(s.brand||s.slug||s.id)}</b><div style="font-size:11px">${safe(email)} · ${safe(host)}</div><label style="display:block;margin-top:8px"><input type="checkbox" data-ctrl="sellerAudioPaused" ${c.sellerAudioPaused?'checked':''}> 🔊 Pausar vendedor em áudio</label><button type="button" class="btn primary admin-store-save" style="margin-top:8px">💾 Salvar controles</button></div>`}).join('');list.querySelectorAll('[data-admin-store]').forEach(card=>{card.querySelector('.admin-store-save').onclick=async()=>{const ctrl={};card.querySelectorAll('[data-ctrl]').forEach(x=>ctrl[x.dataset.ctrl]=x.checked);await db.collection(typeof COLECAO!=='undefined'?COLECAO:'chatshops').doc(card.dataset.adminStore).set({adminControl:ctrl,adminControlUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});say('Controles salvos!')}})}catch(e){console.error(e);box.innerHTML='<p class="empty-hint">Não foi possível carregar as lojas.</p>'}
}
function installAdmin(){if(!adminAllowed())return false;const videos=$('adminTabVideos'),pages=$('adminTabConteudo');if(!videos||!$('adminConteudo'))return false;if($('adminTabLojas'))return true;const b=document.createElement('button');b.className='btn';b.id='adminTabLojas';b.type='button';b.textContent='🏪 Lojas';(pages||videos).insertAdjacentElement('afterend',b);b.onclick=showAdminStores;return true}

window.addEventListener('beforeunload',()=>{try{speechSynthesis.cancel()}catch(e){};stopPublicPlayback()});
let tries=0;(function boot(){tries++;installEditor();installPublic();installAdmin();if(tries<100)setTimeout(boot,120)})();
})();