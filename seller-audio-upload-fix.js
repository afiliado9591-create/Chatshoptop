(function(){
'use strict';

let storagePromise=null;
let activeRecord=null;

function notify(message){
  try{ if(typeof toast==='function') return toast(message); }catch(e){}
  alert(message);
}
function currentUid(){
  try{return firebase.auth().currentUser?.uid||''}catch(e){return''}
}
function loadStorage(){
  try{ if(window.firebase&&firebase.storage) return Promise.resolve(firebase.storage()); }catch(e){}
  if(storagePromise) return storagePromise;
  storagePromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js';
    s.onload=()=>{try{resolve(firebase.storage())}catch(e){reject(e)}};
    s.onerror=()=>reject(new Error('Não foi possível carregar o Firebase Storage.'));
    document.head.appendChild(s);
  });
  return storagePromise;
}
function sectionOf(el){return el?.closest('.seller-audio-editor')||null}
function hiddenUrl(section){return section?.querySelector('[data-seller-audio-url]')||null}
function statusEl(section){return section?.querySelector('.seller-audio-status')||null}
function modeEl(section){return section?.querySelector('[data-seller-audio-mode]')||null}
function previewBox(section){
  let box=section?.querySelector('.seller-audio-preview-fixed');
  if(!section) return null;
  if(!box){
    box=document.createElement('div');
    box.className='seller-audio-preview-fixed';
    box.style.cssText='display:none;margin-top:9px;padding:9px;border-radius:9px;background:#fff;border:1px solid #bbf7d0';
    box.innerHTML='<div class="seller-audio-preview-title" style="font-size:12px;font-weight:900;color:#15803d;margin-bottom:6px">🎧 Prévia da gravação</div><audio controls preload="metadata" style="width:100%;height:38px"></audio><div class="seller-audio-preview-note" style="font-size:10px;color:#6b7280;margin-top:5px"></div>';
    section.appendChild(box);
  }
  return box;
}
function setPreview(section,src,title,note){
  const box=previewBox(section); if(!box)return;
  const audio=box.querySelector('audio');
  const old=section.dataset.localAudioObjectUrl||'';
  if(src&&src!==old&&old.startsWith('blob:')){try{URL.revokeObjectURL(old)}catch(e){} section.dataset.localAudioObjectUrl='';}
  if(src){audio.src=src;box.style.display='block';}
  if(title) box.querySelector('.seller-audio-preview-title').textContent=title;
  if(note) box.querySelector('.seller-audio-preview-note').textContent=note;
}
function setLocalPreview(section,blob){
  const old=section.dataset.localAudioObjectUrl||'';
  if(old.startsWith('blob:')){try{URL.revokeObjectURL(old)}catch(e){}}
  const url=URL.createObjectURL(blob);
  section.dataset.localAudioObjectUrl=url;
  setPreview(section,url,'🎧 Gravação concluída','Você já pode ouvir aqui. O envio ainda precisa concluir para ficar salvo na loja.');
  return url;
}
function readableStorageError(error){
  const code=String(error?.code||'');
  if(code==='storage/unauthorized') return 'O Firebase Storage recusou o envio por permissão. Precisamos ajustar as regras do Storage.';
  if(code==='storage/unauthenticated') return 'Sua sessão não foi reconhecida pelo Storage. Entre novamente na conta e tente de novo.';
  if(code==='storage/quota-exceeded') return 'O Firebase Storage está indisponível por plano/cota. O Cloud Storage agora exige o plano Blaze.';
  if(code==='storage/bucket-not-found'||code==='storage/no-default-bucket') return 'O bucket do Firebase Storage não está disponível/configurado.';
  if(code==='storage/retry-limit-exceeded') return 'O Firebase Storage demorou demais para responder. O envio foi interrompido.';
  if(code==='storage/canceled') return 'O envio demorou demais e foi interrompido.';
  return 'Não foi possível salvar o áudio no Firebase Storage'+(code?` (${code})`:'')+'.';
}
async function uploadWithTimeout(blob,fileName,section){
  const uid=currentUid();
  const status=statusEl(section);
  const hidden=hiddenUrl(section);
  if(hidden) hidden.value='';
  if(!uid){if(status)status.textContent='❌ Entre novamente na conta para enviar.';notify('Entre novamente na conta para enviar o áudio.');return''}
  if(!blob||!blob.size){if(status)status.textContent='❌ A gravação ficou vazia.';return''}
  if(blob.size>8*1024*1024){if(status)status.textContent='❌ Áudio maior que 8 MB.';notify('Use um áudio de até 8 MB.');return''}
  try{
    const storage=await loadStorage();
    try{storage.setMaxUploadRetryTime?.(15000)}catch(e){}
    const ext=(String(fileName||'audio.webm').split('.').pop()||'webm').replace(/[^a-z0-9]/ig,'').slice(0,8)||'webm';
    const ref=storage.ref().child(`seller-audio/${uid}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`);
    if(status)status.textContent='Enviando áudio... 0%';
    const task=ref.put(blob,{contentType:blob.type||'audio/webm'});
    const snap=await new Promise((resolve,reject)=>{
      let finished=false;
      const timer=setTimeout(()=>{
        if(finished)return; finished=true;
        try{task.cancel()}catch(e){}
        const err=new Error('Tempo limite do upload');err.code='storage/retry-limit-exceeded';reject(err);
      },20000);
      task.on('state_changed',snapshot=>{
        const pct=snapshot.totalBytes?Math.round(snapshot.bytesTransferred/snapshot.totalBytes*100):0;
        if(status)status.textContent=`Enviando áudio... ${pct}%`;
      },error=>{
        if(finished)return;finished=true;clearTimeout(timer);reject(error);
      },()=>{
        if(finished)return;finished=true;clearTimeout(timer);resolve(task.snapshot);
      });
    });
    const url=await snap.ref.getDownloadURL();
    if(hidden)hidden.value=url;
    if(modeEl(section)?.value==='off')modeEl(section).value='record';
    if(status)status.textContent='✅ Áudio salvo — agora clique em Salvar/Publicar a loja.';
    setPreview(section,url,'✅ Áudio salvo','Ouça para conferir. Agora clique em Salvar/Publicar a loja para o cliente receber este áudio.');
    try{if(typeof debounce==='function')debounce()}catch(e){}
    notify('Áudio salvo com sucesso!');
    return url;
  }catch(error){
    console.error('seller audio upload fixed',error);
    const msg=readableStorageError(error);
    if(status)status.textContent='❌ '+msg;
    const box=previewBox(section);if(box){box.style.display='block';const note=box.querySelector('.seller-audio-preview-note');if(note)note.textContent='A gravação ficou disponível apenas para você ouvir agora, mas ainda NÃO foi salva na loja.';}
    notify(msg);
    return'';
  }
}
async function startRecording(button,section){
  if(activeRecord){
    if(activeRecord.button===button){try{activeRecord.rec.stop()}catch(e){};return}
    notify('Finalize a gravação atual antes de gravar outro produto.');return;
  }
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){notify('Este navegador não permite gravação de áudio.');return}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const options={};
    try{if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))options.mimeType='audio/webm;codecs=opus'}catch(e){}
    const rec=new MediaRecorder(stream,options),parts=[];
    rec.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data)};
    rec.onstop=async()=>{
      clearTimeout(activeRecord?.timer);
      stream.getTracks().forEach(t=>t.stop());
      activeRecord=null;
      button.textContent='🎙️ Começar gravação';button.classList.add('success');
      const blob=new Blob(parts,{type:rec.mimeType||'audio/webm'});
      const mode=modeEl(section);if(mode)mode.value='record';
      section.querySelectorAll('[data-audio-pane]').forEach(p=>p.style.display=p.dataset.audioPane==='record'?'block':'none');
      setLocalPreview(section,blob);
      const st=statusEl(section);if(st)st.textContent='✅ Gravação concluída. Preparando envio...';
      await uploadWithTimeout(blob,'gravacao.webm',section);
    };
    rec.start(500);
    button.textContent='⏹️ Parar gravação';button.classList.remove('success');
    const st=statusEl(section);if(st)st.textContent='🔴 Gravando... toque para parar';
    activeRecord={rec,button,section,timer:setTimeout(()=>{try{rec.stop()}catch(e){}},60000)};
  }catch(error){console.error(error);notify('Não foi possível acessar o microfone. Confira a permissão do navegador.')}
}
function bind(section){
  if(!section||section.dataset.uploadFixBound==='1')return;
  section.dataset.uploadFixBound='1';
  const record=section.querySelector('.seller-audio-record');
  if(record)record.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();
    startRecording(record,section);
  },true);
  const file=section.querySelector('.seller-audio-file');
  if(file)file.addEventListener('change',event=>{
    event.stopImmediatePropagation();event.stopPropagation();
    const f=file.files&&file.files[0];if(!f)return;
    const mode=modeEl(section);if(mode)mode.value='upload';
    section.querySelectorAll('[data-audio-pane]').forEach(p=>p.style.display=p.dataset.audioPane==='upload'?'block':'none');
    setLocalPreview(section,f);
    uploadWithTimeout(f,f.name,section);
  },true);
}
function scan(){document.querySelectorAll('.seller-audio-editor').forEach(bind)}
let ticks=0;const timer=setInterval(()=>{scan();if(++ticks>1200)clearInterval(timer)},300);
scan();
})();