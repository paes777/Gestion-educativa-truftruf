import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, GraduationCap, FileLineChart } from 'lucide-react';

const COURSES = [
  "1° Básico", "2° Básico", "3° Básico", "4° Básico",
  "5° Básico", "6° Básico", "7° Básico", "8° Básico"
];

const SUBJECTS = [
  "Lenguaje y Comunicación", "Matemática", "Historia, Geografía y Cs. Sociales",
  "Ciencias Naturales", "Inglés", "Artes Visuales", "Música", "Educación Física y Salud", "Orientación", "Lengua Indígena", "Religión", "Tecnología"
];

export default function AdminReports({ allowedCourses }) {
  const initialCourse = (allowedCourses && allowedCourses.length > 0) ? allowedCourses[0] : COURSES[0];
  const [selectedCourse, setSelectedCourse] = useState(initialCourse);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (allowedCourses && allowedCourses.length > 0) {
       if (!allowedCourses.includes(selectedCourse)) setSelectedCourse(allowedCourses[0]);
    }
  }, [allowedCourses, selectedCourse]);

  useEffect(() => {
    loadStudents(selectedCourse);
  }, [selectedCourse]);

  const loadStudents = async (course) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'estudiantes'), where('curso', '==', course));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({id: d.id, ...d.data()}));
      list.sort((a,b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
      setStudents(list);
      if(list.length > 0) setSelectedStudent(list[0].id);
      else setSelectedStudent('');
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  const getBaseReportData = async (studentId) => {
     const st = students.find(s => s.id === studentId);
     if (!st) throw new Error("Estudiante no encontrado");
     
     // Obtener Notas
     const qNotas = query(collection(db, 'notas'), where('studentId', '==', studentId));
     const snapNotas = await getDocs(qNotas);
     const notas = [];
     snapNotas.forEach(d => notas.push(d.data()));

     // Obtener Asistencia
     const docAsistencia = await getDoc(doc(db, 'asistencias', studentId));
     const asistencia = docAsistencia.exists() ? docAsistencia.data() : null;

     // Obtener Observaciones (Asumiendo colleccion observaciones: doc ID = studentId)
     const docObs = await getDoc(doc(db, 'observaciones', studentId));
     const observaciones = docObs.exists() ? docObs.data() : { sem1: '', sem2: '' };

     return { student: st, notas, asistencia, observaciones };
  };

  const calculateAttendancePerc = (asistenciaObj) => {
      if(!asistenciaObj) return { worked: 0, total: 182, perc: 100 };
      let present = 0;
      Object.values(asistenciaObj).forEach(m => {
          present += (Number(m.present) || 0);
      });
      let perc = (present / 182) * 100;
      if (perc > 100) perc = 100;
      return { worked: present, total: 182, perc: perc.toFixed(1) };
  };

  const getImageFromUrl = (url) => {
      return new Promise((resolve) => {
          const img = new Image();
          img.src = url;
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
      });
  };

  const buildDocumentHeader = async (doc, headerText) => {
      const logo = await getImageFromUrl('/logo.png');
      if (logo) {
         const aspectRatio = logo.width / logo.height;
         const displayHeight = 22;
         const displayWidth = displayHeight * aspectRatio;
         // Optimization: Use JPEG and FAST compression
         doc.addImage(logo, 'JPEG', 14, 8, displayWidth, displayHeight, undefined, 'FAST');
      }
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text("ESCUELA METRENCO", 105, 15, null, null, "center");
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text("Educación Básica", 105, 20, null, null, "center");
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(headerText, 105, 28, null, null, "center");
  };

  const downloadAlumnoRegular = async () => {
     if(!selectedStudent) return;
     const st = students.find(s => s.id === selectedStudent);
     
     const doc = new jsPDF({ compress: true });
     
     // 1. Logo and Header Left
     const logo = await getImageFromUrl('/logo.png');
     if (logo) {
         const aspectRatio = logo.width / logo.height;
         const displayHeight = 25;
         const displayWidth = displayHeight * aspectRatio;
         // Optimization: Use JPEG and FAST compression
         doc.addImage(logo, 'JPEG', 14, 15, displayWidth, displayHeight, undefined, 'FAST');
     }
     
     doc.setFontSize(10);
     doc.setFont('helvetica', 'normal');
     doc.setTextColor(150, 150, 150);
     doc.text("Escuela Metrenco F-471", 38, 23);
     // Simulating an underline for the second element if needed, but simple text is fine
     doc.text("Municipalidad de Padre las Casas/", 38, 28);
     
     // 2. Date Right
     doc.setTextColor(0, 0, 0);
     const date = new Date();
     const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
     
     // Simulating the "Metrenco, _______________" filled with the actual date
     const dateStr = `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
     doc.text(`Metrenco, ${dateStr}`, 190, 50, null, null, "right");
     
     // 3. Title Center
     doc.setFontSize(16);
     doc.setFont('helvetica', 'bold');
     doc.text("CERTIFICADO DE ALUMNO REGULAR", 105, 80, null, null, "center");

     // 4. Body Content
     doc.setFontSize(12);
     doc.setFont('helvetica', 'normal');
     
     const text = `EUGENIO OMAR MANRIQUEZ NAVARRO, director de la Escuela Metrenco F - 471, certifica que ${st.nombreCompleto.toUpperCase()} RUT ${st.rut}, es alumno(a) regular de este establecimiento educacional y actualmente se encuentra matriculado para proceso lectivo del año ${date.getFullYear()} en ${st.curso}.`;
     const footerText = `Se extiende el presente certificado para los fines que estime conveniente.`;
     
     // Justify the body text
     doc.text(text, 20, 110, { maxWidth: 170, align: 'justify', lineHeightFactor: 1.5 });
     doc.text(footerText, 20, 140, { maxWidth: 170, align: 'justify' });

     // 5. Bottom Signatures
     doc.setFontSize(12);
     doc.setFont('helvetica', 'bold');
     doc.text("EUGENIO OMAR MANRIQUEZ NAVARRO", 105, 210, null, null, "center");
     doc.text("DIRECTOR", 105, 216, null, null, "center");
     doc.text("ESCUELA METRENCO F - 471", 105, 222, null, null, "center");

     doc.save(`Certificado_Alumno_Regular_${st.rut}.pdf`);
  };

  const generateInformeForStudentDoc = async (doc, stId, mode, isFirstPage) => {
      const data = await getBaseReportData(stId);
      const st = data.student;
      
      const title = mode === 'full' ? "INFORME COMPLETO DE NOTAS FINALES" : (mode === 's1' ? "INFORME DE NOTAS PARCIALES (1° SEM)" : "INFORME DE NOTAS PARCIALES (2° SEM)");
      
      if (!isFirstPage) doc.addPage();
      await buildDocumentHeader(doc, title);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("Nombre: ", 14, 38);
      doc.setFont('helvetica', 'normal');
      doc.text(st.nombreCompleto, 35, 38);
      
      doc.setFont('helvetica', 'bold');
      doc.text("RUT: ", 14, 44);
      doc.setFont('helvetica', 'normal');
      doc.text(st.rut, 25, 44);

      doc.setFont('helvetica', 'bold');
      doc.text("Curso: ", 150, 38);
      doc.setFont('helvetica', 'normal');
      doc.text(st.curso, 165, 38);

      // Tabla de Notas
      // Agrupar por asignaturas
      const subjectsMap = {}; // { 'Matematicas': { s1: avg, s2: avg, final: avg, grades1: [], grades2: [] } }
      
      // Initialize with all subjects to ensure they all appear
      SUBJECTS.forEach(sub => {
         subjectsMap[sub] = { s1: '-', s2: '-', final: '-', grades1: Array(10).fill(''), grades2: Array(10).fill('') };
      });

      data.notas.forEach(n => {
         if(!subjectsMap[n.subject]) {
            // Fallback for subjects not in the main list
            subjectsMap[n.subject] = { s1: '-', s2: '-', final: '-', grades1: Array(10).fill(''), grades2: Array(10).fill('') };
         }
         if(n.semester === 1) {
             subjectsMap[n.subject].s1 = n.average;
             subjectsMap[n.subject].grades1 = n.grades || Array(10).fill('');
         }
         if(n.semester === 2) {
             subjectsMap[n.subject].s2 = n.average;
             subjectsMap[n.subject].grades2 = n.grades || Array(10).fill('');
         }
      });

      let finalY = 48;
      const totals = { totalS1: 0, totalS2: 0, totalFinal: 0 };
      const counts = { countS1: 0, countS2: 0, countFinal: 0 };

      Object.keys(subjectsMap).forEach(sub => {
          let s1 = subjectsMap[sub].s1; // Ya viene con .toFixed(1) de Firestore o '-'
          let s2 = subjectsMap[sub].s2; // Ya viene con .toFixed(1) de Firestore o '-'
          let final = '-';
          
          if(s1 !== '-' && s2 !== '-') {
              // Promedio de promedios redondeados, redondeado a 1 decimal
              final = ((Number(s1) + Number(s2)) / 2).toFixed(1);
          } else if (s1 !== '-') {
              final = Number(s1).toFixed(1);
          } else if (s2 !== '-') {
              final = Number(s2).toFixed(1);
          }

          const isConcept = sub.includes('Religi') || sub.includes('Orientaci');
          
          if (!isConcept) {
              if (final !== '-') { 
                  totals.totalFinal += Number(final); 
                  counts.countFinal++; 
              }
              // Semestral Totals for general averages
              if(s1 !== '-') { totals.totalS1 += Number(s1); counts.countS1++; }
              if(s2 !== '-') { totals.totalS2 += Number(s2); counts.countS2++; }
          }
          
          subjectsMap[sub].final = final;
      });

      const toConcept = (val) => {
          if (!val || val === '-') return val;
          const n = Number(val);
          if (isNaN(n)) return val;
          if (n >= 6.0) return 'MB';
          if (n >= 5.0) return 'B';
          if (n >= 4.0) return 'S';
          return 'I';
      };

      const renderSemesterTable = (title, gradesKey, promKey, totalKey, countKey) => {
          const headParams = ["Asignatura"];
          for(let i=1; i<=10; i++) headParams.push(`N${i}`);
          headParams.push("PROM");

          const tableRows = [];
          Object.keys(subjectsMap).forEach(sub => {
              let avg = subjectsMap[sub][promKey];
              let grades = subjectsMap[sub][gradesKey];
              let row = [sub];
              
              const isConcept = sub.includes('Religi') || sub.includes('Orientaci');
              
              grades.forEach(g => row.push(isConcept ? toConcept(g) : (g || '')));
              row.push(isConcept ? toConcept(avg) : avg);
              tableRows.push(row);
          });

          const avgRow = ["PROMEDIO GENERAL SEMESTRE"];
          const generalAvg = counts[countKey] > 0 ? (totals[totalKey]/counts[countKey]).toFixed(1) : '-';
          for(let i=0; i<10; i++) avgRow.push(""); 
          avgRow.push(generalAvg);
          tableRows.push(avgRow);

          autoTable(doc, {
            startY: finalY,
            head: [[{ content: title, colSpan: 12, styles: { halign: 'center', fillColor: [13, 19, 88] } }], headParams],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [26, 35, 126], fontSize: 6.5, halign: 'center' },
            styles: { fontSize: 7, halign: 'center', cellPadding: 1 },
            columnStyles: { 0: { halign: 'left', minCellWidth: 50 } },
            didParseCell: function(dataTarget) {
               if (dataTarget.row.index === tableRows.length - 1 && dataTarget.section === 'body') {
                   dataTarget.cell.styles.fontStyle = 'bold';
                   dataTarget.cell.styles.fillColor = [232, 234, 246];
               }
            }
          });
          finalY = doc.lastAutoTable.finalY + 4;
      };

      if (mode === 's1' || mode === 'full') {
          renderSemesterTable("CALIFICACIONES: PRIMER SEMESTRE", "grades1", "s1", "totalS1", "countS1");
      }
      if (mode === 's2' || mode === 'full') {
          renderSemesterTable("CALIFICACIONES: SEGUNDO SEMESTRE", "grades2", "s2", "totalS2", "countS2");
      }
      
      // Summary Averages Table
      if (mode === 'full') {
          const s1Gen = counts.countS1 > 0 ? (totals.totalS1 / counts.countS1).toFixed(1) : '-';
          const s2Gen = counts.countS2 > 0 ? (totals.totalS2 / counts.countS2).toFixed(1) : '-';
          const finalGen = counts.countFinal > 0 ? (totals.totalFinal / counts.countFinal).toFixed(1) : '-';

          autoTable(doc, {
            startY: finalY,
            margin: { left: 14, right: 14 },
            head: [[{ content: "RESUMEN DE PROMEDIOS", colSpan: 2, styles: { halign: 'center', fillColor: [13, 19, 88] } }]],
            body: [
              ["Promedio General 1° Semestre", s1Gen],
              ["Promedio General 2° Semestre", s2Gen],
              [{ content: "PROMEDIO GENERAL ANUAL", styles: { fontStyle: 'bold', fillColor: [26, 35, 126], textColor: 255 } }, 
               { content: finalGen, styles: { fontStyle: 'bold', fillColor: [26, 35, 126], textColor: 255 } }]
            ],
            theme: 'grid',
            styles: { fontSize: 8.5, cellPadding: 1.5 },
            columnStyles: { 
              0: { cellWidth: 151 },
              1: { cellWidth: 40, halign: 'center' }
            }
          });
          finalY = doc.lastAutoTable.finalY + 5;
      }

      // Asistencia
      const attendance = calculateAttendancePerc(data.asistencia);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("Porcentaje de Asistencia Anual:", 14, finalY);
      doc.setFont('helvetica', 'normal');
      doc.text(`${attendance.perc}%`, 70, finalY);

      finalY += 7;
      
      // Observaciones
      const obs = data.observaciones;
      if (mode === 's1' || mode === 'full') {
         doc.setFont('helvetica', 'bold');
         doc.setFontSize(9);
         doc.text("Observación Semestre 1:", 14, finalY);
         doc.setFont('helvetica', 'normal');
         doc.text(doc.splitTextToSize(obs.sem1 || "Sin observaciones.", 180), 14, finalY + 4);
         finalY += 10;
      }

      if (mode === 's2' || mode === 'full') {
         doc.setFont('helvetica', 'bold');
         doc.setFontSize(9);
         doc.text("Observación Semestre 2:", 14, finalY);
         doc.setFont('helvetica', 'normal');
         doc.text(doc.splitTextToSize(obs.sem2 || "Sin observaciones.", 180), 14, finalY + 4);
         finalY += 7;
      }

      // Firmas
      finalY = Math.min(finalY + 12, 305);
      if (finalY < 285) finalY = 285; 

      doc.setLineDashPattern([1, 1], 0);
      doc.line(30, finalY, 80, finalY);
      doc.line(130, finalY, 180, finalY);
      doc.setFont('helvetica', 'bold');
      doc.text("PROFESOR(A) JEFE", 55, finalY + 5, null, null, "center");
      doc.text("DIRECCIÓN", 155, finalY + 5, null, null, "center");
      
      return st; // Return student data for file naming
  };
      
  const downloadInformeCompleto = async (mode = 'full') => { 
      if(!selectedStudent) return;
      setLoading(true);
      try {
        const doc = new jsPDF({ format: [219, 330], compress: true }); 
        const st = await generateInformeForStudentDoc(doc, selectedStudent, mode, true);
        doc.save(`Informe_Notas_${st.rut}_${mode}.pdf`);
      } catch (err) {
        console.error(err);
        alert("Error al generar el PDF.");
      }
      setLoading(false);
  };

  const downloadInformeCurso = async (mode = 'full') => {
      if(students.length === 0) return;
      setLoading(true);
      try {
        const doc = new jsPDF({ format: [219, 330], compress: true }); 
        for (let i = 0; i < students.length; i++) {
            await generateInformeForStudentDoc(doc, students[i].id, mode, i === 0);
        }
        doc.save(`Informes_${selectedCourse}_${mode}.pdf`);
      } catch (err) {
        console.error(err);
        alert("Error al generar los PDFs del curso.");
      }
      setLoading(false);
  };

  return (
    <div className="grid" style={{gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
      <div className="card">
        <h3>Selección de Estudiante</h3>
        <p className="text-muted mt-2 mb-4">Seleccione un curso y luego un estudiante para habilitar las opciones de descarga.</p>
        
        <div className="grid gap-4">
          <div>
            <label>Curso</label>
            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} disabled={allowedCourses && allowedCourses.length === 1}>
               {allowedCourses && allowedCourses.length > 0 ? (
                  allowedCourses.map(c => <option key={c} value={c}>{c}</option>)
               ) : (
                  COURSES.map(c => <option key={c} value={c}>{c}</option>)
               )}
            </select>
          </div>
          
          <div>
             <label>Estudiante</label>
             {loading ? <p className="text-muted text-sm mt-2">Cargando...</p> : (
               <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                 {students.length === 0 ? <option value="">Sin estudiantes</option> : null}
                 {students.map(s => <option key={s.id} value={s.id}>{s.nombreCompleto}</option>)}
               </select>
             )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="card">
          <h3>Documentos Disponibles</h3>
          <p className="text-muted mt-2 mb-4">Haz clic para generar el documento en formato PDF.</p>

          <div className="grid gap-4">
            <button 
               onClick={downloadAlumnoRegular}
               className="btn btn-secondary justify-between" 
               style={{textAlign: 'left'}}
               disabled={!selectedStudent}
            >
               <span className="flex items-center gap-4"><GraduationCap size={20} /> Certificado Alumno Regular</span>
               <FileDown size={18} />
            </button>
            
            <button 
               onClick={() => downloadInformeCompleto('s1')}
               className="btn btn-secondary justify-between" 
               style={{textAlign: 'left'}}
               disabled={!selectedStudent}
            >
               <span className="flex items-center gap-4"><FileLineChart size={20} /> Informe Notas Parciales (1° Sem)</span>
               <FileDown size={18} />
            </button>

            <button 
               onClick={() => downloadInformeCompleto('s2')}
               className="btn btn-secondary justify-between" 
               style={{textAlign: 'left'}}
               disabled={!selectedStudent}
            >
               <span className="flex items-center gap-4"><FileLineChart size={20} /> Informe Notas Parciales (2° Sem)</span>
               <FileDown size={18} />
            </button>

            <button 
               onClick={() => downloadInformeCompleto('full')}
               className="btn btn-primary justify-between" 
               style={{textAlign: 'left'}}
               disabled={!selectedStudent}
            >
               <span className="flex items-center gap-4"><FileLineChart size={20} /> Informe de Notas Anual (Estudiante)</span>
               <FileDown size={18} />
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Descarga Masiva (Curso Completo)</h3>
          <p className="text-muted mt-2 mb-4">Descarga un solo archivo PDF con los informes de todos los estudiantes del curso {selectedCourse}.</p>
          
          <div className="grid gap-4">
            <button 
               onClick={() => downloadInformeCurso('s1')}
               className="btn btn-secondary justify-between" 
               style={{textAlign: 'left'}}
               disabled={students.length === 0}
            >
               <span className="flex items-center gap-4"><FileDown size={20} /> Curso: Notas Parciales (1° Sem)</span>
            </button>
            
            <button 
               onClick={() => downloadInformeCurso('s2')}
               className="btn btn-secondary justify-between" 
               style={{textAlign: 'left'}}
               disabled={students.length === 0}
            >
               <span className="flex items-center gap-4"><FileDown size={20} /> Curso: Notas Parciales (2° Sem)</span>
            </button>

            <button 
               onClick={() => downloadInformeCurso('full')}
               className="btn btn-primary justify-between" 
               style={{textAlign: 'left'}}
               disabled={students.length === 0}
            >
               <span className="flex items-center gap-4"><FileDown size={20} /> Curso: Notas Anual</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
