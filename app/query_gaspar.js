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
  const q = query(collection(db, 'notas'), where('studentId', '==', '26.725.206-8'));
  const snap = await getDocs(q);
  console.log(`Found ${snap.size} notes for 26.725.206-8`);
  
  if (snap.size === 0) {
      // maybe the RUT in DB is different?
      const q2 = query(collection(db, 'notas'), where('course', '==', 'Pre-Kínder')); // Assume he is in some course
      const snap2 = await getDocs(q2);
      snap2.forEach(d => {
         if (d.data().studentId.includes('26.725')) {
             console.log("Found similar RUT: " + d.data().studentId);
         }
      });
      // Just check ALL students for his name or part of his RUT
      const snap3 = await getDocs(collection(db, 'notas'));
      snap3.forEach(d => {
         if (d.data().studentId.includes('26.725.206')) {
             console.log("Found similar RUT globally: " + d.data().studentId);
         }
      });
  } else {
      snap.forEach(d => console.log(d.id, d.data().subject));
  }
  process.exit(0);
}
main();
