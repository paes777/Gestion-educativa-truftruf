import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { LogIn, ShieldAlert } from 'lucide-react';

export default function Login({ onParentLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rut, setRut] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('apoderado'); // 'apoderado' | 'docente' | 'admin'
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (tab === 'apoderado') {
       if (!rut || !rut.includes('-')) {
          setError('El RUT debe contener un guion.');
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
    <div className="auth-container">
      <div className="auth-box card">
        <div className="brand-header">
          <img src="/logo.png" alt="Escuela Truf-Truf" style={{maxWidth: '100px', margin: '0 auto'}} />
          <h1>Escuela Truf-Truf</h1>
          <p className="text-muted text-sm">Sistema de Administración Académica</p>
          <p style={{fontSize: '10px', color: '#ccc', marginTop: '5px'}}>ID: Truf-Truf 2.0 (administrador@truftruf.cl)</p>
        </div>

        <div style={{marginBottom: '1.5rem'}}>
          {tab !== 'apoderado' ? (
             <button 
                type="button" 
                onClick={() => { setTab('apoderado'); setError(''); }} 
                style={{width: '100%', padding: '0.8rem', backgroundColor: '#81c784', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
                Acceso Apoderado
             </button>
          ) : (
             <div style={{display: 'flex', gap: '0.5rem'}}>
                <button type="button" onClick={() => setTab('docente')} className="btn btn-secondary" style={{flex: 1}}>Soy Docente</button>
                <button type="button" onClick={() => setTab('admin')} className="btn btn-secondary" style={{flex: 1}}>Administración</button>
             </div>
          )}
        </div>

        {tab !== 'apoderado' && (
          <div className="auth-tabs">
            <div 
              className={`auth-tab ${tab === 'docente' ? 'active' : ''}`}
              onClick={() => { setTab('docente'); setError(''); }}
            >
              Docentes
            </div>
            <div 
              className={`auth-tab ${tab === 'admin' ? 'active' : ''}`}
              onClick={() => { setTab('admin'); setError(''); }}
            >
              Administración
            </div>
          </div>
        )}

        {error && (
          <div className="alert-error flex items-center gap-4">
            <ShieldAlert size={20} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="grid">
          {tab === 'apoderado' ? (
             <div className="text-center">
                <p className="mb-4 text-muted" style={{fontSize: '0.9rem'}}>Ingrese el RUT del estudiante para revisar sus notas e informes.</p>
                <div style={{textAlign: 'left'}}>
                  <label>RUT del Estudiante</label>
                  <input 
                    type="text" 
                    value={rut}
                    onChange={e => setRut(e.target.value)}
                    placeholder="Ej: 22222222-2" 
                    required
                  />
                  <small style={{color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem', fontSize: '0.8rem'}}>
                    * Escríbalo tal como aparece en la plataforma, <strong>sin puntos y con guion</strong>.
                  </small>
                </div>
                <button type="submit" className="btn btn-block" disabled={loading} style={{marginTop: '1.5rem', padding: '0.75rem', backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px'}}>
                  {loading ? 'Ingresando...' : 'Ver Notas del Estudiante'}
                </button>
             </div>
          ) : (
            <>
              {isRegistering && tab === 'docente' && (
                <div>
                  <label>Nombre Completo</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej: Juan Pérez" 
                    required
                  />
                </div>
              )}
              <div>
                <label>
                  {tab === 'docente' ? 'Nombre de Usuario' : 'Correo Electrónico'}
                </label>
                <input 
                  type={tab === 'docente' ? 'text' : 'email'} 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={tab === 'docente' ? 'Ej: jperez' : 'administrador@truftruf.cl'} 
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label>Contraseña</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                />
              </div>
              
              <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{marginTop: '1.5rem', padding: '0.75rem'}}>
                {loading ? 'Procesando...' : (isRegistering ? 'Crear Cuenta Docente' : 'Ingresar al Portal')}
              </button>
            </>
          )}
        </form>

        {tab === 'docente' && (
          <div style={{marginTop: '1.5rem', textAlign: 'center'}}>
            <a href="#!" onClick={(e) => {e.preventDefault(); setIsRegistering(!isRegistering);}} style={{color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem'}}>
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
