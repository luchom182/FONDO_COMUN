import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCUUIMaeyV2KSgxQ-l8XcG4OANzK2ad9HM",
  authDomain: "fondo-comun-d5f57.firebaseapp.com",
  projectId: "fondo-comun-d5f57",
  storageBucket: "fondo-comun-d5f57.firebasestorage.app",
  messagingSenderId: "912910485866",
  appId: "1:912910485866:web:057657e34d3daa6de9fd13",
  measurementId: "G-DKDVWWQV7M"
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
