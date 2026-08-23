/* ChatShop — painel do lojista para pedidos e rastreio. */
(function(){
'use strict';
if(!/^(www\.)?alibr\.com\.br$/i.test(location.hostname))return;
const $=(s,r)=>(r||document).querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function slug(){try{return String((typeof mySlug!=='undefined'&&mySlug)||$('#slug')?.value||'').trim()}catch(e){return String($('#slug')?.value||'').trim()}}
async function user(){try{return (typeof currentUser!=='undefined'&&currentUser)||await auth?.currentUser}catch(e){return null}}
function install(){
 if($('#ordersAdminPanel'))return true;const editor=$('#editorView .panel')||$('#editorView')||$('.panel');if(!editor)return false;
 const box=document.createElement('section');box.id='ordersAdminPanel';box.className='section';box.innerHTML='<h2>📦 Pedidos e rastreio</h2><p style="font-size:12px;color:#64748b">Consulte pagamentos e informe o envio para o cliente acompanhar em “Meus pedidos”.</p><button type="button" class="btn" id="loadOrders">Atualizar pedidos</button><div id="ordersAdminList" style="display:grid;gap:12px;margin-top:12px"></div>';editor.appendChild(box);$('#loadOrders').onclick=load;return true;
}
async function load(){
 const btn=$('#loadOrders'),list=$('#ordersAdminList'),s=slug(),u=await user();if(!s||!u){list.innerHTML='<p>Publique a loja e entre novamente para consultar pedidos.</p>';return}
 btn.disabled=true;btn.textContent='Consultando…';try{const token=await u.getIdToken();const r=await fetch('/api/mercadopago/status',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({slug:s,action:'orders'})});const j=await r.json();if(!r.ok)throw new Error(j.message||'Não foi possível consultar.');render(j.orders||[])}catch(e){list.innerHTML='<p style="color:#b91c1c">'+esc(e.message)+'</p>'}finally{btn.disabled=false;btn.textContent='Atualizar pedidos'}
}
function render(orders){
 const list=$('#ordersAdminList');if(!orders.length){list.innerHTML='<p style="color:#64748b">Nenhum pagamento encontrado ainda.</p>';return}
 list.innerHTML=orders.map(o=>{const t=o.tracking||{};return '<article data-order="'+esc(o.orderNumber)+'" style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#fff"><b>'+esc(o.orderNumber)+'</b><div style="margin:5px 0;color:#475569">'+esc(o.paymentStatus)+' · R$ '+Number(o.total||0).toLocaleString('pt-BR',{minimumFractionDigits:2})+'</div><select data-track="status" style="width:100%;padding:9px;margin:5px 0"><option value="">Status da entrega</option><option value="Preparando">Preparando</option><option value="Enviado">Enviado</option><option value="Entregue">Entregue</option></select><input data-track="carrier" value="'+esc(t.carrier||'')+'" placeholder="Transportadora" style="width:100%;padding:9px;margin:5px 0"><input data-track="code" value="'+esc(t.code||'')+'" placeholder="Código de rastreio" style="width:100%;padding:9px;margin:5px 0"><input data-track="url" value="'+esc(t.url||'')+'" placeholder="Link de rastreio" style="width:100%;padding:9px;margin:5px 0"><button type="button" class="btn success" data-save-track>Salvar rastreio</button><small data-save-status style="margin-left:8px"></small></article>'}).join('');
 orders.forEach(o=>{const card=list.querySelector('[data-order="'+CSS.escape(o.orderNumber)+'"]');const sel=card?.querySelector('[data-track="status"]');if(sel)sel.value=o.tracking?.status||''});
 list.querySelectorAll('[data-save-track]').forEach(b=>b.onclick=save);
}
async function save(e){
 const card=e.target.closest('[data-order]'),order=card.dataset.order,status=card.querySelector('[data-save-status]'),u=await user(),s=slug();if(!u||!s)return;
 const data={status:card.querySelector('[data-track="status"]').value,carrier:card.querySelector('[data-track="carrier"]').value.trim(),code:card.querySelector('[data-track="code"]').value.trim(),url:card.querySelector('[data-track="url"]').value.trim(),updatedAt:new Date().toISOString()};
 e.target.disabled=true;status.textContent='Salvando…';try{await db.collection('chatshops').doc(s).update({['orderTracking.'+order]:data});status.textContent='✅ Salvo'}catch(err){status.textContent='⚠️ Não foi possível salvar'}finally{e.target.disabled=false}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{let n=0,t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},250)});else{let n=0,t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},250)}
})();