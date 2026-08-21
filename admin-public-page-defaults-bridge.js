(function(){
'use strict';
if(window.__CHATSHOP_PUBLIC_PAGE_DEFAULTS_BRIDGE)return;
window.__CHATSHOP_PUBLIC_PAGE_DEFAULTS_BRIDGE=true;
const originalFetch=window.fetch.bind(window);
const routes=[
  {id:'inicio',slug:'inicio',url:'/site',menuLabel:'Início'},
  {id:'chatshop',slug:'chatshop',url:'/p/chatshop',menuLabel:'Conheça o ChatShop'},
  {id:'politica-de-privacidade',slug:'politica-de-privacidade',url:'/p/politica-de-privacidade',menuLabel:'Privacidade'}
];
async function scrapePage(item){
  const response=await originalFetch(item.url,{cache:'no-store'});
  if(!response.ok)throw new Error('Falha ao carregar '+item.url);
  const html=await response.text();
  const doc=new DOMParser().parseFromString(html,'text/html');
  const main=doc.querySelector('main.page');
  const title=(doc.querySelector('title')?.textContent||item.menuLabel).replace(/\s*·\s*ChatShop\s*$/i,'').trim();
  const summary=doc.querySelector('meta[name="description"]')?.getAttribute('content')||'';
  return {id:item.id,slug:item.slug,title,menuLabel:item.menuLabel,summary,published:true,showInMenu:true,content:main?main.innerHTML.trim():''};
}
window.fetch=async function(input,init){
  const raw=typeof input==='string'?input:(input&&input.url)||'';
  if(raw.includes('/api/public-page.js?adminDefaults=1')){
    try{
      const pages=[];
      for(const item of routes)pages.push(await scrapePage(item));
      return new Response(JSON.stringify({pages}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
    }catch(error){
      return new Response(JSON.stringify({pages:[],error:String(error?.message||error)}),{status:500,headers:{'content-type':'application/json; charset=utf-8'}});
    }
  }
  return originalFetch(input,init);
};
})();
