import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0365610015",
  appId: "1:1011537026315:web:9a8e51b2b2e4bfa0c6960e",
  apiKey: "AIzaSyCe8CkRp8W2EaYLsUxpdioSqsfL4_MXtuY",
  authDomain: "gen-lang-client-0365610015.firebaseapp.com",
  storageBucket: "gen-lang-client-0365610015.firebasestorage.app",
  messagingSenderId: "1011537026315",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, "ai-studio-clouddeploy-e9c692e4-b2ca-4b82-8b61-737b68536430");
