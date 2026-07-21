import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0365610015",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1011537026315:web:9a8e51b2b2e4bfa0c6960e",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCe8CkRp8W2EaYLsUxpdioSqsfL4_MXtuY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0365610015.firebaseapp.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0365610015.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1011537026315",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-clouddeploy-e9c692e4-b2ca-4b82-8b61-737b68536430");

