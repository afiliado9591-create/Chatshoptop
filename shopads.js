/* ShopAds — página inicial da rede de publicidade do ChatShop. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
function styles(){
 if($('#shopAdsStyles'))return;
 const s=document.createElement('style');s.id='shopAdsStyles';s.textContent=`
 #shopAdsOverlay{position:fixed;inset:0;z-index:10050;background:#f7f5ff;overflow:auto;display:none;font-family:Arial,sans-serif;color:#1f2937}
 #shopAdsOverlay.open{display:block}.sa-top{background:linear-gradient(135deg,#4c1d95,#7c3aed);color:#fff;padding:18px 18px 30px}.sa-head{max-width:760px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:12px}.sa-brand{font-size:27px;font-weight:900}.sa-brand span{color:#facc15}.sa-close{border:0;background:#ffffff24;color:#fff;width:40px;height:40px;border-radius:50%;font-size:24px}.sa-hero{max-width:760px;margin:25px auto 0;text-align:center}.sa-hero h1{font-size:31px;margin:0 0 10px}.sa-hero p{font-size:16px;line-height:1.5;margin:0 auto;max-width:580px;opacity:.94}.sa-tag{display:inline-block;margin-top:14px;background:#fff;color:#5b21b6;padding:8px 13px;border-radius:999px;font-weight:800;font-size:12px}
 .sa-body{max-width:760px;margin:-14px auto 40px;padding:0 14px}.sa-card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:20px;margin-bottom:14px;box-shadow:0 8px 25px #312e8112}.sa-card h2{margin:0 0 7px;font-size:20px}.sa-card p{margin:0 0 16px;color:#6b7280;line-height:1.5}.sa-btn{width:100%;border:0;border-radius:12px;padding:14px;font-size:15px;font-weight:900;cursor:pointer}.sa-advertise{background:#6d28d9;color:#fff}.sa-promote{background:#16a34a;color:#fff}.sa-how{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.sa-step{background:#fafafa;border-radius:12px;padding:12px;text-align:center;font-size:12px;line-height:1.35}.sa-step b{display:block;font-size:22px;margin-bottom:5px}.sa-note{text-align:center;color:#6b7280;font-size:12px;padding:8px 10px 25px}
 @media(max-width:560px){.sa-hero h1{font-size:27px}.sa-how{grid-template-columns:1fr}.sa-body{margin-top:-12px}}
 `;document.head.appendChild(s);
}
function overlay(){
 let el=$('#shopAdsOverlay');if(el)return el;styles();el=document.createElement('div');el.id='shopAdsOverlay';el.innerHTML=`
 <div class="sa-top"><div class="sa-head"><div class="sa-brand">Shop<span>Ads</span></div><button class="sa-close" aria-label="Fechar">×</button></div><div class="sa-hero"><h1>Anuncie. Divulgue. Ganhe.</h1><p>A rede de publicidade do ChatShop para conectar quem precisa divulgar produtos e catálogos com quem quer ganhar promovendo campanhas.</p><div class="sa-tag">ShopAds · A rede de publicidade do ChatShop</div></div></div>
 <main class="sa-body">
  <section class="sa-card"><h2>📣 Quero anunciar</h2><p>Promova seu catálogo ou seus produtos para aumentar o alcance e levar mais pessoas até suas ofertas.</p><button class="sa-btn sa-advertise" data-shopads-advertise>Quero anunciar</button></section>
  <section class="sa-card"><h2>💰 Quero divulgar</h2><p>Use seu perfil de Divulgador do ChatShop para encontrar campanhas, compartilhar e futuramente ganhar por resultados válidos.</p><button class="sa-btn sa-promote" data-shopads-promote>Quero divulgar</button></section>
  <section class="sa-card"><h2>Como vai funcionar</h2><div class="sa-how"><div class="sa-step"><b>1️⃣</b>O anunciante cria uma campanha.</div><div class="sa-step"><b>2️⃣</b>Divulgadores escolhem campanhas para promover.</div><div class="sa-step"><b>3️⃣</b>O ShopAds acompanha os resultados.</div></div></section>
  <div class="sa-note">ShopAds está sendo preparado. As campanhas e pagamentos serão liberados em uma próxima etapa.</div>
 </main>`;
 document.body.appendChild(el);el.querySelector('.sa-close').onclick=()=>el.classList.remove('open');
 el.querySelector('[data-shopads-advertise]').onclick=()=>alert('Área do Anunciante ShopAds em preparação.');
 el.querySelector('[data-shopads-promote]').onclick=()=>{el.classList.remove('open');const btn=document.querySelector('[data-promoter-directory],#promoterDirectoryBtn,#divulgadoresBtn');if(btn)btn.click();else alert('Use a área Divulgadores do ChatShop para preparar seu perfil.');};return el;
}
function open(){overlay().classList.add('open')}
function installButton(){
 if($('#shopAdsBtn'))return;
 const candidates=[...document.querySelectorAll('button,a')].filter(x=>/vídeo|video|blog|divulgador/i.test((x.textContent||'').trim()));
 const anchor=candidates[0];if(!anchor)return;
 const b=document.createElement('button');b.id='shopAdsBtn';b.type='button';b.className=anchor.className||'btn';b.innerHTML='📣 ShopAds';b.onclick=open;anchor.insertAdjacentElement('afterend',b);
}
window.openShopAds=open;
let tries=0;const timer=setInterval(()=>{tries++;installButton();if($('#shopAdsBtn')||tries>100)clearInterval(timer)},200);
document.addEventListener('click',e=>{const t=e.target.closest?.('[data-open-shopads]');if(t){e.preventDefault();open()}},true);
})();
