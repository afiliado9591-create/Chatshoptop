/* ChatShop — Modelo 2 (chat por produto) como padrão global.
   O Modelo 1 (chat geral) só pode ser escolhido pelo administrador por projeto. */
(function(){
'use strict';
const DEFAULT_MODEL='product';
const $=(s,r)=>(r||document).querySelector(s);
let loadedModel=DEFAULT_MODEL;
function editorHost(){const h=location.hostname.toLowerCase();return h==='alibr.com.br'||h==='www.alibr.com.br'||h==='localhost'}
function adminUser(){try{return typeof isAdmin!=='undefined'&&isAdmin===true}catch(e){return false}}
function normalize(value){return String(value||'').toLowerCase()==='general'?'general':DEFAULT_MODEL}
function publicStore(){return window.__CHATSHOP_STORE_DATA||window.__CHATSHOP_STORE_FEATURE_DATA||window.__CHATSHOP_PUBLIC_STORE||null}
function releaseDirectPending(){
  if(editorHost())return false;
  const direct=!!(window.__CHATSHOP_DIRECT_STORE_ACTIVE||document.getElementById('chatshopDirectVirtualBootstrap'));
  if(!direct)return false;
  const root=$('#storefrontScreen');
  const data=publicStore();
  if(!data)return false;
  document.documentElement.classList.remove('chatshop-virtual-pending');
  if(root){
    root.style.setProperty('display','block','important');
    root.style.setProperty('visibility','visible','important');
  }
  return true;
}
function ensureStyle(){if($('#chatModelDefaultStyle'))return;const style=document.createElement('style');style.id='chatModelDefaultStyle';style.textContent=`body.chatshop-product-chat-default #pubChatToggle,body.chatshop-product-chat-default .pub-chat-toggle,body.chatshop-product-chat-default .global-chat-toggle,body.chatshop-product-chat-default .general-chat-button{display:none!important;visibility:hidden!important;pointer-events:none!important}`;document.head.appendChild(style)}
function applyPublicModel(){if(editorHost())return false;ensureStyle();const data=publicStore();if(!data)return false;const productDefault=normalize(data.chatModel)!=='general';document.body.classList.toggle('chatshop-product-chat-default',productDefault);document.body.classList.toggle('chatshop-general-chat-enabled',!productDefault);document.querySelectorAll('#pubChatToggle,.pub-chat-toggle,.global-chat-toggle,.general-chat-button').forEach(button=>{if(productDefault){button.style.setProperty('display','none','important');button.style.setProperty('visibility','hidden','important');button.style.setProperty('pointer-events','none','important')}else{button.style.removeProperty('display');button.style.removeProperty('visibility');button.style.removeProperty('pointer-events')}});if(productDefault)$('#pubChatOverlay')?.classList.remove('open');return true}
function ensureAdminControl(){if(!editorHost()||!adminUser())return false;let field=$('#chatModelAdminField');if(!field){const anchor=$('#virtualStoreFormatRecovery')||$('#storeType')?.closest('.field');if(!anchor)return false;field=document.createElement('div');field.id='chatModelAdminField';field.className='field affiliate-simple-only';field.style.cssText='margin:10px 0 14px;padding:12px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:12px';field.innerHTML='<label style="font-size:14px;font-weight:900;color:#1d4ed8">🛠️ Modelo do chat — somente administrador</label><select id="chatModelAdminSelect" style="margin-top:8px"><option value="product">Modelo 2 — chat do produto (padrão)</option><option value="general">Modelo 1 — chat geral da loja</option></select><small>O Modelo 1 fica oculto para usuários comuns. Use-o somente em um projeto específico.</small>';anchor.insertAdjacentElement('afterend',field);$('#chatModelAdminSelect',field).addEventListener('change',()=>{loadedModel=normalize($('#chatModelAdminSelect',field).value);try{window.debounce?.()}catch(e){}})}const select=$('#chatModelAdminSelect',field);if(select&&select.value!==loadedModel)select.value=loadedModel;field.style.setProperty('display','flex','important');return true}
function wrapEditor(){if(!editorHost())return;try{if(typeof window.collect==='function'&&!window.collect.__chatModelDefaultWrapped){const original=window.collect;function wrapped(){const data=original.apply(this,arguments)||{},select=$('#chatModelAdminSelect');data.chatModel=adminUser()&&select?normalize(select.value):loadedModel;return data}wrapped.__chatModelDefaultWrapped=true;window.collect=wrapped;try{collect=wrapped}catch(e){}}if(typeof window.populateForm==='function'&&!window.populateForm.__chatModelDefaultWrapped){const original=window.populateForm;async function wrapped(data){loadedModel=normalize(data?.chatModel);const result=await original.apply(this,arguments);setTimeout(ensureAdminControl,80);return result}wrapped.__chatModelDefaultWrapped=true;window.populateForm=wrapped;try{populateForm=wrapped}catch(e){}}if(typeof window.clearForm==='function'&&!window.clearForm.__chatModelDefaultWrapped){const original=window.clearForm;function wrapped(){loadedModel=DEFAULT_MODEL;const result=original.apply(this,arguments);setTimeout(ensureAdminControl,30);return result}wrapped.__chatModelDefaultWrapped=true;window.clearForm=wrapped;try{clearForm=wrapped}catch(e){}}}catch(e){console.warn('chat model default:',e)}}
function boot(){ensureStyle();wrapEditor();ensureAdminControl();releaseDirectPending();applyPublicModel();let tries=0;const timer=setInterval(()=>{tries++;wrapEditor();ensureAdminControl();releaseDirectPending();applyPublicModel();if(tries>=40)clearInterval(timer)},250);if(document.body)new MutationObserver(()=>{if(editorHost())ensureAdminControl();else{releaseDirectPending();applyPublicModel()}}).observe(document.body,{childList:true,subtree:true});setTimeout(releaseDirectPending,100);setTimeout(releaseDirectPending,500);setTimeout(releaseDirectPending,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
