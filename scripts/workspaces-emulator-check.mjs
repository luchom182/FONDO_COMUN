import assert from 'node:assert/strict';

// Run only against the demo project with firebase emulators:exec.
const project = 'demo-fondo-workspaces';
const base = `http://127.0.0.1:5001/${project}/us-central1`;
const firestore = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`;
async function call(name, data) {
  const response = await fetch(`${base}/${name}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
  return response.json();
}
const input = { name: 'Fondo de prueba', goalAmount: 100000, quotaAmount: 10000, deadline: '',
  password: 'clave-prueba-123', recoveryKey: 'recuperacion-prueba' };
const first = (await call('createSavingsWorkspace', input)).result;
assert.ok(first?.id, 'Creación remota');
const second = (await call('createSavingsWorkspace', { ...input, name: 'Otro fondo' })).result;
const url = `${firestore}/savings_workspaces/${first.id}`;
const publicResponse = await fetch(url);
assert.equal(publicResponse.status, 200, 'Consulta pública por enlace');
assert.ok(!JSON.stringify(await publicResponse.json()).includes('password'), 'Sin claves públicas');
assert.equal((await fetch(`${firestore}/workspace_secrets/${first.id}`)).status, 403, 'Secretos privados');
assert.equal((await fetch(`${firestore}/savings_workspaces`)).status, 403, 'No enumerar otros fondos');
assert.equal((await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { name: { stringValue: 'Intrusión' } } }) })).status, 403, 'Sin escrituras directas');
const command = { type: 'addMember', input: { name: 'Ana', phone: '' } };
assert.equal((await call('mutateSavingsWorkspace', { id: first.id, token: second.token, revision: 0, command })).error?.status, 'UNAUTHENTICATED');
const concurrent = await Promise.all([1, 2].map(() => call('mutateSavingsWorkspace', {
  id: first.id, token: first.token, revision: 0, command,
})));
assert.equal(concurrent.filter(response => response.result).length, 1, 'Solo una escritura de la revisión inicial');
assert.equal(concurrent.filter(response => response.error?.status === 'ABORTED').length, 1, 'Conflicto de versión explícito');
const fund = concurrent.find(response => response.result).result.fund;
const contribution = { type: 'addMovement', input: { type: 'contribution', amount: 20000,
  memberId: fund.members[0].id, date: '2026-09-09', description: 'Aporte compartido' } };
const paid = await call('mutateSavingsWorkspace', { id: first.id, token: first.token, revision: fund.revision, command: contribution });
assert.equal(paid.result.fund.movements.length, 1, 'Registrar aporte remoto');
assert.equal((await call('accessSavingsWorkspace', { id: first.id, password: 'incorrecta' })).error?.status, 'PERMISSION_DENIED');
assert.equal((await call('accessSavingsWorkspace', { id: first.id, recovery: true, recoveryKey: '8888', newPassword: 'nueva-clave-123' })).error?.status, 'PERMISSION_DENIED');
const recovered = await call('accessSavingsWorkspace', { id: first.id, recovery: true,
  recoveryKey: input.recoveryKey, newPassword: 'nueva-clave-123' });
assert.ok(recovered.result.token, 'Recuperación remota');
assert.equal((await call('mutateSavingsWorkspace', { id: first.id, token: first.token, revision: 2, command })).error?.status, 'UNAUTHENTICATED');
assert.ok((await call('accessSavingsWorkspace', { id: first.id, password: 'nueva-clave-123' })).result.token);
console.log('Emuladores: creación, consulta pública, aislamiento, permisos, concurrencia, aportes y recuperación OK.');
