const {
  platformReady,
  verifyFirebaseUser,
  loadOwnedProfessionalStore,
} = require('./_lib');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const user = await verifyFirebaseUser(req);
    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const owned = await loadOwnedProfessionalStore(rawBody.slug, user);
    const c = owned.storeDoc.mercadoPagoConnection || {};
    return res.status(200).json({
      configured: platformReady(),
      eligible: true,
      connected: c.connected === true,
      provider: c.provider || 'mercadopago',
      userId: c.userId || '',
      connectedAt: c.connectedAt || '',
      expiresAt: c.expiresAt || ''
    });
  } catch (error) {
    const code = error && error.message ? error.message : 'status_failed';
    const messages = {
      firebase_token_missing: 'Entre novamente no ChatShop.',
      firebase_token_invalid: 'Sua sessão expirou. Entre novamente no ChatShop.',
      invalid_store: 'Publique a loja primeiro.',
      store_not_found: 'Loja não encontrada.',
      not_store_owner: 'Esta loja não pertence à sua conta.',
      professional_plan_required: 'Mercado Pago está disponível somente no plano Profissional.'
    };
    return res.status(error.statusCode || 500).json({
      configured: platformReady(), eligible: false, connected: false,
      error: code, message: messages[code] || 'Não foi possível consultar o Mercado Pago.'
    });
  }
};
