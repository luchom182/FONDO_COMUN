// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { issueSession, makeCredentials, verifyCredential, verifySession } from '../../functions/security.js';

describe('Autorización de workspaces compartidos', () => {
  it('vincula sesiones al workspace, a su vigencia y a la versión de sus claves', () => {
    const credentials = makeCredentials('clave-larga-123', 'recuperacion-123');
    const token = issueSession('fondo-a', credentials, 1000);
    expect(verifySession(token, 'fondo-a', credentials, 1001)).toBe(true);
    expect(verifySession(token, 'fondo-b', credentials, 1001)).toBe(false);
    expect(verifySession(token, 'fondo-a', credentials, 1000 + 8 * 3600000)).toBe(false);
    expect(verifySession(`${token}x`, 'fondo-a', credentials, 1001)).toBe(false);
    expect(verifySession(token, 'fondo-a', makeCredentials('nueva-clave-123', 'recuperacion-123'), 1001)).toBe(false);
  });

  it('no comparte un hash entre contraseñas iguales y no acepta la recuperación heredada', () => {
    const a = makeCredentials('clave-larga-123', 'recuperacion-123');
    const b = makeCredentials('clave-larga-123', 'recuperacion-123');
    expect(a.passwordHash).not.toBe(b.passwordHash);
    expect(verifyCredential('clave-larga-123', a)).toBe(true);
    expect(verifyCredential('8888', a, true)).toBe(false);
    expect(verifyCredential('recuperacion-123', a, true)).toBe(true);
    expect(verifyCredential(null, a)).toBe(false);
  });
});
