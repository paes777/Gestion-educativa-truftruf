import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, writeBatch, getDoc, setDoc } from 'firebase/firestore';
import { Save } from 'lucide-react';

const SUBJECTS = [
  "Lenguaje y Comunicación", "Matemática", "Historia, Geografía y Cs. Sociales",
  "Ciencias Naturales", "Inglés", "Artes Visuales", "Música", "Educación Física y Salud", "Orientación"
];

const COURSES = [
  "1° Básico", "2° Básico", "3° Básico", "4° Básico",
  "5° Básico", "6° Básico", "7° Básico", "8° Básico"
];

export default function TeacherGrades({ user, assignedCourses, isAdmin, assignedSubjects }) {
  const defaultCourse = (assignedCourses && assignedCourses.length > 0) ? assignedCourses[0] : COURSES[0];
  const [selectedCourseForAdmin, setSelectedCourseForAdmin] = useState(COURSES[0]);
  const [selectedCourseForTeacher, setSelectedCourseForTeacher] = useState(defaultCourse);
  const activeCourse = isAdmin ? selectedCourseForAdmin : selectedCourseForTeacher;

  const defaultSubject = (assignedSubjects && assignedSubjects.length > 0) ? assignedSubjects[0] : SUBJECTS[0];
  const [subject, setSubject] = useState(defaultSubject);

  useEffect(() => {
     if (assignedSubjects && assignedSubjects.length > 0 && !assignedSubjects.includes(subject)) {
        setSubject(assignedSubjects[0]);
     }
  }, [assignedSubjects]);

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
  const [observations, setObservations] = useState({}); // { stId: { sem1: '', sem2: '' } }
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeCourse) {
      loadStudentsAndData();
    }
  }, [activeCourse, subject, semester]);

  const loadStudentsAndData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const q = query(collection(db, 'estudiantes'), where('curso', '==', activeCourse));
      const snapS = await getDocs(q);
      const list = [];
      snapS.forEach(d => list.push({id: d.id, ...d.data()}));
      list.sort((a,b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
      setStudents(list);

      // 2. Fetch Grades for this subject/semester
      const gradesMap = {};
      const obsMap = {};

      for (const st of list) {
         // Grades doc ID: stId_subject_semester
         const gRef = doc(db, 'notas', `${st.id}_${subject.replace(/\s+/g,'')}_s${semester}`);
         const gSnap = await getDoc(gRef);
         
         if (gSnap.exists() && gSnap.data().grades) {
             gradesMap[st.id] = gSnap.data().grades;
         } else {
             gradesMap[st.id] = Array(10).fill('');
         }

         // Observations doc ID: stId
         const oRef = doc(db, 'observaciones', st.id);
         const oSnap = await getDoc(oRef);
         if (oSnap.exists()) {
             obsMap[st.id] = oSnap.data();
         } else {
             obsMap[st.id] = { sem1: '', sem2: '' };
         }
      }

      setGradesData(gradesMap);
      setObservations(obsMap);
    } catch(err) {
      console.error(err);
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
     const current = observations[stId] || {sem1: '', sem2: ''};
     if (semester === 1) {
         setObservations({...observations, [stId]: {...current, sem1: value}});
     } else {
         setObservations({...observations, [stId]: {...current, sem2: value}});
     }
  };

  const calculateAverage = (gradesArray) => {
     if(!gradesArray) return '';
     const validGrades = gradesArray.map(g => Number(g)).filter(g => !isNaN(g) && g > 0 && g <= 7);
     if (validGrades.length === 0) return '';
     const sum = validGrades.reduce((a,b) => a+b, 0);
     return (sum / validGrades.length).toFixed(1);
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
          batch.set(oRef, observations[st.id], { merge: true });
       }

       await batch.commit();
       alert("Calificaciones y observaciones guardadas correctamente.");
     } catch(err) {
       console.error(err);
       alert("Error al guardar en el servidor.");
     }
     setSaving(false);
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
                 {isAdmin 
                   ? SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)
                   : (assignedSubjects && assignedSubjects.length > 0 
                        ? assignedSubjects.map(s => <option key={s} value={s}>{s}</option>)
                        : SUBJECTS.map(s => <option key={s} value={s}>{s}</option>) // fallback
                     )
                 }
              </select>

              <select value={semester} onChange={e => setSemester(Number(e.target.value))}>
                 <option value={1}>Primer Semestre</option>
                 <option value={2}>Segundo Semestre</option>
              </select>

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
                    <th style={{textAlign:'center', width: '70px', backgroundColor: 'var(--primary-light)'}}>Prom.</th>
                    <th className="text-left" style={{width: '300px'}}>Observaciones (Semestre {semester})</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(st => {
                      const arr = gradesData[st.id] || Array(10).fill('');
                      const avg = calculateAverage(arr);
                      const isDanger = avg && Number(avg) < 4.0;
                      
                      return (
                        <tr key={st.id}>
                           <td style={{position: 'sticky', left: 0, backgroundColor: 'var(--surface-solid)', zIndex: 10, fontWeight: 500, fontSize: '12px'}}>
                             {st.nombreCompleto}
                           </td>
                           
                           {arr.map((val, idx) => (
                              <td key={idx} style={{padding: '4px', textAlign: 'center'}}>
                                 <input 
                                    type="text"
                                    className={`grade-input ${val && Number(val) < 4 ? 'failing' : ''}`}
                                    maxLength="3"
                                    value={val}
                                    onChange={e => handleGradeChange(st.id, idx, e.target.value)}
                                    onBlur={e => handleGradeBlur(st.id, idx, e.target.value)}
                                    placeholder=""
                                 />
                              </td>
                           ))}

                           <td className="average-cell" style={{textAlign: 'center', color: isDanger ? 'var(--failing-red)' : 'var(--text-main)'}}>
                              {avg || '-'}
                           </td>

                           <td style={{padding: '4px'}}>
                              <textarea 
                                 rows="1"
                                 value={semester === 1 ? observations[st.id]?.sem1 : observations[st.id]?.sem2}
                                 onChange={e => handleObsChange(st.id, e.target.value)}
                                 placeholder={`Agregar observación...`}
                                 style={{minHeight: '32px', resize: 'vertical', width: '100%', fontSize: '12px'}}
                              />
                           </td>
                        </tr>
                      );
                  })}
                </tbody>
              </table>
           </div>
        )}
      </div>
    </div>
  );
}
