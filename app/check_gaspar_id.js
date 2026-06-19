import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAbNSjso0uA7l37T9wNl6YOXUxCkN9ZcqY",
  authDomain: "gestion-educativa-truf-truf.firebaseapp.com",
  projectId: "gestion-educativa-truf-truf"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const qEst = query(collection(db, 'estudiantes'), where('rut', '==', '26.725.206-8'));
  const snapEst = await getDocs(qEst);
  if (!snapEst.empty) {
      const doc = snapEst.docs[0];
      console.log(`Found Gaspar with ID: ${doc.id}`);
      
      const qNotas = query(collection(db, 'notas'), where('studentId', '==', doc.id));
      const snapNotas = await getDocs(qNotas);
      console.log(`Found ${snapNotas.size} notes using his auto-generated ID`);
  } else {
      console.log("Could not find Gaspar in estudiantes");
  }
  process.exit(0);
}
main();
