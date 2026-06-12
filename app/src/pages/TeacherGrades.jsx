import { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, writeBatch, getDoc } from 'firebase/firestore';
import studentSeed from '../services/students_seed.json';
import { Save, X } from 'lucide-react';

const SUBJECTS = [
  "Lenguaje y Comunicación", "Matemática", "Historia, Geografía y Cs. Sociales",
  "Ciencias Naturales", "Inglés", "Artes Visuales", "Música", "Educación Física y Salud", "Orientación", "Lengua Indígena", "Religión", "Tecnología"
];

const COURSES = [
  "1° Básico", "2° Básico", "3° Básico", "4° Básico",
  "5° Básico", "6° Básico", "7° Básico", "8° Básico"
];

export default function TeacherGrades({ user, assignedCourses, isAdmin, assignments, jefatura, isDiferencial }) {
  const defaultCourse = (assignedCourses && assignedCourses.length > 0) ? assignedCourses[0] : COURSES[0];
  const [selectedCourseForAdmin, setSelectedCourseForAdmin] = useState(COURSES[0]);
  const [selectedCourseForTeacher, setSelectedCourseForTeacher] = useState(defaultCourse);
  const activeCourse = isAdmin ? selectedCourseForAdmin : selectedCourseForTeacher;

  const canEditObs = isAdmin || activeCourse === jefatura;
  const canEditPie = canEditObs || isDiferencial;

  // Compute subjects for the selected course
  const currentAvailableSubjects = canEditObs
    ? SUBJECTS 
    : (assignments || []).filter(a => a.curso === activeCourse).map(a => a.asignatura);

  const defaultSubject = (currentAvailableSubjects.length > 0) ? currentAvailableSubjects[0] : SUBJECTS[0];
  const [subject, setSubject] = useState(defaultSubject);

  useEffect(() => {
     if (!isAdmin && currentAvailableSubjects.length > 0 && !currentAvailableSubjects.includes(subject)) {
        setSubject(currentAvailableSubjects[0]);
     }
  }, [currentAvailableSubjects, isAdmin, subject]);

  useEffect(() => {
    if (!isAdmin && assignedCourses && assignedCourses.length > 0) {
      if (!assignedCourses.includes(selectedCourseForTeacher)) {
         setSelectedCourseForTeacher(assignedCourses[0]);
      }
    }
  }, [assignedCourses, isAdmin, selectedCourseForTeacher]);

  const [semester, setSemester] = useState(1);
  const [students, setStudents] = useState([]);
  const [gradesData, setGradesData] = useState({}); // { stId: ['', '', ...] } (array of 10)
  const [crossSemesterAverages, setCrossSemesterAverages] = useState({}); // { stId: { s1: '-', s2: '-' } }
  const [observations, setObservations] = useState({}); // { stId: { sem1: '', sem2: '', pie1: '', pie2: '' } }
  const [tabDirection, setTabDirection] = useState('horizontal'); // 'horizontal' or 'vertical'
  
  const [pieEducators, setPieEducators] = useState([]); // [{id, nombre}]
  const [isPieModalOpen, setIsPieModalOpen] = useState(false);
  const [activePieStudent, setActivePieStudent] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const cache = useRef({}); // { 'course_subject': data }

  useEffect(() => {
    if (activeCourse) {
      loadStudentsAndData();
    }
  }, [activeCourse, subject, semester]);

  const loadStudentsAndData = async () => {
    const cacheKey = `${activeCourse}_${subject}`;
    
    setLoading(true);
    try {
       // 1. CARGA DE ESTUDIANTES (DB + SEED)
       const qEstudiantes = query(collection(db, 'estudiantes'));
       const snapEst = await getDocs(qEstudiantes);
       const firestoreData = [];
       snapEst.forEach(d => firestoreData.push({id: d.id, ...d.data()}));
       
       const merged = [...firestoreData];
       merged.forEach(st => {
          const seedMatch = studentSeed.find(seed => seed.rut === st.rut);
          if (seedMatch) {
             st.curso = seedMatch.curso;
             st.nombreCompleto = seedMatch.nombreCompleto;
          }
       });
       
       studentSeed.forEach(localSt => {
         if (!firestoreData.some(fsSt => fsSt.rut === localSt.rut)) {
           merged.push({ id: localSt.rut, ...localSt });
         }
       });

       const list = merged.filter(st => st.curso === activeCourse);

       list.sort((a, b) => {
         const numA = typeof a.numeroLista === 'number' ? a.numeroLista : 999;
         const numB = typeof b.numeroLista === 'number' ? b.numeroLista : 999;
         if (numA !== numB) return numA - numB;
         return a.nombreCompleto.localeCompare(b.nombreCompleto);
       });
       setStudents(list);

       // 2. USO DE CACHÉ PARA NOTAS
       if (cache.current[cacheKey]) {
          const cData = cache.current[cacheKey];
          setGradesData(cData.gradesMap);
          setCrossSemesterAverages(cData.crossAvgMap);
          setObservations(cData.obsMap);
       }
       const gradesMap = {};
       const crossAvgMap = {};
       const obsMap = {};
 
       // Pre-llenar mapas para evitar saltos en la UI
       list.forEach(st => {
         gradesMap[st.id] = Array(10).fill('');
         crossAvgMap[st.id] = { s1: '-', s2: '-' };
         obsMap[st.id] = { sem1: '', sem2: '', pie1: '', pie2: '', pie_details_1: {}, pie_details_2: {} };
       });

       // Query optimizada para notas
       const gradesQuery = query(
         collection(db, 'notas'), 
         where('course', '==', activeCourse)
       );
       const qDocentes = query(collection(db, 'docentes'), where('isDiferencial', '==', true));

       const [gradesSnap, docentesSnap, ...obsSnaps] = await Promise.all([
         getDocs(gradesQuery),
         getDocs(qDocentes),
         ...list.map(st => getDoc(doc(db, 'observaciones', st.id)))
       ]);

       const courseEducators = [];
       docentesSnap.forEach(d => {
           const data = d.data();
           let isAssigned = false;
           if (data.jefatura === activeCourse) isAssigned = true;
           if (data.asignaciones && data.asignaciones.some(a => a.curso === activeCourse)) isAssigned = true;
           if (data.cursosAsignados && data.cursosAsignados.includes(activeCourse)) isAssigned = true;
           if (data.cursoAsignado === activeCourse) isAssigned = true;
           
           if (isAssigned) courseEducators.push({ id: d.id, name: data.nombre });
       });
       setPieEducators(courseEducators);

       gradesSnap.forEach(d => {
         const data = d.data();
         const stId = data.studentId;
         if (gradesMap[stId] && data.subject === subject) {
           if (data.semester === semester) gradesMap[stId] = data.grades || Array(10).fill('');
           if (data.semester === 1) crossAvgMap[stId].s1 = data.average || '-';
           if (data.semester === 2) crossAvgMap[stId].s2 = data.average || '-';
         }
       });

       obsSnaps.forEach(d => {
         if (d.exists() && obsMap[d.id]) {
             obsMap[d.id] = d.data();
         }
       });
 
       setGradesData(gradesMap);
       setCrossSemesterAverages(crossAvgMap);
       setObservations(obsMap);
       
       // Guardar en Caché para la próxima vez
       cache.current[cacheKey] = { gradesMap, crossAvgMap, obsMap };
    } catch(err) {
      console.error("Error en carga rápida:", err);
    }
    setLoading(false);
  };


  const handleGradeChange = (stId, index, value) => {
     let val = value.replace(',', '.');
     if (val !== '' && isNaN(Number(val))) return; // only numbers
     
     const newGrades = [...gradesData[stId]];
     newGrades[index] = val;
     setGradesData({...gradesData, [stId]: newGrades});
  };

  const handleGradeBlur = (stId, index, value) => {
     if (!value) return;
     let val = value.trim().replace(',', '.');
     
     // Case 1: Single digit "4" -> "4.0"
     if (val.length === 1 && /^[1-7]$/.test(val)) {
         val = val + ".0";
     }
     // Case 2: Two digits "45" -> "4.5"
     else if (val.length === 2 && /^\d\d$/.test(val)) {
         val = val[0] + "." + val[1];
     }
     
     const num = parseFloat(val);
     if (!isNaN(num) && num >= 1.0 && num <= 7.0) {
         handleGradeChange(stId, index, num.toFixed(1));
     }
  };

  const handleObsChange = (stId, value) => {
     const current = observations[stId] || {sem1: '', sem2: '', pie1: '', pie2: ''};
     if (semester === 1) {
         setObservations({...observations, [stId]: {...current, sem1: value}});
     } else {
         setObservations({...observations, [stId]: {...current, sem2: value}});
     }
  };

  const handlePieChange = (stId, value) => {
     const current = observations[stId] || {sem1: '', sem2: '', pie1: '', pie2: '', pie_details_1: {}, pie_details_2: {}};
     if (semester === 1) {
         setObservations({...observations, [stId]: {...current, pie1: value}});
     } else {
         setObservations({...observations, [stId]: {...current, pie2: value}});
     }
  };

  const handlePieDetailsChange = (stId, educatorId, educatorName, text) => {
      const currentObs = observations[stId] || { sem1: '', sem2: '', pie1: '', pie2: '', pie_details_1: {}, pie_details_2: {} };
      const field = semester === 1 ? 'pie_details_1' : 'pie_details_2';
      const currentDetails = currentObs[field] || {};
      
      setObservations({
          ...observations,
          [stId]: {
             ...currentObs,
             [field]: {
                ...currentDetails,
                [educatorId]: { nombre: educatorName, texto: text }
             }
          }
      });
  };

  const openPieModal = (st) => {
     setActivePieStudent(st);
     setIsPieModalOpen(true);
  };

  const closePieModal = () => {
     setIsPieModalOpen(false);
     setActivePieStudent(null);
  };

  const calculateAverage = (gradesArray) => {
     if(!gradesArray) return '';
     const validGrades = gradesArray.map(g => Number(g)).filter(g => !isNaN(g) && g > 0 && g <= 7);
     if (validGrades.length === 0) return '';
     const sumInt = validGrades.reduce((a,b) => a + Math.round(b * 10), 0);
     return (Math.floor(sumInt / validGrades.length) / 10).toFixed(1);
  };

  const handleSave = async () => {
     setSaving(true);
     try {
       const batch = writeBatch(db);
       
       for (const st of students) {
          const arr = gradesData[st.id];
          const avg = calculateAverage(arr);
          
          const gRef = doc(db, 'notas', `${st.id}_${subject.replace(/\s+/g,'')}_s${semester}`);
          batch.set(gRef, {
             studentId: st.id,
             course: activeCourse,
             subject: subject,
             semester: semester,
             grades: arr,
             average: avg
          }, { merge: true });

          const oRef = doc(db, 'observaciones', st.id);
          batch.set(oRef, { ...observations[st.id], course: activeCourse }, { merge: true });
       }

       await batch.commit();
       alert("Calificaciones y observaciones guardadas correctamente.");
     } catch(err) {
       console.error(err);
       alert("Error al guardar en el servidor.");
     }
     setSaving(false);
  };

   const handleKeyDown = (e, stIndex, colIndex) => {
      if (e.key === 'Tab' && tabDirection === 'vertical') {
          e.preventDefault();
          const nextRow = stIndex + (e.shiftKey ? -1 : 1);
          const nextInput = document.querySelector(`input[data-row="${nextRow}"][data-col="${colIndex}"]`);
          if (nextInput) {
              nextInput.focus();
              nextInput.select();
          }
      }
   };

  return (
    <div>
      <div className="card">
        <div className="flex justify-between items-center mb-6">
           <div>
             <h3>Registro de Calificaciones</h3>
              {isAdmin ? (
               <div className="mt-2" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                 <label style={{margin: 0}}>Seleccionar Curso:</label>
                 <select value={selectedCourseForAdmin} onChange={e => setSelectedCourseForAdmin(e.target.value)} style={{width: '200px'}}>
                   {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
             ) : (
                assignedCourses && assignedCourses.length > 1 ? (
                   <div className="mt-2" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                     <label style={{margin: 0}}>Curso a Gestionar:</label>
                     <select value={selectedCourseForTeacher} onChange={e => setSelectedCourseForTeacher(e.target.value)} style={{width: '200px'}}>
                       {assignedCourses.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                ) : (
                   <p className="text-muted mt-1">Curso Asignado: <strong>{activeCourse}</strong></p>
                )
             )}
           </div>
           
           <div className="flex gap-4">
               <select value={subject} onChange={e => setSubject(e.target.value)}>
                  {currentAvailableSubjects.length > 0 
                    ? currentAvailableSubjects.map(s => <option key={s} value={s}>{s}</option>)
                    : SUBJECTS.map(s => <option key={s} value={s}>{s}</option>) // fallback if nothing assigned
                  }
               </select>

              <select value={semester} onChange={e => setSemester(Number(e.target.value))}>
                 <option value={1}>Primer Semestre</option>
                 <option value={2}>Segundo Semestre</option>
              </select>

              <button 
                 onClick={() => setTabDirection(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')} 
                 className="btn btn-secondary"
                 style={{whiteSpace: 'nowrap'}}
                 title="Cambiar dirección de navegación con Tabulador"
              >
                 {tabDirection === 'horizontal' ? 'Tab: →' : 'Tab: ↓'}
              </button>

              <button onClick={handleSave} disabled={saving || loading} className="btn btn-primary" style={{whiteSpace: 'nowrap'}}>
                 {saving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
              </button>
           </div>
        </div>

        {loading ? (
           <div className="flex items-center justify-center p-6"><div className="spinner"></div></div>
        ) : (
           <div className="table-container" style={{maxHeight:'65vh', overflowY:'auto'}}>
              <table style={{minWidth:'max-content'}}>
                <thead>
                  <tr>
                    <th className="text-left" style={{position: 'sticky', left: 0, backgroundColor: 'var(--surface-solid)', zIndex: 10, width: '250px'}}>Alumnos del Curso</th>
                    {[...Array(10)].map((_, i) => <th key={i} style={{textAlign:'center', width: '50px'}}>N{i+1}</th>)}
                    <th style={{textAlign:'center', width: '50px', backgroundColor: 'var(--primary-light)'}}>S1</th>
                    <th style={{textAlign:'center', width: '50px', backgroundColor: 'var(--primary-light)'}}>S2</th>
                    <th style={{textAlign:'center', width: '50px', backgroundColor: 'var(--primary)' , color: 'white'}}>Anual</th>
                    {canEditObs && <th className="text-left" style={{width: '300px'}}>Observaciones (Semestre {semester})</th>}
                    {canEditPie && <th className="text-center" style={{width: '150px'}}>Resultados PIE</th>}
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, studentIndex) => {
                      const arr = gradesData[st.id] || Array(10).fill('');
                      const avg = calculateAverage(arr);
                      const isDanger = avg && Number(avg) < 4.0;
                      
                      return (
                        <tr key={st.id}>
                           <td style={{position: 'sticky', left: 0, backgroundColor: 'var(--surface-solid)', zIndex: 10, fontWeight: 500, fontSize: '12px'}}>
                             <span style={{display:'inline-block', width:'20px', color:'var(--text-muted)'}}>{st.numeroLista ?? '-'}</span>
                             {st.nombreCompleto}
                           </td>
                           
                           {arr.map((val, idx) => (
                              <td key={idx} style={{padding: '4px', textAlign: 'center'}}>
                                 <input 
                                    type="text"
                                    className={`grade-input ${val && Number(val) < 4 ? 'failing' : ''}`}
                                    maxLength="3"
                                    value={val}
                                    data-row={studentIndex}
                                    data-col={idx}
                                    onKeyDown={(e) => handleKeyDown(e, studentIndex, idx)}
                                    onChange={e => handleGradeChange(st.id, idx, e.target.value)}
                                    onBlur={e => handleGradeBlur(st.id, idx, e.target.value)}
                                    placeholder=""
                                 />
                              </td>
                           ))}

                           <td style={{textAlign: 'center', fontSize: '12px', fontWeight: semester === 1 ? 'bold' : 'normal', backgroundColor: semester === 1 ? '#f0f4ff' : 'transparent'}}>
                              {semester === 1 ? (avg || '-') : (crossSemesterAverages[st.id]?.s1 || '-')}
                           </td>
                           <td style={{textAlign: 'center', fontSize: '12px', fontWeight: semester === 2 ? 'bold' : 'normal', backgroundColor: semester === 2 ? '#f0f4ff' : 'transparent'}}>
                              {semester === 2 ? (avg || '-') : (crossSemesterAverages[st.id]?.s2 || '-')}
                           </td>
                           <td style={{textAlign: 'center', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#e8eaf6'}}>
                              {(() => {
                                 const s1 = semester === 1 ? (avg || '-') : (crossSemesterAverages[st.id]?.s1 || '-');
                                 const s2 = semester === 2 ? (avg || '-') : (crossSemesterAverages[st.id]?.s2 || '-');
                                 if (s1 !== '-' && s2 !== '-') {
                                    return ((Number(s1) + Number(s2)) / 2).toFixed(1);
                                 }
                                 return '-';
                              })()}
                           </td>

                           {canEditObs && (
                                 <td style={{padding: '4px'}}>
                                    <textarea 
                                       rows="1"
                                       value={semester === 1 ? observations[st.id]?.sem1 : observations[st.id]?.sem2}
                                       onChange={e => handleObsChange(st.id, e.target.value)}
                                       placeholder={`Agregar observación...`}
                                       style={{minHeight: '32px', resize: 'vertical', width: '100%', fontSize: '12px'}}
                                    />
                                 </td>
                           )}
                           {canEditPie && (
                                 <td style={{padding: '4px', textAlign: 'center'}}>
                                    <button 
                                       className="btn btn-secondary" 
                                       style={{padding: '0.4rem', fontSize: '12px'}}
                                       onClick={() => openPieModal(st)}
                                    >
                                       Resultado PIE
                                    </button>
                                 </td>
                           )}
                        </tr>
                      );
                  })}
                </tbody>
              </table>
           </div>
        )}
      </div>

      {isPieModalOpen && activePieStudent && (
          <div className="modal-overlay" onClick={closePieModal} style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
             <div className="modal-content card" onClick={e => e.stopPropagation()} style={{width: '600px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto'}}>
                <div className="flex justify-between items-center mb-4">
                   <h3 style={{color: 'var(--primary)', fontWeight: 'bold'}}>
                      Resultados PIE: {activePieStudent.nombreCompleto}
                   </h3>
                   <button onClick={closePieModal} style={{background: 'none', border: 'none', cursor: 'pointer'}}><X size={24} color="var(--text-muted)" /></button>
                </div>
                
                {pieEducators.length === 0 ? (
                   <div style={{padding: '2rem', textAlign: 'center', backgroundColor: 'var(--surface-solid)', borderRadius: '8px'}}>
                      <p className="text-muted">No hay educadoras diferenciales asignadas a este curso en el sistema.</p>
                   </div>
                ) : (
                   <div className="flex flex-col gap-4">
                      {pieEducators.map(educator => {
                         const field = semester === 1 ? 'pie_details_1' : 'pie_details_2';
                         const text = observations[activePieStudent.id]?.[field]?.[educator.id]?.texto || '';
                         
                         return (
                            <div key={educator.id} style={{backgroundColor: 'var(--surface-solid)', padding: '1rem', borderRadius: '8px'}}>
                               <label style={{fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: 'var(--text)'}}>
                                  Educadora: {educator.name}
                               </label>
                               <textarea 
                                  value={text}
                                  onChange={e => handlePieDetailsChange(activePieStudent.id, educator.id, educator.name, e.target.value)}
                                  placeholder="Escribe el reporte aquí..."
                                  style={{width: '100%', minHeight: '80px', padding: '0.5rem', resize: 'vertical'}}
                               />
                            </div>
                         );
                      })}
                   </div>
                )}

                {/* Legacy Data Fallback Display */}
                {((semester === 1 && observations[activePieStudent.id]?.pie1) || (semester === 2 && observations[activePieStudent.id]?.pie2)) && (
                   <div style={{marginTop: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px'}}>
                      <label style={{fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: '#64748b'}}>
                         Reporte Antiguo / General
                      </label>
                      <textarea 
                         value={semester === 1 ? observations[activePieStudent.id]?.pie1 : observations[activePieStudent.id]?.pie2}
                         onChange={e => handlePieChange(activePieStudent.id, e.target.value)}
                         style={{width: '100%', minHeight: '60px', padding: '0.5rem', resize: 'vertical', borderColor: '#cbd5e1', backgroundColor: '#f8fafc'}}
                      />
                   </div>
                )}
                
                <div className="mt-6 flex justify-end">
                   <button className="btn btn-primary" onClick={closePieModal}>
                      Listo (Recuerda Guardar Cambios)
                   </button>
                </div>
             </div>
          </div>
       )}

    </div>
  );
}
