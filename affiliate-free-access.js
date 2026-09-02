/* ChatShop — Ganhe dinheiro liberado para qualquer usuário logado, sem exigir plano pago. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function getDb(){try{return typeof db!=='undefined'&&db?db:null}catch(e){return null}}
function getUser(){try{return typeof currentUser!=='undefined'&&currentUser?currentUser:(window.auth?.currentUser||null)}catch(e){return null}}
function codeFor(uid,email){const base=String(email||uid||'usuario').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,10)||'usuario';return base+String(uid||'').slice(0,5).toLowerCase()}
function money(v){try{return typeof formatarReais==='function'?formatarReais(v):'R$ '+Number(v||0).toFixed(2).replace('.',',')}catch(e){return'R$ '+Number(v||0).toFixed(2).replace('.',',')}}
function commission(plan){try{return typeof calcularComissao==='function'?Number(calcularComissao(plan)||0):0}catch(e){return 0}}
async function openFreeAffiliate(){
  const box=$('#afiliadoConteudo'),modal=$('#afiliadoModal');
  if(!box||!modal)return;
  modal.style.display='flex';
  box.innerHTML='<p class="empty-hint">Preparando seu link de indicação...</p>';
  const user=getUser(),d=getDb();
  if(!user?.uid||!d){box.innerHTML='<p class="empty-hint">Entre na sua conta para receber seu link de indicação.</p>';return;}
  try{
    const ref=d.collection('users').doc(user.uid),snap=await ref.get();
    let code=snap.exists&&snap.data()?.affiliateCode;
    if(!code){code=codeFor(user.uid,user.email);await ref.set({affiliateCode:code,affiliateEnabled:true,affiliateEnabledAt:new Date().toISOString()},{merge:true});}
    else await ref.set({affiliateEnabled:true},{merge:true}).catch(()=>{});
    const link=`${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(code)}`;
    box.innerHTML=`
      <p style="line-height:1.5"><b>Seu link de indicação já está liberado.</b> Você não precisa assinar nenhum plano para indicar o ChatShop.</p>
      <div class="field"><label>Seu link de indicação</label><input id="afiliadoLink" value="${esc(link)}" readonly></div>
      <button class="btn dark" id="afiliadoCopiar" style="width:100%">Copiar link</button>
      <hr style="margin:16px 0;border:none;border-top:1px solid #eee">
      <p style="font-weight:700;font-size:14px;margin:0 0 8px">📊 Suas indicações</p>
      <div id="afiliadoIndicacoesLista"><p class="empty-hint">Carregando indicações...</p></div>`;
    $('#afiliadoCopiar').onclick=async()=>{try{await navigator.clipboard.writeText(link);if(typeof toast==='function')toast('Link copiado!');else alert('Link copiado!')}catch(e){const input=$('#afiliadoLink');input?.select();document.execCommand('copy');if(typeof toast==='function')toast('Link copiado!')}};
    const list=$('#afiliadoIndicacoesLista');
    try{
      const q=await d.collection('users').where('referredBy','==',code).get();
      if(q.empty){list.innerHTML='<p class="empty-hint">Você ainda não indicou ninguém. Compartilhe seu link!</p>';return;}
      let total=0;
      const rows=q.docs.map(doc=>{const u=doc.data()||{},c=commission(u.plan);total+=c;let planName=u.plan||'Básico';try{if(typeof PLANOS!=='undefined'&&PLANOS[u.plan])planName=PLANOS[u.plan].nome}catch(e){}return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13px"><span>${esc(u.email||'—')}<br><span style="font-size:11px;color:var(--muted)">Plano: ${esc(planName)}</span></span><b style="color:${c>0?'#16a34a':'var(--muted)'};white-space:nowrap">${c>0?money(c)+'/mês':'R$ 0,00'}</b></div>`}).join('');
      list.innerHTML=rows+`<div style="display:flex;justify-content:space-between;padding:10px 0 0;font-weight:800;font-size:14px"><span>Total estimado</span><span style="color:#16a34a">${money(total)}/mês</span></div>`;
    }catch(e){console.warn('Indicações:',e);list.innerHTML='<p class="empty-hint">Seu link está ativo. Não foi possível carregar as indicações agora.</p>';}
  }catch(e){console.error('Ganhe dinheiro:',e);box.innerHTML='<p class="empty-hint">Não foi possível gerar seu link agora. Tente novamente em instantes.</p>';}
}
function install(){
  window.abrirAfiliado=openFreeAffiliate;
  const btn=$('#afiliadoBtn');if(btn)btn.onclick=openFreeAffiliate;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{install();setTimeout(install,500)},{once:true});else{install();setTimeout(install,500)}
let n=0,t=setInterval(()=>{install();if(++n>40)clearInterval(t)},250);
})();
