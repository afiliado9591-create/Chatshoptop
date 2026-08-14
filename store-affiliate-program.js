/* ChatShop — programa de afiliados por loja (Profissional) */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function plan(){try{return (typeof myPlan!=='undefined'&&myPlan)||'aprendiz'}catch(e){return'aprendiz'}}
function isPro(){return plan()==='profissional'}
function currentSlug(){try{return (typeof mySlug!=='undefined'&&mySlug)||$('#slug')?.value||window.__CHATSHOP_STORE_DATA?.slug||''}catch(e){return''}}
function publicBase(slug,data){
  const custom=String(data?.customDomain||$('#customDomain')?.value||'').trim().replace(/^https?:\/\//,'').replace(/\/$/,'');
  return custom?'https://'+custom:'https://'+slug+'.alibr.com.br';
}
function updatePreview(){
  const el=$('#affiliatePagePreview');if(!el)return;const slug=currentSlug()||'sua-loja';const base=publicBase(slug);el.textContent=base+'/afiliados';
}
function ensureEditor(){
  if(!$('#editorView')||$('#affiliateProgramSettings'))return;
  const sections=[...document.querySelectorAll('#editorView .section')];
  const publish=sections.find(s=>String(s.querySelector('h2')?.textContent||'').includes('4. Publicar'));
  if(!publish)return;
  const box=document.createElement('div');box.className='section';box.id='affiliateProgramSettings';
  box.innerHTML=`<h2>🤝 Programa de afiliados</h2><div id="affiliateProgramLocked" class="notice" style="display:none">🔒 Disponível somente no plano <b>Profissional</b>.</div><div id="affiliateProgramFields"><label style="display:flex;gap:8px;align-items:center;font-size:13px;font-weight:800"><input type="checkbox" id="affiliateProgramEnabled"> Habilitar programa de afiliados desta loja</label><div class="grid2" style="margin-top:10px"><div class="field"><label>Comissão (%)</label><input id="affiliateCommission" inputmode="decimal" placeholder="Ex: 10"></div><div class="field"><label>URL pública para cadastro</label><div id="affiliatePagePreview" style="font-size:12px;word-break:break-all;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px"></div></div></div><div class="field"><label>Regras / mensagem para afiliados</label><textarea id="affiliateTerms" rows="3" placeholder="Ex: Divulgue seu link e receba comissão nas vendas confirmadas."></textarea></div><small style="color:var(--muted)">Quando ativado, a loja ganha uma página /afiliados para novos parceiros se cadastrarem.</small></div>`;
  publish.parentNode.insertBefore(box,publish);
  ['affiliateProgramEnabled','affiliateCommission','affiliateTerms'].forEach(id=>$('#'+id)?.addEventListener('input',()=>{try{debounce()}catch(e){}}));
  $('#slug')?.addEventListener('input',updatePreview);$('#customDomain')?.addEventListener('input',updatePreview);updateAccess();updatePreview();
}
function updateAccess(){
  const f=$('#affiliateProgramFields'),l=$('#affiliateProgramLocked');if(!f||!l)return;f.style.display=isPro()?'block':'none';l.style.display=isPro()?'none':'block';
}
function wrapCollect(){
  if(typeof window.collect!=='function'||window.collect.__affiliateWrapped)return;const original=window.collect;
  function wrapped(){const d=original();const pro=isPro();d.affiliateProgram={enabled:pro&&!!$('#affiliateProgramEnabled')?.checked,commissionPercent:pro?Math.max(0,Math.min(100,Number(String($('#affiliateCommission')?.value||'0').replace(',','.'))||0)):0,terms:pro?String($('#affiliateTerms')?.value||'').trim():''};return d}
  wrapped.__affiliateWrapped=true;window.collect=wrapped;try{collect=wrapped}catch(e){}
}
function wrapPopulate(){
  if(typeof window.populateForm!=='function'||window.populateForm.__affiliateWrapped)return;const original=window.populateForm;
  async function wrapped(data){const r=await original.apply(this,arguments);ensureEditor();const a=data?.affiliateProgram||{};if($('#affiliateProgramEnabled'))$('#affiliateProgramEnabled').checked=!!a.enabled;if($('#affiliateCommission'))$('#affiliateCommission').value=a.commissionPercent??'';if($('#affiliateTerms'))$('#affiliateTerms').value=a.terms||'';updateAccess();updatePreview();return r}
  wrapped.__affiliateWrapped=true;window.populateForm=wrapped;try{populateForm=wrapped}catch(e){}
}
function wrapClear(){
  if(typeof window.clearForm!=='function'||window.clearForm.__affiliateWrapped)return;const original=window.clearForm;
  function wrapped(){const r=original.apply(this,arguments);ensureEditor();if($('#affiliateProgramEnabled'))$('#affiliateProgramEnabled').checked=false;if($('#affiliateCommission'))$('#affiliateCommission').value='';if($('#affiliateTerms'))$('#affiliateTerms').value='';updateAccess();updatePreview();return r}
  wrapped.__affiliateWrapped=true;window.clearForm=wrapped;try{clearForm=wrapped}catch(e){}
}
function referralTracking(){
  try{const data=window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA;if(!data||data.planTier!=='profissional'||data.affiliateProgram?.enabled!==true)return;const p=new URLSearchParams(location.search),ref=String(p.get('ref')||'').trim();const key='chatshop_aff_ref_'+String(data.slug||location.hostname);if(ref){localStorage.setItem(key,ref);localStorage.setItem('chatshop_aff_ref',ref);window.__CHATSHOP_AFFILIATE_REF=ref}else{window.__CHATSHOP_AFFILIATE_REF=localStorage.getItem(key)||localStorage.getItem('chatshop_aff_ref')||''}}catch(e){}
}
async function openAffiliateList(slug,base){
  if(!window.db)return;let modal=$('#storeAffiliateModal');if(!modal){modal=document.createElement('div');modal.id='storeAffiliateModal';modal.style.cssText='position:fixed;inset:0;z-index:200;background:#0008;display:none;align-items:center;justify-content:center;padding:16px';modal.innerHTML='<div style="background:#fff;border-radius:16px;max-width:640px;width:100%;max-height:86vh;overflow:auto;padding:18px"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">🤝 Afiliados cadastrados</h2><button id="closeStoreAffiliateModal" style="border:0;background:none;font-size:24px">×</button></div><div id="storeAffiliateList" style="margin-top:14px"></div></div>';document.body.appendChild(modal);$('#closeStoreAffiliateModal').onclick=()=>modal.style.display='none'}
  modal.style.display='flex';const list=$('#storeAffiliateList');list.innerHTML='<p>Carregando...</p>';
  try{const snap=await db.collection('chatshops').doc(slug).collection('leads').orderBy('data','desc').limit(200).get();const docs=snap.docs.map(d=>d.data()).filter(x=>x.type==='affiliate_application');if(!docs.length){list.innerHTML='<p style="color:#6b7280">Nenhum afiliado cadastrado ainda.</p>';return}list.innerHTML=docs.map(a=>{const link=base+'/?ref='+encodeURIComponent(a.affiliateCode||'');return `<div style="border-bottom:1px solid #eee;padding:10px 0"><b>${safe(a.affiliateName||'Afiliado')}</b><div style="font-size:12px;color:#6b7280">${safe(a.affiliateEmail||'')} · ${safe(a.affiliateWhatsapp||'')}</div><div style="font-size:11px;word-break:break-all;margin-top:5px">${safe(link)}</div></div>`}).join('')}catch(e){console.error(e);list.innerHTML='<p style="color:#b91c1c">Não foi possível carregar os afiliados.</p>'}
}
async function decorateDashboard(){
  if(!$('#storeGrid')||typeof db==='undefined'||!db)return;
  for(const card of document.querySelectorAll('#storeGrid .storecard')){
    if(card.dataset.urlReady==='1')continue;card.dataset.urlReady='1';const visit=card.querySelector('a.visit');if(!visit)continue;let u;try{u=new URL(visit.href)}catch(e){continue}const slug=u.hostname.split('.')[0];let data={};try{const s=await db.collection('chatshops').doc(slug).get();if(s.exists)data=s.data()||{}}catch(e){}
    const base=publicBase(slug,data);const url=document.createElement('div');url.style.cssText='font-size:11px;margin:8px 0;word-break:break-all;color:#4b5563';url.innerHTML=`🔗 <b>URL da loja:</b> <a href="${safe(base)}" target="_blank" rel="noopener">${safe(base)}</a> <button type="button" style="border:0;background:none;color:#6d28d9;font-weight:800;cursor:pointer">Copiar</button>`;url.querySelector('button').onclick=async()=>{try{await navigator.clipboard.writeText(base);if(typeof toast==='function')toast('URL copiada!')}catch(e){}};card.querySelector('.slugtag')?.insertAdjacentElement('afterend',url);
    if(data.planTier==='profissional'&&data.affiliateProgram?.enabled===true){const actions=card.querySelector('.cardbtns');if(actions&&!actions.querySelector('.affiliate-owner-btn')){const b=document.createElement('button');b.type='button';b.className='affiliate-owner-btn';b.textContent='🤝 Afiliados';b.style.cssText='border:1px solid #059669;background:#fff;color:#047857;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer';b.onclick=()=>openAffiliateList(slug,base);actions.appendChild(b);const a=document.createElement('a');a.href=base+'/afiliados';a.target='_blank';a.rel='noopener';a.textContent='Cadastro';a.style.cssText='border:1px solid #059669;background:#ecfdf5;color:#047857;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700;text-decoration:none;text-align:center';actions.appendChild(a)}}
  }
}
function mentionInPlans(){document.querySelectorAll('#plansCols .plan-card').forEach(c=>{if(String(c.querySelector('h3')?.textContent||'').includes('Profissional')&&!String(c.textContent).includes('Programa de afiliados')){const lim=c.querySelector('.lim');if(lim)lim.insertAdjacentHTML('beforeend','<br>✅ Programa de afiliados por loja')}})}
function install(){ensureEditor();wrapCollect();wrapPopulate();wrapClear();updateAccess();decorateDashboard();referralTracking();mentionInPlans();const body=document.body;if(body&&!body.dataset.affProgramObs){body.dataset.affProgramObs='1';let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>{ensureEditor();wrapCollect();wrapPopulate();wrapClear();updateAccess();decorateDashboard();referralTracking();mentionInPlans()},120)}).observe(body,{childList:true,subtree:true})}}
let n=0;(function wait(){n++;if(document.body){install();return}if(n<80)setTimeout(wait,100)})();
})();