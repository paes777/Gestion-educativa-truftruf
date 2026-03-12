import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "metrenco-reservas-app",
  appId: "1:1080678458222:web:41c9785c702add6815577f",
  storageBucket: "metrenco-reservas-app.firebasestorage.app",
  apiKey: "AIzaSyBN17i1sN4hSOllyla4ASbzPWIgip552Jw",
  authDomain: "metrenco-reservas-app.firebaseapp.com",
  messagingSenderId: "1080678458222"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
