import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { LogOut, BookOpen, FileText } from 'lucide-react';
import TeacherGrades from './TeacherGrades';
import AdminReports from './AdminReports';

export default function TeacherDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('notas');
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const snap = await getDoc(doc(db, 'docentes', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.cursosAsignados && data.cursosAsignados.length > 0) {
             setCourses(data.cursosAsignados);
          } else if (data.cursoAsignado) {
             setCourses([data.cursoAsignado]);
          }

          if (data.asignaturasAsignadas && data.asignaturasAsignadas.length > 0) {
             setSubjects(data.asignaturasAsignadas);
          } else if (data.asignaturaAsignada) {
             setSubjects([data.asignaturaAsignada]);
          }
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    loadCourse();
  }, [user]);

  const handleLogout = () => signOut(auth);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="Metrenco" />
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'notas' ? 'active' : ''}`}
            onClick={() => setActiveTab('notas')}
            style={{background: 'none', border: 'none', width: '100%', textAlign: 'left', font: 'inherit'}}
          >
            <BookOpen size={20} />
            Subir Notas
          </button>
          <button
            className={`nav-item ${activeTab === 'informes' ? 'active' : ''}`}
            onClick={() => setActiveTab('informes')}
            style={{background: 'none', border: 'none', width: '100%', textAlign: 'left', font: 'inherit'}}
          >
            <FileText size={20} />
            Generar Informes
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <div className="top-navbar">
          <div className="top-navbar-title">{activeTab === 'notas' ? 'Registro de Calificaciones' : 'Descarga de Informes'}</div>
          <div className="top-navbar-actions">
            <span style={{color: 'var(--text-muted)', fontSize: '13px', alignSelf: 'center'}}>
              {user.email.split('@')[0]}
            </span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{padding: '0.4rem 0.8rem'}}>
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>
        
        <div className="content-scrollable">
        {loading ? (
             <div className="flex justify-center p-6"><div className="spinner"></div></div>
        ) : courses.length === 0 ? (
             <div className="card text-center p-6">
                <h3 style={{color: 'var(--primary)', fontWeight: 'bold'}}>Aviso Importante</h3>  
                <p className="mt-2 text-muted">Aún no se te ha asignado ningún curso. Por favor, comunícate con Coordinación para que vinculen tu cuenta a tus cursos.</p>
             </div>
        ) : (
             <>
               {activeTab === 'notas' && <TeacherGrades user={user} assignedCourses={courses} assignedSubjects={subjects} />}
               {activeTab === 'informes' && <AdminReports allowedCourses={courses} />}
             </>
        )}
        </div>
      </main>
    </div>
  );
}
