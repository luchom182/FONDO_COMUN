import { doc, onSnapshot, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app, db } from '../firebase';

export const cloudEnabled = import.meta.env.VITE_WORKSPACES_CLOUD_ENABLED === 'true';
const functions = getFunctions(app, 'us-central1');
if (import.meta.env.VITE_FIREBASE_EMULATORS === 'true') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export function subscribeWorkspace(id, onData, onError) {
  return onSnapshot(doc(db, 'savings_workspaces', id), { includeMetadataChanges: true }, snapshot => {
    onData(snapshot.exists() ? snapshot.data() : null, snapshot.metadata.fromCache);
  }, onError);
}

export async function callWorkspace(name, input) {
  if (!cloudEnabled) throw new Error('La sincronización de workspaces no está configurada en esta instalación.');
  try { return (await httpsCallable(functions, name, { timeout: 20000 })(input)).data; }
  catch (error) {
    if (['functions/unavailable', 'functions/internal', 'functions/deadline-exceeded', 'functions/not-found'].includes(error.code)) {
      throw new Error('No se pudo conectar con el servicio de workspaces. Revisa la conexión y el despliegue de Cloud Functions.');
    }
    throw error;
  }
}
