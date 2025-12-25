
import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Konfigurácia pre projekt 'sklad-ulohy'
const firebaseConfig = {
  apiKey: "AIzaSyAfpO5WnMt-6lWI6i0XNpfcPGkbrMEpoo4",
  authDomain: "sklad-ulohy.firebaseapp.com",
  projectId: "sklad-ulohy",
  storageBucket: "sklad-ulohy.firebasestorage.app",
  messagingSenderId: "782478005476",
  appId: "1:782478005476:web:8b9d08723322cb6f3088f1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicializácia Firestore s vynúteným Long Pollingom (rieši firewally v továrňach)
// Odstránená vlastnosť useFetchStreams (TS2353 fix)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true
});

export const auth = getAuth(app);
