/* Perfil único Alibr — compartilhado entre ChatShop e Blog Alibr. */
(function(){
'use strict';
if(window.__ALIBR_UNIFIED_PROFILE__) return;
window.__ALIBR_UNIFIED_PROFILE__=true;

const $=(s,r)=>(r||document).querySelector(s);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let profilePhoto='',activeUser=null;

function getDb(){try{return typeof db!=='undefined'&&db?db:null}catch(e){return null}}
function resolveUser(){
  // A autenticação atual é sempre a fonte de verdade. Nunca reutilize a conta anterior.
  try{
    if(typeof auth!=='undefined' && auth && auth.currentUser && !auth.currentUser.isAnonymous){
      return auth.currentUser;
    }
  }catch(e){}
  try{
    if(typeof myUid!=='undefined' && myUid){
      return {uid:myUid,email:''};
    }
  }catch(e){}
  return null;
}
function message(text,ok){
  const box=$('#alibrProfileMessage');if(!box)return;
  box.textContent=text;box.className='alibr-profile-message '+(ok?'ok':'error');
}
function initials(name){return String(name||'A').trim().split(/\s+/).slice(0,2).map(x=>x.charAt(0)).join('').toUpperCase()||'A'}
function digits(v){return String(v||'').replace(/\D/g,'')}
function validHttps(v){if(!String(v||'').trim())return true;try{return new URL(String(v).trim()).protocol==='https:'}catch(e){return false}}

function installStyle(){
  if($('#alibrUnifiedProfileStyle'))return;
  const s=document.createElement('style');s.id='alibrUnifiedProfileStyle';
  s.textContent=
  '.alibr-profile-modal{position:fixed;inset:0;z-index:10020;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.64)}'+
  '.alibr-profile-modal.open{display:flex}.alibr-profile-card{width:min(100%,620px);max-height:92vh;overflow:auto;background:#fff;border-radius:20px;padding:20px;box-shadow:0 24px 70px rgba(0,0,0,.28);color:#1f2937}'+
  '.alibr-profile-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}.alibr-profile-head h2{margin:0;font-size:25px}.alibr-profile-head p{margin:5px 0 0;color:#6b7280;line-height:1.35}'+
  '.alibr-profile-close{border:0;background:none;color:#6b7280;font-size:30px;line-height:1;cursor:pointer}.alibr-profile-photo-row{display:flex;align-items:center;gap:14px;margin-bottom:15px}'+
  '.alibr-profile-photo{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;overflow:hidden;flex:0 0 76px;background:#ede9fe;color:#5b21b6;font-size:25px;font-weight:900;border:3px solid #ddd6fe}.alibr-profile-photo img{width:100%;height:100%;object-fit:cover}'+
  '.alibr-profile-upload{display:inline-flex;padding:9px 12px;border-radius:10px;background:#f3e8ff;color:#6b21a8;font-weight:850;cursor:pointer}.alibr-profile-upload input{display:none}'+
  '.alibr-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.alibr-profile-field{display:flex;flex-direction:column;gap:5px}.alibr-profile-field.full{grid-column:1/-1}.alibr-profile-field label{font-size:13px;font-weight:850}'+
  '.alibr-profile-field input,.alibr-profile-field textarea{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:11px 12px;font:inherit;color:#111827;background:#fff}.alibr-profile-field textarea{min-height:92px;resize:vertical}'+
  '.alibr-profile-public{display:flex;align-items:flex-start;gap:9px;margin:14px 0;padding:11px;border-radius:11px;background:#f8fafc;border:1px solid #e5e7eb;font-size:13px}.alibr-profile-public input{margin-top:2px}'+
  '.alibr-profile-actions{display:flex;gap:9px;justify-content:flex-end}.alibr-profile-save{border:0;border-radius:11px;background:#6d28d9;color:#fff;padding:11px 18px;font-weight:900;cursor:pointer}.alibr-profile-save:disabled{opacity:.6}'+
  '.alibr-profile-message{display:none;margin:0 0 12px;padding:10px;border-radius:10px;font-size:13px}.alibr-profile-message.ok{display:block;background:#dcfce7;color:#166534}.alibr-profile-message.error{display:block;background:#fee2e2;color:#991b1b}'+
  '.alibr-profile-trigger{white-space:nowrap}.alibr-author{display:flex;align-items:center;gap:7px;margin-top:9px;color:#6b7280;font-size:12px}.alibr-author-avatar{width:28px;height:28px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#ede9fe;color:#5b21b6;font-weight:900}.alibr-author-avatar img{width:100%;height:100%;object-fit:cover}'+
  '@media(max-width:560px){.alibr-profile-card{padding:17px}.alibr-profile-grid{grid-template-columns:1fr}.alibr-profile-field.full{grid-column:auto}.alibr-profile-head h2{font-size:22px}}';
  document.head.appendChild(s);
}
function modal(){
  if($('#alibrProfileModal'))return;
  const el=document.createElement('div');el.id='alibrProfileModal';el.className='alibr-profile-modal';
  el.innerHTML='<section class="alibr-profile-card" role="dialog" aria-modal="true" aria-labelledby="alibrProfileTitle">'+
    '<div class="alibr-profile-head"><div><h2 id="alibrProfileTitle">👤 Meu perfil Alibr</h2><p>Este mesmo perfil será usado no ChatShop e no Blog Alibr.</p></div><button class="alibr-profile-close" type="button" aria-label="Fechar">×</button></div>'+
    '<div id="alibrProfileMessage" class="alibr-profile-message"></div>'+
    '<div class="alibr-profile-photo-row"><div id="alibrProfilePhoto" class="alibr-profile-photo">A</div><div><label class="alibr-profile-upload">Escolher foto<input id="alibrProfilePhotoInput" type="file" accept="image/*"></label><div style="font-size:11px;color:#6b7280;margin-top:5px">A imagem será reduzida antes de salvar.</div></div></div>'+
    '<div class="alibr-profile-grid">'+
      '<div class="alibr-profile-field"><label>Nome público *</label><input id="alibrProfileName" maxlength="80"></div>'+
      '<div class="alibr-profile-field"><label>Cidade e estado</label><input id="alibrProfileLocation" maxlength="100" placeholder="Ex.: São Paulo, SP"></div>'+
      '<div class="alibr-profile-field"><label>WhatsApp</label><input id="alibrProfileWhatsapp" maxlength="20" inputmode="tel"></div>'+
      '<div class="alibr-profile-field"><label>Rede social ou site</label><input id="alibrProfileSocial" maxlength="300" placeholder="https://..."></div>'+
      '<div class="alibr-profile-field full"><label>Apresentação</label><textarea id="alibrProfileBio" maxlength="600" placeholder="Conte um pouco sobre você e seu trabalho."></textarea></div>'+
    '</div>'+
    '<label class="alibr-profile-public"><input id="alibrProfilePublic" type="checkbox" checked><span><b>Perfil público</b><br>Permitir que seu nome, foto e apresentação apareçam nas publicações e páginas públicas.</span></label>'+
    '<div class="alibr-profile-actions"><button id="alibrProfileSave" class="alibr-profile-save" type="button">Salvar perfil</button></div>'+
  '</section>';
  document.body.appendChild(el);
  $('.alibr-profile-close',el).onclick=closeModal;
  el.addEventListener('click',e=>{if(e.target===el)closeModal()});
  $('#alibrProfilePhotoInput').onchange=async e=>{
    try{profilePhoto=await compressPhoto(e.target.files&&e.target.files[0]);showPhoto(profilePhoto,$('#alibrProfileName').value)}
    catch(x){message(x.message||'Não foi possível usar essa imagem.',false)}
  };
  $('#alibrProfileName').addEventListener('input',()=>{if(!profilePhoto)showPhoto('', $('#alibrProfileName').value)});
  $('#alibrProfileSave').onclick=saveProfile;
}
function showPhoto(src,name){
  const box=$('#alibrProfilePhoto');if(!box)return;box.innerHTML='';
  if(src){const img=document.createElement('img');img.src=src;img.alt='Foto do perfil';box.appendChild(img)}
  else box.textContent=initials(name);
}
function compressPhoto(file){
  return new Promise((resolve,reject)=>{
    if(!file)return resolve(profilePhoto||'');
    if(file.size>8*1024*1024)return reject(new Error('A foto deve ter no máximo 8 MB.'));
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Não foi possível ler a foto.'));
    reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('Formato de imagem inválido.'));img.onload=()=>{
      const size=320,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
      const ctx=canvas.getContext('2d'),side=Math.min(img.width,img.height),sx=(img.width-side)/2,sy=(img.height-side)/2;
      ctx.drawImage(img,sx,sy,side,side,0,0,size,size);resolve(canvas.toDataURL('image/jpeg',.78));
    };img.src=reader.result};reader.readAsDataURL(file);
  });
}
async function loadProfile(){
  const d=getDb();activeUser=resolveUser();if(!d||!activeUser)return;
  message('',true);
  profilePhoto='';
  $('#alibrProfileName').value='';
  $('#alibrProfileLocation').value='';
  $('#alibrProfileWhatsapp').value='';
  $('#alibrProfileSocial').value='';
  $('#alibrProfileBio').value='';
  $('#alibrProfilePublic').checked=true;
  showPhoto('','A');
  try{
    const requestedUid=activeUser.uid;
    const snap=await d.collection('profiles').doc(requestedUid).get();
    const latest=resolveUser();
    if(!latest || latest.uid!==requestedUid) return;
    const p=snap.exists?snap.data()||{}:{};
    const fallback=(activeUser.displayName||String(activeUser.email||'').split('@')[0]||'').slice(0,80);
    $('#alibrProfileName').value=p.name||fallback;
    $('#alibrProfileLocation').value=p.location||'';
    $('#alibrProfileWhatsapp').value=p.whatsapp||'';
    $('#alibrProfileSocial').value=p.social||'';
    $('#alibrProfileBio').value=p.bio||'';
    $('#alibrProfilePublic').checked=p.public!==false;
    profilePhoto=p.photo||'';showPhoto(profilePhoto,p.name||fallback);
  }catch(e){console.error(e);message('Não foi possível abrir o perfil. É necessário liberar a coleção profiles no Firebase.',false)}
}
async function saveProfile(){
  const d=getDb();activeUser=resolveUser();if(!d||!activeUser)return;
  const name=$('#alibrProfileName').value.trim(),social=$('#alibrProfileSocial').value.trim();
  if(name.length<2)return message('Digite seu nome público.',false);
  if(!validHttps(social))return message('A rede social ou site precisa começar com https://',false);
  const btn=$('#alibrProfileSave');btn.disabled=true;btn.textContent='Salvando...';
  try{
    await d.collection('profiles').doc(activeUser.uid).set({
      ownerUid:activeUser.uid,
      name:name.slice(0,80),
      photo:profilePhoto,
      location:$('#alibrProfileLocation').value.trim().slice(0,100),
      whatsapp:digits($('#alibrProfileWhatsapp').value).slice(0,15),
      social:social.slice(0,300),
      bio:$('#alibrProfileBio').value.trim().slice(0,600),
      public:$('#alibrProfilePublic').checked,
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true});
    try{if(activeUser.updateProfile)await activeUser.updateProfile({displayName:name.slice(0,80),photoURL:profilePhoto&&profilePhoto.length<1000?profilePhoto:null})}catch(e){}
    window.dispatchEvent(new CustomEvent('alibr-profile-updated',{detail:{uid:activeUser.uid,name:name,photo:profilePhoto}}));
    message('Perfil salvo! Ele já é o mesmo no ChatShop e no Blog Alibr.',true);
  }catch(e){console.error(e);message('Não foi possível salvar. Verifique as regras da coleção profiles no Firebase.',false)}
  finally{btn.disabled=false;btn.textContent='Salvar perfil'}
}
async function openModal(){activeUser=resolveUser();if(!activeUser){alert('Entre na sua conta Alibr para abrir o perfil.');return}modal();$('#alibrProfileModal').classList.add('open');await loadProfile()}
function closeModal(){$('#alibrProfileModal')?.classList.remove('open')}
function addButton(){
  if($('#alibrProfileBtn'))return true;
  const b=document.createElement('button');b.id='alibrProfileBtn';b.type='button';b.className='btn alibr-profile-trigger';b.textContent='👤 Meu perfil';b.onclick=openModal;
  const plan=$('#verPlanosBtn');
  if(plan&&plan.parentElement){plan.parentElement.insertBefore(b,plan);return true}
  const authBtn=$('#authBtn');
  if(authBtn&&authBtn.parentElement){b.className='alibr-profile-trigger';b.style.cssText='border:1px solid rgba(255,255,255,.55);background:#fff;color:#1d4ed8;border-radius:10px;padding:9px 12px;font-weight:900;cursor:pointer';authBtn.parentElement.insertBefore(b,authBtn);return true}
  return false;
}
function watchAuthentication(){
  try{
    if(typeof auth==='undefined'||!auth||typeof auth.onAuthStateChanged!=='function')return;
    let lastUid=auth.currentUser&&!auth.currentUser.isAnonymous?auth.currentUser.uid:'';
    auth.onAuthStateChanged(next=>{
      const nextUid=next&&!next.isAnonymous?next.uid:'';
      if(nextUid!==lastUid){
        activeUser=null;profilePhoto='';closeModal();lastUid=nextUid;
      }
    });
  }catch(e){}
}
function boot(){installStyle();modal();watchAuthentication();if(addButton())return;let n=0;const timer=setInterval(()=>{if(addButton()||++n>50)clearInterval(timer)},200)}
boot();
})();
