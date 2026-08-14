const {
  FIREBASE_API_KEY,
  env,
  platformReady,
  readState,
  encryptMerchantTokens,
  pkceVerifier,
  firestoreGet,
  parseJsonSafe,
} = require('./_lib');

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
function messagePage(title, message, ok = false) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{margin:0;font-family:Arial,sans-serif;background:#f5f3ff;color:#1f2937;min-height:100vh;display:grid;place-items:center;padding:20px}.card{max-width:520px;width:100%;background:#fff;border-radius:18px;padding:24px;box-shadow:0 10px 35px #312e8120;text-align:center}.icon{font-size:44px}.btn{display:inline-block;margin-top:16px;background:#6d28d9;color:#fff;text-decoration:none;padding:11px 16px;border-radius:10px;font-weight:800}</style></head><body><div class="card"><div class="icon">${ok?'✅':'⚠️'}</div><h2>${esc(title)}</h2><p>${esc(message)}</p><a class="btn" href="https://www.alibr.com.br/">Voltar ao ChatShop</a></div></body></html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).send(messagePage('Método não permitido', 'Abra esta página pelo botão Conectar Mercado Pago dentro do ChatShop.'));
  if (!platformReady()) return res.status(503).send(messagePage('Mercado Pago não configurado', 'A aplicação Mercado Pago do ChatShop ainda não está configurada no servidor.'));

  const errorParam = String(req.query && req.query.error || '').trim();
  if (errorParam) {
    const description = String(req.query && (req.query.error_description || req.query.error_message) || 'A autorização não foi concluída.');
    return res.status(400).send(messagePage('Conexão cancelada', description));
  }

  try {
    const code = String(req.query && req.query.code || '').trim();
    const stateRaw = String(req.query && req.query.state || '').trim();
    if (!code || !stateRaw) return res.status(400).send(messagePage('Autorização incompleta', 'O Mercado Pago não retornou os dados necessários para concluir a conexão.'));

    const state = readState(stateRaw);
    if (!state || !state.uid || !state.slug || !state.nonce || !state.exp || Date.now() > Number(state.exp)) {
      return res.status(400).send(messagePage('Autorização expirada', 'Volte ao ChatShop e toque em Conectar Mercado Pago novamente.'));
    }

    const store = await firestoreGet(`chatshops/${encodeURIComponent(state.slug)}`);
    if (!store || String(store.ownerUid || '') !== String(state.uid)) {
      return res.status(403).send(messagePage('Loja inválida', 'Não foi possível confirmar a loja desta autorização.'));
    }

    const cfg = env();
    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: cfg.redirectUri,
        code_verifier: pkceVerifier(state.nonce)
      })
    });
    const tokenData = await parseJsonSafe(tokenResponse);
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Mercado Pago OAuth token error:', tokenResponse.status, tokenData && (tokenData.message || tokenData.error || tokenData.cause));
      return res.status(400).send(messagePage('Não foi possível conectar', 'O Mercado Pago não aceitou a autorização. Volte ao ChatShop e tente novamente.'));
    }

    const connectedAt = new Date().toISOString();
    const expiresIn = Number(tokenData.expires_in || 0);
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : '';
    const vault = encryptMerchantTokens({
      accessToken: String(tokenData.access_token || ''),
      refreshToken: String(tokenData.refresh_token || ''),
      publicKey: String(tokenData.public_key || ''),
      userId: String(tokenData.user_id || ''),
      tokenType: String(tokenData.token_type || 'Bearer'),
      expiresIn,
      connectedAt,
      expiresAt
    });
    const connection = {
      connected: true,
      provider: 'mercadopago',
      userId: String(tokenData.user_id || ''),
      connectedAt,
      expiresAt,
      oauthVersion: 1
    };

    const firebaseConfig = {
      apiKey: FIREBASE_API_KEY,
      authDomain: 'chatshop-97ea3.firebaseapp.com',
      projectId: 'chatshop-97ea3'
    };
    const payload = { uid: String(state.uid), slug: String(state.slug), connection, vault };

    return res.status(200).send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conectar Mercado Pago · ChatShop</title><script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#f5f3ff;color:#1f2937;min-height:100vh;display:grid;place-items:center;padding:20px}.card{max-width:520px;width:100%;background:#fff;border-radius:18px;padding:24px;box-shadow:0 10px 35px #312e8120;text-align:center}.icon{font-size:48px}.muted{color:#6b7280;font-size:13px;line-height:1.5}.btn{display:inline-block;margin-top:14px;border:0;background:#6d28d9;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:900;cursor:pointer}.err{color:#b91c1c}</style></head><body><div class="card"><div class="icon">🔵</div><h2 id="title">Concluindo conexão...</h2><p id="msg" class="muted">Aguarde enquanto o ChatShop vincula esta conta Mercado Pago à sua loja.</p><a id="back" class="btn" href="https://www.alibr.com.br/" style="display:none">Voltar ao ChatShop</a></div><script>const CFG=${safeJson(firebaseConfig)},P=${safeJson(payload)};firebase.initializeApp(CFG);const db=firebase.firestore(),auth=firebase.auth(),title=document.getElementById('title'),msg=document.getElementById('msg'),back=document.getElementById('back');function fail(t){title.textContent='Não foi possível concluir';msg.textContent=t;msg.className='muted err';back.style.display='inline-block'}auth.onAuthStateChanged(async user=>{if(!user){fail('Sua sessão do ChatShop expirou. Entre novamente no ChatShop e repita a conexão.');return}if(user.uid!==P.uid){fail('A conta conectada no ChatShop não corresponde à autorização iniciada.');return}try{await db.collection('chatshops').doc(P.slug).set({mercadoPagoConnection:P.connection,mercadoPagoVault:P.vault},{merge:true});title.textContent='✅ Mercado Pago conectado';msg.textContent='A conta foi vinculada à loja com segurança. O lojista não precisa copiar nem colar token.';back.href='https://www.alibr.com.br/?mp=connected&slug='+encodeURIComponent(P.slug);back.textContent='Voltar para minha loja';back.style.display='inline-block'}catch(e){console.error(e);fail('A autorização foi aceita, mas o ChatShop não conseguiu salvar a conexão. Confira as regras do Firestore e tente novamente.')}});</script></body></html>`);
  } catch (error) {
    console.error('Mercado Pago OAuth callback:', error && error.message ? error.message : error);
    return res.status(400).send(messagePage('Não foi possível concluir', 'A autorização expirou ou ficou inválida. Volte ao ChatShop e conecte novamente.'));
  }
};
