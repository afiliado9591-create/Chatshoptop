/* ChatShop — opções do botão Ganhe dinheiro: indicação ou perfil de divulgador existente. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
let originalAffiliateClick=null;
function ensureStyle(){
  if($('#ganheDinheiroOptionsStyle'))return;
  const s=document.createElement('style');s.id='ganheDinheiroOptionsStyle';
  s.textContent=`#ganheDinheiroOptions{position:fixed;inset:0;z-index:12050;display:none;align-items:center;justify-content:center;padding:16px;font-family:Arial,sans-serif}#ganheDinheiroOptions.open{display:flex}.gdo-bg{position:absolute;inset:0;background:#0009}.gdo-box{position:relative;width:min(460px,100%);background:#fff;border-radius:18px;padding:20px;box-shadow:0 18px 60px #0004}.gdo-close{position:absolute;right:10px;top:8px;border:0;background:transparent;font-size:26px;color:#6b7280;cursor:pointer}.gdo-box h2{margin:0 32px 8px 0}.gdo-box p{margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.45}.gdo-actions{display:grid;gap:10px}.gdo-btn{width:100%;border:0;border-radius:12px;padding:14px 15px;font-weight:900;font-size:15px;cursor:pointer}.gdo-ref{background:#16a34a;color:#fff}.gdo-promoter{background:#6d28d9;color:#fff}.gdo-note{font-size:12px;color:#6b7280;text-align:center;margin-top:10px}`;
  document.head.appendChild(s);
}
function ensureModal(){
  let m=$('#ganheDinheiroOptions');if(m)return m;
  m=document.createElement('div');m.id='ganheDinheiroOptions';
  m.innerHTML=`<div class="gdo-bg" data-gdo-close></div><div class="gdo-box"><button class="gdo-close" type="button" data-gdo-close>×</button><h2>💰 Ganhe dinheiro</h2><p>Escolha como você quer ganhar dinheiro no ChatShop.</p><div class="gdo-actions"><button type="button" class="gdo-btn gdo-ref" id="gdoReferral">🔗 Continuar com meu link de indicação</button><button type="button" class="gdo-btn gdo-promoter" id="gdoPromoter">📣 Seja um divulgador</button></div><div class="gdo-note">O perfil de divulgador é o mesmo perfil que já existe no ChatShop.</div></div>`;
  document.body.appendChild(m);
  m.onclick=e=>{if(e.target.closest('[data-gdo-close]'))closeModal()};
  $('#gdoReferral',m).onclick=()=>{closeModal();if(typeof originalAffiliateClick==='function')originalAffiliateClick.call($('#afiliadoBtn'));else if(typeof window.abrirAfiliado==='function')window.abrirAfiliado()};
  $('#gdoPromoter',m).onclick=()=>{closeModal();openPromoterProfile()};
  return m;
}
function closeModal(){$('#ganheDinheiroOptions')?.classList.remove('open')}
function openChoice(){ensureStyle();ensureModal().classList.add('open')}
function loadPromoterScript(){
  if(document.getElementById('chatshopPromoterDirectoryScript'))return;
  const s=document.createElement('script');s.id='chatshopPromoterDirectoryScript';s.src='/promoter-directory.js?v=20260905-ganhe-dinheiro';s.async=true;document.body.appendChild(s);
}
function openPromoterProfile(){
  if(typeof window.openPromoterProfile==='function'){window.openPromoterProfile();return}
  loadPromoterScript();
  let n=0;const t=setInterval(()=>{n++;if(typeof window.openPromoterProfile==='function'){clearInterval(t);window.openPromoterProfile()}else if(n>=30){clearInterval(t);alert('Não foi possível abrir o perfil de divulgador agora. Tente novamente.')}},150);
}
function hookButton(){
  const b=$('#afiliadoBtn');if(!b)return false;
  if(b.dataset.ganheDinheiroOptions==='1')return true;
  if(typeof b.onclick==='function')originalAffiliateClick=b.onclick;
  b.onclick=e=>{e?.preventDefault?.();openChoice()};
  b.dataset.ganheDinheiroOptions='1';
  return true;
}
function boot(){ensureStyle();ensureModal();let n=0;const t=setInterval(()=>{if(hookButton()||++n>120)clearInterval(t)},250);hookButton();new MutationObserver(()=>hookButton()).observe(document.documentElement,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
