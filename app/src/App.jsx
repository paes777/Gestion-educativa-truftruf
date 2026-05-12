import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth, db } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin' | 'docente'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Explicitly check for admin email
        if (currentUser.email === 'admin@truftruf.cl') {
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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Cargando plataforma...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        
        <Route 
          path="/" 
          element={
            user 
              ? (role === 'admin' ? <AdminDashboard user={user} /> : <TeacherDashboard user={user} />) 
              : <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
