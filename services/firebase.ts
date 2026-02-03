import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration - using environment variables or defaults
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "AIzaSyBOV3YW5bxXwK7-7Kxxt4_-7MlKBLYXTfQ",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "your-project",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// ✅ Connect to local emulators in development
const useEmulator = (import.meta as any).env.VITE_USE_EMULATOR === 'true';

if (useEmulator && typeof window !== 'undefined') {
  try {
    // Firestore emulator
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
      console.log('🔥 Connected to Firestore Emulator');
    }

    // Functions emulator
    if (!process.env.FUNCTIONS_EMULATOR_HOST) {
      connectFunctionsEmulator(functions, '127.0.0.1', 5001);
      console.log('⚡ Connected to Functions Emulator');
    }
  } catch (error: any) {
    // Emulator might already be connected
    if (!error.message?.includes('Emulator already')) {
      console.warn('Emulator connection:', error.message);
    }
  }
}
