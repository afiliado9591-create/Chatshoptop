(function(){
'use strict';

const byId=id=>document.getElementById(id);
const safe=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const notify=m=>{try{if(typeof toast==='function')return toast(m)}catch(e){} alert(m)};
let hydratedKey='';
let hydrating=false;

function adminAllowed(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function getDb(){try{return typeof db!=='undefined'?db:null}catch(e){return null}}
function getCollection(){try{return typeof COLECAO!=='undefined'?COLECAO:'chatshops'}catch(e){return'chatshops'}}

async function showAdminStoresFixed(){
  if(!adminAllowed())return;
  const database=getDb();
  const box=byId('adminConteudo');
  if(!box)return;
  if(!database){box.innerHTML='<p class="empty-hint">O banco de dados ainda não carregou. Feche e abra o Admin novamente.</p>';return}
  box.innerHTML='<p class="empty-hint">Carregando lojas...</p>';
  try{
    const [storesSnap,usersSnap]=await Promise.all([
      database.collection(getCollection()).limit(300).get(),
      database.collection('users').limit(300).get()
    ]);
    const emails={};
    usersSnap.docs.forEach(d=>{emails[d.id]=d.data().email||''});
    const stores=storesSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.brand||a.slug||a.id).localeCompare(String(b.brand||b.slug||b.id),'pt-BR'));
    box.innerHTML='<div style="margin-bottom:12px"><h3 style="margin:0 0 4px">🏪 Lojas dos lojistas e afiliados</h3><small style="color:var(--muted)">Abra a loja e pause somente a função que desejar.</small></div><div id="adminStoresListFixed"></div>';
    const list=byId('adminStoresListFixed');
    if(!stores.length){list.innerHTML='<p class="empty-hint">Nenhuma loja encontrada.</p>';return}
    list.innerHTML=stores.map(s=>{
      const c=s.adminControl||{};
      const host=s.customDomain||`${s.slug||s.id}.alibr.com.br`;
      const url=`https://${host}/`;
      const email=emails[s.ownerUid]||'e-mail não encontrado';
      return `<div data-admin-store-fixed="${safe(s.id)}" style="border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:11px;background:#fff">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap">
          <div><b>${safe(s.brand||s.slug||s.id)}</b><div style="font-size:11px;color:var(--muted);margin-top:2px">${safe(email)} · ${safe(host)}</div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn admin-store-preview-fixed" data-url="${safe(url)}" style="padding:7px 9px">👁 Ver loja</button><a class="btn" href="${safe(url)}" target="_blank" rel="noopener" style="padding:7px 9px;text-decoration:none">↗ Abrir</a></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:8px;margin-top:12px;font-size:12px">
          <label><input type="checkbox" data-ctrl="storePaused" ${c.storePaused?'checked':''}> ⏸️ Pausar loja inteira</label>
          <label><input type="checkbox" data-ctrl="sellerAudioPaused" ${c.sellerAudioPaused?'checked':''}> 🔊 Pausar vendedor em áudio</label>
          <label><input type="checkbox" data-ctrl="chatPaused" ${c.chatPaused?'checked':''}> 💬 Pausar chat</label>
          <label><input type="checkbox" data-ctrl="voicePaused" ${c.voicePaused?'checked':''}> 🎙️ Pausar conversa por voz</label>
          <label><input type="checkbox" data-ctrl="buyPaused" ${c.buyPaused?'checked':''}> 🛒 Pausar botões de compra</label>
          <label><input type="checkbox" data-ctrl="productsPaused" ${c.productsPaused?'checked':''}> 📦 Pausar catálogo/produtos</label>
        </div>
        <button type="button" class="btn primary admin-store-save-fixed" style="margin-top:11px;padding:8px 11px">💾 Salvar controles</button>
        <div class="admin-store-frame-fixed" style="display:none;margin-top:11px;border-top:1px solid #eee;padding-top:10px"><iframe title="Prévia da loja" src="about:blank" style="width:100%;height:620px;border:1px solid #ddd;border-radius:12px;background:#fff"></iframe></div>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-admin-store-fixed]').forEach(card=>{
      const preview=card.querySelector('.admin-store-preview-fixed');
      preview.onclick=()=>{
        const wrap=card.querySelector('.admin-store-frame-fixed');
        const frame=wrap.querySelector('iframe');
        if(wrap.style.display==='none'){
          frame.src=preview.dataset.url;
          wrap.style.display='block';
          preview.textContent='✖ Fechar prévia';
          setTimeout(()=>wrap.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
        }else{
          wrap.style.display='none';frame.src='about:blank';preview.textContent='👁 Ver loja';
        }
      };
      const save=card.querySelector('.admin-store-save-fixed');
      save.onclick=async()=>{
        save.disabled=true;save.textContent='Salvando...';
        const ctrl={};card.querySelectorAll('[data-ctrl]').forEach(x=>ctrl[x.dataset.ctrl]=x.checked);
        try{
          await database.collection(getCollection()).doc(card.dataset.adminStoreFixed).set({adminControl:ctrl,adminControlUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
          notify('Controles da loja salvos!');
        }catch(e){console.error('admin store controls',e);notify('Não foi possível salvar os controles. Confira as regras do Firestore.');}
        finally{save.disabled=false;save.textContent='💾 Salvar controles';}
      };
    });
  }catch(e){
    console.error('admin stores fixed',e);
    box.innerHTML='<p class="empty-hint">Não foi possível carregar as lojas. Confira as regras do Firestore.</p>';
  }
}

function bindAdminButton(){
  const btn=byId('adminTabLojas');
  if(!btn||!adminAllowed())return;
  if(btn.dataset.storeFix==='1')return;
  btn.dataset.storeFix='1';
  btn.onclick=showAdminStoresFixed;
}

function ensureAudioPreview(section){
  if(!section)return;
  let help=section.querySelector('.seller-audio-help-fixed');
  if(!help){
    help=document.createElement('div');
    help.className='seller-audio-help-fixed';
    help.style.cssText='margin-top:9px;padding:9px;border-radius:9px;background:#fff;border:1px solid #dcfce7;font-size:11px;line-height:1.45;color:#166534';
    help.innerHTML='<b>Onde aparece?</b> Depois de salvar/publicar a loja, o cliente verá o botão verde <b>🔊 Detalhes do produto</b> sobre a foto do produto.';
    section.appendChild(help);
  }
  let preview=section.querySelector('.seller-audio-preview-fixed');
  if(!preview){
    preview=document.createElement('div');
    preview.className='seller-audio-preview-fixed';
    preview.style.cssText='display:none;margin-top:9px;padding:9px;border-radius:9px;background:#fff;border:1px solid #bbf7d0';
    preview.innerHTML='<div style="font-size:12px;font-weight:900;color:#15803d;margin-bottom:6px">✅ Áudio gravado/enviado</div><audio controls preload="metadata" style="width:100%;height:38px"></audio><div style="font-size:10px;color:#6b7280;margin-top:5px">Ouça aqui para conferir. Depois clique em Salvar/Publicar a loja para o áudio aparecer para o cliente.</div>';
    section.appendChild(preview);
  }
  const hidden=section.querySelector('[data-seller-audio-url]');
  const mode=section.querySelector('[data-seller-audio-mode]');
  const url=hidden?.value.trim()||'';
  const audio=preview.querySelector('audio');
  if(url&&(mode?.value==='record'||mode?.value==='upload')){
    if(audio.src!==url)audio.src=url;
    preview.style.display='block';
    const status=section.querySelector('.seller-audio-status');
    if(status&&!/Erro|Gravando|Enviando/i.test(status.textContent||''))status.textContent='✅ Áudio pronto — agora salve/publique a loja.';
  }else{
    preview.style.display='none';
    if(audio.hasAttribute('src')){audio.pause();audio.removeAttribute('src');}
  }
}

function enhanceAudioEditors(){
  document.querySelectorAll('.seller-audio-editor').forEach(ensureAudioPreview);
}

async function hydrateAudioFixed(){
  const database=getDb();
  if(!database||hydrating)return;
  let slug='';
  try{slug=typeof mySlug!=='undefined'?String(mySlug||''):''}catch(e){slug=''}
  const cards=[...document.querySelectorAll('#products .product')];
  if(!slug||!cards.length)return;
  const key=slug+'|'+cards.length;
  if(key===hydratedKey)return;
  hydrating=true;
  try{
    const snap=await database.collection(getCollection()).doc(slug).get();
    if(!snap.exists){hydratedKey=key;return}
    const ps=Array.isArray(snap.data().products)?snap.data().products:[];
    cards.forEach((card,i)=>{
      const p=ps[i]||{};
      const section=card.querySelector('.seller-audio-editor');
      if(!section)return;
      const mode=section.querySelector('[data-seller-audio-mode]');
      const text=section.querySelector('[data-seller-audio-text]');
      const url=section.querySelector('[data-seller-audio-url]');
      if(mode&&!mode.dataset.userChanged){mode.value=['tts','upload','record'].includes(p.sellerAudioMode)?p.sellerAudioMode:'off';}
      if(text&&!text.value)text.value=p.sellerAudioText||'';
      if(url&&!url.value)url.value=p.sellerAudioUrl||'';
      section.querySelectorAll('[data-audio-pane]').forEach(pane=>pane.style.display=pane.dataset.audioPane===(mode?.value||'off')?'block':'none');
      ensureAudioPreview(section);
    });
    hydratedKey=key;
  }catch(e){console.warn('hydrate audio fix',e)}finally{hydrating=false}
}

function markUserAudioChanges(){
  document.querySelectorAll('.seller-audio-editor [data-seller-audio-mode]').forEach(mode=>{
    if(mode.dataset.changeFix==='1')return;
    mode.dataset.changeFix='1';
    mode.addEventListener('change',()=>{mode.dataset.userChanged='1'});
  });
}

let ticks=0;
const timer=setInterval(()=>{
  ticks++;
  bindAdminButton();
  enhanceAudioEditors();
  markUserAudioChanges();
  hydrateAudioFixed();
  if(ticks>1200)clearInterval(timer);
},500);

})();