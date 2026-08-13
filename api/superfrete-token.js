const crypto = require('crypto');

function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).send(JSON.stringify(body));
}

function keyFromEnv() {
  const secret = String(process.env.CHATSHOP_SUPERFRETE_SECRET || '').trim();
  if (!secret) return null;
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

function encryptToken(token, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método não permitido.' });
  const key = keyFromEnv();
  if (!key) {
    return send(res, 503, {
      error: 'A proteção do token SuperFrete ainda não foi ativada no servidor.',
      code: 'SUPERFRETE_SECRET_NOT_CONFIGURED'
    });
  }

  const token = String(req.body?.token || '').trim();
  if (!token || token.length < 20 || token.length > 5000) {
    return send(res, 400, { error: 'Informe um token SuperFrete válido.' });
  }

  try {
    const cipher = encryptToken(token, key);
    return send(res, 200, { ok: true, tokenCipher: cipher });
  } catch (error) {
    console.error('Erro ao proteger token SuperFrete:', error);
    return send(res, 500, { error: 'Não foi possível proteger o token agora.' });
  }
};
