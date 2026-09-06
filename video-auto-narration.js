/* ChatShop — narração automática por imagem. Preserva o gerador original. */
(function(){
'use strict';
if(window.__CHATSHOP_VIDEO_AUTO_NARRATION__)return;
window.__CHATSHOP_VIDEO_AUTO_NARRATION__=true;
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let imageTexts=[];
let ttsReadyPromise=null;

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function previewText(text,max=105){const s=String(text||'').trim().replace(/\s+/g,' ');return s.length>max?s.slice(0,max).trimEnd()+'…':s}
function removeTtsScript(){document.querySelectorAll('script[data-auto-tts]').forEach(s=>s.remove())}
function loadScript(src,timeout=18000){return new Promise((resolve,reject)=>{
  if(window.meSpeak)return resolve();
  removeTtsScript();
  const s=document.createElement('script');s.src=src;s.async=true;s.dataset.autoTts='1';
  const timer=setTimeout(()=>{s.remove();reject(new Error('tempo esgotado ao carregar o motor de voz'))},timeout);
  s.onload=()=>{clearTimeout(timer);window.meSpeak?resolve():reject(new Error('motor de voz carregou incompleto'))};
  s.onerror=()=>{clearTimeout(timer);s.remove();reject(new Error('falha ao baixar o motor de voz'))};
  document.head.appendChild(s);
})}
function waitUntil(test,timeout=25000){return new Promise((resolve,reject)=>{const start=Date.now();const tick=()=>{try{if(test())return resolve(true)}catch(e){}if(Date.now()-start>=timeout)return reject(new Error('tempo esgotado'));setTimeout(tick,120)};tick()})}
async function loadData(base){
  if(!window.meSpeak)throw new Error('Motor de voz não carregou.');
  let configError='',voiceError='';
  try{meSpeak.loadConfig(base+'mespeak_config.json',(ok,msg)=>{if(ok===false)configError=String(msg||'erro de configuração')})}catch(e){configError=e.message||String(e)}
  try{await waitUntil(()=>meSpeak.isConfigLoaded&&meSpeak.isConfigLoaded(),22000)}catch(e){throw new Error('Configuração da voz não carregou'+(configError?': '+configError:''))}
  try{meSpeak.loadVoice(base+'voices/pt.json',(ok,msg)=>{if(ok===false)voiceError=String(msg||'erro de voz')})}catch(e){voiceError=e.message||String(e)}
  try{await waitUntil(()=>meSpeak.isVoiceLoaded&&meSpeak.isVoiceLoaded('pt'),30000)}catch(e){throw new Error('Voz em português não carregou'+(voiceError?': '+voiceError:''))}
  try{meSpeak.setDefaultVoice&&meSpeak.setDefaultVoice('pt')}catch(e){}
  return true;
}
async function ensureTts(){
  if(window.meSpeak&&meSpeak.isConfigLoaded?.()&&meSpeak.isVoiceLoaded?.('pt'))return true;
  if(ttsReadyPromise)return ttsReadyPromise;
  const sources=[
    {script:'https://cdn.jsdelivr.net/npm/mespeak@2.0.2/mespeak.js',base:'https://cdn.jsdelivr.net/npm/mespeak@2.0.2/'},
    {script:'https://unpkg.com/mespeak@2.0.2/mespeak.js',base:'https://unpkg.com/mespeak@2.0.2/'},
    {script:'https://cdn.jsdelivr.net/gh/btopro/mespeak@master/mespeak.js',base:'https://cdn.jsdelivr.net/gh/btopro/mespeak@master/'}
  ];
  ttsReadyPromise=(async()=>{
    let lastError=null;
    for(const src of sources){
      try{
        if(!window.meSpeak)await loadScript(src.script);
        await loadData(src.base);
        return true;
      }catch(e){lastError=e;console.warn('Tentativa de voz automática falhou:',src.base,e);try{window.meSpeak=null}catch(x){}removeTtsScript()}
    }
    throw new Error('Não consegui carregar a voz automática neste aparelho. Verifique a internet e tente novamente. '+(lastError?.message||''));
  })().catch(e=>{ttsReadyPromise=null;throw e});
  return ttsReadyPromise;
}
function synth(text){
  const clean=String(text||'').trim();if(!clean)return null;
  const raw=meSpeak.speak(clean,{voice:'pt',variant:'f2',speed:Number($('autoVoiceSpeed')?.value||165),pitch:Number($('autoVoicePitch')?.value||48),amplitude:100,rawdata:true});
  if(!raw||!(raw.byteLength||raw.length))throw new Error('Não foi possível criar a narração deste texto.');
  if(raw instanceof Uint8Array)return raw;
  if(raw instanceof ArrayBuffer)return new Uint8Array(raw);
  return new Uint8Array(raw);
}
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
  const card=document.createElement('div');card.className='card';card.id='autoNarrationCard';card.innerHTML=`<div class="section-title">✨ Narração automática por imagem</div><div class="notice" style="margin-bottom:10px">Esta opção é adicional. A gravação pelo microfone e todas as opções antigas continuam funcionando normalmente.</div><div id="autoImageTexts"></div><div class="grid2"><div><label>Velocidade da voz</label><input id="autoVoiceSpeed" type="range" min="120" max="220" value="165"><div class="box">Mais à esquerda = voz mais lenta.</div></div><div><label>Tom da voz</label><input id="autoVoicePitch" type="range" min="25" max="75" value="48"><div class="box">Ajusta o tom da voz sintetizada.</div></div></div><label style="display:flex;gap:8px;align-items:center;font-weight:800"><input id="autoShowText" type="checkbox" checked style="width:auto"> Mostrar um trecho do texto sobre cada imagem</label><button id="generateAuto" type="button" style="margin-top:12px">✨ Gerar vídeo com narração automática</button><div id="autoStatus" class="status"></div>`;
  productCard.insertAdjacentElement('afterend',card);
  const style=document.createElement('style');style.textContent='.auto-image-row{display:grid;grid-template-columns:92px 1fr;gap:10px;align-items:start;padding:10px 0;border-top:1px solid #e5e7eb}.auto-image-row:first-child{border-top:0}.auto-image-row img{width:92px;height:92px;object-fit:cover;border-radius:10px}.auto-image-row textarea{min-height:78px}.auto-image-row small{display:block;color:#6b7280;margin-top:4px;line-height:1.35}.auto-empty{padding:12px;border:1px dashed #cbd5e1;border-radius:10px;color:#6b7280;background:#f8fafc}@media(max-width:520px){.auto-image-row{grid-template-columns:72px 1fr}.auto-image-row img{width:72px;height:72px}}';document.head.appendChild(style);
  $('images').addEventListener('change',()=>{imageTexts=[];setTimeout(renderImageTexts,0)});
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
  if($('autoShowText')?.checked&&text){ctx.font='bold 36px Arial';wrap(ctx,previewText(text),610).slice(0,3).forEach((x,i)=>ctx.fillText(x,360,940+i*47))}
  const price=String($('price')?.value||'').trim();if(price){ctx.font='bold 56px Arial';const w=Math.min(620,ctx.measureText(price).width+70);ctx.fillStyle='#fffffff0';ctx.fillRect((720-w)/2,1155,w,82);ctx.fillStyle='#111';ctx.fillText(price,360,1212)}
}
async function decode(ac,source,label){if(!source)return null;let arr;if(source instanceof Blob)arr=await source.arrayBuffer();else if(source instanceof Uint8Array)arr=source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength);else if(source instanceof ArrayBuffer)arr=source;else{const r=await fetch(source,{cache:'no-store'});if(!r.ok)throw new Error(label+' não encontrado.');arr=await r.arrayBuffer()}return ac.decodeAudioData(arr.slice(0))}
function mime(){for(const m of ['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm'])if(MediaRecorder.isTypeSupported(m))return m;return''}
async function generateAutoVideo(){
  const files=[...($('images')?.files||[])];if(!files.length)return alert('Escolha pelo menos uma imagem.');
  const texts=files.map((_,i)=>String(imageTexts[i]||'').trim());if(!texts.some(Boolean))return alert('Escreva o texto de pelo menos uma imagem para a narração automática.');
  if(!HTMLCanvasElement.prototype.captureStream||!window.MediaRecorder){$('autoStatus').textContent='Use o Chrome atualizado para gerar o vídeo.';$('autoStatus').className='status err';return}
  const btn=$('generateAuto');btn.disabled=true;$('download')?.classList.add('hidden');if($('preview'))$('preview').style.display='none';$('autoStatus').textContent='Preparando voz automática... Na primeira vez pode levar alguns segundos.';$('autoStatus').className='status';
  let ac,musicSourceNode;const voiceNodes=[];
  try{
    await ensureTts();
    $('autoStatus').textContent='Criando a narração e montando o vídeo...';
    const imgs=await Promise.all(files.map(loadImg));
    const wavs=texts.map(t=>t?synth(t):null);
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
    rec.onstop=async()=>{try{musicSourceNode?.stop()}catch(e){}voiceNodes.forEach(n=>{try{n.stop()}catch(e){}});const blob=new Blob(chunks,{type:mt}),url=URL.createObjectURL(blob);if($('preview')){$('preview').src=url;$('preview').style.display='block'}if($('download')){$('download').href=url;$('download').classList.remove('hidden')}$('autoStatus').textContent='✓ Vídeo pronto. A voz automática foi gravada dentro do vídeo. Salve no aparelho.';$('autoStatus').className='status ok';btn.disabled=false;try{await ac.close()}catch(e){}};
    drawFrame(ctx,imgs[0],0,slots[0],texts[0]);rec.start(250);await sleep(120);const start=performance.now();const boundaries=[];let sum=0;for(const s of slots){sum+=s;boundaries.push(sum)}
    function anim(now){const elapsed=(now-start)/1000;let idx=boundaries.findIndex(x=>elapsed<x);if(idx<0)idx=imgs.length-1;const before=idx?boundaries[idx-1]:0;drawFrame(ctx,imgs[idx],elapsed-before,slots[idx],texts[idx]);if(elapsed<total)requestAnimationFrame(anim);else setTimeout(()=>rec.stop(),420)}requestAnimationFrame(anim);
  }catch(e){console.error(e);$('autoStatus').textContent='Erro na narração automática: '+(e.message||e);$('autoStatus').className='status err';btn.disabled=false;try{musicSourceNode?.stop()}catch(x){}voiceNodes.forEach(n=>{try{n.stop()}catch(x){}});try{await ac?.close()}catch(x){}}
}
function boot(){let tries=0;const t=setInterval(()=>{tries++;if($('images')&&$('generate')){clearInterval(t);installUi()}else if(tries>80)clearInterval(t)},100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
