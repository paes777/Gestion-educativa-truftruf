import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { LogIn, ShieldAlert } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('docente'); // 'docente' | 'admin'
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
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
          <p style={{fontSize: '10px', color: '#ccc', marginTop: '5px'}}>ID: gestion-educativa-truf-truf</p>
        </div>

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

        {error && (
          <div className="alert-error flex items-center gap-4">
            <ShieldAlert size={20} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="grid">
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
              placeholder={tab === 'docente' ? 'Ej: jperez' : 'admin@truftruf.cl'} 
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
