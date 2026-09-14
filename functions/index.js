import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { randomUUID, createHash } from 'node:crypto';
import { createFund, applyCommand } from './domain.js';
import { makeCredentials, verifyCredential, issueSession, verifySession } from './security.js';

initializeApp();
const db = getFirestore();
const options = { region: 'us-central1', maxInstances: 10 };

function refs(id) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) {
    throw new HttpsError('invalid-argument', 'El enlace del workspace no es válido.');
  }
  return { fund: db.doc(`savings_workspaces/${id}`), secret: db.doc(`workspace_secrets/${id}`) };
}

function checked(action) {
  return onCall(options, async request => {
    try { return await action(request); }
    catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('invalid-argument', error.message || 'No se pudo completar la operación.');
    }
  });
}

// Passwords and recovery keys never enter the publicly readable workspace document.
export const createSavingsWorkspace = checked(async ({ data }) => {
  const credentials = makeCredentials(data.password, data.recoveryKey);
  const fund = createFund(data);
  const id = randomUUID();
  const reference = refs(id);
  const batch = db.batch();
  batch.create(reference.fund, fund);
  batch.create(reference.secret, credentials);
  await batch.commit();
  return { id, fund, token: issueSession(id, credentials) };
});

export const accessSavingsWorkspace = checked(async request => {
  const { id, password, recoveryKey, newPassword } = request.data;
  const reference = refs(id);
  const recovery = request.data.recovery === true;
  const ip = request.rawRequest.ip || 'unknown';
  const attemptId = createHash('sha256').update(`${id}:${ip}`).digest('hex');
  const attemptRef = db.doc(`workspace_attempts/${attemptId}`);
  const result = await db.runTransaction(async tx => {
    const [secret, attempts] = await Promise.all([tx.get(reference.secret), tx.get(attemptRef)]);
    if (!secret.exists) throw new HttpsError('not-found', 'No se encontró el workspace.');
    const now = Date.now();
    const previous = attempts.data();
    const count = previous?.until > now ? previous.count : 0;
    if (count >= 10) throw new HttpsError('resource-exhausted', 'Demasiados intentos. Intenta de nuevo en 15 minutos.');
    let credentials = secret.data();
    if (!verifyCredential(recovery ? recoveryKey : password, credentials, recovery)) {
      tx.set(attemptRef, { count: count + 1, until: previous?.until > now ? previous.until : now + 900000 });
      return null;
    }
    if (recovery) {
      credentials = makeCredentials(newPassword, recoveryKey);
      tx.set(reference.secret, credentials);
    }
    tx.delete(attemptRef);
    return { token: issueSession(id, credentials) };
  });
  if (!result) throw new HttpsError('permission-denied', 'La clave ingresada es incorrecta.');
  return result;
});

export const mutateSavingsWorkspace = checked(async ({ data }) => {
  const { id, token, command, revision } = data;
  const reference = refs(id);
  return db.runTransaction(async tx => {
    const [snapshot, secret] = await Promise.all([tx.get(reference.fund), tx.get(reference.secret)]);
    if (!snapshot.exists || !secret.exists) throw new HttpsError('not-found', 'No se encontró el workspace.');
    if (!verifySession(token, id, secret.data())) throw new HttpsError('unauthenticated', 'Tu sesión venció. Ingresa nuevamente.');
    if (snapshot.data().revision !== revision) {
      throw new HttpsError('aborted', 'El fondo cambió en otro dispositivo. Revisa los datos e intenta de nuevo.');
    }
    const fund = applyCommand(snapshot.data(), command, randomUUID());
    tx.set(reference.fund, fund);
    return { fund };
  });
});

export const changeSavingsCredentials = checked(async ({ data }) => {
  const reference = refs(data.id);
  const credentials = makeCredentials(data.password, data.recoveryKey);
  return db.runTransaction(async tx => {
    const secret = await tx.get(reference.secret);
    if (!secret.exists || !verifySession(data.token, data.id, secret.data())) {
      throw new HttpsError('unauthenticated', 'Tu sesión venció. Ingresa nuevamente.');
    }
    tx.set(reference.secret, credentials);
    return { token: issueSession(data.id, credentials) };
  });
});
