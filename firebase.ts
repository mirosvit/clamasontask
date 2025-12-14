import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration for sklad-ulohy
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

// Export the database for use in the application
export const db = getFirestore(app);
