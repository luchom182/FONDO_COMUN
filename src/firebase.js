import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const APP_DOC_REF = doc(db, "fondo_comun", "app_data");

/**
 * Escucha cambios en la base de datos Firestore en tiempo real.
 * @param {Function} onDataReceived Callback con los datos recibidos.
 * @param {Function} onError Callback en caso de error.
 * @returns Unsubscribe function
 */
export function subscribeToAppData(onDataReceived, onError) {
  return onSnapshot(
    APP_DOC_REF,
    (snapshot) => {
      if (snapshot.exists()) {
        onDataReceived(snapshot.data());
      } else {
        onDataReceived(null);
      }
    },
    (err) => {
      console.warn("Firestore snapshot error (usando fallback local):", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Guarda o actualiza los datos principales de la app en Firestore.
 * @param {Object} data Objeto con { title, quotaAmount, members, periods, payments, expenses }
 */
export async function saveAppData(data) {
  try {
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(APP_DOC_REF, {
      ...cleanData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error("Error guardando en Firestore:", err);
    return false;
  }
}
