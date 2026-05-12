import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAbNSjso0uA7l37T9wNl6YOXUxCkN9ZcqY",
  authDomain: "gestion-educativa-truf-truf.firebaseapp.com",
  projectId: "gestion-educativa-truf-truf",
  storageBucket: "gestion-educativa-truf-truf.firebasestorage.app",
  messagingSenderId: "1072537515072",
  appId: "1:1072537515072:web:d86e9f5abc8eb1d1191ba5",
  measurementId: "G-8L9736M245"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
