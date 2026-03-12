import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "metrenco-reservas-app",
  appId: "1:1080678458222:web:41c9785c702add6815577f",
  storageBucket: "metrenco-reservas-app.firebasestorage.app",
  apiKey: "AIzaSyBN17i1sN4hSOllyla4ASbzPWIgip552Jw",
  authDomain: "metrenco-reservas-app.firebaseapp.com",
  messagingSenderId: "1080678458222"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  const email = "admin@metrenco.cl";
  const password = "admin123";

  try {
    console.log("Intentando crear usuario " + email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create the admin role document
    await setDoc(doc(db, "users", user.uid), {
      email: email,
      role: 'admin',
      name: 'Administrador Principal'
    });
    
    console.log("Administrador creado exitosamente: " + user.uid);
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
       console.log("El administrador ya existía en Auth. Verificando rol en Firestore...");
       // No podemos recuperar el UID fácilmente aquí sin el admin SDK si nos da este error.
       // Lo ideal es que el usuario simplemente ingrese.
       console.log("Por favor, dígale al usuario que ingrese con " + email + " y " + password);
    } else {
       console.error("Error al crear admin:", error);
    }
    process.exit(1);
  }
}

createAdmin();
