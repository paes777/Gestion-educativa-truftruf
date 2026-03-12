import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const COURSES = [
  "Todos los cursos", "1° Básico", "2° Básico", "3° Básico", "4° Básico",
  "5° Básico", "6° Básico", "7° Básico", "8° Básico"
];

export default function AdminAnalysis() {
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ insuficiente: 0, elemental: 0, adecuado: 0 });
  const [studentsAvgs, setStudentsAvgs] = useState([]);

  useEffect(() => {
    loadAnalysisData(selectedCourse);
  }, [selectedCourse]);

  const loadAnalysisData = async (course) => {
    setLoading(true);
    try {
      // 1. Fetch Students
      let qStudents = collection(db, 'estudiantes');
      if (course !== "Todos los cursos") {
        qStudents = query(collection(db, 'estudiantes'), where('curso', '==', course));
      }
      const snapS = await getDocs(qStudents);
      const studentMap = {};
      snapS.forEach(d => { studentMap[d.id] = d.data(); });

      // 2. Fetch Grades for these students
      const qGrades = collection(db, 'notas');
      // En una BD real con miles se fraccionaría, aquí cargamos todo para analisis.
      const snapG = await getDocs(qGrades);
      
      const gradesByStudent = {};
      snapG.forEach(d => {
        const gradeData = d.data();
        if (studentMap[gradeData.studentId]) {
           if(!gradesByStudent[gradeData.studentId]) gradesByStudent[gradeData.studentId] = [];
           gradesByStudent[gradeData.studentId].push(gradeData.average || 0);
        }
      });

      let inS = 0, el = 0, ad = 0;
      const avgList = [];

      Object.keys(studentMap).forEach(sId => {
         const sgrades = gradesByStudent[sId];
         let finalAvg = 0;
         if (sgrades && sgrades.length > 0) {
             const sum = sgrades.reduce((acc, v) => acc + parseFloat(v), 0);
             finalAvg = sum / sgrades.length;
         }

         if (finalAvg > 0) {
           avgList.push({ name: studentMap[sId].nombreCompleto, avg: finalAvg });
           if (finalAvg < 4.0) inS++;
           else if (finalAvg < 6.0) el++;
           else ad++;
         }
      });

      setStats({ insuficiente: inS, elemental: el, adecuado: ad });
      setStudentsAvgs(avgList.sort((a,b) => b.avg - a.avg)); // mejor promedio arriba

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const hasData = stats.insuficiente > 0 || stats.elemental > 0 || stats.adecuado > 0;

  const chartData = {
    labels: ['Insuficiente (1.0 - 3.9)', 'Elemental (4.0 - 5.9)', 'Adecuado (6.0 - 7.0)'],
    datasets: [
      {
        label: 'Cantidad de Estudiantes',
        data: [stats.insuficiente, stats.elemental, stats.adecuado],
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',  // rojo
          'rgba(245, 158, 11, 0.7)', // amarillo/naranja
          'rgba(16, 185, 129, 0.7)'  // verde
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
          'rgb(16, 185, 129)'
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div>
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3>Análisis del Nivel de Logro</h3>
            <p className="text-muted mt-1">Nivel académico consolidado por estudiante en el curso seleccionado.</p>
          </div>
          <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} style={{width: '250px'}}>
            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-6"><div className="spinner"></div></div>
        ) : (
          <div>
             {!hasData ? (
                <div style={{padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-color)', borderRadius: '12px'}}>
                  <BarChart3 size={40} style={{color: 'var(--text-muted)', margin: '0 auto 1rem'}} />
                  <p className="text-muted">Aún no hay calificaciones subidas para emitir el análisis de nivel de logro en este curso.</p>
                </div>
             ) : (
                <div className="grid" style={{gridTemplateColumns: '1fr 2fr', gap: '2rem'}}>
                   <div style={{height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                     <h4 style={{marginBottom: '1rem', color: 'var(--text-muted)'}}>Distribución de Alumnos</h4>
                     <div style={{position: 'relative', width: '250px', height: '250px'}}>
                        <Doughnut data={chartData} options={{ maintainAspectRatio: false }} />
                     </div>
                   </div>
                   <div style={{height: '300px'}}>
                       <Bar 
                          data={chartData} 
                          options={{
                             maintainAspectRatio: false,
                             plugins: { legend: { display: false }},
                             scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                          }} 
                       />
                   </div>
                </div>
             )}
          </div>
        )}
      </div>

      {hasData && (
         <div className="card mt-6">
           <h3>Mejores Promedios del Curso</h3>
           <div className="table-container mt-4">
               <table>
                 <thead><tr><th>Estudiante</th><th style={{textAlign: 'right'}}>Promedio General</th></tr></thead>
                 <tbody>
                    {studentsAvgs.slice(0, 10).map((s, idx) => (
                       <tr key={idx}>
                          <td>{idx + 1}. {s.name}</td>
                          <td style={{textAlign: 'right', fontWeight: 'bold'}}>{s.avg.toFixed(1)}</td>
                       </tr>
                    ))}
                 </tbody>
               </table>
           </div>
         </div>
      )}
    </div>
  );
}
