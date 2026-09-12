import { createFund, applyCommand } from '../../functions/domain.js';

const PREFIX = 'fondo_workspace_v1:';
const DIRECTORY = `${PREFIX}directory`;
export const ORIGINAL = { id: 'original', name: 'Almacén · Logística', mode: 'original' };
export const validId = id => typeof id === 'string' && /^(local-)?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
const key = id => `${PREFIX}${id}`;

function read(keyName) {
  const value = localStorage.getItem(keyName);
  return value ? JSON.parse(value) : null;
}

function write(keyName, value) {
  try { localStorage.setItem(keyName, JSON.stringify(value)); }
  catch { throw new Error('No se pudo guardar en este navegador. Revisa el espacio disponible y los permisos de almacenamiento.'); }
}

export function getDirectory() {
  try {
    const saved = read(DIRECTORY);
    return [ORIGINAL, ...(Array.isArray(saved) ? saved.filter(item => validId(item?.id) &&
      typeof item.name === 'string' && item.mode === (item.id.startsWith('local-') ? 'local' : 'cloud')) : [])];
  } catch { return [ORIGINAL]; }
}

export function rememberWorkspace(item) {
  const entries = getDirectory().filter(entry => entry.id !== 'original' && entry.id !== item.id);
  write(DIRECTORY, [...entries, { id: item.id, name: item.name, mode: item.mode }]);
  window.dispatchEvent(new Event('workspace-directory'));
}

export function readWorkspace(id) { return read(key(id)); }
export function cacheWorkspace(id, fund) { write(key(id), fund); }

export function parseWorkspaceLink(value) {
  let id = String(value || '').trim();
  if (!validId(id)) {
    try { id = new URL(id).searchParams.get('workspace'); } catch { /* validated below */ }
  }
  if (!validId(id) || id.startsWith('local-')) throw new Error('Pega un enlace o código de un workspace compartido válido.');
  return id;
}

export function shareLink(id) {
  const url = new URL(window.location.href);
  url.searchParams.set('workspace', id);
  url.hash = '';
  return url.toString();
}

async function passwordHash(value, salt) {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', encoder.encode(value), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt),
    iterations: 100000, hash: 'SHA-256' }, material, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function validatePasswords(password, recoveryKey) {
  if ([password, recoveryKey].some(value => typeof value !== 'string' || value.trim().length < 8 || value.length > 128)) {
    throw new Error('La clave de administrador y la de recuperación deben tener entre 8 y 128 caracteres.');
  }
}

async function localCredentials(password, recoveryKey) {
  validatePasswords(password, recoveryKey);
  const salt = crypto.randomUUID();
  return { salt, passwordHash: await passwordHash(password, salt),
    recoveryHash: await passwordHash(recoveryKey, salt), session: crypto.randomUUID() };
}

export async function createLocalWorkspace(input) {
  const id = `local-${crypto.randomUUID()}`;
  const fund = createFund(input);
  const credentials = await localCredentials(input.password, input.recoveryKey);
  // A single write makes creation atomic, including its local credentials.
  write(key(id), { fund, credentials });
  return { id, fund, token: credentials.session };
}

export async function accessLocalWorkspace(id, input) {
  const record = readWorkspace(id);
  if (!record?.credentials) throw new Error('Este workspace local no está disponible en este navegador.');
  const { credentials } = record;
  const value = input.recovery ? input.recoveryKey : input.password;
  if (typeof value !== 'string' || value.length > 128 || await passwordHash(value, credentials.salt) !==
      (input.recovery ? credentials.recoveryHash : credentials.passwordHash)) throw new Error('La clave ingresada es incorrecta.');
  if (input.recovery) {
    const nextCredentials = await localCredentials(input.newPassword, input.recoveryKey);
    const current = authorizedRecord(id, credentials.session);
    write(key(id), { ...current, credentials: nextCredentials });
    return { token: nextCredentials.session };
  }
  return { token: record.credentials.session };
}

function authorizedRecord(id, token) {
  const record = readWorkspace(id);
  if (!record?.credentials || record.credentials.session !== token) {
    throw new Error('Tu sesión venció. Ingresa nuevamente.');
  }
  return record;
}

export function mutateLocalWorkspace(id, token, command, revision) {
  const record = authorizedRecord(id, token);
  if (record.fund.revision !== revision) throw new Error('El fondo cambió en otra pestaña. Revisa los datos e intenta de nuevo.');
  const fund = applyCommand(record.fund, command, crypto.randomUUID());
  write(key(id), { ...record, fund });
  return { fund };
}

export async function changeLocalCredentials(id, token, input) {
  authorizedRecord(id, token);
  const credentials = await localCredentials(input.password, input.recoveryKey);
  // Read again after hashing: another tab may have changed the fund meanwhile.
  const record = authorizedRecord(id, token);
  write(key(id), { ...record, credentials });
  return { token: credentials.session };
}
