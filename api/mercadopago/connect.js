const crypto = require('crypto');
const {
  env,
  platformReady,
  createState,
  pkceVerifier,
  pkceChallenge,
  verifyFirebaseUser,
  loadOwnedProfessionalStore,
} = require('./_lib');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!platformReady()) {
    return res.status(503).json({
      error: 'mercadopago_platform_not_configured',
      message: 'O ChatShop ainda precisa das credenciais OAuth da aplicação Mercado Pago.'
    });
  }
  try {
    const user = await verifyFirebaseUser(req);
    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const owned = await loadOwnedProfessionalStore(rawBody.slug, user);
    const nonce = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const state = createState({ uid: user.uid, slug: owned.slug, nonce, exp: expiresAt });
    const verifier = pkceVerifier(nonce);
    const challenge = pkceChallenge(verifier);
    const cfg = env();
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      response_type: 'code',
      platform_id: 'mp',
      state,
      redirect_uri: cfg.redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });
    return res.status(200).json({
      ok: true,
      authorizationUrl: `https://auth.mercadopago.com/authorization?${params.toString()}`,
      redirectUri: cfg.redirectUri
    });
  } catch (error) {
    console.error('Mercado Pago OAuth connect:', error && error.message ? error.message : error);
    const code = error && error.message ? error.message : 'connect_failed';
    const messages = {
      firebase_token_missing: 'Entre novamente no ChatShop.',
      firebase_token_invalid: 'Sua sessão expirou. Entre novamente no ChatShop.',
      invalid_store: 'Publique a loja antes de conectar o Mercado Pago.',
      store_not_found: 'Loja não encontrada.',
      not_store_owner: 'Esta loja não pertence à sua conta.',
      professional_plan_required: 'Mercado Pago está disponível somente no plano Profissional.'
    };
    return res.status(error.statusCode || 500).json({ error: code, message: messages[code] || 'Não foi possível iniciar a conexão com o Mercado Pago.' });
  }
};
