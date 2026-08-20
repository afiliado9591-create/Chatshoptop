/* ChatShop Admin — importação em massa de produtos por CSV no catálogo. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
let catalogId='';
let catalogName='';

function isAdminUser(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function database(){try{return typeof db!=='undefined'&&db?db:null}catch(e){return null}}
function notify(msg){try{if(typeof toast==='function')return toast(msg)}catch(e){};alert(msg)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function normHeader(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function detectSep(line){const semi=(line.match(/;/g)||[]).length,comma=(line.match(/,/g)||[]).length;return semi>comma?';':','}
function parseCsv(text){
  text=String(text||'').replace(/^\uFEFF/,'');
  const first=(text.split(/\r?\n/).find(x=>x.trim())||'');
  const sep=detectSep(first),rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    }else if(ch===sep&&!quoted){row.push(cell);cell='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){
      if(ch==='\r'&&text[i+1]==='\n')i++;
      row.push(cell);cell='';
      if(row.some(v=>String(v).trim()))rows.push(row);
      row=[];
    }else cell+=ch;
  }
  row.push(cell);if(row.some(v=>String(v).trim()))rows.push(row);
  if(rows.length<2)return[];
  const headers=rows.shift().map(normHeader);
  const aliases={
    name:['nome','produto','titulo','title','name'],
    price:['preco','valor','price'],
    image:['imagem','image','foto','url imagem','imagem url','image url'],
    link:['link','url','link shopee','url shopee','produto link','link produto'],
    category:['categoria','category'],
    description:['descricao','description','texto','descricao produto']
  };
  const indexes={};
  Object.entries(aliases).forEach(([key,names])=>{indexes[key]=headers.findIndex(h=>names.includes(h))});
  return rows.map(cols=>{
    const get=k=>indexes[k]>=0?String(cols[indexes[k]]||'').trim():'';
    return{name:get('name'),price:get('price'),image:get('image'),link:get('link'),category:get('category'),description:get('description')};
  }).filter(p=>p.name||p.link);
}
function sampleCsv(){return 'nome;preco;imagem;link shopee;categoria;descricao\nPanela de pressão MTA;199,90;https://exemplo.com/imagem.jpg;https://shopee.com.br/produto;Casa;Panela de pressão com visor e controle de segurança\nMochila escolar;89,90;https://exemplo.com/mochila.jpg;https://shopee.com.br/produto2;Mochilas;Mochila prática para uso diário';}
function downloadSample(){const blob=new Blob(['\uFEFF'+sampleCsv()],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='modelo-importacao-chatshop.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
function ensureImportButton(){
  if(!isAdminUser()||!catalogId)return;
  const box=$('#adminConteudo');if(!box||!$('#catNome',box)||$('#adminCsvImportBtn',box))return;
  const anchor=$('#catalogDefaultModelBox',box)||$('#catNome',box)?.closest('.field')||box.firstElementChild;
  const wrap=document.createElement('div');wrap.id='adminCsvImportWrap';wrap.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px';
  wrap.innerHTML='<button type="button" class="btn primary" id="adminCsvImportBtn">📥 Importar produtos em massa</button><button type="button" class="btn" id="adminCsvModelBtn">📄 Baixar modelo CSV</button>';
  anchor?.insertAdjacentElement('afterend',wrap);
  $('#adminCsvImportBtn',wrap).onclick=openModal;
  $('#adminCsvModelBtn',wrap).onclick=downloadSample;
}
function openModal(){
  if(!catalogId)return notify('Abra primeiro o catálogo onde deseja importar os produtos.');
  $('#adminCsvImportModal')?.remove();
  const modal=document.createElement('div');modal.id='adminCsvImportModal';modal.style.cssText='position:fixed;inset:0;z-index:1000;background:#0009;display:flex;align-items:flex-end;justify-content:center';
  modal.innerHTML=`<div style="background:#fff;width:min(700px,100%);max-height:92dvh;overflow:auto;border-radius:20px 20px 0 0;padding:18px">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b style="font-size:18px">📥 Importar produtos em massa</b><small style="display:block;color:#64748b;margin-top:4px">Catálogo: ${esc(catalogName||catalogId)}</small></div><button id="adminCsvClose" style="border:0;background:#f3f4f6;width:36px;height:36px;border-radius:50%;font-size:22px">×</button></div>
    <div class="notice" style="margin:14px 0">Use CSV com as colunas: <b>nome; preço; imagem; link shopee; categoria; descrição</b>. Você pode importar centenas de produtos de uma vez.</div>
    <input id="adminCsvFile" type="file" accept=".csv,text/csv" style="width:100%;padding:14px;border:1px dashed #a78bfa;border-radius:12px;background:#faf5ff">
    <div id="adminCsvPreview" style="font-size:13px;color:#475569;margin:12px 0">Nenhum arquivo selecionado.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="adminCsvDownload">📄 Baixar modelo CSV</button><button class="btn primary" id="adminCsvImport" disabled>🚀 Importar produtos</button></div>
    <div id="adminCsvProgress" style="margin-top:12px;font-weight:700;color:#5b21b6"></div>
  </div>`;
  document.body.appendChild(modal);
  const file=$('#adminCsvFile',modal),preview=$('#adminCsvPreview',modal),go=$('#adminCsvImport',modal),progress=$('#adminCsvProgress',modal);let products=[];
  $('#adminCsvClose',modal).onclick=()=>modal.remove();
  $('#adminCsvDownload',modal).onclick=downloadSample;
  file.onchange=async()=>{const f=file.files?.[0];if(!f){products=[];go.disabled=true;preview.textContent='Nenhum arquivo selecionado.';return}try{products=parseCsv(await f.text());go.disabled=!products.length;preview.innerHTML=products.length?`✅ <b>${products.length}</b> produto(s) encontrados. Primeiros: ${esc(products.slice(0,3).map(p=>p.name).filter(Boolean).join(', '))}`:'❌ Não encontrei produtos. Confira o cabeçalho do CSV.'}catch(e){console.error(e);products=[];go.disabled=true;preview.textContent='Não consegui ler este arquivo.'}};
  go.onclick=async()=>{
    if(!products.length||!catalogId)return;
    const d=database();if(!d)return notify('Banco de dados indisponível.');
    go.disabled=true;file.disabled=true;progress.textContent='Preparando importação...';
    let done=0;
    try{
      for(let start=0;start<products.length;start+=400){
        const chunk=products.slice(start,start+400),batch=d.batch();
        chunk.forEach((p,offset)=>{
          const ref=d.collection('catalogoGeral').doc();
          const data={
            catalogoId:catalogId,
            name:p.name||'Produto',nome:p.name||'Produto',
            price:p.price||'',preco:p.price||'',
            image:p.image||'',imageUrl:p.image||'',imagem:p.image||'',
            baseLink:p.link||'',link:p.link||'',
            category:p.category||'',categoria:p.category||'',
            description:p.description||'',displayText:p.description||'',cardDescription:p.description||'',
            useCatalogModel:true,source:'csv-shopee',order:start+offset,
            createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()
          };
          batch.set(ref,data);
        });
        await batch.commit();done+=chunk.length;progress.textContent=`Importando... ${done}/${products.length}`;
      }
      progress.textContent=`✅ ${done} produto(s) importados com sucesso.`;
      notify(`${done} produtos adicionados ao catálogo.`);
      setTimeout(()=>{try{document.querySelector('#ctgLista [data-ver="'+catalogId+'"]')?.click()}catch(e){}},700);
    }catch(e){console.error('import csv catalog',e);progress.textContent=`❌ A importação parou em ${done}/${products.length}.`;notify('Erro ao importar. Os produtos já concluídos foram mantidos.');}
    finally{go.disabled=false;file.disabled=false}
  };
}
function trackCatalog(e){
  const ver=e.target.closest?.('#ctgLista [data-ver]');
  if(!ver)return;
  catalogId=ver.dataset.ver||'';
  catalogName=ver.closest('div')?.querySelector('b')?.textContent||'';
  setTimeout(ensureImportButton,120);
}
function boot(){
  if(!isAdminUser())return;
  document.addEventListener('click',trackCatalog,true);
  const root=$('#adminConteudo');
  if(root)new MutationObserver(()=>setTimeout(ensureImportButton,60)).observe(root,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
