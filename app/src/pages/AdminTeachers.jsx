import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import studentSeed from '../services/students_seed.json';

const COURSES = [
  "1° Básico", "2° Básico", "3° Básico", "4° Básico",
  "5° Básico", "6° Básico", "7° Básico", "8° Básico"
];

const SUBJECTS = [
  "Lenguaje y Comunicación", "Matemática", "Historia, Geografía y Cs. Sociales",
  "Ciencias Naturales", "Inglés", "Artes Visuales", "Música", "Educación Física y Salud", "Orientación", "Lengua Indígena"
];

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [editCourses, setEditCourses] = useState([]); // array
  const [editSubjects, setEditSubjects] = useState([]); // array

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    const snap = await getDocs(collection(db, 'docentes'));
    const data = [];
    snap.forEach(d => data.push({id: d.id, ...d.data()}));
    setTeachers(data);
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (!username || !password || !name) return;
    setLoading(true);
    try {
      const safeUser = username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `${safeUser}@docente.metrenco.cl`;
      
      // REST API call to create user without signing out the current admin session
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyBN17i1sN4hSOllyla4ASbzPWIgip552Jw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      const uid = data.localId;
      await setDoc(doc(db, "docentes", uid), {
         nombre: name,
         usuario: email,
         cursosAsignados: [], // Array to allow multiple
         asignaturasAsignadas: [] // Array to allow multiple
      });
      
      setName('');
      setUsername('');
      setPassword('');
      alert('Cuenta Docente creada exitosamente.');
      loadTeachers();
    } catch(err) {
      console.error(err);
      alert('Error al crear docente: ' + err.message);
    }
    setLoading(false);
  };

    const saveAssignment = async (id) => {
     try {
       await updateDoc(doc(db, 'docentes', id), {
          cursosAsignados: editCourses,
          asignaturasAsignadas: editSubjects
       });
       setEditingId(null);
       loadTeachers();
     } catch (err) {
       console.error(err);
       alert("Error al guardar la asignación.");
     }
  };

  const handleSeedStudents = async () => {
    if (!confirm('¿Estás seguro de cargar los 177 estudiantes de los PDFs al sistema? Esto solo debe hacerse UNA vez.')) return;
    setSeeding(true);
    try {
      const studentsRef = collection(db, 'estudiantes');
      let count = 0;
      for (const student of studentSeed) {
        await addDoc(studentsRef, {
          ...student,
          createdAt: new Date().toISOString()
        });
        count++;
      }
      alert(`¡Éxito! Se han cargado ${count} estudiantes a la base de datos.`);
    } catch(err) {
      console.error(err);
      alert('Error al poblar base de datos');
    }
    setSeeding(false);
  };

  return (
    <div>
      <div className="card" style={{borderColor: 'var(--primary)', backgroundColor: 'var(--primary-light)'}}>
        <div className="flex justify-between items-center">
          <div>
            <h3 style={{color: 'var(--primary)'}}>Poblar Base de Datos (Inicialización)</h3>
            <p className="text-muted mt-2">Sube los {studentSeed.length} estudiantes extraídos desde los archivos PDF a Firestore.</p>
          </div>
          <button onClick={handleSeedStudents} disabled={seeding} className="btn btn-primary" style={{whiteSpace: 'nowrap'}}>
            {seeding ? 'Cargando...' : 'Cargar Estudiantes a BD'}
          </button>
        </div>
      </div>

      <div className="grid" style={{gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '1.5rem'}}>
        <div className="card">
          <h3>Crear Nuevo Docente</h3>
          <p className="text-muted mt-2 mb-4">Crea una cuenta para un profesor sin salir del administrador.</p>
          <form onSubmit={handleCreateTeacher} className="grid gap-4">
            <div>
              <label>Nombre Completo</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ej: Juan Pérez" />
            </div>
            <div>
              <label>Nombre de Usuario</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Ej: jperez" />
            </div>
            <div>
              <label>Contraseña Corta</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" minLength="6" />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{marginTop: '0.5rem'}}>
              {loading ? 'Creando...' : 'Crear Cuenta'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Lista de Docentes y Asignaciones</h3>
          <p className="text-muted mt-2 mb-4">Asigna el Curso y Asignatura principal a cada docente registrado.</p>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Curso</th>
                  <th>Asignatura</th>
                  <th style={{textAlign: 'center'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => (
                  <tr key={t.id}>
                    <td>
                       <strong>{t.nombre}</strong><br/>
                       <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>{t.usuario}</span>
                    </td>
                    {editingId === t.id ? (
                      <>
                        <td style={{padding: '0.3rem'}}>
                           <div style={{display:'flex', flexDirection:'column', gap:'4px', maxHeight:'150px', overflowY:'auto', border:'1px solid #ccc', padding:'5px', borderRadius:'4px', background:'#fff'}}>
                             {COURSES.map(c => (
                               <label key={c} style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', margin:0}}>
                                 <input 
                                   type="checkbox" 
                                   checked={editCourses.includes(c)} 
                                   onChange={(e) => {
                                      if(e.target.checked) setEditCourses([...editCourses, c]);
                                      else setEditCourses(editCourses.filter(course => course !== c));
                                   }} 
                                 />
                                 {c}
                               </label>
                             ))}
                           </div>
                        </td>
                        <td style={{padding: '0.3rem'}}>
                           <div style={{display:'flex', flexDirection:'column', gap:'4px', maxHeight:'150px', overflowY:'auto', border:'1px solid #ccc', padding:'5px', borderRadius:'4px', background:'#fff'}}>
                             {SUBJECTS.map(s => (
                               <label key={s} style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', margin:0}}>
                                 <input 
                                   type="checkbox" 
                                   checked={editSubjects.includes(s)} 
                                   onChange={(e) => {
                                      if(e.target.checked) setEditSubjects([...editSubjects, s]);
                                      else setEditSubjects(editSubjects.filter(sub => sub !== s));
                                   }} 
                                 />
                                 {s}
                               </label>
                             ))}
                           </div>
                        </td>
                        <td style={{textAlign: 'center'}}>
                           <button onClick={() => saveAssignment(t.id)} className="btn btn-primary" style={{padding: '0.2rem 0.5rem', fontSize: '11px'}}>Guardar</button>
                           <button onClick={() => setEditingId(null)} className="btn btn-secondary" style={{padding: '0.2rem 0.5rem', fontSize: '11px', marginLeft: '0.5rem'}}>X</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          {t.cursosAsignados && t.cursosAsignados.length > 0 
                             ? <div style={{fontSize:'12px'}}>{t.cursosAsignados.join(', ')}</div> 
                             : (t.cursoAsignado ? t.cursoAsignado : <span className="text-muted">No Asignado</span>)}
                        </td>
                        <td>
                          {t.asignaturasAsignadas && t.asignaturasAsignadas.length > 0 
                             ? <div style={{fontSize:'12px'}}>{t.asignaturasAsignadas.join(', ')}</div> 
                             : (t.asignaturaAsignada ? t.asignaturaAsignada : <span className="text-muted">No Asignado</span>)}
                        </td>
                        <td style={{textAlign: 'center'}}>
                          <button 
                            className="btn btn-secondary" 
                            style={{padding: '0.3rem 0.6rem', fontSize: '0.75rem'}}
                            onClick={() => {
                               // Fallback for legacy string format
                               let initialCourses = [];
                               if (t.cursosAsignados) initialCourses = t.cursosAsignados;
                               else if (t.cursoAsignado) initialCourses = [t.cursoAsignado];
                               
                               let initialSubjects = [];
                               if (t.asignaturasAsignadas) initialSubjects = t.asignaturasAsignadas;
                               else if (t.asignaturaAsignada) initialSubjects = [t.asignaturaAsignada];

                               setEditCourses(initialCourses);
                               setEditSubjects(initialSubjects);
                               setEditingId(t.id);
                            }}
                          >
                            Editar Asignación
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{textAlign: 'center', padding: '2rem'}}>No hay docentes registrados todavía.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
