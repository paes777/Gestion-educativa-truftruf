import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gestion-educativa-metrenco",
  appId: "1:547543511036:web:cdd3222f523f8558700c79",
  storageBucket: "gestion-educativa-metrenco.firebasestorage.app",
  apiKey: "AIzaSyB2cdrnvX-VjbNV77kiZw5iNAFyw1I9vB8",
  authDomain: "gestion-educativa-metrenco.firebaseapp.com",
  messagingSenderId: "547543511036"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
