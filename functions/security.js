import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';

export function validateCredentials(password, recoveryKey) {
  for (const [value, label] of [[password, 'La clave'], [recoveryKey, 'La clave de recuperación']]) {
    if (typeof value !== 'string' || value.trim().length < 8 || value.length > 128) {
      throw new Error(`${label} debe tener entre 8 y 128 caracteres.`);
    }
  }
}

function hash(value, salt) { return scryptSync(value, salt, 64).toString('hex'); }
function equals(a, b) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function makeCredentials(password, recoveryKey) {
  validateCredentials(password, recoveryKey);
  const salt = randomBytes(16).toString('hex');
  return { salt, passwordHash: hash(password, salt), recoveryHash: hash(recoveryKey, salt),
    sessionSecret: randomBytes(32).toString('hex') };
}

export function verifyCredential(value, credentials, recovery = false) {
  return typeof value === 'string' && value.length <= 128 &&
    equals(hash(value, credentials.salt), recovery ? credentials.recoveryHash : credentials.passwordHash);
}

export function issueSession(id, credentials, now = Date.now()) {
  const expires = String(now + 8 * 60 * 60 * 1000);
  const signature = createHmac('sha256', credentials.sessionSecret).update(`${id}:${expires}`).digest('hex');
  return `${expires}.${signature}`;
}

export function verifySession(token, id, credentials, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 100) return false;
  const [expires, signature] = token.split('.');
  if (!/^\d+$/.test(expires) || Number(expires) <= now || !signature) return false;
  const expected = createHmac('sha256', credentials.sessionSecret).update(`${id}:${expires}`).digest('hex');
  return equals(signature, expected);
}
