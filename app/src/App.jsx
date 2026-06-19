import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth, db } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useSystemConfig } from './hooks/useSystemConfig';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ParentDashboard from './pages/ParentDashboard';
import PieEditor from './pages/PieEditor';

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin' | 'docente'
  const [loading, setLoading] = useState(true);
  const [parentRut, setParentRut] = useState(localStorage.getItem('parentRut') || null);
  const { config, loading: configLoading } = useSystemConfig();

  const handleParentLogin = (rut) => {
    localStorage.setItem('parentRut', rut);
    setParentRut(rut);
  };

  const handleParentLogout = () => {
    localStorage.removeItem('parentRut');
    setParentRut(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Explicitly check for admin email
        console.log("Usuario detectado:", currentUser.email);
        // Permite los correos definidos como admin
        if (currentUser.email === 'administrador@truftruf.cl' || currentUser.email === 'admin@truftruf.cl' || currentUser.email === 'admin@metrenco.cl') {
          setRole('admin');
        } else {
          const docRef = doc(db, "docentes", currentUser.uid);
          try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setRole('docente');
            } else {
              setRole('docente'); // Default for unrecognized auth users
            }
          } catch (err) {
            console.error("Error fetching user role:", err);
            setRole('docente');
          }
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading || configLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Cargando plataforma...</p>
      </div>
    );
  }

  // Si un apoderado intentó entrar por caché pero el portal está inactivo
  if (parentRut && !config.portalApoderadosActivo) {
     localStorage.removeItem('parentRut');
     setParentRut(null);
  }

  return (
    <BrowserRouter>
      {config.mensajeGlobal && config.mensajeGlobal.trim() !== '' && (
         <div style={{ backgroundColor: '#ff9800', color: 'white', padding: '10px', textAlign: 'center', fontWeight: 'bold', zIndex: 9999, position: 'relative' }}>
            {config.mensajeGlobal}
         </div>
      )}
      <Routes>
        <Route path="/login" element={!user && !parentRut ? <Login onParentLogin={handleParentLogin} /> : <Navigate to="/" replace />} />
        
        <Route 
          path="/" 
          element={
            parentRut 
              ? <ParentDashboard rut={parentRut} onLogout={handleParentLogout} />
              : user 
                ? (role === 'admin' ? <AdminDashboard user={user} /> : <TeacherDashboard user={user} />) 
                : <Navigate to="/login" replace />
          } 
        />
        
        <Route 
          path="/pie/:studentId/:course/:semester" 
          element={
            user ? <PieEditor /> : <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
