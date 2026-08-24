/* ChatShop — diretório de divulgadores, carregado somente após o login. */
(function(){
'use strict';

const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COLLECTION='divulgadores';
let profileImage='';
let currentPlan='aprendiz';

function dbRef(){try{return typeof db!=='undefined'&&db?db:null}catch(e){return null}}
function uid(){try{return typeof myUid!=='undefined'?myUid:''}catch(e){return''}}
function email(){try{return typeof currentUser!=='undefined'&&currentUser?.email?currentUser.email:''}catch(e){return''}}
function normalizePlan(value){
  const p=String(value||'aprendiz').toLowerCase();
  if(p.includes('prof'))return'profissional';
  if(p.includes('bas'))return'basico';
  return'aprendiz';
}
function paidPlan(){return currentPlan==='basico'||currentPlan==='profissional'}
function notify(message){try{if(typeof toast==='function')return toast(message)}catch(e){}alert(message)}
function openPlans(){try{if(typeof abrirPlanos==='function')return abrirPlanos()}catch(e){}try{window.abrirPlanos?.()}catch(e){}}
function onlyDigits(value){return String(value||'').replace(/\D/g,'')}
function whatsappLink(number,name){
  let n=onlyDigits(number);
  if(!n)return'';
  if(n.length===10||n.length===11)n='55'+n;
  const message='Olá, '+String(name||'')+'! Encontrei seu perfil de divulgador no ChatShop e quero conversar sobre divulgação.';
  return'https://wa.me/'+n+'?text='+encodeURIComponent(message);
}
function initials(name){return String(name||'D').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'D'}

function styles(){
  if($('#promoterDirectoryStyle'))return;
  const s=document.createElement('style');s.id='promoterDirectoryStyle';
  s.textContent=`
  .divulgador-modal{position:fixed;inset:0;z-index:110;display:none;align-items:center;justify-content:center;padding:14px}
  .divulgador-modal.open{display:flex}.divulgador-overlay{position:absolute;inset:0;background:#0009}
  .divulgador-box{position:relative;width:min(920px,100%);max-height:92dvh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 20px 60px #0004}
  .divulgador-close{position:absolute;right:12px;top:9px;border:0;background:none;font-size:28px;color:#6b7280;cursor:pointer}
  .divulgador-tabs{display:flex;gap:8px;margin:16px 0}.divulgador-tabs button{flex:1;border:1px solid #ddd;background:#fff;border-radius:10px;padding:10px;font-weight:800;cursor:pointer}
  .divulgador-tabs button.active{background:#ede9fe;border-color:#7c3aed;color:#5b21b6}
  .divulgador-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:12px}
  .divulgador-card{border:1px solid #e5e7eb;border-radius:14px;padding:14px;background:#fff;box-shadow:0 4px 14px #312e8110}
  .divulgador-avatar{width:70px;height:70px;border-radius:50%;object-fit:cover;background:#ede9fe;color:#5b21b6;display:grid;place-items:center;font-size:22px;font-weight:900;margin-bottom:9px}
  .divulgador-card h3{margin:0 0 3px;font-size:16px}.divulgador-card p{font-size:13px;color:#4b5563;line-height:1.45}.divulgador-meta{font-size:12px;color:#6b7280;margin:5px 0}
  .divulgador-contact{display:block;text-align:center;background:#25D366;color:#fff;text-decoration:none;border-radius:10px;padding:10px;font-weight:900;margin-top:10px}
  .divulgador-contact.disabled{background:#e5e7eb;color:#6b7280;pointer-events:none}
  .divulgador-form{display:grid;grid-template-columns:1fr 1fr;gap:10px}.divulgador-form .wide{grid-column:1/-1}
  .divulgador-photo-preview{width:92px;height:92px;border-radius:50%;object-fit:cover;background:#ede9fe;display:grid;place-items:center;color:#5b21b6;font-weight:900;font-size:25px}
  .divulgador-lock{border:1px solid #fbbf24;background:#fffbeb;color:#92400e;border-radius:12px;padding:14px;margin-bottom:14px}
  .divulgador-public-toggle{display:flex;gap:9px;align-items:flex-start;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px;padding:12px}
  @media(max-width:650px){.divulgador-box{padding:16px}.divulgador-form{grid-template-columns:1fr}.divulgador-form .wide{grid-column:auto}.divulgador-tabs{flex-direction:column}}
  `;
  document.head.appendChild(s);
}

function modalMarkup(){
  return `<div id="divulgadoresModal" class="divulgador-modal">
    <div class="divulgador-overlay" data-div-close></div>
    <section class="divulgador-box" role="dialog" aria-modal="true" aria-labelledby="divulgadorTitle">
      <button class="divulgador-close" type="button" data-div-close aria-label="Fechar">×</button>
      <h2 id="divulgadorTitle" style="margin:0 35px 4px 0">📣 Divulgadores</h2>
      <p style="margin:0;color:#6b7280;font-size:13px">Encontre pessoas para divulgar seu trabalho ou publique seu perfil profissional.</p>
      <div class="divulgador-tabs">
        <button type="button" class="active" data-div-tab="list">Encontrar divulgadores</button>
        <button type="button" data-div-tab="profile">Meu perfil de divulgador</button>
      </div>
      <div data-div-view="list"><div id="divulgadoresList"><p class="empty-hint">Carregando perfis...</p></div></div>
      <div data-div-view="profile" style="display:none">
        <div id="divulgadorPlanLock" class="divulgador-lock" style="display:none">
          <b>🔒 Recurso do Plano Básico</b>
          <p style="margin:6px 0 10px">Para publicar seu perfil de divulgador, assine o Plano Básico. Usuários Aprendiz podem visualizar os profissionais disponíveis.</p>
          <button class="btn primary" id="divulgadorUpgrade" type="button">Assinar Plano Básico — R$ 18/mês</button>
        </div>
        <div id="divulgadorFormWrap">
          <div class="divulgador-form">
            <div class="field wide"><label>Foto de perfil</label><div style="display:flex;gap:12px;align-items:center"><div id="divulgadorPhotoPreview" class="divulgador-photo-preview">📷</div><div><input id="divulgadorPhoto" type="file" accept="image/jpeg,image/png,image/webp"><small>A foto será reduzida automaticamente.</small></div></div></div>
            <div class="field"><label>Nome público</label><input id="divulgadorName" maxlength="80"></div>
            <div class="field"><label>Cidade e estado</label><input id="divulgadorLocation" maxlength="100" placeholder="Ex: São Paulo - SP"></div>
            <div class="field"><label>WhatsApp</label><input id="divulgadorWhatsapp" inputmode="tel" maxlength="20" placeholder="DDD + número"></div>
            <div class="field"><label>Nichos</label><input id="divulgadorNiches" maxlength="150" placeholder="Ex: moda, beleza, lojas"></div>
            <div class="field wide"><label>Redes sociais</label><input id="divulgadorSocial" maxlength="300" placeholder="Cole seus links ou nomes de usuário"></div>
            <div class="field wide"><label>Apresentação</label><textarea id="divulgadorBio" rows="3" maxlength="600" placeholder="Conte sobre seu público e seu trabalho"></textarea></div>
            <div class="field wide"><label>Serviços e valores</label><textarea id="divulgadorServices" rows="3" maxlength="600" placeholder="Ex: stories, vídeo, publicação. Valores ou a combinar."></textarea></div>
            <label class="divulgador-public-toggle wide"><input id="divulgadorEnabled" type="checkbox"><span><b>Publicar meu perfil na lista de divulgadores</b><small style="display:block;margin-top:4px;color:#4b5563">Ao ativar, os dados acima, inclusive WhatsApp e redes sociais, ficarão visíveis para usuários do ChatShop.</small></span></label>
          </div>
          <button class="btn primary" id="divulgadorSave" type="button" style="width:100%;margin-top:14px">Salvar perfil</button>
          <p style="font-size:11px;color:#6b7280;line-height:1.45">O ChatShop apenas aproxima as partes. Valores, pagamentos, prazos e entregas são combinados diretamente entre contratante e divulgador.</p>
        </div>
      </div>
    </section>
  </div>`;
}

function installButton(){
  const planBtn=$('#verPlanosBtn');
  if(!planBtn||$('#divulgadoresBtn'))return false;
  const b=document.createElement('button');b.className='btn';b.id='divulgadoresBtn';b.type='button';b.textContent='📣 Divulgadores';
  planBtn.parentElement.insertBefore(b,planBtn);
  b.onclick=openModal;
  return true;
}

function setPhoto(value,name){
  profileImage=String(value||'');
  const p=$('#divulgadorPhotoPreview');if(!p)return;
  p.innerHTML='';
  if(profileImage){const img=document.createElement('img');img.src=profileImage;img.alt='Foto de perfil';img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';p.appendChild(img)}
  else p.textContent=initials(name)||'📷';
}

function compressPhoto(file){
  return new Promise((resolve,reject)=>{
    if(!file)return resolve('');
    if(file.size>8*1024*1024)return reject(new Error('A imagem deve ter no máximo 8 MB.'));
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('Formato de imagem inválido.'));
      img.onload=()=>{
        const size=320,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
        const ctx=canvas.getContext('2d'),side=Math.min(img.width,img.height),sx=(img.width-side)/2,sy=(img.height-side)/2;
        ctx.drawImage(img,sx,sy,side,side,0,0,size,size);
        resolve(canvas.toDataURL('image/jpeg',.78));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function readPlan(){
  const d=dbRef(),id=uid();if(!d||!id)return'aprendiz';
  try{const snap=await d.collection('users').doc(id).get();return normalizePlan(snap.exists?snap.data()?.plan:'aprendiz')}catch(e){return normalizePlan(typeof myPlan!=='undefined'?myPlan:'aprendiz')}
}

function applyGate(){
  const paid=paidPlan();
  $('#divulgadorPlanLock').style.display=paid?'none':'block';
  const wrap=$('#divulgadorFormWrap');wrap.style.opacity=paid?'1':'.45';wrap.style.pointerEvents=paid?'auto':'none';
}

async function loadOwn(){
  const d=dbRef(),id=uid();if(!d||!id)return;
  currentPlan=await readPlan();applyGate();
  try{
    const snap=await d.collection(COLLECTION).doc(id).get(),p=snap.exists?(snap.data()||{}):{};
    $('#divulgadorName').value=p.name||'';
    $('#divulgadorLocation').value=p.location||'';
    $('#divulgadorWhatsapp').value=p.whatsapp||'';
    $('#divulgadorNiches').value=p.niches||'';
    $('#divulgadorSocial').value=p.social||'';
    $('#divulgadorBio').value=p.bio||'';
    $('#divulgadorServices').value=p.services||'';
    $('#divulgadorEnabled').checked=paid&&p.enabled===true;
    setPhoto(p.photo||'',p.name||'');
    if(!paid&&p.enabled===true){
      try{await d.collection(COLLECTION).doc(id).set({enabled:false,hiddenReason:'plan_required',updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})}catch(e){}
    }
  }catch(e){console.warn('Não foi possível carregar o perfil de divulgador',e)}
}

async function saveOwn(){
  if(!paidPlan()){openPlans();return}
  const d=dbRef(),id=uid();if(!d||!id)return;
  const name=$('#divulgadorName').value.trim(),whatsapp=onlyDigits($('#divulgadorWhatsapp').value);
  if(!name){notify('Informe o nome público.');return}
  if($('#divulgadorEnabled').checked&&!whatsapp){notify('Informe o WhatsApp antes de publicar o perfil.');return}
  const button=$('#divulgadorSave');button.disabled=true;button.textContent='Salvando...';
  try{
    await d.collection(COLLECTION).doc(id).set({
      ownerUid:id,ownerEmail:email(),name,photo:profileImage,
      location:$('#divulgadorLocation').value.trim(),
      whatsapp,niches:$('#divulgadorNiches').value.trim(),
      social:$('#divulgadorSocial').value.trim(),
      bio:$('#divulgadorBio').value.trim(),
      services:$('#divulgadorServices').value.trim(),
      enabled:$('#divulgadorEnabled').checked===true,
      eligiblePlan:currentPlan,updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true});
    notify('Perfil de divulgador salvo!');
    await loadList();
  }catch(e){console.error(e);notify('Não foi possível salvar. Verifique as permissões do Firebase.')}
  finally{button.disabled=false;button.textContent='Salvar perfil'}
}

function card(p){
  const link=whatsappLink(p.whatsapp,p.name),photo=p.photo?'<img class="divulgador-avatar" src="'+esc(p.photo)+'" alt="Foto de '+esc(p.name)+'">':'<div class="divulgador-avatar">'+esc(initials(p.name))+'</div>';
  return '<article class="divulgador-card">'+photo+'<h3>'+esc(p.name||'Divulgador')+'</h3>'+
    (p.location?'<div class="divulgador-meta">📍 '+esc(p.location)+'</div>':'')+
    (p.niches?'<div class="divulgador-meta">🏷️ '+esc(p.niches)+'</div>':'')+
    (p.bio?'<p>'+esc(p.bio)+'</p>':'')+
    (p.services?'<p><b>Serviços:</b> '+esc(p.services)+'</p>':'')+
    (p.social?'<div class="divulgador-meta">🌐 '+esc(p.social)+'</div>':'')+
    (link?'<a class="divulgador-contact" href="'+esc(link)+'" target="_blank" rel="noopener">💬 Falar com o divulgador</a>':'<span class="divulgador-contact disabled">Contato indisponível</span>')+
    '</article>';
}

async function loadList(){
  const box=$('#divulgadoresList'),d=dbRef();if(!box||!d)return;
  box.innerHTML='<p class="empty-hint">Carregando perfis...</p>';
  try{
    const snap=await d.collection(COLLECTION).where('enabled','==',true).limit(100).get();
    const rows=snap.docs.map(x=>x.data()||{}).filter(p=>['basico','profissional'].includes(normalizePlan(p.eligiblePlan)));
    rows.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
    box.innerHTML=rows.length?'<div class="divulgador-grid">'+rows.map(card).join('')+'</div>':'<p class="empty-hint">Ainda não há divulgadores publicados.</p>';
  }catch(e){console.error(e);box.innerHTML='<div class="divulgador-lock"><b>Não foi possível abrir os divulgadores.</b><br><small>É necessário permitir a leitura da coleção divulgadores nas regras do Firebase.</small></div>'}
}

function selectTab(tab){
  $$('[data-div-tab]').forEach(b=>b.classList.toggle('active',b.dataset.divTab===tab));
  $$('[data-div-view]').forEach(v=>v.style.display=v.dataset.divView===tab?'block':'none');
  if(tab==='profile')loadOwn();else loadList();
}
function openModal(){
  const m=$('#divulgadoresModal');if(!m)return;
  m.classList.add('open');selectTab('list');
}
function closeModal(){$('#divulgadoresModal')?.classList.remove('open')}

function bind(){
  const m=$('#divulgadoresModal');if(!m||m.dataset.bound)return;m.dataset.bound='1';
  m.onclick=e=>{if(e.target.closest('[data-div-close]'))closeModal();const tab=e.target.closest('[data-div-tab]');if(tab)selectTab(tab.dataset.divTab)};
  $('#divulgadorUpgrade').onclick=()=>{closeModal();openPlans()};
  $('#divulgadorSave').onclick=saveOwn;
  $('#divulgadorName').addEventListener('input',e=>{if(!profileImage)setPhoto('',e.target.value)});
  $('#divulgadorPhoto').addEventListener('change',async e=>{try{const value=await compressPhoto(e.target.files?.[0]);setPhoto(value,$('#divulgadorName').value)}catch(err){notify(err.message)}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
}

function install(){
  if(!uid())return;
  styles();
  if(!$('#divulgadoresModal'))document.body.insertAdjacentHTML('beforeend',modalMarkup());
  bind();installButton();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();