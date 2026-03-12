import { useState } from 'react';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { LogOut, Users, BookOpen, BarChart3, FileText, Settings } from 'lucide-react';
import AdminTeachers from './AdminTeachers';
import AdminStudents from './AdminStudents';
import AdminAttendance from './AdminAttendance';
import AdminAnalysis from './AdminAnalysis';
import AdminReports from './AdminReports';
import TeacherGrades from './TeacherGrades';
import { PenTool } from 'lucide-react';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('docentes');

  const handleLogout = () => signOut(auth);

  const navItems = [
    { id: 'docentes', label: 'Gestión Docentes', icon: <Users size={20} /> },
    { id: 'estudiantes', label: 'Estudiantes', icon: <BookOpen size={20} /> },
    { id: 'notas', label: 'Subir Notas', icon: <PenTool size={20} /> },
    { id: 'asistencia', label: 'Asistencia', icon: <Settings size={20} /> },
    { id: 'analisis', label: 'Análisis de Avance', icon: <BarChart3 size={20} /> },
    { id: 'informes', label: 'Informes y Certificados', icon: <FileText size={20} /> },
  ];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="Metrenco" />
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              style={{background: 'none', border: 'none', width: '100%', textAlign: 'left', font: 'inherit'}}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <div className="top-navbar">
          <div className="top-navbar-title">{navItems.find(i => i.id === activeTab)?.label}</div>
          <div className="top-navbar-actions">
            <span style={{color: 'var(--text-muted)', fontSize: '13px', alignSelf: 'center'}}>
              {user.email}
            </span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{padding: '0.4rem 0.8rem'}}>
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>
        
        <div className="content-scrollable">
        {activeTab === 'docentes' && <AdminTeachers />}
        {activeTab === 'estudiantes' && <AdminStudents />}
        {activeTab === 'notas' && <TeacherGrades user={user} isAdmin={true} />}
        {activeTab === 'asistencia' && <AdminAttendance />}
        {activeTab === 'analisis' && <AdminAnalysis />}
        {activeTab === 'informes' && <AdminReports />}
        </div>
      </main>
    </div>
  );
}
