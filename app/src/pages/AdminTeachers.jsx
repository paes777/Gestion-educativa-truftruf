import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import studentSeed from '../services/students_seed.json';

const COURSES = [
  "1° Básico", "2° Básico", "3° Básico", "4° Básico",
  "5° Básico", "6° Básico", "7° Básico", "8° Básico"
];

const SUBJECTS = [
  "Lenguaje y Comunicación", "Matemática", "Historia, Geografía y Cs. Sociales",
  "Ciencias Naturales", "Inglés", "Artes Visuales", "Música", "Educación Física y Salud", "Orientación", "Lengua Indígena", "Religión", "Tecnología"
];

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
   const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState(0);
  
  const [editingId, setEditingId] = useState(null);
  const [editAssignments, setEditAssignments] = useState([]); // Array of {curso, asignatura}
  const [editJefatura, setEditJefatura] = useState('');

  useEffect(() => {
    loadTeachers();
    checkAndAutoSeed();
  }, []);

  const checkAndAutoSeed = async () => {
    try {
      const snap = await getDocs(collection(db, 'estudiantes'));
      if (snap.empty && studentSeed.length > 0) {
        console.log("Auto-seeding students...");
        handleSeedStudents();
      }
    } catch (err) {
      console.error("Auto-seed check failed:", err);
    }
  };

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
      const email = `${safeUser}@docente.truftruf.cl`;
      
      // REST API call to create user without signing out the current admin session
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyAbNSjso0uA7l37T9wNl6YOXUxCkN9ZcqY`, {
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
           asignaciones: editAssignments,
           jefatura: editJefatura,
           // Keep legacy fields empty to avoid confusion or just stop using them
           cursosAsignados: [], 
           asignaturasAsignadas: []
        });
        setEditingId(null);
        loadTeachers();
      } catch (err) {
        console.error(err);
        alert("Error al guardar la asignación.");
      }
   };

   const handleDeleteTeacher = async (id, name) => {
     if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente al docente "${name}"? Esta acción no se puede deshacer.`)) return;
     
     try {
       await deleteDoc(doc(db, 'docentes', id));
       alert('Docente eliminado exitosamente.');
       loadTeachers();
     } catch (err) {
       console.error(err);
       alert('Error al eliminar docente: ' + err.message);
     }
   };

   const handleSeedStudents = async () => {
    if (!confirm(`¿Estás seguro de cargar los ${studentSeed.length} estudiantes al sistema? Se usará un proceso de carga rápida por lotes.`)) return;
    setSeeding(true);
    setSeedProgress(10);
    try {
      import('firebase/firestore').then(async ({ writeBatch, doc, collection, getDocs, deleteDoc }) => {
        const batch = writeBatch(db);
        const studentsRef = collection(db, 'estudiantes');
        
        // 1. Limpiar anteriores (opcional pero recomendado para orden)
        const currentSnap = await getDocs(studentsRef);
        for (const d of currentSnap.docs) {
          batch.delete(doc(db, 'estudiantes', d.id));
        }
        
        setSeedProgress(30);

        // 2. Cargar nuevos en el batch
        studentSeed.forEach((student) => {
          const newDocRef = doc(collection(db, 'estudiantes'));
          batch.set(newDocRef, {
            ...student,
            createdAt: new Date().toISOString()
          });
        });

        setSeedProgress(60);

        // 3. Ejecutar todo el lote de una vez
        await batch.commit();
        
        setSeedProgress(100);
        alert(`¡Éxito total! Se han cargado los ${studentSeed.length} estudiantes correctamente.`);
        setSeeding(false);
      });
    } catch(err) {
      console.error(err);
      alert('Error crítico en la carga: ' + err.message);
      setSeeding(false);
    }
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
            {seeding ? `Cargando (${seedProgress}%)...` : 'Cargar Estudiantes a BD'}
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
                       {t.jefatura && (
                         <div style={{fontSize: '11px', color: 'var(--primary)', marginTop: '4px', fontWeight: 'bold'}}>
                           🏅 Prof. Jefe: {t.jefatura}
                         </div>
                       )}
                    </td>
                    {editingId === t.id ? (
                      <>
                        <td colSpan="2" style={{padding: '0.5rem'}}>
                           <div style={{display:'flex', gap:'10px', alignItems:'center', marginBottom:'10px', paddingBottom: '10px', borderBottom: '1px solid #eee'}}>
                              <label style={{fontSize: '11px', margin: 0, fontWeight: 'bold'}}>Jefatura:</label>
                              <select 
                                 value={editJefatura} 
                                 onChange={(e) => setEditJefatura(e.target.value)}
                                 style={{fontSize:'12px', padding:'4px', minWidth: '120px'}}
                              >
                                 <option value="">Ninguno</option>
                                 {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                           </div>
                           <div style={{display:'flex', gap:'10px', alignItems:'center', marginBottom:'10px'}}>
                              <select 
                                id="new-assignment-course"
                                style={{fontSize:'12px', padding:'4px'}}
                              >
                                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <select 
                                id="new-assignment-subject"
                                style={{fontSize:'12px', padding:'4px'}}
                              >
                                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button 
                                type="button"
                                className="btn btn-primary" 
                                style={{padding:'2px 8px', fontSize:'11px'}}
                                onClick={() => {
                                  const c = document.getElementById('new-assignment-course').value;
                                  const s = document.getElementById('new-assignment-subject').value;
                                  if (!editAssignments.some(a => a.curso === c && a.asignatura === s)) {
                                    setEditAssignments([...editAssignments, { curso: c, asignatura: s }]);
                                  }
                                }}
                              >
                                + Agregar
                              </button>
                           </div>
                           <div style={{maxHeight:'100px', overflowY:'auto', background:'white', border:'1px solid #ddd', padding:'5px', borderRadius:'4px'}}>
                              {editAssignments.length === 0 && <span className="text-muted" style={{fontSize:'11px'}}>Sin asignaciones</span>}
                              {editAssignments.map((a, idx) => (
                                <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'11px', padding:'2px 0'}}>
                                  <span>{a.curso} - {a.asignatura}</span>
                                  <button 
                                    type="button"
                                    onClick={() => setEditAssignments(editAssignments.filter((_, i) => i !== idx))}
                                    style={{background:'none', border:'none', color:'red', cursor:'pointer', fontSize:'14px'}}
                                  >
                                    &times;
                                  </button>
                                </div>
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
                        <td colSpan="2">
                          {t.asignaciones && t.asignaciones.length > 0 ? (
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px'}}>
                              {t.asignaciones.map((a, idx) => (
                                <div key={idx} style={{fontSize:'11px', padding:'2px 4px', background:'var(--primary-light)', borderRadius:'4px', color:'var(--primary)'}}>
                                  <strong>{a.curso}</strong>: {a.asignatura}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted" style={{fontSize:'12px'}}>No Asignado</span>
                          )}
                        </td>
                        <td style={{textAlign: 'center'}}>
                          <div style={{display:'flex', gap:'8px', justifyContent:'center'}}>
                            <button 
                              className="btn btn-secondary" 
                              style={{padding: '0.3rem 0.6rem', fontSize: '0.75rem'}}
                              onClick={() => {
                                 let initial = [];
                                 if (t.asignaciones) {
                                   initial = [...t.asignaciones];
                                 } else if (t.cursosAsignados && t.asignaturasAsignadas) {
                                    t.cursosAsignados.forEach(c => {
                                      t.asignaturasAsignadas.forEach(s => {
                                        initial.push({ curso: c, asignatura: s });
                                      });
                                    });
                                 }
                                 setEditAssignments(initial);
                                 setEditJefatura(t.jefatura || '');
                                 setEditingId(t.id);
                              }}
                            >
                              Editar
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{padding: '0.3rem 0.6rem', fontSize: '0.75rem', backgroundColor: '#dc3545', color: 'white'}}
                              onClick={() => handleDeleteTeacher(t.id, t.nombre)}
                            >
                              Eliminar
                            </button>
                          </div>
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
