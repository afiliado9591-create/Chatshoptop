/* ChatShop — editor das páginas institucionais de cada loja. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
function plan(){try{return (typeof myPlan!=='undefined'&&myPlan)||'aprendiz'}catch(e){return'aprendiz'}}
function slug(){try{return String((typeof mySlug!=='undefined'&&mySlug)||$('#slug')?.value||'').trim()}catch(e){return''}}
function base(){
  const custom=String($('#customDomain')?.value||'').trim().replace(/^https?:\/\//,'').replace(/\/$/,'');
  return custom?'https://'+custom:'https://'+(slug()||'sua-loja')+'.alibr.com.br';
}
function defaults(){return{
  aboutTitle:'Quem somos',
  aboutText:'',
  privacyText:'Esta loja utiliza os dados informados pelo cliente somente para atendimento, processamento de pedidos, entrega e cumprimento das obrigações aplicáveis. Os pagamentos são processados pelo provedor escolhido pela loja. Para dúvidas sobre seus dados, entre em contato pelos canais oficiais da loja.',
  affiliateHeadline:'Ganhe dinheiro indicando nossa loja',
  affiliateDescription:'Cadastre-se, receba seu link exclusivo e divulgue nossos produtos. As comissões e regras são definidas pela loja.',
  affiliateCta:'Quero ser afiliado'
}}
function ensure(){
  if(!$('#editorView')||$('#storePublicPagesSettings'))return;
  const publish=[...document.querySelectorAll('#editorView .section')].find(s=>String(s.querySelector('h2')?.textContent||'').includes('4. Publicar'));
  if(!publish)return;
  const d=defaults(),box=document.createElement('div');box.id='storePublicPagesSettings';box.className='section';
  box.innerHTML=`<h2>📄 Páginas da loja</h2>
  <p style="font-size:12px;color:var(--muted);margin-top:-4px">Preencha as páginas que aparecerão dentro do domínio da sua loja.</p>
  <div class="field"><label>Título da página Quem somos</label><input id="storeAboutTitle" value="${d.aboutTitle}"></div>
  <div class="field"><label>Texto Quem somos</label><textarea id="storeAboutText" rows="5" placeholder="Conte a história da loja, o que vende, onde está localizada e seus diferenciais."></textarea></div>
  <div class="field"><label>Política de Privacidade da loja</label><textarea id="storePrivacyText" rows="7">${d.privacyText}</textarea><small>Informe também como o cliente pode entrar em contato para tratar seus dados.</small></div>
  <div id="storeAffiliatePageFields" style="border:1px solid #d1fae5;background:#f0fdf4;border-radius:12px;padding:11px;margin-top:12px">
    <div style="font-weight:900;color:#047857;margin-bottom:8px">🤝 Chamada para afiliados</div>
    <div class="field"><label>Título</label><input id="storeAffiliateHeadline" value="${d.affiliateHeadline}"></div>
    <div class="field"><label>Texto de apresentação</label><textarea id="storeAffiliateDescription" rows="4">${d.affiliateDescription}</textarea></div>
    <div class="field"><label>Texto do botão</label><input id="storeAffiliateCta" value="${d.affiliateCta}"></div>
    <small id="storeAffiliatePageLock" style="color:#92400e"></small>
  </div>
  <div style="margin-top:12px;font-size:12px;line-height:1.7">
    <b>Endereços públicos:</b><br>
    <a id="storeAboutUrl" target="_blank" rel="noopener"></a><br>
    <a id="storePrivacyUrl" target="_blank" rel="noopener"></a><br>
    <a id="storeAffiliateUrl" target="_blank" rel="noopener"></a>
  </div>`;
  publish.parentNode.insertBefore(box,publish);
  box.querySelectorAll('input,textarea').forEach(el=>el.addEventListener('input',()=>{try{window.debounce?.()}catch(e){}}));
  $('#slug')?.addEventListener('input',updateUrls);$('#customDomain')?.addEventListener('input',updateUrls);
  updateUrls();updateAccess();
}
function updateUrls(){
  const b=base(),set=(id,path)=>{const a=$(id);if(a){a.href=b+path;a.textContent=b+path}};
  set('#storeAboutUrl','/quem-somos');set('#storePrivacyUrl','/politica-de-privacidade');set('#storeAffiliateUrl','/afiliados');
}
function updateAccess(){
  const pro=plan()==='profissional',wrap=$('#storeAffiliatePageFields'),lock=$('#storeAffiliatePageLock');
  if(!wrap)return;wrap.querySelectorAll('input,textarea').forEach(x=>x.disabled=!pro);
  if(lock)lock.textContent=pro?'A página /afiliados será publicada quando o programa de afiliados estiver habilitado.':'🔒 Página de afiliados disponível somente no plano Profissional.';
}
function wrapCollect(){
  if(typeof window.collect!=='function'||window.collect.__storePagesWrapped)return;const old=window.collect;
  function fn(){const d=old();d.storePages={aboutTitle:String($('#storeAboutTitle')?.value||'Quem somos').trim(),aboutText:String($('#storeAboutText')?.value||'').trim(),privacyText:String($('#storePrivacyText')?.value||'').trim(),affiliateHeadline:String($('#storeAffiliateHeadline')?.value||'').trim(),affiliateDescription:String($('#storeAffiliateDescription')?.value||'').trim(),affiliateCta:String($('#storeAffiliateCta')?.value||'').trim()};return d}
  fn.__storePagesWrapped=true;window.collect=fn;try{collect=fn}catch(e){}
}
function wrapPopulate(){
  if(typeof window.populateForm!=='function'||window.populateForm.__storePagesWrapped)return;const old=window.populateForm;
  async function fn(data){const r=await old.apply(this,arguments);ensure();const d={...defaults(),...(data?.storePages||{})};if($('#storeAboutTitle'))$('#storeAboutTitle').value=d.aboutTitle;if($('#storeAboutText'))$('#storeAboutText').value=d.aboutText;if($('#storePrivacyText'))$('#storePrivacyText').value=d.privacyText;if($('#storeAffiliateHeadline'))$('#storeAffiliateHeadline').value=d.affiliateHeadline;if($('#storeAffiliateDescription'))$('#storeAffiliateDescription').value=d.affiliateDescription;if($('#storeAffiliateCta'))$('#storeAffiliateCta').value=d.affiliateCta;updateUrls();updateAccess();return r}
  fn.__storePagesWrapped=true;window.populateForm=fn;try{populateForm=fn}catch(e){}
}
function wrapClear(){
  if(typeof window.clearForm!=='function'||window.clearForm.__storePagesWrapped)return;const old=window.clearForm;
  function fn(){const r=old.apply(this,arguments);setTimeout(()=>{ensure();const d=defaults();if($('#storeAboutTitle'))$('#storeAboutTitle').value=d.aboutTitle;if($('#storeAboutText'))$('#storeAboutText').value='';if($('#storePrivacyText'))$('#storePrivacyText').value=d.privacyText;if($('#storeAffiliateHeadline'))$('#storeAffiliateHeadline').value=d.affiliateHeadline;if($('#storeAffiliateDescription'))$('#storeAffiliateDescription').value=d.affiliateDescription;if($('#storeAffiliateCta'))$('#storeAffiliateCta').value=d.affiliateCta;updateUrls();updateAccess()},0);return r}
  fn.__storePagesWrapped=true;window.clearForm=fn;try{clearForm=fn}catch(e){}
}
function install(){ensure();wrapCollect();wrapPopulate();wrapClear();updateUrls();updateAccess();const b=document.body;if(b&&!b.dataset.storePagesObserved){b.dataset.storePagesObserved='1';let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>{ensure();wrapCollect();wrapPopulate();wrapClear();updateUrls();updateAccess()},100)}).observe(b,{childList:true,subtree:true})}}
let n=0;(function wait(){n++;if(document.body&&typeof window.collect==='function'){install();return}if(n<100)setTimeout(wait,100)})();
})();