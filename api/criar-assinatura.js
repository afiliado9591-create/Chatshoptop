const { env, parseJsonSafe } = require('../lib/mercadopago');

const PLANOS = {
  basico: { nome: 'ChatShop Básico', valor: 18.00 },
  profissional: { nome: 'ChatShop Profissional', valor: 49.90 }
};

function clean(v, max = 200) {
  return String(v || '').trim().slice(0, max);
}

function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
}

async function getPlatformAccessToken() {
  const direct = clean(
    process.env.MP_ACCESS_TOKEN ||
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
    500
  );
  if (direct) return direct;

  const cfg = env();
  if (!cfg.clientId || !cfg.clientSecret) return '';

  // Fallback para instalações que guardam apenas Client ID / Client Secret.
  // Se a conta Mercado Pago não aceitar client_credentials, a resposta abaixo
  // será tratada e a Vercel mostrará que é necessário cadastrar MP_ACCESS_TOKEN.
  try {
    const r = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret
      }).toString()
    });
    const j = await parseJsonSafe(r);
    if (r.ok && j && j.access_token) return String(j.access_token);
  } catch (_) {}
  return '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Método não permitido.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const plano = clean(body.plano, 30).toLowerCase();
    const cfgPlano = PLANOS[plano];
    const uid = clean(body.uid, 160);
    const email = clean(body.email, 180).toLowerCase();

    if (!cfgPlano) {
      return res.status(400).json({ error: 'invalid_plan', message: 'Plano inválido.' });
    }
    if (!uid || !validEmail(email)) {
      return res.status(400).json({ error: 'user_required', message: 'Usuário ou e-mail inválido. Entre novamente no ChatShop.' });
    }

    const accessToken = await getPlatformAccessToken();
    if (!accessToken) {
      return res.status(503).json({
        error: 'mp_credentials_missing',
        message: 'O pagamento ainda não está configurado. Cadastre MP_ACCESS_TOKEN nas variáveis de ambiente da Vercel.'
      });
    }

    const origin = 'https://www.alibr.com.br';
    const externalReference = `chatshop-plan:${uid}:${plano}:${Date.now()}`;
    const payload = {
      reason: cfgPlano.nome,
      external_reference: externalReference,
      payer_email: email,
      back_url: `${origin}/?assinatura=retorno&plano=${encodeURIComponent(plano)}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: cfgPlano.valor,
        currency_id: 'BRL'
      }
    };

    const r = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + accessToken,
        'x-idempotency-key': `chatshop-${uid}-${plano}-${Date.now()}`
      },
      body: JSON.stringify(payload)
    });
    const j = await parseJsonSafe(r);

    if (!r.ok || !j || !j.init_point) {
      console.error('MP subscription error:', r.status, j);
      const detail = j && (j.message || j.error || j.cause?.[0]?.description);
      return res.status(400).json({
        error: 'subscription_failed',
        message: detail ? `Mercado Pago: ${String(detail).slice(0, 220)}` : 'O Mercado Pago não conseguiu criar a assinatura agora.'
      });
    }

    return res.status(200).json({
      ok: true,
      init_point: j.init_point,
      checkoutUrl: j.init_point,
      subscriptionId: j.id || '',
      status: j.status || '',
      plano,
      valor: cfgPlano.valor
    });
  } catch (e) {
    console.error('criar-assinatura:', e);
    return res.status(500).json({
      error: 'subscription_exception',
      message: 'Não foi possível iniciar a assinatura. Tente novamente em instantes.'
    });
  }
};
