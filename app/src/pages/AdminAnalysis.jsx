import { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import studentSeed from '../services/students_seed.json';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { BarChart3, Users, User, Download, FileText, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const COURSES = [
  "1° Básico", "2° Básico", "3° Básico", "4° Básico",
  "5° Básico", "6° Básico", "7° Básico", "8° Básico"
];

const LEVELS = {
  INSUFICIENTE: { label: 'Insuficiente', range: [1.0, 3.9], color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  ELEMENTAL: { label: 'Elemental', range: [4.0, 5.9], color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  ADECUADO: { label: 'Adecuado', range: [6.0, 7.0], color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }
};

const getLevel = (avg) => {
  const val = parseFloat(avg);
  if (isNaN(val) || val === 0) return null;
  if (val < 4.0) return 'INSUFICIENTE';
  if (val < 6.0) return 'ELEMENTAL';
  return 'ADECUADO';
};

export default function AdminAnalysis() {
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0]);
  const [analysisMode, setAnalysisMode] = useState('curso'); // 'curso' | 'estudiante'
  const [studentsInCourse, setStudentsInCourse] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [results, setResults] = useState(null);
  const reportRef = useRef(null);
  const barChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const individualBarRef = useRef(null);
  const barContainerRef = useRef(null);
  const doughContainerRef = useRef(null);
  const individualContainerRef = useRef(null);

  useEffect(() => {
    loadStudents();
  }, [selectedCourse]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      // 1. Uso de Estudiantes PERMANENTES (Desde el código local)
      const list = studentSeed
        .filter(s => s.curso === selectedCourse)
        .map(s => ({ id: s.rut, ...s })); // El ID ahora es el RUT para siempre

      list.sort((a,b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
      setStudentsInCourse(list);
      if (list.length > 0) setSelectedStudent(list[0].id);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const gradesRef = collection(db, 'notas');
      const snapG = await getDocs(gradesRef);
      const allGrades = [];
      snapG.forEach(d => allGrades.push(d.data()));

      if (analysisMode === 'curso') {
        runCourseAnalysis(allGrades);
      } else {
        runStudentAnalysis(allGrades);
      }
    } catch (err) {
      console.error(err);
    }
    setAnalyzing(false);
  };

  const runCourseAnalysis = (allGrades) => {
    const courseStudents = studentsInCourse.map(s => s.id);
    const courseGrades = allGrades.filter(g => courseStudents.includes(g.studentId));

    const stats = {
      s1: { INSUFICIENTE: 0, ELEMENTAL: 0, ADECUADO: 0 },
      s2: { INSUFICIENTE: 0, ELEMENTAL: 0, ADECUADO: 0 },
      mobility: { up: 0, down: 0, stable: 0 },
      details: []
    };

    studentsInCourse.forEach(st => {
      const stGrades = courseGrades.filter(g => g.studentId === st.id);
      
      // Calculate Semester Averages (excluding concept subjects)
      const validGrades = stGrades.filter(g => !g.subject.includes('Religi') && !g.subject.includes('Orientaci'));
      const s1Avgs = validGrades.filter(g => g.semester === 1).map(g => parseFloat(g.average)).filter(v => v > 0);
      const s2Avgs = validGrades.filter(g => g.semester === 2).map(g => parseFloat(g.average)).filter(v => v > 0);

      const avg1 = s1Avgs.length > 0 ? (s1Avgs.reduce((a,b) => a+b, 0) / s1Avgs.length).toFixed(1) : 0;
      const avg2 = s2Avgs.length > 0 ? (s2Avgs.reduce((a,b) => a+b, 0) / s2Avgs.length).toFixed(1) : 0;

      const level1 = getLevel(avg1);
      const level2 = getLevel(avg2);

      if (level1) stats.s1[level1]++;
      if (level2) stats.s2[level2]++;

      if (level1 && level2) {
        const priority = { INSUFICIENTE: 1, ELEMENTAL: 2, ADECUADO: 3 };
        if (priority[level2] > priority[level1]) stats.mobility.up++;
        else if (priority[level2] < priority[level1]) stats.mobility.down++;
        else stats.mobility.stable++;
      }

      stats.details.push({
        name: st.nombreCompleto,
        avg1, level1, avg2, level2
      });
    });

    setResults({ type: 'curso', data: stats });
  };

  const runStudentAnalysis = (allGrades) => {
    const st = studentsInCourse.find(s => s.id === selectedStudent);
    const stGrades = allGrades.filter(g => g.studentId === selectedStudent);

    const subjectAnalysis = stGrades.reduce((acc, g) => {
      if (!acc[g.subject]) acc[g.subject] = { s1: '-', s2: '-' };
      if (g.semester === 1) acc[g.subject].s1 = g.average;
      if (g.semester === 2) acc[g.subject].s2 = g.average;
      return acc;
    }, {});

    setResults({ type: 'estudiante', studentName: st.nombreCompleto, data: subjectAnalysis });
  };

  const exportPDF = async () => {
    if (!results) return;
    
    // Enable compression to keep file size under 1MB
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // PDF Header with Green background
    doc.setFillColor(46, 125, 50);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ESCUELA TRUF-TRUF', 20, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Administración Académica - Reporte de Análisis', 20, 28);
    doc.text(new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }), 20, 34);

    let y = 50;

    if (results.type === 'curso') {
      // --- Course Analysis Title ---
      doc.setTextColor(26, 35, 126);
      doc.setFontSize(16);
      doc.text(`Análisis de Curso: ${selectedCourse}`, 20, y);
      y += 10;

      // Stats Summary
      const { mobility } = results.data;
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text(`Resumen de Movilidad:`, 20, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(`• Alumnos que mejoraron: ${mobility.up}`, 25, y); y += 5;
      doc.text(`• Alumnos que descendieron: ${mobility.down}`, 25, y); y += 5;
      doc.text(`• Alumnos sin cambios: ${mobility.stable}`, 25, y); y += 10;

      // Charts - Reduced scale to 2 for size optimization
      try {
        if (barContainerRef.current) {
          const canvas = await html2canvas(barContainerRef.current, { scale: 2, logging: false, backgroundColor: '#ffffff' });
          const barImg = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG with 80% quality for size
          doc.addImage(barImg, 'JPEG', 20, y, 80, 50, undefined, 'FAST');
        }
        if (doughContainerRef.current) {
          const canvas = await html2canvas(doughContainerRef.current, { scale: 2, logging: false, backgroundColor: '#ffffff' });
          const doughImg = canvas.toDataURL('image/jpeg', 0.8);
          doc.addImage(doughImg, 'JPEG', 110, y, 60, 50, undefined, 'FAST');
        }
      } catch (e) { console.error("Error adding charts to PDF", e); }
      
      y += 60;

      // Table
      const tableData = results.data.details.map(d => {
        const priority = { INSUFICIENTE: 1, ELEMENTAL: 2, ADECUADO: 3 };
        let status = 'Igual';
        if (priority[d.level2] > priority[d.level1]) status = 'Mejoró';
        else if (priority[d.level2] < priority[d.level1]) status = 'Descendió';
        
        return [
          d.name,
          d.avg1 || '-',
          d.level1 ? LEVELS[d.level1].label : '-',
          d.avg2 || '-',
          d.level2 ? LEVELS[d.level2].label : '-',
          status
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['Estudiante', 'Prom S1', 'Nivel 1', 'Prom S2', 'Nivel 2', 'Estado']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [26, 35, 126] },
        styles: { fontSize: 8 },
        margin: { left: 20, right: 20 }
      });

    } else {
      // --- Student Analysis Title ---
      doc.setTextColor(26, 35, 126);
      doc.setFontSize(16);
      doc.text(`Análisis de Estudiante: ${results.studentName}`, 20, y);
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Curso: ${selectedCourse}`, 20, y);
      y += 15;

      // Chart - Reduced scale to 2 for size optimization
      try {
        if (individualContainerRef.current) {
          const canvas = await html2canvas(individualContainerRef.current, { scale: 2, logging: false, backgroundColor: '#ffffff' });
          const barImg = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG with 80% quality for size
          doc.addImage(barImg, 'JPEG', 20, y, 170, 70, undefined, 'FAST');
          y += 80;
        }
      } catch (e) { console.error("Error adding chart to PDF", e); }

      // Table
      const subjects = results.data;
      const labels = Object.keys(subjects);
      const tableData = labels.map(sub => {
        const s1 = parseFloat(subjects[sub].s1);
        const s2 = parseFloat(subjects[sub].s2);
        const diff = (s2 - s1).toFixed(1);
        return [
          sub,
          subjects[sub].s1,
          subjects[sub].s2,
          diff > 0 ? `+${diff}` : (diff === 'NaN' ? '-' : diff)
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['Asignatura', 'Prom S1', 'Prom S2', 'Variación']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] }, // Indigo-600
        styles: { fontSize: 9 },
        margin: { left: 20, right: 20 }
      });
    }
    
    // Page Number
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} - Generado por Brain Truf-Truf`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`Analisis_${results.type === 'curso' ? selectedCourse : results.studentName}_${new Date().toLocaleDateString()}.pdf`);
  };

  const renderCourseReport = () => {
    const { s1, s2, mobility, details } = results.data;

    const barDataS1 = [s1.INSUFICIENTE, s1.ELEMENTAL, s1.ADECUADO];
    const barDataS2 = [s2.INSUFICIENTE, s2.ELEMENTAL, s2.ADECUADO];

    const chartData = {
      labels: ['Insuficiente', 'Elemental', 'Adecuado'],
      datasets: [
        { label: 'Semestre 1', data: barDataS1, backgroundColor: 'rgba(54, 162, 235, 0.6)' },
        { label: 'Semestre 2', data: barDataS2, backgroundColor: 'rgba(255, 99, 132, 0.6)' }
      ]
    };

    const doughnutData = {
      labels: ['Mejoraron', 'Bajaron', 'Estables'],
      datasets: [{
        data: [mobility.up, mobility.down, mobility.stable],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b']
      }]
    };

    return (
      <div className="mt-8 animate-fade-in" ref={reportRef}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card glass text-center">
                <TrendingUp className="mx-auto mb-2 text-green-500" size={32} />
                <h2 className="text-2xl font-bold">{mobility.up}</h2>
                <p className="text-muted text-sm">Alumnos Mejoraron</p>
            </div>
            <div className="card glass text-center">
                <TrendingDown className="mx-auto mb-2 text-red-500" size={32} />
                <h2 className="text-2xl font-bold">{mobility.down}</h2>
                <p className="text-muted text-sm">Alumnos Descendieron</p>
            </div>
            <div className="card glass text-center">
                <Minus className="mx-auto mb-2 text-amber-500" size={32} />
                <h2 className="text-2xl font-bold">{mobility.stable}</h2>
                <p className="text-muted text-sm">Sin Cambios de Nivel</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="card glass">
                <h4 className="mb-4">Comparativa Semestral por Nivel</h4>
                <div ref={barContainerRef} style={{height: '300px', background: 'white', padding: '10px', borderRadius: '8px'}}>
                  <Bar ref={barChartRef} data={chartData} options={{ maintainAspectRatio: false }} />
                </div>
            </div>
            <div className="card glass">
                <h4 className="mb-4">Movilidad de Aprendizaje (%)</h4>
                <div ref={doughContainerRef} style={{height: '300px', display:'flex', justifyContent:'center', background: 'white', padding: '10px', borderRadius: '8px'}}>
                  <Doughnut ref={doughnutChartRef} data={doughnutData} options={{ maintainAspectRatio: false }} />
                </div>
            </div>
        </div>

        <div className="card glass">
            <h4 className="mb-6">Detalle de Variabilidad por Estudiante</h4>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre Completo</th>
                            <th className="text-center">S1</th>
                            <th className="text-center">S2</th>
                            <th className="text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.map((d, i) => (
                            <tr key={i}>
                                <td>{d.name}</td>
                                <td className="text-center">
                                    <span style={{color: LEVELS[d.level1]?.color || 'inherit', fontWeight: 'bold'}}>{d.avg1 || '-'}</span>
                                    {d.level1 && <div style={{fontSize:'10px', color:'var(--text-muted)'}}>{LEVELS[d.level1].label}</div>}
                                </td>
                                <td className="text-center">
                                    <span style={{color: LEVELS[d.level2]?.color || 'inherit', fontWeight: 'bold'}}>{d.avg2 || '-'}</span>
                                    {d.level2 && <div style={{fontSize:'10px', color:'var(--text-muted)'}}>{LEVELS[d.level2].label}</div>}
                                </td>
                                <td className="text-center">
                                    {d.level1 && d.level2 ? (
                                        (() => {
                                            const p = { INSUFICIENTE: 1, ELEMENTAL: 2, ADECUADO: 3 };
                                            if (p[d.level2] > p[d.level1]) return <TrendingUp className="text-green-500 mx-auto" />;
                                            if (p[d.level2] < p[d.level1]) return <TrendingDown className="text-red-500 mx-auto" />;
                                            return <Minus className="text-amber-500 mx-auto" />;
                                        })()
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    );
  };

  const renderStudentReport = () => {
    const subjects = results.data;
    const labels = Object.keys(subjects);
    const s1Data = labels.map(l => subjects[l].s1 === '-' ? 0 : parseFloat(subjects[l].s1));
    const s2Data = labels.map(l => subjects[l].s2 === '-' ? 0 : parseFloat(subjects[l].s2));

    const chartData = {
      labels,
      datasets: [
        { label: 'Semestre 1', data: s1Data, backgroundColor: 'rgba(54, 162, 235, 0.5)', borderColor: '#36a2eb', borderWidth: 1 },
        { label: 'Semestre 2', data: s2Data, backgroundColor: 'rgba(255, 99, 132, 0.5)', borderColor: '#ff6384', borderWidth: 1 }
      ]
    };

    return (
      <div className="mt-8 animate-fade-in" ref={reportRef}>
         <div className="card glass mb-8 border-l-4 border-indigo-500">
            <h3 className="text-indigo-600 mb-1">Análisis Individual: {results.studentName}</h3>
            <p className="text-muted text-sm">Visualización de rendimiento por asignatura y brecha semestral.</p>
         </div>

         <div className="card glass mb-8">
            <h4 className="mb-4">Progresión por Asignatura</h4>
            <div ref={individualContainerRef} style={{height: '350px', background: 'white', padding: '10px', borderRadius: '8px'}}>
               <Bar ref={individualBarRef} data={chartData} options={{ maintainAspectRatio: false }} />
            </div>
         </div>

         <div className="table-container">
            <table className="glass-table">
                <thead>
                    <tr><th>Asignatura</th><th className="text-center">Prom S1</th><th className="text-center">Prom S2</th><th className="text-center">Variación</th></tr>
                </thead>
                <tbody>
                    {labels.map((sub, i) => {
                        const s1 = parseFloat(subjects[sub].s1);
                        const s2 = parseFloat(subjects[sub].s2);
                        const diff = (s2 - s1).toFixed(1);
                        return (
                            <tr key={i}>
                                <td>{sub}</td>
                                <td className="text-center font-bold" style={{color: LEVELS[getLevel(s1)]?.color}}>{subjects[sub].s1}</td>
                                <td className="text-center font-bold" style={{color: LEVELS[getLevel(s2)]?.color}}>{subjects[sub].s2}</td>
                                <td className={`text-center font-bold ${diff > 0 ? 'text-green-500' : (diff < 0 ? 'text-red-500' : 'text-amber-500')}`}>
                                    {diff > 0 ? `+${diff}` : (diff === 'NaN' ? '-' : diff)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
         </div>
      </div>
    );
  };

  return (
    <div className="analysis-page">
      <div className="card glass-header">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-200">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Cerebro de Análisis Truf-Truf</h3>
                <p className="text-xs text-muted">Inteligencia de Datos para la Movilidad del Aprendizaje</p>
              </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
             <div className="flex items-center bg-white/50 p-1 rounded-lg border border-gray-200">
                <button 
                   onClick={() => setAnalysisMode('curso')} 
                   className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm ${analysisMode === 'curso' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                   <Users size={16} /> Curso
                </button>
                <button 
                   onClick={() => setAnalysisMode('estudiante')} 
                   className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm ${analysisMode === 'estudiante' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                   <User size={16} /> Estudiante
                </button>
             </div>

             <div className="flex items-center gap-3">
                <select 
                   value={selectedCourse} 
                   onChange={e => setSelectedCourse(e.target.value)}
                   className="select-custom"
                >
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {analysisMode === 'estudiante' && (
                  <select 
                    value={selectedStudent} 
                    onChange={e => setSelectedStudent(e.target.value)}
                    className="select-custom"
                    disabled={loading}
                  >
                    {studentsInCourse.map(s => <option key={s.id} value={s.id}>{s.nombreCompleto}</option>)}
                  </select>
                )}

                <button 
                   onClick={handleAnalyze} 
                   disabled={analyzing || loading} 
                   className="btn btn-primary shadow-lg shadow-indigo-100 flex items-center gap-2"
                >
                   {analyzing ? <div className="spinner-xs"></div> : <TrendingUp size={18} />}
                   {analyzing ? 'Procesando...' : 'Analizar'}
                </button>
             </div>
          </div>
        </div>
      </div>

      {!results && !analyzing && (
         <div className="welcome-analysis">
            <div className="text-center py-20">
               <div className="inline-block p-6 bg-white rounded-3xl shadow-2xl mb-6">
                 <img src="/logo.png" alt="Truf-Truf" style={{width: '80px', filter: 'grayscale(1)'}} />
               </div>
               <h3 className="text-xl font-bold text-gray-700">Listo para analizar</h3>
               <p className="text-muted max-w-sm mx-auto mt-2">Selecciona un parámetro arriba para generar gráficos de variabilidad y movilidad de aprendizaje.</p>
            </div>
         </div>
      )}

      {results && (
         <div className="report-canvas">
            <div className="flex justify-end mb-4">
               <button onClick={exportPDF} className="btn btn-secondary flex items-center gap-2 text-sm">
                  <Download size={16} /> Exportar Reporte PDF
               </button>
            </div>
            {results.type === 'curso' ? renderCourseReport() : renderStudentReport()}
         </div>
      )}

      <style>{`
        .glass-header {
           background: rgba(255, 255, 255, 0.7) !important;
           backdrop-filter: blur(10px);
           border-bottom: 3px solid #6366f1 !important;
        }
        .card.glass {
           background: rgba(255, 255, 255, 0.8) !important;
           backdrop-filter: blur(8px);
           border: 1px solid rgba(255, 255, 255, 0.5) !important;
           box-shadow: 0 8px 32px rgba(31, 38, 135, 0.07) !important;
           border-radius: 20px !important;
           padding: 1.5rem !important;
        }
        .select-custom {
           padding: 0.6rem 1rem;
           border-radius: 10px;
           border: 1px solid #e2e8f0;
           background: white;
           font-size: 0.9rem;
           color: #1e293b;
           outline: none;
           min-width: 150px;
        }
        .select-custom:focus {
           border-color: #6366f1;
           box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .animate-fade-in {
           animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
           from { opacity: 0; transform: translateY(10px); }
           to { opacity: 1; transform: translateY(0); }
        }
        .spinner-xs {
           width: 18px;
           height: 18px;
           border: 2px solid rgba(255,255,255,0.3);
           border-top-color: white;
           border-radius: 50%;
           animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
