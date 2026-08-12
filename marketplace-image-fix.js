(function(){
  'use strict';
  const style = document.createElement('style');
  style.id = 'marketplaceImageFixStyle';
  style.textContent = `
    #pubFeed.marketplace-final .mp-card{
      min-width:0!important;
      height:auto!important;
    }
    #pubFeed.marketplace-final .mp-image-wrap{
      display:block!important;
      position:relative!important;
      flex:0 0 auto!important;
      flex-shrink:0!important;
      width:100%!important;
      height:auto!important;
      aspect-ratio:1 / 1!important;
      overflow:hidden!important;
      background:#fff!important;
      border-bottom:1px solid #f0f0f0!important;
    }
    #pubFeed.marketplace-final .mp-image-wrap img{
      display:block!important;
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      max-height:none!important;
      object-fit:contain!important;
      background:#fff!important;
    }
    #pubFeed.marketplace-final .mp-noimg{
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      display:grid!important;
      place-items:center!important;
    }
    #pubFeed.marketplace-final .mp-info{
      flex:1 0 auto!important;
    }
    @media(max-width:560px){
      #pubFeed.marketplace-final .mp-image-wrap{
        min-height:150px!important;
      }
    }
  `;
  document.head.appendChild(style);
})();
