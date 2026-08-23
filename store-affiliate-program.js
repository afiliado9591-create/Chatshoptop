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
function getDb(){try{return (typeof db!=='undefined'&&db)||window.firebase?.firestore?.()||null}catch(e){return null}}
function fv(){try{return window.firebase?.firestore?.FieldValue||firebase.firestore.FieldValue}catch(e){return null}}
function brl(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function updatePreview(){
  const el=$('#affiliatePagePreview');if(!el)return;const slug=currentSlug()||'sua-loja';const base=publicBase(slug);el.textContent=base+'/afiliados';
}
function ensureEditor(){
  if(!$('#editorView'))return;
  const existing=$('#affiliateProgramSettings');
  if(existing){
    if(existing.dataset.bound!=='1'){
      existing.dataset.bound='1';
      ['affiliateProgramEnabled','affiliateCommission','affiliateTerms'].forEach(id=>$('#'+id)?.addEventListener('input',()=>{try{debounce()}catch(e){}}));
      $('#slug')?.addEventListener('input',updatePreview);$('#customDomain')?.addEventListener('input',updatePreview);
    }
    updatePreview();return;
  }
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
function referralContext(){
  try{
    const data=window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||{};
    const slug=String(data.slug||'').trim();
    const ref=String(window.__CHATSHOP_AFFILIATE_REF||localStorage.getItem('chatshop_aff_ref_'+(slug||location.hostname))||'').trim();
    return {data,slug,ref:/^af_[a-z0-9]+$/i.test(ref)?ref:''};
  }catch(e){return{data:{},slug:'',ref:''}}
}
async function recordAffiliateMetric(kind,value=0){
  const {data,slug,ref}=referralContext(),d=getDb(),F=fv();
  if(!slug||!ref||!d||data.planTier!=='profissional'||data.affiliateProgram?.enabled!==true)return;
  try{
    if(window.firebase?.auth&&!firebase.auth().currentUser)await firebase.auth().signInAnonymously();
    const patch={affiliateCode:ref,lastActivityAt:F?.serverTimestamp?F.serverTimestamp():new Date()};
    if(kind==='click')patch.clickCount=F?.increment?F.increment(1):1;
    if(kind==='order'){patch.orderCount=F?.increment?F.increment(1):1;patch.orderValue=F?.increment?F.increment(Math.max(0,Number(value)||0)):Math.max(0,Number(value)||0)}
    const storeRef=d.collection('chatshops').doc(slug);
    const nested={};
    nested['affiliateMetricsSummary.'+ref+'.affiliateCode']=ref;
    nested['affiliateMetricsSummary.'+ref+'.lastActivityAt']=patch.lastActivityAt;
    if(kind==='click')nested['affiliateMetricsSummary.'+ref+'.clickCount']=F?.increment?F.increment(1):1;
    if(kind==='order'){nested['affiliateMetricsSummary.'+ref+'.orderCount']=F?.increment?F.increment(1):1;nested['affiliateMetricsSummary.'+ref+'.orderValue']=F?.increment?F.increment(Math.max(0,Number(value)||0)):Math.max(0,Number(value)||0)}
    await storeRef.update(nested);
    storeRef.collection('affiliateMetrics').doc(ref).set(patch,{merge:true}).catch(()=>{});

  }catch(e){console.warn('Métrica de afiliado não registrada',e)}
}
function cartAttributedValue(){
  const root=$('#csvCartBody')||$('#vsCartBody')||document.body,text=String(root?.textContent||'');
  const values=[...text.matchAll(/Total(?:\s+com\s+frete)?\s*R\$\s*([\d.]+,\d{2})/gi)].map(m=>Number(m[1].replace(/\./g,'').replace(',','.')));
  return values.length?values[values.length-1]:0;
}
function installReferralMetrics(){
  const {slug,ref}=referralContext();
  if(slug&&ref){const key='chatshop_aff_click_'+slug+'_'+ref;if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');recordAffiliateMetric('click')}}
  if(document.body?.dataset.affiliateMetricsBound==='1')return;
  if(document.body)document.body.dataset.affiliateMetricsBound='1';
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#csvCheckout,#vsCheckout,.csv-checkout,.vs-checkout');
    if(!btn||btn.id==='csvCheckoutMp')return;
    const c=referralContext();if(!c.slug||!c.ref)return;
    const signature=c.slug+'_'+c.ref+'_'+Math.round(cartAttributedValue()*100);
    const key='chatshop_aff_order_'+signature;if(sessionStorage.getItem(key))return;
    sessionStorage.setItem(key,'1');setTimeout(()=>recordAffiliateMetric('order',cartAttributedValue()),50);
  },true);
  window.addEventListener('chatshop:mercadopago-checkout',e=>{
    const c=referralContext();if(!c.slug||!c.ref)return;
    const value=Number(e.detail?.value||cartAttributedValue()||0),key='chatshop_aff_mp_order_'+c.slug+'_'+c.ref+'_'+Math.round(value*100);
    if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1');recordAffiliateMetric('order',value);
  });
}
async function openAffiliateList(slug,base){
  const d=getDb();if(!d)return;let modal=$('#storeAffiliateModal');if(!modal){modal=document.createElement('div');modal.id='storeAffiliateModal';modal.style.cssText='position:fixed;inset:0;z-index:200;background:#0008;display:none;align-items:center;justify-content:center;padding:16px';modal.innerHTML='<div style="background:#fff;border-radius:16px;max-width:760px;width:100%;max-height:88vh;overflow:auto;padding:18px"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">📊 Métricas dos afiliados</h2><button id="closeStoreAffiliateModal" style="border:0;background:none;font-size:24px">×</button></div><div id="storeAffiliateList" style="margin-top:14px"></div></div>';document.body.appendChild(modal);$('#closeStoreAffiliateModal').onclick=()=>modal.style.display='none'}
  modal.style.display='flex';const list=$('#storeAffiliateList');list.innerHTML='<p>Carregando métricas...</p>';
  try{
    const storeSnap=await d.collection('chatshops').doc(slug).get(),store=storeSnap.data()||{};
    const directory=store.affiliateDirectory||{},metrics=store.affiliateMetricsSummary||{};
    const codes=[...new Set([...Object.keys(directory),...Object.keys(metrics)])];
    const rate=Math.max(0,Math.min(100,Number(store.affiliateProgram?.commissionPercent||0)));
    const rows=codes.map(code=>{const a=directory[code]||{},m=metrics[code]||{};return{affiliateCode:code,...a,clicks:Number(m.clickCount||0),orders:Number(m.orderCount||0),value:Number(m.orderValue||0)}}).sort((a,b)=>b.orders-a.orders||b.clicks-a.clicks);
    const totals=rows.reduce((t,a)=>({clicks:t.clicks+a.clicks,orders:t.orders+a.orders,value:t.value+a.value}),{clicks:0,orders:0,value:0});
    const cards=`<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:14px"><div style="padding:11px;border-radius:11px;background:#f3f4f6"><small>Afiliados</small><b style="display:block;font-size:21px">${rows.length}</b></div><div style="padding:11px;border-radius:11px;background:#eff6ff"><small>Cliques</small><b style="display:block;font-size:21px">${totals.clicks}</b></div><div style="padding:11px;border-radius:11px;background:#ecfdf5"><small>Pedidos atribuídos</small><b style="display:block;font-size:21px">${totals.orders}</b></div><div style="padding:11px;border-radius:11px;background:#fff7ed"><small>Comissão estimada</small><b style="display:block;font-size:18px">${brl(totals.value*rate/100)}</b></div></div><p style="font-size:11px;color:#6b7280">Área privada desta loja. Confirme o pagamento antes de liberar a comissão.</p>`;
    if(!rows.length){list.innerHTML=cards+'<p style="color:#6b7280">Nenhum afiliado cadastrado ainda. Os novos cadastros aparecerão aqui.</p>';return}
    list.innerHTML=cards+rows.map(a=>{const link=base+'/?ref='+encodeURIComponent(a.affiliateCode||''),conversion=a.clicks?((a.orders/a.clicks)*100).toFixed(1).replace('.',','):'0';return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:9px 0"><b>${safe(a.affiliateName||'Afiliado')}</b><div style="font-size:12px;color:#6b7280">${safe(a.affiliateEmail||'')} ${a.affiliateWhatsapp?'· '+safe(a.affiliateWhatsapp):''}</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:9px 0;font-size:12px"><span>👆 Cliques: <b>${a.clicks}</b></span><span>🛒 Pedidos: <b>${a.orders}</b></span><span>📈 Conversão: <b>${conversion}%</b></span><span>💰 Comissão estimada: <b>${brl(a.value*rate/100)}</b></span></div><div style="font-size:11px;word-break:break-all">${safe(link)}</div></div>`}).join('');
  }catch(e){console.error(e);list.innerHTML='<p style="color:#b91c1c">Não foi possível carregar as métricas desta loja.</p>'}
}
async function decorateDashboard(){
  if(!$('#storeGrid')||typeof db==='undefined'||!db)return;
  for(const card of document.querySelectorAll('#storeGrid .storecard')){
    if(card.dataset.urlReady==='1')continue;card.dataset.urlReady='1';const visit=card.querySelector('a.visit');if(!visit)continue;let u;try{u=new URL(visit.href)}catch(e){continue}const slug=u.hostname.split('.')[0];let data={};try{const s=await db.collection('chatshops').doc(slug).get();if(s.exists)data=s.data()||{}}catch(e){}
    const base=publicBase(slug,data);const url=document.createElement('div');url.style.cssText='font-size:11px;margin:8px 0;word-break:break-all;color:#4b5563';url.innerHTML=`🔗 <b>URL da loja:</b> <a href="${safe(base)}" target="_blank" rel="noopener">${safe(base)}</a> <button type="button" style="border:0;background:none;color:#6d28d9;font-weight:800;cursor:pointer">Copiar</button>`;url.querySelector('button').onclick=async()=>{try{await navigator.clipboard.writeText(base);if(typeof toast==='function')toast('URL copiada!')}catch(e){}};card.querySelector('.slugtag')?.insertAdjacentElement('afterend',url);
    if(data.planTier==='profissional'&&data.affiliateProgram?.enabled===true){const actions=card.querySelector('.cardbtns');if(actions&&!actions.querySelector('.affiliate-owner-btn')){const b=document.createElement('button');b.type='button';b.className='affiliate-owner-btn';b.textContent='📊 Métricas de afiliados';b.style.cssText='border:1px solid #059669;background:#fff;color:#047857;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer';b.onclick=()=>openAffiliateList(slug,base);actions.appendChild(b);const a=document.createElement('a');a.href=base+'/afiliados';a.target='_blank';a.rel='noopener';a.textContent='Cadastro';a.style.cssText='border:1px solid #059669;background:#ecfdf5;color:#047857;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700;text-decoration:none;text-align:center';actions.appendChild(a)}}
  }
}
function mentionInPlans(){document.querySelectorAll('#plansCols .plan-card').forEach(c=>{if(String(c.querySelector('h3')?.textContent||'').includes('Profissional')&&!String(c.textContent).includes('Programa de afiliados')){const lim=c.querySelector('.lim');if(lim)lim.insertAdjacentHTML('beforeend','<br>✅ Programa de afiliados por loja')}})}
function install(){ensureEditor();wrapCollect();wrapPopulate();wrapClear();updateAccess();decorateDashboard();referralTracking();installReferralMetrics();mentionInPlans();const body=document.body;if(body&&!body.dataset.affProgramObs){body.dataset.affProgramObs='1';let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>{ensureEditor();wrapCollect();wrapPopulate();wrapClear();updateAccess();decorateDashboard();referralTracking();mentionInPlans()},120)}).observe(body,{childList:true,subtree:true})}}
let n=0;(function wait(){n++;if(document.body){install();return}if(n<80)setTimeout(wait,100)})();
})();