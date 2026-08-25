/* Blog Alibr — curtidas, compartilhamento e perfil público com contato. */
(function(){
'use strict';
if(window.__BLOG_ALIBR_SOCIAL__)return;
window.__BLOG_ALIBR_SOCIAL__=true;
const $=(s,r)=>(r||document).querySelector(s);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits=v=>String(v||'').replace(/\D/g,'');
const member=()=>{try{return auth.currentUser&&!auth.currentUser.isAnonymous?auth.currentUser:null}catch(e){return null}};
const getDb=()=>{try{return typeof db!=='undefined'?db:null}catch(e){return null}};
function initials(name){return String(name||'A').trim().split(/\s+/).slice(0,2).map(x=>x.charAt(0)).join('').toUpperCase()||'A'}
function safeHttps(v){try{const u=new URL(String(v||''));return u.protocol==='https:'?u.href:''}catch(e){return''}}
function installStyle(){
 if($('#blogSocialStyle'))return;
 const s=document.createElement('style');s.id='blogSocialStyle';s.textContent=
 '.blog-social-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:11px;border-top:1px solid #e5e7eb}.blog-social-btn{border:1px solid #dbe2ea;background:#fff;color:#334155;border-radius:999px;padding:8px 12px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.blog-social-btn:hover{background:#f8fafc}.blog-like.liked{background:#fee2e2;border-color:#fecaca;color:#b91c1c}.blog-profile-link{border:0;background:none;color:#2563eb;padding:0;font:inherit;font-size:12px;font-weight:850;text-decoration:underline;cursor:pointer}.blog-profile-link[href]{display:inline-block}.blog-social-note{font-size:11px;color:#64748b}.blog-back{display:inline-block;margin-bottom:14px;color:#1457d9;font-weight:900;text-decoration:none}.blog-profile-page{background:#fff;border:1px solid #dbe3ef;border-radius:18px;padding:22px;margin-bottom:18px;text-align:center}'+
 '.blog-profile-modal{position:fixed;inset:0;z-index:11000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.68)}.blog-profile-modal.open{display:flex}.blog-profile-card{width:min(100%,480px);max-height:90vh;overflow:auto;background:#fff;border-radius:20px;padding:22px;box-shadow:0 25px 75px rgba(0,0,0,.3);text-align:center}.blog-profile-close{float:right;border:0;background:none;color:#64748b;font-size:30px;line-height:1;cursor:pointer}.blog-public-avatar{width:92px;height:92px;margin:8px auto 12px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#dbeafe;color:#1d4ed8;font-size:30px;font-weight:900}.blog-public-avatar img{width:100%;height:100%;object-fit:cover}.blog-profile-card h2{margin:0 0 5px}.blog-profile-location{color:#64748b;font-size:13px;margin-bottom:12px}.blog-profile-bio{white-space:pre-wrap;line-height:1.5;color:#334155}.blog-profile-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:16px}.blog-profile-action{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:11px;padding:11px 15px;text-decoration:none!important;font-weight:900}.blog-profile-chat{background:#16a34a;color:#fff!important}.blog-profile-social{background:#e0e7ff;color:#3730a3!important}.blog-profile-status{padding:25px;color:#64748b}';
 document.head.appendChild(s);
}
function ensureModal(){
 if($('#blogPublicProfileModal'))return;
 const m=document.createElement('div');m.id='blogPublicProfileModal';m.className='blog-profile-modal';
 m.innerHTML='<section class="blog-profile-card" role="dialog" aria-modal="true"><button class="blog-profile-close" type="button" aria-label="Fechar">×</button><div id="blogPublicProfileContent" class="blog-profile-status">Carregando perfil...</div></section>';
 document.body.appendChild(m);$('.blog-profile-close',m).onclick=()=>m.classList.remove('open');m.onclick=e=>{if(e.target===m)m.classList.remove('open')};
}
function promptLogin(){const modal=$('#authModal');if(modal)modal.classList.add('on');else alert('Entre na sua conta Alibr para curtir.')}
function likeId(postId,uid){return String(postId)+'_'+String(uid)}
async function loadLikes(post,button){
 const d=getDb(),postId=post.dataset.postId;if(!d||!postId)return;
 try{
  const snap=await d.collection('blogLikes').where('postId','==',postId).limit(500).get();
  const u=member(),liked=!!u&&snap.docs.some(x=>x.data()?.ownerUid===u.uid);
  button.dataset.count=String(snap.size);button.classList.toggle('liked',liked);button.setAttribute('aria-pressed',liked?'true':'false');
  button.textContent=(liked?'❤️':'♡')+' Curtir · '+snap.size;
 }catch(e){console.warn('Curtidas indisponíveis:',e);button.textContent='♡ Curtir'}
}
async function toggleLike(post,button){
 const u=member();if(!u)return promptLogin();
 const d=getDb(),postId=post.dataset.postId;if(!d||!postId)return;
 button.disabled=true;
 try{
  const ref=d.collection('blogLikes').doc(likeId(postId,u.uid)),snap=await ref.get();
  if(snap.exists)await ref.delete();
  else await ref.set({postId:postId,ownerUid:u.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  await loadLikes(post,button);
 }catch(e){console.error(e);alert('Não foi possível registrar a curtida. Verifique as permissões do Firebase.')}
 finally{button.disabled=false}
}
function sharePost(post){
 const title=$('h2',post)?.textContent||'Publicação no Blog Alibr';
 const id=post.dataset.postId||'',slug=post.dataset.postSlug||id,url=new URL('/post/'+encodeURIComponent(slug),location.origin);
 const data={title:title,text:title+' — Blog Alibr',url:url.href};
 if(navigator.share){navigator.share(data).catch(()=>{})}
 else window.open('https://wa.me/?text='+encodeURIComponent(data.text+' '+data.url),'_blank','noopener');
}
async function profileHref(uid){
 if(!uid)return'#';
 try{const snap=await getDb().collection('profiles').doc(uid).get(),p=snap.exists?snap.data()||{}:{};return '/perfil/'+encodeURIComponent(p.slug||uid)}catch(e){return '/perfil/'+encodeURIComponent(uid)}
}
async function openProfile(uid,fallbackName){
 ensureModal();const modal=$('#blogPublicProfileModal'),content=$('#blogPublicProfileContent');modal.classList.add('open');content.className='blog-profile-status';content.textContent='Carregando perfil...';
 if(!uid){content.textContent='Este autor ainda não possui perfil público.';return}
 try{
  const snap=await getDb().collection('profiles').doc(uid).get();
  if(!snap.exists){content.textContent='Este autor ainda não preencheu o perfil público.';return}
  const p=snap.data()||{};if(p.public===false){content.textContent='Este perfil é privado.';return}
  const name=String(p.name||fallbackName||'Usuário Alibr'),photo=String(p.photo||''),phone=digits(p.whatsapp),social=safeHttps(p.social);
  let phoneIntl=phone;if(phoneIntl&&(phoneIntl.length===10||phoneIntl.length===11))phoneIntl='55'+phoneIntl;
  const chat=phoneIntl?'https://wa.me/'+phoneIntl+'?text='+encodeURIComponent('Olá, '+name+'! Encontrei seu perfil no Blog Alibr e quero conversar.'):'';
  const href='/perfil/'+encodeURIComponent(p.slug||uid);content.className='';content.innerHTML=
   '<div class="blog-public-avatar">'+(photo?'<img src="'+esc(photo)+'" alt="Foto de '+esc(name)+'">':esc(initials(name)))+'</div>'+
   '<h2>'+esc(name)+'</h2>'+(p.location?'<div class="blog-profile-location">📍 '+esc(p.location)+'</div>':'')+
   (p.bio?'<p class="blog-profile-bio">'+esc(p.bio)+'</p>':'<p class="blog-profile-bio">Este usuário ainda não escreveu uma apresentação.</p>')+
   '<div class="blog-profile-actions"><a class="blog-profile-action blog-profile-social" href="'+esc(href)+'">📄 Abrir perfil e postagens</a>'+
    (chat?'<a class="blog-profile-action blog-profile-chat" href="'+esc(chat)+'" target="_blank" rel="noopener">💬 Conversar no WhatsApp</a>':'')+
    (social?'<a class="blog-profile-action blog-profile-social" href="'+esc(social)+'" target="_blank" rel="noopener">🌐 Ver rede social</a>':'')+
   '</div>'+(chat?'':'<p class="blog-social-note">O usuário ainda não informou WhatsApp para contato.</p>');
 }catch(e){console.error(e);content.textContent='Não foi possível abrir este perfil.'}
}
function decorate(post){
 if(!post||post.dataset.socialReady==='1')return;const postId=post.dataset.postId;if(!postId)return;post.id='post-'+postId;post.dataset.socialReady='1';
 const body=$('.postbody',post),meta=$('.meta',post);if(!body)return;
 const uid=post.dataset.authorUid||'',fallback=String(meta?.textContent||'').replace(/^Por\s+/,'').split(' · ')[0];
 if(meta&&uid){const p=document.createElement('a');p.className='blog-profile-link';p.textContent='Ver perfil de '+fallback;p.href='/perfil/'+encodeURIComponent(uid);p.onclick=e=>{if(e.ctrlKey||e.metaKey)return;e.preventDefault();profileHref(uid).then(href=>location.href=href)};profileHref(uid).then(href=>p.href=href);meta.insertAdjacentElement('afterend',p)}
 const bar=document.createElement('div');bar.className='blog-social-bar';bar.innerHTML='<button class="blog-social-btn blog-like" type="button" aria-pressed="false">♡ Curtir</button><button class="blog-social-btn blog-share" type="button">↗ Compartilhar</button>';
 body.appendChild(bar);const like=$('.blog-like',bar);like.onclick=()=>toggleLike(post,like);$('.blog-share',bar).onclick=()=>sharePost(post);loadLikes(post,like);
}
function routePart(kind){const m=location.pathname.match(new RegExp('^/'+kind+'/([^/]+)/?$','i'));if(!m)return'';try{return decodeURIComponent(m[1])}catch(e){return m[1]}}
function setSeo(title,description,path){document.title=title;const d=document.querySelector('meta[name="description"]');if(d)d.content=description;const c=document.querySelector('link[rel="canonical"]');if(c)c.href=location.origin+path}
async function showPostRoute(slug){
 const feed=$('#feed');if(!feed)return;feed.innerHTML='<div class="skeleton"></div>';
 try{let snap=await getDb().collection('blogPosts').where('slug','==',slug).where('status','==','approved').limit(1).get(),doc=snap.docs[0];if(!doc){const byId=await getDb().collection('blogPosts').doc(slug).get();if(byId.exists&&byId.data().status==='approved')doc=byId}if(!doc)throw new Error('not-found');const p={id:doc.id,...doc.data()};document.querySelector('.hero').innerHTML='<a class="blog-back" href="/">← Voltar ao blog</a><h1>'+esc(p.title)+'</h1>';document.querySelector('.tabs').hidden=true;feed.style.gridTemplateColumns='minmax(0,760px)';feed.style.justifyContent='center';feed.innerHTML=postCard(p,false,true);setSeo(p.title+' — Blog Alibr',String(p.body||'').replace(/\s+/g,' ').slice(0,155),'/post/'+encodeURIComponent(p.slug||p.id));recordMetric('view',p.id)}catch(e){feed.innerHTML='<div class="empty">Publicação não encontrada ou ainda não aprovada.<br><br><a href="/">Voltar ao blog</a></div>'}
}
async function showProfileRoute(identifier){
 const feed=$('#feed');if(!feed)return;feed.innerHTML='<div class="skeleton"></div>';
 try{let profileDoc=null;const bySlug=await getDb().collection('profiles').where('slug','==',identifier).where('public','==',true).limit(1).get();profileDoc=bySlug.docs[0]||null;if(!profileDoc){const byId=await getDb().collection('profiles').doc(identifier).get();if(byId.exists&&byId.data().public!==false)profileDoc=byId}if(!profileDoc)throw new Error('not-found');const p=profileDoc.data()||{},uid=profileDoc.id,name=String(p.name||'Usuário Alibr'),photo=String(p.photo||'');const posts=await getDb().collection('blogPosts').where('authorUid','==',uid).where('status','==','approved').limit(80).get(),rows=posts.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));document.querySelector('.hero').innerHTML='<a class="blog-back" href="/">← Voltar ao blog</a><div class="blog-profile-page"><div class="blog-public-avatar">'+(photo?'<img src="'+esc(photo)+'" alt="Foto de '+esc(name)+'">':esc(initials(name)))+'</div><h1>'+esc(name)+'</h1>'+(p.location?'<div class="blog-profile-location">📍 '+esc(p.location)+'</div>':'')+(p.bio?'<p class="blog-profile-bio">'+esc(p.bio)+'</p>':'')+'<b>'+rows.length+' postagem'+(rows.length===1?'':'s')+'</b></div>';document.querySelector('.tabs').hidden=true;feed.innerHTML=rows.length?rows.map(x=>postCard(x)).join(''):'<div class="empty">Este perfil ainda não possui postagens aprovadas.</div>';setSeo(name+' — Perfil no Blog Alibr','Postagens e perfil público de '+name+'.','/perfil/'+encodeURIComponent(p.slug||uid))}catch(e){feed.innerHTML='<div class="empty">Perfil não encontrado ou privado.<br><br><a href="/">Voltar ao blog</a></div>'}
}
function scan(){document.querySelectorAll('.post').forEach(decorate)}
function boot(){installStyle();ensureModal();const postSlug=routePart('post'),profileSlug=routePart('perfil');if(postSlug)showPostRoute(postSlug);else if(profileSlug)showProfileRoute(profileSlug);else scan();const root=$('#feed')||document.body;new MutationObserver(()=>scan()).observe(root,{childList:true,subtree:true});window.addEventListener('alibr-profile-updated',()=>scan())}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
