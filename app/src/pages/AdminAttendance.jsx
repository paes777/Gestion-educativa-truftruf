import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, writeBatch, getDoc } from 'firebase/firestore';
import { Save } from 'lucide-react';

const MONTHS = [
  { id: 'mar', name: 'Marzo', defaultDays: 22 },
  { id: 'abr', name: 'Abril', defaultDays: 21 },
  { id: 'may', name: 'Mayo', defaultDays: 18 },
  { id: 'jun', name: 'Junio', defaultDays: 15 },
  { id: 'jul', name: 'Julio', defaultDays: 18 },
  { id: 'ago', name: 'Agosto', defaultDays: 21 },
  { id: 'sep', name: 'Septiembre', defaultDays: 17 },
  { id: 'oct', name: 'Octubre', defaultDays: 20 },
  { id: 'nov', name: 'Noviembre', defaultDays: 21 },
  { id: 'dic', name: 'Diciembre', defaultDays: 10 },
];
const TOTAL_YEAR_DAYS = 182;

const COURSES = [
  "1° Básico", "2° Básico", "3° Básico", "4° Básico",
  "5° Básico", "6° Básico", "7° Básico", "8° Básico"
];

export default function AdminAttendance() {
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0]);
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // { studentId: { mar: { present, absent }, abr: ... } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCourseData(selectedCourse);
  }, [selectedCourse]);

  const loadCourseData = async (course) => {
    setLoading(true);
    setStudents([]);
    try {
      const q = query(collection(db, 'estudiantes'), where('curso', '==', course));
      const snap = await getDocs(q);
      const studentList = [];
      snap.forEach(d => studentList.push({ id: d.id, ...d.data() }));
      // Sort alphabetically
      studentList.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
      setStudents(studentList);

      // Load attendance records
      const updatedAtt = {};
      for (const st of studentList) {
         // Formato esperado de DB: asistencias / {studentId} -> { mar: {present, absent}, abr: ... }
         const attRef = doc(db, 'asistencias', st.id);
         const attSnap = await getDoc(attRef);
         if (attSnap.exists()) {
             updatedAtt[st.id] = attSnap.data();
         } else {
             // Defaults if none exist
             const defaultObj = {};
             MONTHS.forEach(m => {
                 defaultObj[m.id] = { present: m.defaultDays, absent: 0 };
             });
             updatedAtt[st.id] = defaultObj;
         }
      }
      setAttendanceData(updatedAtt);
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  const calculateTotalPercentage = (studentId) => {
    const record = attendanceData[studentId];
    if (!record) return 100;
    let totalPresent = 0;
    MONTHS.forEach(m => {
      totalPresent += parseInt(record[m.id]?.present || 0);
    });
    const perc = (totalPresent / TOTAL_YEAR_DAYS) * 100;
    return perc > 100 ? 100 : perc;
  };

  const handleAbsenceChange = (studentId, monthId, maxDays, absentValue) => {
    const val = parseInt(absentValue) || 0;
    const boundedAbsent = val > maxDays ? maxDays : (val < 0 ? 0 : val);
    const present = maxDays - boundedAbsent;

    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [monthId]: { present, absent: boundedAbsent }
      }
    }));
  };

  const handleSave = async () => {
    if(!confirm("¿Deseas guardar la asistencia actual de este curso?")) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      for (const stId of Object.keys(attendanceData)) {
        const ref = doc(db, 'asistencias', stId);
        batch.set(ref, attendanceData[stId], { merge: true });
      }
      await batch.commit();
      alert("Asistencia guardada con éxito.");
    } catch(err) {
      console.error(err);
      alert("Error al guardar.");
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3>Asignación de Asistencia Mensual</h3>
            <p className="text-muted mt-1">Ingresa los <strong>días inasistentes (faltas)</strong> por mes. Los presentes se calculan automáticamente.</p>
          </div>
          <div className="flex gap-4">
            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} style={{width: '200px'}}>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleSave} disabled={saving || loading} className="btn btn-primary" style={{whiteSpace: 'nowrap'}}>
              {saving ? 'Guardando...' : <><Save size={18} /> Guardar Asistencia</>}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-6"><div className="spinner"></div></div>
        ) : (
          <div className="table-container" style={{maxHeight: '60vh', overflowY: 'auto', overflowX: 'auto'}}>
            <table style={{minWidth: '1200px'}}>
              <thead>
                <tr>
                  <th style={{position: 'sticky', left: 0, backgroundColor: 'var(--surface-solid)', zIndex: 10}}>Estudiante</th>
                  {MONTHS.map(m => (
                    <th key={m.id} style={{textAlign: 'center', minWidth: '80px'}}>
                      {m.name}<br/><span style={{fontSize:'0.75rem', fontWeight:'normal'}}>({m.defaultDays} d)</span>
                    </th>
                  ))}
                  <th style={{textAlign: 'center', backgroundColor: 'var(--primary-light)'}}>% Total</th>
                </tr>
              </thead>
              <tbody>
                {students.map(st => {
                  const perc = calculateTotalPercentage(st.id);
                  return (
                    <tr key={st.id}>
                      <td style={{position: 'sticky', left: 0, backgroundColor: 'var(--surface-solid)', zIndex: 10, fontWeight: 500, fontSize: '0.9rem'}}>
                        {st.nombreCompleto}
                      </td>
                      {MONTHS.map(m => (
                        <td key={m.id} style={{textAlign: 'center'}}>
                          <input 
                            type="number" 
                            min="0"
                            max={m.defaultDays}
                            value={attendanceData[st.id]?.[m.id]?.absent || 0}
                            onChange={e => handleAbsenceChange(st.id, m.id, m.defaultDays, e.target.value)}
                            style={{width: '55px', padding: '0.2rem', textAlign: 'center', '-moz-appearance': 'textfield'}}
                            title={`Días ausente en ${m.name}`}
                          />
                        </td>
                      ))}
                      <td style={{textAlign: 'center', fontWeight: 'bold', backgroundColor: 'var(--primary-light)', color: perc < 85 ? 'var(--failing-red)' : 'var(--text-main)'}}>
                        {perc.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
