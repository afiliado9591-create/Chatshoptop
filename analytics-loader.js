/* Carrega Google Analytics somente a partir de um Measurement ID validado. */
(function(){
  'use strict';
  const id=String(document.querySelector('meta[name="chatshop-google-analytics-id"]')?.content||'').trim().toUpperCase();
  if(!/^G-[A-Z0-9]+$/.test(id)||window.__CHATSHOP_GA_LOADED)return;
  window.__CHATSHOP_GA_LOADED=id;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  window.gtag('js',new Date());
  window.gtag('config',id,{anonymize_ip:true});
  const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);document.head.appendChild(script);
})();
