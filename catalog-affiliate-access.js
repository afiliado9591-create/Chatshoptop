/* ChatShop — acesso aos catálogos para afiliados.
   - Dridália Modas: catálogo completo liberado no Aprendiz.
   - Outros catálogos: seguem a flag liberadoGratis definida pelo admin.
   - Botão de afiliação usa o link cadastrado no catálogo.
*/
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function isDridalia(name){const n=norm(name);return n.includes('dridalia')||n.includes('didalia')||n.includes('dritalia')}
function isAdminUser(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function notify(msg){try{if(typeof toast==='function')return toast(msg)}catch(e){};alert(msg)}

function decorateAffiliateButton(){
  const a=$('#linkAfiliacaoParceiro');if(!a)return;
  a.textContent='🤝 Afiliar-se a este catálogo';
  a.title='Abrir cadastro de afiliado deste parceiro';
}

function unlockDridaliaForFree(){
  const list=$('#catalogoPickerLista');if(!list)return;
  $$('button[data-id]',list).forEach(btn=>{
    const name=btn.querySelector('span')?.textContent||btn.textContent||'';
    if(!isDridalia(name))return;
    btn.dataset.bloqueado='';
    btn.style.opacity='1';
    const spans=btn.querySelectorAll('span');
    const status=spans[spans.length-1];
    if(status){status.textContent='🎁 catálogo completo grátis';status.style.color='#15803d';status.style.fontWeight='800'}
    btn.dataset.catalogoDridalia='1';
  });
}

async function ensureDridaliaDatabaseFlag(){
  if(!isAdminUser())return;
  try{
    if(typeof db==='undefined'||!db)return;
    const snap=await db.collection('catalogos').limit(100).get();
    await Promise.all(snap.docs.filter(d=>isDridalia(d.data()?.nome)).map(d=>{
      if(d.data()?.liberadoGratis===true)return Promise.resolve();
      return d.ref.set({liberadoGratis:true,catalogoGratisPrincipal:true},{merge:true});
    }));
  }catch(e){console.warn('Não consegui marcar Dridália como catálogo grátis:',e)}
}

function decorateAdminCatalogs(){
  if(!isAdminUser())return;
  const list=$('#ctgLista');if(!list)return;
  $$('[data-ver]',list).forEach(ver=>{
    const row=ver.closest('div');if(!row)return;
    const name=row.querySelector('b')?.textContent||'';
    const id=ver.dataset.ver;
    const toggle=row.querySelector('[data-toggle]');
    if(toggle){
      toggle.textContent=/liberado pro plano grátis/i.test(row.textContent||'')?'Bloquear catálogo grátis':'Liberar catálogo grátis';
      toggle.title='Controle manual: define se o plano Grátis/Aprendiz pode usar este catálogo inteiro.';
    }
    if(isDridalia(name)){
      const status=row.querySelector('span');
      if(status){status.textContent='🎁 Catálogo grátis principal · Dridália';status.style.color='#15803d'}
      if(toggle){toggle.textContent='Dridália: grátis';toggle.disabled=true;}
    }
    if(!row.querySelector('[data-edit-affiliate-link]')){
      const b=document.createElement('button');b.type='button';b.className='btn';b.dataset.editAffiliateLink=id;
      b.style.cssText='font-size:11px;white-space:nowrap;background:#ecfdf5;color:#047857';
      b.textContent='🤝 Link de afiliação';
      b.onclick=async e=>{
        e.preventDefault();e.stopPropagation();
        try{
          const ref=db.collection('catalogos').doc(id),snap=await ref.get(),old=String(snap.data()?.linkAfiliacao||'');
          const value=prompt('Cole o link para o afiliado se cadastrar neste parceiro:',old);
          if(value===null)return;
          const link=String(value||'').trim();
          if(link&&!/^https?:\/\//i.test(link)){notify('O link precisa começar com http:// ou https://');return}
          await ref.set({linkAfiliacao:link},{merge:true});
          notify(link?'Link de afiliação salvo!':'Link de afiliação removido.');
        }catch(err){console.error(err);notify('Não foi possível salvar o link de afiliação.');}
      };
      ver.insertAdjacentElement('afterend',b);
    }
  });
}

function refresh(){decorateAffiliateButton();unlockDridaliaForFree();decorateAdminCatalogs()}
function boot(){
  decorateAffiliateButton();
  ensureDridaliaDatabaseFlag().finally(()=>setTimeout(refresh,100));
  refresh();
  const root=document.body;
  if(root&&!root.dataset.catalogAffiliateAccessObserved){
    root.dataset.catalogAffiliateAccessObserved='1';
    let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(refresh,70)}).observe(root,{childList:true,subtree:true});
  }
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#usarCatalogoBtn,#voltarCatalogos,#adminTabCatalogo,#ctgLista [data-ver]'))setTimeout(refresh,120);
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
