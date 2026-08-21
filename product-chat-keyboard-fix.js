/* ChatShop — mantém o campo do chat visível quando o teclado móvel abre. */
(function(){
'use strict';
function applyKeyboardFix(){
  var overlay=document.getElementById('spfProductChat');
  if(!overlay)return;
  var panel=overlay.querySelector('.spf-product-chat-panel');
  var input=overlay.querySelector('#spfProductInput');
  var messages=overlay.querySelector('#spfProductChatMessages');
  if(!panel||!input)return;
  function fit(){
    var vv=window.visualViewport;
    var h=vv?vv.height:window.innerHeight;
    var top=vv?vv.offsetTop:0;
    overlay.style.height=h+'px';
    overlay.style.top=top+'px';
    overlay.style.bottom='auto';
    panel.style.height=Math.min(h*0.76,720)+'px';
    panel.style.maxHeight='100%';
    requestAnimationFrame(function(){
      input.scrollIntoView({block:'nearest',behavior:'auto'});
      if(messages)messages.scrollTop=messages.scrollHeight;
    });
  }
  if(!overlay.dataset.keyboardFix){
    overlay.dataset.keyboardFix='1';
    input.addEventListener('focus',function(){setTimeout(fit,60);setTimeout(fit,250)});
    input.addEventListener('input',fit,{passive:true});
    input.addEventListener('blur',function(){setTimeout(fit,80)});
    if(window.visualViewport){
      visualViewport.addEventListener('resize',fit,{passive:true});
      visualViewport.addEventListener('scroll',fit,{passive:true});
    }
  }
  fit();
}
function boot(){
  applyKeyboardFix();
  var mo=new MutationObserver(function(){applyKeyboardFix()});
  mo.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
