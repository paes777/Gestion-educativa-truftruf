import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import studentSeed from '../services/students_seed.json';
import { Send, Trash2, Users, User } from 'lucide-react';

export default function TeacherCommunications({ user, assignedCourses, teacherName }) {
  const defaultCourse = assignedCourses.length > 0 ? assignedCourses[0] : '';
  const [course, setCourse] = useState(defaultCourse);
  const [target, setTarget] = useState('all');
  const [message, setMessage] = useState('');
  const [students, setStudents] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
     if (course) {
        const fetchStudents = async () => {
           const snap = await getDocs(collection(db, 'estudiantes'));
           const dynamic = [];
           snap.forEach(d => dynamic.push({ rut: d.id, ...d.data() }));
           
           const merged = [...studentSeed];
           dynamic.forEach(ds => {
               if(!merged.find(m => m.rut === ds.rut)) {
                   merged.push(ds);
               }
           });
           
           const list = merged.filter(s => s.curso === course).sort((a,b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
           setStudents(list);
           setTarget('all');
           loadHistory();
        };
        fetchStudents();
     }
  }, [course]);

  const loadHistory = async () => {
      try {
         const q = query(collection(db, 'comunicaciones'), where('course', '==', course), where('teacherId', '==', user.uid));
         const snap = await getDocs(q);
         const data = [];
         snap.forEach(d => data.push({id: d.id, ...d.data()}));
         data.sort((a,b) => b.timestamp - a.timestamp);
         setHistory(data);
      } catch(err) {
         console.error("Error al cargar historial:", err);
      }
  };

  const handleSend = async (e) => {
     e.preventDefault();
     if (!message.trim() || !course) return;
     setLoading(true);
     try {
         await addDoc(collection(db, 'comunicaciones'), {
             course,
             target,
             message,
             teacherId: user.uid,
             teacherName: teacherName || user.email.split('@')[0],
             timestamp: Date.now()
         });
         setMessage('');
         loadHistory();
         alert("Mensaje enviado correctamente a los apoderados.");
     } catch(err) {
         console.error(err);
         alert("Error al enviar mensaje: " + err.message);
     }
     setLoading(false);
  };

  const handleDelete = async (id) => {
      if(!confirm("¿Estás seguro de que deseas eliminar este mensaje? Ya no aparecerá en el portal de apoderados.")) return;
      try {
          await deleteDoc(doc(db, 'comunicaciones', id));
          loadHistory();
      } catch(err) {
          console.error("Error al eliminar:", err);
      }
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      <div className="card">
        <h3>Enviar Nuevo Mensaje</h3>
        <p className="text-muted mt-2 mb-4">Envía un comunicado oficial a los apoderados. Ellos lo verán en su portal al ingresar con el RUT.</p>
        
        <form onSubmit={handleSend} className="grid gap-4">
          <div>
            <label>Curso Destino</label>
            <select value={course} onChange={e => setCourse(e.target.value)} required>
               {assignedCourses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div>
            <label>Destinatario</label>
            <select value={target} onChange={e => setTarget(e.target.value)} required>
               <option value="all">📢 Todo el Curso ({course})</option>
               <optgroup label="Estudiantes Específicos">
                  {students.map(s => (
                     <option key={s.rut} value={s.rut}>👤 {s.nombreCompleto}</option>
                  ))}
               </optgroup>
            </select>
          </div>

          <div>
            <label>Mensaje</label>
            <textarea 
               value={message} 
               onChange={e => setMessage(e.target.value)}
               rows="5" 
               placeholder="Escribe el mensaje que verán los apoderados..."
               required
               style={{ resize: 'vertical' }}
            ></textarea>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !course}>
             {loading ? 'Enviando...' : <><Send size={18} style={{marginRight: '8px'}} /> Enviar Mensaje</>}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Historial de Mensajes Enviados</h3>
        <p className="text-muted mt-2 mb-4">Tus últimos comunicados enviados a {course}.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
           {history.length === 0 && <p className="text-center text-muted mt-4">No has enviado mensajes a este curso.</p>}
           {history.map(msg => {
              const student = msg.target === 'all' ? null : students.find(s => s.rut === msg.target);
              return (
                 <div key={msg.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', position: 'relative' }}>
                    <button 
                       onClick={() => handleDelete(msg.id)}
                       style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                       title="Eliminar mensaje"
                    >
                       <Trash2 size={16} />
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                       {msg.target === 'all' ? <Users size={16} /> : <User size={16} />}
                       {msg.target === 'all' ? 'A todo el curso' : (student ? `A apoderado de: ${student.nombreCompleto}` : msg.target)}
                    </div>
                    
                    <p style={{ margin: 0, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#888' }}>
                       {new Date(msg.timestamp).toLocaleString()}
                    </div>
                 </div>
              );
           })}
        </div>
      </div>
    </div>
  );
}
