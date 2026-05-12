import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false); // Para la carga inicial
  
  const [editingId, setEditingId] = useState(null);
  const [editAssignments, setEditAssignments] = useState([]); // Array of {curso, asignatura}
  const [editJefatura, setEditJefatura] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'docentes'), (snap) => {
      const data = [];
      snap.forEach(d => data.push({id: d.id, ...d.data()}));
      setTeachers(data);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando docentes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (!username || !password || !name) return;
    setCreating(true);
    try {
      const safeUser = username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `${safeUser}@docente.truftruf.cl`;
      
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyAbNSjso0uA7l37T9wNl6YOXUxCkN9ZcqY`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const uid = data.localId;
      await setDoc(doc(db, "docentes", uid), {
         nombre: name,
         usuario: email,
         asignaciones: [],
         jefatura: ""
      });
      
      setName('');
      setUsername('');
      setName('');
      setUsername('');
      setPassword('');
    } catch(err) {
      console.error(err);
      if (err.message === 'EMAIL_EXISTS') {
        try {
           // Intento de recuperación: hacer login para obtener el UID
           const loginRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyAbNSjso0uA7l37T9wNl6YOXUxCkN9ZcqY`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ email: `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@docente.truftruf.cl`, password, returnSecureToken: true })
           });
           const loginData = await loginRes.json();
           
           if (!loginData.error) {
              const uid = loginData.localId;
              await setDoc(doc(db, "docentes", uid), {
                 nombre: name,
                 usuario: loginData.email,
                 asignaciones: [],
                 jefatura: ""
              }, { merge: true });
              alert('Docente recuperado exitosamente. Sus datos aparecerán automáticamente en la lista.');
           } else {
              alert('Este usuario ya existe, pero la contraseña no coincide. Usa una cuenta nueva o contacta a soporte.');
           }
        } catch(recoverErr) {
           console.error("Error en recuperación:", recoverErr);
           alert('Este docente ya estaba creado en seguridad, pero no se pudo vincular. Error: ' + recoverErr.message);
        }
        setName('');
        setUsername('');
        setPassword('');
      } else {
         if (err.message.includes('Missing or insufficient permissions')) {
            alert('Error de Permisos: Las reglas de seguridad de Firebase expiraron. El actualizador las reparará ahora.');
         } else if (err.message === 'OPERATION_NOT_ALLOWED') {
            alert('Error: El inicio de sesión por Correo/Contraseña está desactivado en tu proyecto de Firebase. Actívalo en la consola de Firebase > Authentication > Sign-in method.');
         } else if (err.message === 'WEAK_PASSWORD') {
            alert('Error: La contraseña es demasiado débil. Debe tener al menos 6 caracteres.');
         } else {
            alert('Error al crear: ' + err.message);
         }
      }
    } finally {
      setCreating(false);
    }
  };

   const [newAssignCourse, setNewAssignCourse] = useState(COURSES[0]);
   const [newAssignSubject, setNewAssignSubject] = useState(SUBJECTS[0]);

   const saveAssignment = async (id) => {
      setSaving(true);
      try {
        await updateDoc(doc(db, 'docentes', id), {
           asignaciones: editAssignments,
           jefatura: editJefatura
        });
        setEditingId(null);
      } catch (err) {
        console.error(err);
        alert("Error al guardar: " + err.message);
      } finally {
        setSaving(false);
      }
   };

   const handleDeleteTeacher = async (id, name) => {
     if (!confirm(`¿Estás seguro de que deseas eliminar al docente "${name}"?`)) return;
     setLoading(true);
     try {
       await deleteDoc(doc(db, 'docentes', id));
       alert('Docente eliminado exitosamente.');
     } catch (err) {
       console.error(err);
       alert('Error al eliminar docente: ' + err.message);
     }
     setLoading(false);
   };



  return (
    <div>


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
            <button type="submit" disabled={creating} className="btn btn-primary" style={{marginTop: '0.5rem'}}>
              {creating ? 'Creando...' : 'Crear Cuenta'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3>Lista de Docentes y Asignaciones</h3>
              <p className="text-muted mt-2">Asigna el Curso y Asignatura principal a cada docente registrado.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
              <span className="animate-pulse">🟢</span> En Vivo
            </div>
          </div>
          
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
                                value={newAssignCourse}
                                onChange={(e) => setNewAssignCourse(e.target.value)}
                                style={{fontSize:'12px', padding:'4px'}}
                              >
                                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <select 
                                value={newAssignSubject}
                                onChange={(e) => setNewAssignSubject(e.target.value)}
                                style={{fontSize:'12px', padding:'4px'}}
                              >
                                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button 
                                type="button"
                                className="btn btn-primary" 
                                style={{padding:'2px 8px', fontSize:'11px'}}
                                onClick={() => {
                                  if (!editAssignments.some(a => a.curso === newAssignCourse && a.asignatura === newAssignSubject)) {
                                    setEditAssignments([...editAssignments, { curso: newAssignCourse, asignatura: newAssignSubject }]);
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
                           <button onClick={() => saveAssignment(t.id)} disabled={saving} className="btn btn-primary" style={{padding: '0.2rem 0.5rem', fontSize: '11px'}}>
                             {saving ? 'Guardando...' : 'Guardar'}
                           </button>
                           <button onClick={() => setEditingId(null)} disabled={saving} className="btn btn-secondary" style={{padding: '0.2rem 0.5rem', fontSize: '11px', marginLeft: '0.5rem'}}>X</button>
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
