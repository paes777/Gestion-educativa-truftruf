import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import studentSeed from '../services/students_seed.json';
import { LogOut, Star, MessageCircle, ChevronRight, ChevronDown, User, Calendar, FileText, MoreHorizontal } from 'lucide-react';

export default function ParentDashboard({ rut, onLogout }) {
  const [activeTab, setActiveTab] = useState('notas');
  const [student, setStudent] = useState(null);
  const [grades, setGrades] = useState([]);
  const [subjectTeacherMap, setSubjectTeacherMap] = useState({});
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // 1. Find student
      const st = studentSeed.find(s => s.rut === rut);
      if (!st) {
        alert("RUT no encontrado en el sistema. Asegúrese de ingresarlo sin puntos y con guion.");
        onLogout();
        return;
      }
      setStudent(st);

      try {
        // 2. Fetch grades for both semesters
        const qNotas = query(collection(db, 'notas'), where('studentId', '==', rut));
        const snapNotas = await getDocs(qNotas);
        const gradesData = [];
        snapNotas.forEach(doc => gradesData.push(doc.data()));
        setGrades(gradesData);

        // 3. Fetch teachers for the course
        const snapDocentes = await getDocs(collection(db, 'docentes'));
        const teacherMap = {};
        snapDocentes.forEach(doc => {
           const d = doc.data();
           if (d.asignaciones) {
              d.asignaciones.forEach(a => {
                 if (a.curso === st.curso) {
                    teacherMap[a.asignatura] = d.nombre;
                 }
              });
           }
        });
        setSubjectTeacherMap(teacherMap);

        // 4. Fetch communications
        const qMsgs = query(collection(db, 'comunicaciones'), where('course', '==', st.curso));
        const snapMsgs = await getDocs(qMsgs);
        const msgs = [];
        snapMsgs.forEach(d => {
           const msg = { id: d.id, ...d.data() };
           if (msg.target === 'all' || msg.target === rut) {
              msgs.push(msg);
           }
        });
        
        msgs.sort((a, b) => b.timestamp - a.timestamp);
        setMessages(msgs);

      } catch(err) {
        console.error("Error al cargar datos del apoderado:", err);
      }
      
      setLoading(false);
    };
    loadData();
  }, [rut, onLogout]);

  // Aggregate subjects from grades
  const subjectsMap = {};
  grades.forEach(g => {
     if (!subjectsMap[g.subject]) {
         subjectsMap[g.subject] = { s1: null, s2: null, n1: [], n2: [] };
     }
     if (g.semester === 1) {
         subjectsMap[g.subject].s1 = g.average;
         subjectsMap[g.subject].n1 = g.grades || [];
     } else if (g.semester === 2) {
         subjectsMap[g.subject].s2 = g.average;
         subjectsMap[g.subject].n2 = g.grades || [];
     }
  });

  const subjectsList = Object.keys(subjectsMap).map(subj => {
      const data = subjectsMap[subj];
      let finalAvg = '-';
      if (data.s1 && data.s1 !== '-' && data.s2 && data.s2 !== '-') {
          finalAvg = ((Number(data.s1) + Number(data.s2)) / 2).toFixed(1);
      } else if (data.s1 && data.s1 !== '-') {
          finalAvg = data.s1;
      } else if (data.s2 && data.s2 !== '-') {
          finalAvg = data.s2;
      }

      return {
          name: subj,
          teacher: subjectTeacherMap[subj] || 'Sin docente asignado',
          avg: finalAvg,
          gradesS1: data.n1,
          gradesS2: data.n2
      };
  });

  // Sort subjects alphabetically
  subjectsList.sort((a, b) => a.name.localeCompare(b.name));

  // Calculate overall student average
  const validAvgs = subjectsList.map(s => Number(s.avg)).filter(n => !isNaN(n));
  const generalAvg = validAvgs.length > 0 ? (validAvgs.reduce((a,b) => a+b, 0) / validAvgs.length).toFixed(1) : '-';

  const getSubjectColor = (name) => {
     const colors = ['#8c2633', '#5c6bc0', '#4db6ac', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#03a9f4'];
     let hash = 0;
     for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
     return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
      return <div className="flex justify-center items-center h-screen"><div className="spinner"></div></div>;
  }

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh', paddingBottom: '70px', fontFamily: 'sans-serif' }}>
      
      {/* HEADER AZUL */}
      <div style={{ backgroundColor: '#0077ff', padding: '2rem 1rem 4rem 1rem', color: 'white', textAlign: 'center', borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px', position: 'relative' }}>
         <button onClick={onLogout} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px', borderRadius: '50%' }}>
            <LogOut size={20} />
         </button>
         
         <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '50%', padding: '4px', display: 'inline-block' }}>
               <img src="/logo.png" alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => e.target.style.display='none'} />
            </div>
         </div>

         <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{student?.nombreCompleto}</h2>
         <div style={{ marginTop: '0.5rem' }}>
            <span style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.9rem' }}>
               {student?.curso}
            </span>
         </div>
      </div>

      {/* TARJETA DE PROMEDIOS */}
      <div style={{ margin: '-40px 1rem 1rem 1rem', backgroundColor: 'white', borderRadius: '15px', padding: '1.5rem', display: 'flex', justifyContent: 'space-around', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative', zIndex: 10 }}>
          <div style={{ textAlign: 'center' }}>
             <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.2 }}>Promedio<br/>Estudiante</div>
             <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: generalAvg >= 4.0 ? '#4caf50' : '#f44336', marginTop: '5px' }}>{generalAvg}</div>
          </div>
          <div style={{ width: '1px', backgroundColor: '#eee' }}></div>
          <div style={{ textAlign: 'center' }}>
             <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.2 }}>RUT<br/>Estudiante</div>
             <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333', marginTop: '15px' }}>{rut}</div>
          </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ padding: '0 1rem' }}>
        {activeTab === 'notas' && (
          <div>
            <h3 style={{ color: '#666', fontSize: '1.1rem', marginBottom: '1rem', marginTop: '1.5rem' }}>Notas por asignatura</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               {subjectsList.map((subj, idx) => {
                  const isExpanded = expandedSubject === subj.name;
                  return (
                    <div key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#eaf2f8', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div 
                           onClick={() => setExpandedSubject(isExpanded ? null : subj.name)}
                           style={{ padding: '1rem', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        >
                           {/* Icono letra */}
                           <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: getSubjectColor(subj.name), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', flexShrink: 0 }}>
                              {subj.name.charAt(0)}
                           </div>
                           
                           {/* Info */}
                           <div style={{ marginLeft: '1rem', flex: 1 }}>
                              <div style={{ fontWeight: 'bold', color: '#333', fontSize: '1rem' }}>{subj.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', color: '#666', fontSize: '0.85rem', marginTop: '4px' }}>
                                 <User size={14} style={{ marginRight: '4px' }} />
                                 {subj.teacher}
                              </div>
                           </div>

                           {/* Promedio */}
                           <div style={{ textAlign: 'center', paddingLeft: '1rem' }}>
                              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: subj.avg >= 4.0 ? '#333' : '#f44336' }}>{subj.avg}</div>
                              <div style={{ fontSize: '0.7rem', color: '#888' }}>Promedio</div>
                           </div>

                           {/* Flecha */}
                           <div style={{ marginLeft: '10px', color: '#ccc' }}>
                              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                           </div>
                        </div>

                        {/* Detalle Notas */}
                        {isExpanded && (
                           <div style={{ padding: '1rem', backgroundColor: '#fafafa', borderTop: '1px solid #eee' }}>
                              <div style={{ marginBottom: '1rem' }}>
                                 <strong style={{ fontSize: '0.9rem', color: '#444' }}>Primer Semestre:</strong>
                                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                    {subj.gradesS1 && subj.gradesS1.filter(n => n).length > 0 
                                      ? subj.gradesS1.filter(n => n).map((n, i) => (
                                          <span key={i} style={{ backgroundColor: 'white', border: '1px solid #ddd', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', color: Number(n) < 4 ? '#f44336' : '#333' }}>{n}</span>
                                        ))
                                      : <span style={{ color: '#888', fontSize: '0.85rem' }}>Sin notas registradas</span>
                                    }
                                 </div>
                              </div>
                              <div>
                                 <strong style={{ fontSize: '0.9rem', color: '#444' }}>Segundo Semestre:</strong>
                                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                    {subj.gradesS2 && subj.gradesS2.filter(n => n).length > 0 
                                      ? subj.gradesS2.filter(n => n).map((n, i) => (
                                          <span key={i} style={{ backgroundColor: 'white', border: '1px solid #ddd', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', color: Number(n) < 4 ? '#f44336' : '#333' }}>{n}</span>
                                        ))
                                      : <span style={{ color: '#888', fontSize: '0.85rem' }}>Sin notas registradas</span>
                                    }
                                 </div>
                              </div>
                           </div>
                        )}
                    </div>
                  )
               })}
               {subjectsList.length === 0 && (
                   <p className="text-muted text-center mt-6">Aún no hay asignaturas con notas registradas para este estudiante.</p>
               )}
            </div>
          </div>
        )}

        {activeTab === 'comunicaciones' && (
          <div>
            <h3 style={{ color: '#666', fontSize: '1.1rem', marginBottom: '1rem', marginTop: '1.5rem' }}>Comunicaciones Oficiales</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {messages.length === 0 ? (
                  <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', textAlign: 'center', color: '#888' }}>
                     No hay mensajes nuevos.
                  </div>
               ) : (
                  messages.map(msg => (
                     <div key={msg.id} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                           <strong style={{ color: '#0077ff' }}>{msg.teacherName}</strong>
                           <span style={{ fontSize: '0.8rem', color: '#888' }}>
                              {new Date(msg.timestamp).toLocaleDateString()}
                           </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#333', whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                        {msg.target === 'all' && (
                           <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#888', backgroundColor: '#f0f0f0', display: 'inline-block', padding: '2px 8px', borderRadius: '10px' }}>
                              Aviso a todo el curso
                           </div>
                        )}
                     </div>
                  ))
               )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'white', display: 'flex', borderTop: '1px solid #e0e0e0', padding: '8px 0', zIndex: 50, justifyContent: 'space-around' }}>
         <button 
            onClick={() => setActiveTab('notas')}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', color: activeTab === 'notas' ? '#0077ff' : '#999' }}
         >
            <Star size={24} fill={activeTab === 'notas' ? '#0077ff' : 'none'} />
            <span style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: activeTab === 'notas' ? 'bold' : 'normal' }}>Notas</span>
         </button>
         <button 
            onClick={() => setActiveTab('comunicaciones')}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', color: activeTab === 'comunicaciones' ? '#0077ff' : '#999' }}
         >
            <MessageCircle size={24} fill={activeTab === 'comunicaciones' ? '#0077ff' : 'none'} />
            <span style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: activeTab === 'comunicaciones' ? 'bold' : 'normal' }}>Comunica.</span>
         </button>
      </div>

    </div>
  );
}
