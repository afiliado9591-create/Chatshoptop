/* ChatShop — narração automática neural por imagem, 100% no navegador. Preserva o gerador original. */
(function(){
'use strict';
if(window.__CHATSHOP_VIDEO_AUTO_NARRATION__)return;
window.__CHATSHOP_VIDEO_AUTO_NARRATION__=true;
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let imageTexts=[];
const piperPromises={};
const VOICES={
  faber:{label:'Brasileira 1 — Faber',download:'cerca de 30 MB'},
  cadu:{label:'Brasileira 2 — Cadu',download:'cerca de 75 MB',urlModelo:'https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/cadu/medium/pt_BR-cadu-medium.onnx?download=true',urlConfig:'https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/cadu/medium/pt_BR-cadu-medium.onnx.json?download=true'}
};

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function selectedVoice(){const key=$('autoVoiceModel')?.value||'faber';return VOICES[key]?key:'faber'}
async function ensureTts(voiceKey=selectedVoice()){
  if(piperPromises[voiceKey])return piperPromises[voiceKey];
  const status=$('autoStatus'),voice=VOICES[voiceKey]||VOICES.faber;
  piperPromises[voiceKey]=(async()=>{
    if(status){status.textContent=`Carregando ${voice.label} pela primeira vez…`;status.className='status'}
    let mod;
    try{mod=await import('https://esm.sh/@pedrobef/vozz@0.2.7/piper?bundle')}
    catch(e){throw new Error('Não foi possível carregar o motor de voz neural. Verifique a internet e tente novamente.')}
    if(!mod?.Piper)throw new Error('Motor de voz neural indisponível neste navegador.');
    const opts={
      dispositivo:'wasm',threads:1,
      aoProgredir:p=>{
        if(!status||p?.status!=='baixando')return;
        const pct=Number.isFinite(Number(p.progresso))?Math.round(Number(p.progresso)*100):0;
        status.textContent=`Baixando ${voice.label}… ${pct}%\nIsso acontece só no primeiro uso desta voz; depois ela fica em cache no aparelho.`;
      }
    };
    if(voice.urlModelo){opts.urlModelo=voice.urlModelo;opts.urlConfig=voice.urlConfig}
    return mod.Piper.carregar(opts);
  })().catch(e=>{delete piperPromises[voiceKey];throw e});
  return piperPromises[voiceKey];
}
async function synth(text,voiceKey=selectedVoice()){
  const clean=String(text||'').trim();if(!clean)return null;
  const tts=await ensureTts(voiceKey);
  const velocidade=Math.max(.65,Math.min(1.45,Number($('autoVoiceSpeed')?.value||165)/165));
  const expressividade=Math.max(.45,Math.min(.95,Number($('autoVoicePitch')?.value||48)/70));
  const audio=await tts.falar(clean,{velocidade,ruido:expressividade,maxFonemas:220});
  let wav=null;
  if(audio&&typeof audio.paraWav==='function')wav=audio.paraWav();
  else if(audio&&typeof audio.paraBlob==='function')wav=audio.paraBlob();
  if(!wav)throw new Error('A voz neural foi criada, mas o áudio não pôde ser preparado para o vídeo.');
  if(wav instanceof Blob)return new Uint8Array(await wav.arrayBuffer());
  if(wav instanceof ArrayBuffer)return new Uint8Array(wav);
  if(ArrayBuffer.isView(wav))return new Uint8Array(wav.buffer,wav.byteOffset,wav.byteLength);
  throw new Error('Formato de áudio da voz neural não reconhecido.');
}
function previewText(text,max=105){const s=String(text||'').trim().replace(/\s+/g,' ');return s.length>max?s.slice(0,max).trimEnd()+'…':s}
function renderImageTexts(){
  const files=[...($('images')?.files||[])],box=$('autoImageTexts');if(!box)return;
  if(!files.length){box.innerHTML='<div class="auto-empty">Escolha as imagens acima. Depois aparecerá um campo de texto para cada imagem.</div>';return}
  imageTexts=imageTexts.slice(0,files.length);while(imageTexts.length<files.length)imageTexts.push('');
  box.innerHTML=files.map((f,i)=>`<div class="auto-image-row"><img src="${URL.createObjectURL(f)}" alt="Imagem ${i+1}"><div><label>Texto da imagem ${i+1} — será narrado inteiro</label><textarea data-auto-text="${i}" maxlength="700" placeholder="Ex.: Esse vestido tem tecido leve, ótimo caimento e está disponível do P ao GG.">${esc(imageTexts[i])}</textarea><small>No vídeo aparece só um trecho. A voz lê o texto completo.</small></div></div>`).join('');
  box.querySelectorAll('[data-auto-text]').forEach(t=>t.addEventListener('input',()=>{imageTexts[Number(t.dataset.autoText)]=t.value}));
}
function installUi(){
  if($('autoNarrationCard'))return;
  const productCard=$('images')?.closest('.card');if(!productCard)return;
  const card=document.createElement('div');card.className='card';card.id='autoNarrationCard';card.innerHTML=`<div class="section-title">✨ Narração automática por imagem</div><div class="notice" style="margin-bottom:10px">Vozes neurais brasileiras naturais. Esta opção é adicional: microfone, arquivo de narração e todas as opções antigas continuam funcionando.</div><div id="autoImageTexts"></div><label>Escolher voz brasileira</label><select id="autoVoiceModel"><option value="faber">Brasileira 1 — Faber</option><option value="cadu">Brasileira 2 — Cadu</option></select><div id="autoVoiceInfo" class="box">Faber: voz neural brasileira atual. No primeiro uso baixa cerca de 30 MB.</div><div class="grid2"><div><label>Velocidade da voz</label><input id="autoVoiceSpeed" type="range" min="120" max="220" value="165"><div class="box">Mais à esquerda = voz mais lenta.</div></div><div><label>Expressividade da voz</label><input id="autoVoicePitch" type="range" min="25" max="75" value="48"><div class="box">Ajusta a variação natural da voz.</div></div></div><label style="display:flex;gap:8px;align-items:center;font-weight:800"><input id="autoShowText" type="checkbox" checked style="width:auto"> Mostrar um trecho do texto sobre cada imagem</label><button id="generateAuto" type="button" style="margin-top:12px">✨ Gerar vídeo com narração automática</button><div class="box" style="margin-top:10px">Cada voz é um modelo diferente. A primeira vez que você usar uma voz nova, o modelo será baixado; depois fica armazenado no aparelho.</div><div id="autoStatus" class="status"></div>`;
  productCard.insertAdjacentElement('afterend',card);
  const style=document.createElement('style');style.textContent='.auto-image-row{display:grid;grid-template-columns:92px 1fr;gap:10px;align-items:start;padding:10px 0;border-top:1px solid #e5e7eb}.auto-image-row:first-child{border-top:0}.auto-image-row img{width:92px;height:92px;object-fit:cover;border-radius:10px}.auto-image-row textarea{min-height:78px}.auto-image-row small{display:block;color:#6b7280;margin-top:4px;line-height:1.35}.auto-empty{padding:12px;border:1px dashed #cbd5e1;border-radius:10px;color:#6b7280;background:#f8fafc}@media(max-width:520px){.auto-image-row{grid-template-columns:72px 1fr}.auto-image-row img{width:72px;height:72px}}';document.head.appendChild(style);
  $('images').addEventListener('change',()=>{imageTexts=[];setTimeout(renderImageTexts,0)});
  $('autoVoiceModel').addEventListener('change',()=>{const k=selectedVoice(),v=VOICES[k];$('autoVoiceInfo').textContent=`${v.label}: modelo brasileiro diferente. No primeiro uso baixa ${v.download}.`;$('autoStatus').textContent=''});
  $('generateAuto').onclick=generateAutoVideo;
  renderImageTexts();
}
function loadImg(file){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=URL.createObjectURL(file)})}
function cover(ctx,img,z){const ir=img.width/img.height,cr=720/1280;let w,h;if(ir>cr){h=1280*z;w=h*ir}else{w=720*z;h=w/ir}ctx.drawImage(img,(720-w)/2,(1280-h)/2,w,h)}
function wrap(ctx,text,max){const words=String(text||'').trim().split(/\s+/),lines=[];let line='';for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>max&&line){lines.push(line);line=word}else line=test}if(line)lines.push(line);return lines}
function drawFrame(ctx,img,elapsed,slot,text){
  ctx.clearRect(0,0,720,1280);ctx.fillStyle='#000';ctx.fillRect(0,0,720,1280);
  if(img){cover(ctx,img,1+.07*(elapsed/Math.max(slot,.001)));const g=ctx.createLinearGradient(0,0,0,1280);g.addColorStop(0,'#0005');g.addColorStop(.55,'#0000');g.addColorStop(1,'#000d');ctx.fillStyle=g;ctx.fillRect(0,0,720,1280)}
  ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='bold 52px Arial';wrap(ctx,$('title')?.value||'',620).slice(0,3).forEach((x,i)=>ctx.fillText(x,360,110+i*62));
  if($('autoShowText')?.checked&&text){ctx.font='bold 36px Arial';const lines=wrap(ctx,previewText(text),610).slice(0,3);const y=940;lines.forEach((x,i)=>ctx.fillText(x,360,y+i*47))}
  const price=String($('price')?.value||'').trim();if(price){ctx.font='bold 56px Arial';const w=Math.min(620,ctx.measureText(price).width+70);ctx.fillStyle='#fffffff0';ctx.fillRect((720-w)/2,1155,w,82);ctx.fillStyle='#111';ctx.fillText(price,360,1212)}
}
async function decode(ac,source,label){if(!source)return null;let arr;if(source instanceof Blob)arr=await source.arrayBuffer();else if(source instanceof Uint8Array)arr=source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength);else{const r=await fetch(source,{cache:'no-store'});if(!r.ok)throw new Error(label+' não encontrado.');arr=await r.arrayBuffer()}return ac.decodeAudioData(arr.slice(0))}
function mime(){for(const m of ['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm'])if(MediaRecorder.isTypeSupported(m))return m;return''}
async function generateAutoVideo(){
  const files=[...($('images')?.files||[])];if(!files.length)return alert('Escolha pelo menos uma imagem.');
  const texts=files.map((_,i)=>String(imageTexts[i]||'').trim());if(!texts.some(Boolean))return alert('Escreva o texto de pelo menos uma imagem para a narração automática.');
  if(!HTMLCanvasElement.prototype.captureStream||!window.MediaRecorder){$('autoStatus').textContent='Use o Chrome atualizado para gerar o vídeo.';$('autoStatus').className='status err';return}
  const voiceKey=selectedVoice(),voice=VOICES[voiceKey];
  const btn=$('generateAuto');btn.disabled=true;$('download')?.classList.add('hidden');if($('preview'))$('preview').style.display='none';$('autoStatus').textContent=`Preparando ${voice.label}…`;$('autoStatus').className='status';
  let ac,musicSourceNode;const voiceNodes=[];
  try{
    await ensureTts(voiceKey);
    const imgs=await Promise.all(files.map(loadImg));
    const wavs=[];for(let i=0;i<texts.length;i++){if(texts[i]){$('autoStatus').textContent=`Criando narração com ${voice.label}: ${i+1} de ${texts.length}…`;wavs.push(await synth(texts[i],voiceKey))}else wavs.push(null)}
    const AC=window.AudioContext||window.webkitAudioContext;ac=new AC();await ac.resume();
    const voiceBuffers=[];for(let i=0;i<wavs.length;i++)voiceBuffers.push(wavs[i]?await decode(ac,wavs[i],'narração'):null);
    const slots=voiceBuffers.map(b=>Math.max(2.2,(b?.duration||1.6)+0.55));const total=slots.reduce((a,b)=>a+b,0);
    const dest=ac.createMediaStreamDestination();
    const ownMusic=$('ownMusic')?.files?.[0]||null;let musicBuffer=null;if(ownMusic)musicBuffer=await decode(ac,ownMusic,'música');
    if(musicBuffer){musicSourceNode=ac.createBufferSource();const gain=ac.createGain();gain.gain.value=Number($('musicVol')?.value||30)/100;musicSourceNode.buffer=musicBuffer;musicSourceNode.loop=true;musicSourceNode.connect(gain);gain.connect(dest)}
    const base=ac.currentTime+0.18;let offset=0;voiceBuffers.forEach((buffer,i)=>{if(buffer){const node=ac.createBufferSource(),gain=ac.createGain();gain.gain.value=Number($('voiceVol')?.value||100)/100;node.buffer=buffer;node.connect(gain);gain.connect(dest);node.start(base+offset+0.18);voiceNodes.push(node)}offset+=slots[i]});
    if(musicSourceNode)musicSourceNode.start(base);
    const canvas=$('canvas'),ctx=canvas.getContext('2d'),videoStream=canvas.captureStream(24),audioTracks=dest.stream.getAudioTracks(),combined=new MediaStream([...videoStream.getVideoTracks(),...audioTracks]),mt=mime();if(!mt)throw new Error('Formato de vídeo não suportado neste navegador.');if(audioTracks.length===0)throw new Error('O navegador não conseguiu criar a faixa de áudio.');
    const chunks=[],rec=new MediaRecorder(combined,{mimeType:mt,videoBitsPerSecond:3200000,audioBitsPerSecond:128000});
    rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    rec.onstop=async()=>{try{musicSourceNode?.stop()}catch(e){}voiceNodes.forEach(n=>{try{n.stop()}catch(e){}});const blob=new Blob(chunks,{type:mt}),url=URL.createObjectURL(blob);if($('preview')){$('preview').src=url;$('preview').style.display='block'}if($('download')){$('download').href=url;$('download').classList.remove('hidden')}$('autoStatus').textContent=`✓ Vídeo pronto. ${voice.label} foi gravada dentro do vídeo. Salve no aparelho.`;$('autoStatus').className='status ok';btn.disabled=false;try{await ac.close()}catch(e){}};
    drawFrame(ctx,imgs[0],0,slots[0],texts[0]);rec.start(250);await sleep(120);const start=performance.now();const boundaries=[];let sum=0;for(const s of slots){sum+=s;boundaries.push(sum)}
    function anim(now){const elapsed=(now-start)/1000;let idx=boundaries.findIndex(x=>elapsed<x);if(idx<0)idx=imgs.length-1;const before=idx?boundaries[idx-1]:0;drawFrame(ctx,imgs[idx],elapsed-before,slots[idx],texts[idx]);if(elapsed<total)requestAnimationFrame(anim);else setTimeout(()=>rec.stop(),420)}requestAnimationFrame(anim);
  }catch(e){console.error(e);$('autoStatus').textContent='Erro na narração automática: '+(e.message||e);$('autoStatus').className='status err';btn.disabled=false;try{musicSourceNode?.stop()}catch(x){}voiceNodes.forEach(n=>{try{n.stop()}catch(x){}});try{await ac?.close()}catch(x){}}
}
function boot(){let tries=0;const t=setInterval(()=>{tries++;if($('images')&&$('generate')){clearInterval(t);installUi()}else if(tries>80)clearInterval(t)},100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
