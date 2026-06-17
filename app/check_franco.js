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
  // Franco's RUT is known from students_seed.json or we can just query by studentId
  // The screenshot shows "RIVERA SANDOVAL FRANCO AGUSTIN DAXON"
  // Let's get his RUT
  
  // Actually, we can just query ALL grades for "1° Básico" and find Franco
  const q = query(collection(db, 'notas'), where('course', '==', '1° Básico'));
  const snap = await getDocs(q);
  
  snap.forEach(d => {
     const data = d.data();
     if (data.subject && data.subject.includes('Lengua')) {
        console.log(`ID: ${d.id}`);
        console.log(`Student ID: ${data.studentId}`);
        console.log(`Subject: ${data.subject}`);
        console.log(`Grades:`, data.grades);
        console.log(`Average: ${data.average}`);
        console.log('---');
     }
  });
  console.log("Done");
  process.exit(0);
}

main();
