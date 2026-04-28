// services\firebase.ts
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
} from "firebase/functions";

/* =========================================================
   ENV
========================================================= */
const env = import.meta.env;

/* =========================================================
   FIREBASE CONFIG
========================================================= */
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/* =========================================================
   INIT APP
========================================================= */
const app = initializeApp(firebaseConfig);

/* =========================================================
   SERVICES
========================================================= */
export const db = getFirestore(app);
export const functions = getFunctions(app);

/* =========================================================
   LOCAL EMULATORS
========================================================= */
const useEmulator = env.VITE_USE_EMULATOR === "true";

if (useEmulator && typeof window !== "undefined") {
  try {
    connectFirestoreEmulator(
      db,
      "127.0.0.1",
      Number(env.VITE_FIREBASE_EMULATOR_PORT || 8080)
    );
    console.log("🔥 Connected to Firestore Emulator");
  } catch (error: any) {
    if (!error.message?.includes("already")) {
      console.warn("Firestore Emulator:", error.message);
    }
  }

  try {
    connectFunctionsEmulator(
      functions,
      "127.0.0.1",
      Number(env.VITE_FUNCTIONS_EMULATOR_PORT || 5001)
    );
    console.log("⚡ Connected to Functions Emulator");
  } catch (error: any) {
    if (!error.message?.includes("already")) {
      console.warn("Functions Emulator:", error.message);
    }
  }
}