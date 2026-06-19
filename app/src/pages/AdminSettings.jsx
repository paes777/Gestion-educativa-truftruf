import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Save } from 'lucide-react';
import { defaultConfig } from '../hooks/useSystemConfig';

export default function AdminSettings() {
   const [config, setConfig] = useState(defaultConfig);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);

   useEffect(() => {
      loadConfig();
   }, []);

   const loadConfig = async () => {
      try {
         const docRef = doc(db, 'configuracion', 'global');
         const docSnap = await getDoc(docRef);
         if (docSnap.exists()) {
            setConfig({ ...defaultConfig, ...docSnap.data() });
         }
      } catch (err) {
         console.error("Error loading config:", err);
      }
      setLoading(false);
   };

   const handleSave = async () => {
      setSaving(true);
      try {
         const docRef = doc(db, 'configuracion', 'global');
         await setDoc(docRef, config, { merge: true });
         alert("Configuración guardada correctamente. Los cambios ya están activos en toda la plataforma.");
      } catch (err) {
         console.error("Error saving config:", err);
         alert("Hubo un error al guardar la configuración.");
      }
      setSaving(false);
   };

   if (loading) {
      return <div className="p-8">Cargando configuración...</div>;
   }

   return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
         <div className="card">
            <h3>Cálculo de Promedios</h3>
            <p className="text-muted mt-2 mb-6">Selecciona cómo el sistema debe calcular matemáticamente las notas.</p>
            
            <div className="grid gap-6">
               <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Aproximación de Promedio por Asignatura</label>
                  <p className="text-muted text-sm mb-4">Afecta al promedio semestral individual de cada ramo (Ej: Matemática).</p>
                  <select 
                     className="status-select" 
                     value={config.aproxAsignatura} 
                     onChange={(e) => setConfig({...config, aproxAsignatura: e.target.value})}
                  >
                     <option value="truncar">Truncar al primer decimal (Ej: 4.49 pasa a ser 4.4)</option>
                     <option value="redondear">Redondear al primer decimal (Ej: 4.45 pasa a ser 4.5)</option>
                  </select>
               </div>

               <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Aproximación de Promedio General Semestral</label>
                  <p className="text-muted text-sm mb-4">Afecta al promedio que consolida todas las asignaturas de un semestre.</p>
                  <select 
                     className="status-select" 
                     value={config.aproxSemestral} 
                     onChange={(e) => setConfig({...config, aproxSemestral: e.target.value})}
                  >
                     <option value="truncar">Truncar al primer decimal (Ej: 4.49 pasa a ser 4.4)</option>
                     <option value="redondear">Redondear al primer decimal (Ej: 4.45 pasa a ser 4.5)</option>
                  </select>
               </div>

               <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Aproximación de Promedio General Anual</label>
                  <p className="text-muted text-sm mb-4">Afecta al promedio final del año escolar del estudiante.</p>
                  <select 
                     className="status-select" 
                     value={config.aproxAnual} 
                     onChange={(e) => setConfig({...config, aproxAnual: e.target.value})}
                  >
                     <option value="truncar">Truncar al primer decimal (Ej: 4.49 pasa a ser 4.4)</option>
                     <option value="redondear">Redondear al primer decimal (Ej: 4.45 pasa a ser 4.5)</option>
                  </select>
               </div>
            </div>
         </div>

         <div className="card">
            <h3>Accesos y Permisos</h3>
            <p className="text-muted mt-2 mb-6">Controla el acceso a las plataformas satélite del sistema.</p>
            
            <div className="grid gap-6">
               <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                     <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Portal de Apoderados</label>
                     <p className="text-muted text-sm m-0">Si se apaga, los apoderados no podrán iniciar sesión para ver notas.</p>
                  </div>
                  <div>
                     <select 
                        className="status-select" 
                        value={config.portalApoderadosActivo ? "si" : "no"} 
                        onChange={(e) => setConfig({...config, portalApoderadosActivo: e.target.value === "si"})}
                        style={{ backgroundColor: config.portalApoderadosActivo ? '#e8f5e9' : '#ffebee', color: config.portalApoderadosActivo ? '#2e7d32' : '#c62828' }}
                     >
                        <option value="si">Activo (Permitir acceso)</option>
                        <option value="no">Inactivo (Bloquear acceso)</option>
                     </select>
                  </div>
               </div>

               <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                     <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Ingreso de Notas por Docentes</label>
                     <p className="text-muted text-sm m-0">Si se cierra, los profesores podrán ver notas pero no modificarlas (cierre de semestre).</p>
                  </div>
                  <div>
                     <select 
                        className="status-select" 
                        value={config.ingresoNotasAbierto ? "si" : "no"} 
                        onChange={(e) => setConfig({...config, ingresoNotasAbierto: e.target.value === "si"})}
                        style={{ backgroundColor: config.ingresoNotasAbierto ? '#e8f5e9' : '#ffebee', color: config.ingresoNotasAbierto ? '#2e7d32' : '#c62828' }}
                     >
                        <option value="si">Abierto (Permitir edición)</option>
                        <option value="no">Cerrado (Solo lectura)</option>
                     </select>
                  </div>
               </div>
            </div>
         </div>

         <div className="card">
            <h3>Mensaje de Anuncio Global</h3>
            <p className="text-muted mt-2 mb-6">Un mensaje informativo que aparecerá en la parte superior para docentes y apoderados. Déjalo en blanco para ocultarlo.</p>
            
            <textarea 
               value={config.mensajeGlobal}
               onChange={(e) => setConfig({...config, mensajeGlobal: e.target.value})}
               placeholder="Ej: Estimados docentes, recuerden que el cierre de notas es este viernes 20 de diciembre."
               style={{ width: '100%', height: '100px', padding: '1rem', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit', resize: 'vertical' }}
            ></textarea>
         </div>

         <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button 
               className="btn btn-primary" 
               style={{ padding: '1rem 2rem', fontSize: '1.1rem', backgroundColor: '#3949ab', color: 'white' }}
               onClick={handleSave}
               disabled={saving}
            >
               <Save size={20} />
               {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
         </div>
      </div>
   );
}
