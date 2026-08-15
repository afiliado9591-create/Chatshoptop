/* ChatShop - cabeçalho e rodapé da Loja Virtual com a identidade da loja. */
(function(){
'use strict';

const data=window.__CHATSHOP_STORE_DATA||null;
if(!data||data.storeType!=='virtual')return;

function validColor(v,fallback){return /^#[0-9a-f]{6}$/i.test(String(v||''))?String(v):fallback}
function contrast(hex){
  const h=String(hex||'#ffffff').replace('#','');
  const r=parseInt(h.slice(0,2),16)||0,g=parseInt(h.slice(2,4),16)||0,b=parseInt(h.slice(4,6),16)||0;
  return ((r*299+g*587+b*114)/1000)>=150?'#1f2937':'#ffffff';
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function safeImage(v){
  const s=String(v||'').trim();
  if(/^data:image\//i.test(s))return s;
  try{const u=new URL(s,location.origin);return /^https?:$/.test(u.protocol)?u.href:''}catch(e){return''}
}

const theme=validColor(data.headerColor,validColor(data.mainColor,'#c2185b'));
const themeText=contrast(theme);
const bag=validColor(data.darkColor,validColor(data.accentColor,'#6d1235'));
const bagText=contrast(bag);
const brand=String(data.brand||data.storeName||data.name||'Minha Loja').trim()||'Minha Loja';
const logo=safeImage(data.logo);

function installStyle(){
  if(document.getElementById('virtualStoreThemeFooterStyle'))return;
  const s=document.createElement('style');
  s.id='virtualStoreThemeFooterStyle';
  s.textContent=`
  .csv-head,.vs-head{background:${theme}!important;border-bottom:0!important;box-shadow:0 3px 14px rgba(0,0,0,.15)!important;padding:10px 14px!important;min-height:64px!important}
  .csv-title b,.vs-head-title b{color:${themeText}!important;font-size:18px!important;line-height:1.12!important;font-weight:900!important;letter-spacing:.1px!important}
  .csv-title small,.vs-head-title small{color:${themeText}!important;opacity:.82!important;font-size:11px!important;font-weight:700!important}
  .csv-logo,.vs-logo{background:rgba(255,255,255,.18)!important;border:2px solid rgba(255,255,255,.65)!important;width:44px!important;height:44px!important;box-shadow:0 2px 8px rgba(0,0,0,.14)!important}
  .csv-bag,.vs-bag{background:${bag}!important;color:${bagText}!important;border:1px solid rgba(255,255,255,.35)!important;box-shadow:0 3px 10px rgba(0,0,0,.17)!important;padding:10px 14px!important;font-weight:900!important}
  .csv-bag span,.vs-bag span{color:${bagText}!important}
  .vst-footer{margin-top:24px;background:${theme};color:${themeText};padding:34px 18px 96px;text-align:center;box-shadow:0 -4px 16px rgba(0,0,0,.08)}
  .vst-footer-inner{width:min(100%,760px);margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:9px}
  .vst-footer-logo{width:58px;height:58px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.65);font-size:25px;font-weight:900;box-shadow:0 3px 12px rgba(0,0,0,.14)}
  .vst-footer-logo img{width:100%;height:100%;object-fit:cover}
  .vst-footer-brand{font-size:20px;line-height:1.15;font-weight:900;letter-spacing:.15px}
  .vst-footer-sub{font-size:12px;font-weight:700;opacity:.86}
  .vst-footer-links{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 18px;margin:7px 0 4px}
  .vst-footer-links a{color:inherit!important;text-decoration:underline!important;text-underline-offset:3px;font-size:13px;font-weight:800;opacity:.96}
  .vst-footer-links a:hover,.vst-footer-links a:focus{opacity:.76}
  .vst-footer-line{width:min(86%,420px);height:1px;background:currentColor;opacity:.22;margin:8px 0 2px}
  .vst-footer-note{font-size:11px;opacity:.72;line-height:1.45}
  @media(max-width:520px){.csv-head,.vs-head{padding:9px 10px!important;gap:8px!important}.csv-title b,.vs-head-title b{font-size:16px!important}.csv-bag,.vs-bag{padding:9px 11px!important;font-size:12px!important}.vst-footer{margin-top:18px;padding:28px 14px 92px}.vst-footer-brand{font-size:18px}}
  `;
  document.head.appendChild(s);
}

function affiliateFooterLink(){
  const plan=String(data.plan||data.planId||data.subscriptionPlan||'').toLowerCase();
  const professional=['profissional','professional','pro','premium'].includes(plan);
  const enabled=Boolean(data.affiliateProgram&&data.affiliateProgram.enabled);
  return professional&&enabled?'<a href="/afiliados">Ganhe dinheiro com esta loja</a>':'';
}

function footerHtml(){
  const affiliateLink=affiliateFooterLink();
  return `<footer class="vst-footer"><div class="vst-footer-inner"><div class="vst-footer-logo">${logo?`<img src="${esc(logo)}" alt="${esc(brand)}">`:esc(brand.charAt(0).toUpperCase())}</div><div class="vst-footer-brand">${esc(brand)}</div><div class="vst-footer-sub">Loja virtual · Atendimento online</div><nav class="vst-footer-links" aria-label="Informações da loja"><a href="/quem-somos">Quem somos</a><a href="/politica-de-privacidade">Política de privacidade</a>${affiliateLink}</nav><div class="vst-footer-line"></div><div class="vst-footer-note">Compre seus produtos com praticidade pelo ChatShop.</div></div></footer>`;
}

function install(){
  const page=document.querySelector('.csv-page,.vs-page');
  if(!page)return false;
  installStyle();
  if(!page.querySelector('.vst-footer'))page.insertAdjacentHTML('beforeend',footerHtml());
  return true;
}

let tries=0;
(function start(){tries++;if(install())return;if(tries<60)setTimeout(start,80)})();
const root=document.getElementById('storefrontScreen')||document.body;
new MutationObserver(()=>{setTimeout(install,0)}).observe(root,{childList:true,subtree:true});
})();
