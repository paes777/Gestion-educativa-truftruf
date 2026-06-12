import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { Save, AlertCircle, User, FileText } from 'lucide-react';
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
            alert("✅ Cambios guardados exitosamente.");
        } catch (err) {
            console.error(err);
            alert("Error al guardar: " + err.message);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f4f7f9'}}>
                <div className="spinner" style={{marginBottom: '1rem'}}></div>
                <p style={{fontSize: '1.125rem', color: '#475569'}}>Cargando datos del estudiante...</p>
            </div>
        );
    }

    return (
        <div style={{minHeight: '100vh', backgroundColor: '#f4f7f9', padding: '3rem 2rem', fontFamily: 'Inter, system-ui, sans-serif'}}>
            <div style={{maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                
                {/* Header Card */}
                <div style={{backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start'}}>
                    <div style={{width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                        <User size={30} color="var(--primary)" />
                    </div>
                    <div>
                        <h1 style={{fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#1e293b', marginBottom: '0.25rem'}}>
                            Reporte PIE: {studentName.toUpperCase()}
                        </h1>
                        <p style={{color: '#64748b', fontSize: '0.95rem', margin: 0}}>
                            Curso: <strong>{activeCourse}</strong> | Semestre: <strong>{semNum}</strong>
                        </p>
                        <p style={{color: '#64748b', fontSize: '0.95rem', margin: '1rem 0 0 0', lineHeight: 1.5}}>
                            Este espacio está diseñado para registrar los avances y observaciones del Programa de Integración Escolar. La información ingresada aquí aparecerá en el informe de notas del estudiante.
                        </p>
                    </div>
                </div>

                {pieEducators.length === 0 ? (
                    <div style={{backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0', padding: '3rem 2rem', textAlign: 'center'}}>
                        <AlertCircle size={48} color="var(--warning)" style={{margin: '0 auto 1rem auto'}} />
                        <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1e293b'}}>Sin Educadoras Asignadas</h3>
                        <p style={{color: '#64748b', margin: 0}}>
                            No se encontraron educadoras diferenciales asignadas a <strong>{activeCourse}</strong> en el sistema.
                        </p>
                        <p style={{color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem'}}>
                            El administrador debe asignar el curso a la educadora desde el panel de Docentes.
                        </p>
                    </div>
                ) : (
                    <>
                        {pieEducators.map(educator => {
                            const field = semNum === 1 ? 'pie_details_1' : 'pie_details_2';
                            const text = observations[field]?.[educator.id]?.texto || '';
                            
                            return (
                                <div key={educator.id} style={{backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0', borderLeft: '4px solid var(--primary)', padding: '1.5rem'}}>
                                    <label style={{fontWeight: 'bold', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#1e293b'}}>
                                        <FileText size={20} color="var(--primary)" />
                                        Educadora Diferencial: {educator.name}
                                    </label>
                                    <textarea 
                                        value={text}
                                        onChange={e => handlePieDetailsChange(educator.id, educator.name, e.target.value)}
                                        placeholder="Escriba aquí las observaciones y resultados de apoyo PIE..."
                                        style={{width: '100%', minHeight: '200px', padding: '0', fontSize: '0.95rem', backgroundColor: 'transparent', border: 'none', resize: 'vertical', outline: 'none', color: '#475569'}}
                                    />
                                </div>
                            );
                        })}
                    </>
                )}

                {/* Legacy Support Display */}
                {((semNum === 1 && observations.pie1) || (semNum === 2 && observations.pie2)) && (
                    <div style={{backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', borderLeft: '4px solid #94a3b8', padding: '1.5rem'}}>
                        <label style={{fontWeight: 'bold', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#64748b'}}>
                            <FileText size={20} color="#64748b" />
                            Reporte Antiguo / General
                        </label>
                        <textarea 
                            readOnly
                            value={semNum === 1 ? observations.pie1 : observations.pie2}
                            style={{width: '100%', minHeight: '100px', padding: '0', fontSize: '0.95rem', backgroundColor: 'transparent', border: 'none', resize: 'vertical', outline: 'none', color: '#94a3b8'}}
                        />
                        <p style={{fontSize: '0.8rem', color: '#94a3b8', margin: '1rem 0 0 0'}}>
                            * Este reporte antiguo es de solo lectura. Para actualizar la información, escríbela en los cuadros superiores.
                        </p>
                    </div>
                )}

                {/* Bottom Buttons */}
                <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
                    <button 
                        onClick={() => window.close()}
                        style={{padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontWeight: 'bold', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s'}}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                    >
                        Cerrar Pestaña
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        style={{padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontWeight: 'bold', backgroundColor: 'var(--primary)', border: '1px solid var(--primary)', color: '#ffffff', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s'}}
                        onMouseOver={e => !saving && (e.currentTarget.style.opacity = '0.9')}
                        onMouseOut={e => !saving && (e.currentTarget.style.opacity = '1')}
                    >
                        {saving ? 'Guardando...' : <><Save size={18} /> Guardar Reporte PIE</>}
                    </button>
                </div>

            </div>
        </div>
    );
}
