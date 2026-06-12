import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { Save, AlertCircle } from 'lucide-react';
import studentSeed from '../services/students_seed.json';

export default function PieEditor() {
    const { course, studentId, semester } = useParams();
    const activeCourse = decodeURIComponent(course);
    const semNum = Number(semester);
    
    const [studentName, setStudentName] = useState('Cargando...');
    const [pieEducators, setPieEducators] = useState([]);
    const [observations, setObservations] = useState({ sem1: '', sem2: '', pie1: '', pie2: '', pie_details_1: {}, pie_details_2: {} });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [studentId, activeCourse]);

    const loadData = async () => {
        try {
            // 1. Get student name
            const stDoc = await getDoc(doc(db, 'estudiantes', studentId));
            if (stDoc.exists()) {
                setStudentName(stDoc.data().nombreCompleto || stDoc.data().nombres);
            } else {
                const seedMatch = studentSeed.find(s => s.rut === studentId);
                if (seedMatch) setStudentName(seedMatch.nombreCompleto);
                else setStudentName('Estudiante Desconocido');
            }

            // 2. Get differential educators
            const qDocentes = query(collection(db, 'docentes'), where('isDiferencial', '==', true));
            const docentesSnap = await getDocs(qDocentes);
            const courseEducators = [];
            docentesSnap.forEach(d => {
                const data = d.data();
                let isAssigned = false;
                if (data.jefatura === activeCourse) isAssigned = true;
                if (data.asignaciones && data.asignaciones.some(a => a.curso === activeCourse)) isAssigned = true;
                if (data.cursosAsignados && data.cursosAsignados.includes(activeCourse)) isAssigned = true;
                if (data.cursoAsignado === activeCourse) isAssigned = true;
                
                if (isAssigned) courseEducators.push({ id: d.id, name: data.nombre });
            });
            setPieEducators(courseEducators);

            // 3. Get existing observations
            const obsDoc = await getDoc(doc(db, 'observaciones', studentId));
            if (obsDoc.exists()) {
                setObservations(obsDoc.data());
            }
        } catch (err) {
            console.error("Error loading PIE data:", err);
            alert("Error al cargar la información: " + err.message);
        }
        setLoading(false);
    };

    const handlePieDetailsChange = (educatorId, educatorName, text) => {
        const field = semNum === 1 ? 'pie_details_1' : 'pie_details_2';
        const currentDetails = observations[field] || {};
        
        setObservations({
            ...observations,
            [field]: {
                ...currentDetails,
                [educatorId]: { nombre: educatorName, texto: text }
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const oRef = doc(db, 'observaciones', studentId);
            await setDoc(oRef, { ...observations, course: activeCourse }, { merge: true });
            alert("Cambios guardados exitosamente. Puedes cerrar esta pestaña si ya terminaste.");
        } catch (err) {
            console.error(err);
            alert("Error al guardar: " + err.message);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc'}}>
                <div className="spinner" style={{marginBottom: '1rem'}}></div>
                <p style={{fontSize: '1.125rem', color: '#475569'}}>Cargando datos del estudiante...</p>
            </div>
        );
    }

    return (
        <div style={{minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '2rem'}}>
            <div style={{maxWidth: '900px', margin: '0 auto'}}>
                
                <header className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1.5rem 2rem'}}>
                    <div>
                        <h1 style={{fontSize: '1.75rem', fontWeight: 'bold', margin: 0, color: 'var(--primary)'}}>
                            Reporte PIE: {studentName}
                        </h1>
                        <p style={{color: '#64748b', marginTop: '0.5rem', fontSize: '1.1rem', margin: '0.5rem 0 0 0'}}>
                            {activeCourse} - Semestre {semNum}
                        </p>
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="btn btn-primary"
                        style={{padding: '0.75rem 1.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}
                    >
                        {saving ? 'Guardando...' : <><Save size={20} /> Guardar Cambios</>}
                    </button>
                </header>

                {pieEducators.length === 0 ? (
                    <div className="card" style={{textAlign: 'center', padding: '3rem 2rem'}}>
                        <AlertCircle size={48} color="var(--warning)" style={{margin: '0 auto 1rem auto'}} />
                        <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>Sin Educadoras Asignadas</h3>
                        <p style={{color: '#64748b', margin: 0}}>
                            No se encontraron educadoras diferenciales asignadas a <strong>{activeCourse}</strong> en el sistema.
                        </p>
                        <p style={{color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem'}}>
                            El administrador debe asignar el curso a la educadora desde el panel de Docentes.
                        </p>
                    </div>
                ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                        {pieEducators.map(educator => {
                            const field = semNum === 1 ? 'pie_details_1' : 'pie_details_2';
                            const text = observations[field]?.[educator.id]?.texto || '';
                            
                            return (
                                <div key={educator.id} className="card" style={{padding: '2rem'}}>
                                    <label style={{fontWeight: 'bold', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text)'}}>
                                        <span style={{width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem'}}>
                                            {educator.name.charAt(0).toUpperCase()}
                                        </span>
                                        Educadora: {educator.name}
                                    </label>
                                    <textarea 
                                        value={text}
                                        onChange={e => handlePieDetailsChange(educator.id, educator.name, e.target.value)}
                                        placeholder={`Escribe el reporte PIE de ${educator.name.split(' ')[0]} aquí...`}
                                        style={{width: '100%', minHeight: '250px', padding: '1rem', fontSize: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', resize: 'vertical'}}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Legacy Support Display */}
                {((semNum === 1 && observations.pie1) || (semNum === 2 && observations.pie2)) && (
                    <div style={{marginTop: '2rem', backgroundColor: '#f8fafc', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0'}}>
                        <label style={{fontWeight: 'bold', display: 'block', marginBottom: '0.75rem', color: '#64748b'}}>
                            Reporte Antiguo / General
                        </label>
                        <textarea 
                            readOnly
                            value={semNum === 1 ? observations.pie1 : observations.pie2}
                            style={{width: '100%', minHeight: '100px', padding: '1rem', color: '#64748b', backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', resize: 'vertical'}}
                        />
                        <p style={{fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem', margin: '0.5rem 0 0 0'}}>
                            * Este reporte antiguo es de solo lectura. Para actualizar la información, escríbela en los cuadros de arriba.
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
}
