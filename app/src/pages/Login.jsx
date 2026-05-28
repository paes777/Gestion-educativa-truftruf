import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { LogIn, ShieldAlert, User } from 'lucide-react';

export default function Login({ onParentLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rut, setRut] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('docente'); // 'apoderado' | 'docente' | 'admin'
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (tab === 'apoderado') {
       if (!rut || !rut.includes('-') || !rut.includes('.')) {
          setError('El RUT debe contener puntos y guion.');
          return;
       }
       setLoading(true);
       try {
           // We could check if RUT exists in students_seed, but for simplicity and offline logic,
           // we just log them in if format is decent.
           onParentLogin(rut);
       } catch(err) {
           setError('Error al ingresar: ' + err.message);
       } finally {
           setLoading(false);
       }
       return;
    }

    setLoading(true);

    try {
      let loginEmail = email;
      if (tab === 'docente' && !email.includes('@')) {
        const safeUser = email.toLowerCase().replace(/[^a-z0-9]/g, '');
        loginEmail = `${safeUser}@docente.truftruf.cl`;
      }
      
      if (isRegistering && tab === 'docente') {
         import('firebase/auth').then(async ({createUserWithEmailAndPassword}) => {
             try {
                const creds = await createUserWithEmailAndPassword(auth, loginEmail, password);
                import('firebase/firestore').then(async ({doc, setDoc}) => {
                    await setDoc(doc(auth.app.options.db || import('../services/firebase').then(m => m.db), "docentes", creds.user.uid), {
                        nombre: name,
                        usuario: email
                    });
                });
             } catch(err) {
                 setError('Error al registrar: ' + err.message);
             }
         });
      } else {
         await signInWithEmailAndPassword(auth, loginEmail, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError('Usuario o contraseña incorrectos.');
      } else {
        setError('Ha ocurrido un error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="auth-box card" style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        <div className="brand-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="Escuela Truf-Truf" style={{ maxWidth: '90px', margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '0.5rem', marginTop: 0 }}>Escuela Truf-Truf</h2>
          <p style={{ color: '#666', fontSize: '0.95rem', margin: 0 }}>Sistema de Administración Académica</p>
        </div>

        {error && (
          <div className="alert-error flex items-center gap-4" style={{ marginBottom: '1rem' }}>
            <ShieldAlert size={20} />
            {error}
          </div>
        )}

        {tab === 'apoderado' ? (
           <div className="text-center">
              <p className="mb-4 text-muted" style={{fontSize: '0.95rem'}}>Ingrese el RUT del estudiante para revisar sus notas e informes.</p>
              <form onSubmit={handleLogin} style={{textAlign: 'left'}}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>RUT del Estudiante</label>
                  <input 
                    type="text" 
                    value={rut}
                    onChange={e => setRut(e.target.value)}
                    placeholder="Ej: 26.474.288-9" 
                    required
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
                  />
                  <small style={{color: '#888', display: 'block', marginTop: '0.4rem', fontSize: '0.8rem'}}>
                    * Escríbalo tal como aparece en la plataforma, <strong>con puntos y guion</strong>.
                  </small>
                </div>
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.8rem', backgroundColor: '#388E3C', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                  {loading ? 'Ingresando...' : 'Ver Notas del Estudiante'}
                </button>
              </form>
              <button onClick={() => setTab('docente')} style={{ background: 'none', border: 'none', color: '#2E7D32', marginTop: '1.5rem', cursor: 'pointer', fontSize: '0.95rem', textDecoration: 'underline' }}>
                 Volver al inicio de sesión
              </button>
           </div>
        ) : (
          <>
            <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: '1.5rem' }}>
              <button 
                type="button"
                onClick={() => { setTab('docente'); setError(''); }}
                style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', borderBottom: tab === 'docente' ? '2px solid #2E7D32' : '2px solid transparent', color: tab === 'docente' ? '#2E7D32' : '#666', fontWeight: tab === 'docente' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '1rem' }}
              >
                Docentes
              </button>
              <button 
                type="button"
                onClick={() => { setTab('admin'); setError(''); }}
                style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', borderBottom: tab === 'admin' ? '2px solid #2E7D32' : '2px solid transparent', color: tab === 'admin' ? '#2E7D32' : '#666', fontWeight: tab === 'admin' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '1rem' }}
              >
                Administración
              </button>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {isRegistering && tab === 'docente' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Nombre Completo</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej: Juan Pérez" 
                    required
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {tab === 'docente' ? 'Nombre de Usuario' : 'Correo Electrónico'}
                </label>
                <input 
                  type={tab === 'docente' ? 'text' : 'email'} 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={tab === 'docente' ? 'Ej: jperez' : 'administrador@truftruf.cl'} 
                  required
                  autoComplete="username"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Contraseña</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
                />
              </div>
              
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.9rem', backgroundColor: '#2E7D32', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                {loading ? 'Procesando...' : (isRegistering ? 'Crear Cuenta Docente' : 'Ingresar al Portal')}
              </button>
            </form>

            {tab === 'docente' && (
              <div style={{ textAlign: 'center', marginTop: '1.2rem' }}>
                <a href="#!" onClick={(e) => {e.preventDefault(); setIsRegistering(!isRegistering);}} style={{ color: '#1B5E20', textDecoration: 'none', fontSize: '0.95rem' }}>
                  {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                </a>
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '2rem 0 1.5rem 0' }} />

            <div style={{ textAlign: 'center' }}>
               <p style={{ fontWeight: 'bold', color: '#333', marginBottom: '1rem', fontSize: '1.1rem' }}>¿Eres Apoderado?</p>
               <button 
                 type="button"
                 onClick={() => { setTab('apoderado'); setError(''); }}
                 style={{ width: '100%', backgroundColor: '#388E3C', color: 'white', padding: '0.9rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
               >
                  <User size={20} /> Acceso Apoderado
               </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
