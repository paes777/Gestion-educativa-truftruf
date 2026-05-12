import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, addDoc, writeBatch } from 'firebase/firestore';
import { Search, Edit2, Trash2, Check, X, Plus, UserPlus } from 'lucide-react';
import studentSeed from '../services/students_seed.json';

const COURSES = [
  "1° Básico", "2° Básico", "3° Básico", "4° Básico",
  "5° Básico", "6° Básico", "7° Básico", "8° Básico"
];

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newData, setNewData] = useState({
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    rut: '',
    curso: COURSES[0]
  });
  const [listNumbers, setListNumbers] = useState({});
  const [savingList, setSavingList] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    // CARGA INSTANTÁNEA: Mostrar locales de inmediato
    const initialList = studentSeed.map(s => ({ id: s.rut, ...s, isLocal: true }));
    setStudents(initialList);
    const initialNums = {};
    initialList.forEach(s => initialNums[s.id] = s.numeroLista || '');
    setListNumbers(initialNums);

    try {
      const q = query(collection(db, 'estudiantes'));
      const snap = await getDocs(q);
      const firestoreData = [];
      snap.forEach(d => firestoreData.push({id: d.id, ...d.data()}));
      
      const merged = [...firestoreData];
      // Force correct course and names from seed to fix corrupted data
      merged.forEach(st => {
         const seedMatch = studentSeed.find(seed => seed.rut === st.rut);
         if (seedMatch) {
            st.curso = seedMatch.curso;
            st.nombreCompleto = seedMatch.nombreCompleto;
         }
      });
      
      studentSeed.forEach(localSt => {
        const exists = firestoreData.some(fsSt => fsSt.rut === localSt.rut);
        if (!exists) {
          merged.push({ id: localSt.rut, ...localSt, isLocal: true });
        }
      });

      merged.sort((a, b) => {
        const numA = typeof a.numeroLista === 'number' ? a.numeroLista : 999;
        const numB = typeof b.numeroLista === 'number' ? b.numeroLista : 999;
        if (numA !== numB) return numA - numB;
        return (a.curso || "").localeCompare(b.curso || "") || a.nombreCompleto.localeCompare(b.nombreCompleto);
      });

      setStudents(merged);
      const nums = {};
      merged.forEach(s => nums[s.id] = s.numeroLista || '');
      setListNumbers(nums);
    } catch (err) {
      console.error("Error loading students:", err);
    }
  };

  const filtered = students.filter(s => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
                          (s.nombreCompleto || "").toLowerCase().includes(term) ||
                          (s.rut || "").includes(term);
    
    const studentCourse = (s.curso || "").trim();
    const matchesCourse = selectedCourse === 'Todos' || studentCourse === selectedCourse.trim();
    
    return matchesSearch && matchesCourse;
  });

  const handleUpdateListNumbers = async () => {
    setSavingList(true);
    try {
      const batch = writeBatch(db);
      filtered.forEach(s => {
        const num = listNumbers[s.id];
        const ref = doc(db, 'estudiantes', s.id);
        const numeroLista = num === '' || num === null || isNaN(Number(num)) ? null : Number(num);
        batch.update(ref, { numeroLista });
      });
      await batch.commit();
      alert("Números de lista actualizados correctamente.");
      loadStudents();
    } catch(err) {
      console.error(err);
      alert("Error al actualizar la lista.");
    }
    setSavingList(false);
  };

  const startEdit = (student) => {
    setEditingId(student.id);
    setEditData(student);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editData.nombreCompleto || !editData.rut) return;
    try {
      await updateDoc(doc(db, 'estudiantes', editingId), {
        nombreCompleto: editData.nombreCompleto,
        rut: editData.rut,
        curso: editData.curso
      });
      setStudents(students.map(s => s.id === editingId ? editData : s));
      setEditingId(null);
    } catch(err) {
      console.error(err);
      alert('Error al guardar cambios');
    }
  };

  const deleteStudent = async (id, name) => {
    if(!confirm(`¿Seguro que deseas eliminar a ${name}?`)) return;
    try {
      await deleteDoc(doc(db, 'estudiantes', id));
      setStudents(students.filter(s => s.id !== id));
    } catch(err) {
      console.error(err);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newData.nombres || !newData.apellidoPaterno || !newData.apellidoMaterno || !newData.rut) {
      alert("Por favor complete todos los campos.");
      return;
    }

    const nombreCompleto = `${newData.nombres} ${newData.apellidoPaterno} ${newData.apellidoMaterno}`.trim();
    
    try {
      const docRef = await addDoc(collection(db, 'estudiantes'), {
        nombreCompleto,
        rut: newData.rut,
        curso: newData.curso
      });
      
      const addedStudent = {
        id: docRef.id,
        nombreCompleto,
        rut: newData.rut,
        curso: newData.curso
      };
      
      setStudents([...students, addedStudent].sort((a,b) => a.nombreCompleto.localeCompare(b.nombreCompleto)));
      setShowAddModal(false);
      setNewData({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', rut: '', curso: COURSES[0] });
    } catch (err) {
      console.error(err);
      alert("Error al agregar estudiante.");
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h3>Gestión de Estudiantes</h3>
          <p className="text-muted mt-1">Total registrados: {students.length}</p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold">Curso:</label>
            <select 
              value={selectedCourse} 
              onChange={e => setSelectedCourse(e.target.value)}
              style={{width: 'auto', minWidth: '150px'}}
            >
              <option value="Todos">Todos los Cursos</option>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{position: 'relative'}}>
            <Search size={18} style={{position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)'}} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o rut..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{paddingLeft: '35px', width: '250px'}}
            />
          </div>

          <button onClick={handleUpdateListNumbers} disabled={savingList} className="btn btn-secondary flex items-center gap-2">
            <Check size={18} />
            {savingList ? 'Actualizando...' : 'Actualizar Lista'}
          </button>

          <button onClick={() => setShowAddModal(true)} className="btn btn-primary flex items-center gap-2">
            <UserPlus size={18} />
            Agregar Estudiante
          </button>
        </div>
      </div>

      <div className="table-container" style={{maxHeight: '600px', overflowY: 'auto'}}>
        <table>
          <thead>
            <tr>
              <th style={{width: '60px'}}>N°</th>
              <th>RUT</th>
              <th>Nombre Completo</th>
              <th>Curso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                {editingId === s.id ? (
                  <>
                    <td>{listNumbers[s.id] ?? '-'}</td>
                    <td><input type="text" value={editData.rut} onChange={e => setEditData({...editData, rut: e.target.value})} /></td>
                    <td><input type="text" value={editData.nombreCompleto} onChange={e => setEditData({...editData, nombreCompleto: e.target.value})} /></td>
                    <td>
                      <select value={editData.curso} onChange={e => setEditData({...editData, curso: e.target.value})}>
                        {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="flex gap-2">
                       <button onClick={saveEdit} className="btn btn-primary" style={{padding: '0.4rem'}} title="Guardar"><Check size={16} /></button>
                       <button onClick={cancelEdit} className="btn btn-secondary" style={{padding: '0.4rem'}} title="Cancelar"><X size={16} /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <input 
                        type="number" 
                        value={listNumbers[s.id] ?? ''} 
                        onChange={e => setListNumbers({...listNumbers, [s.id]: e.target.value})}
                        style={{width: '50px', padding: '0.2rem', textAlign: 'center', margin: 0}}
                      />
                    </td>
                    <td>{s.rut}</td>
                    <td>{s.nombreCompleto}</td>
                    <td>{s.curso}</td>
                    <td className="flex gap-2">
                       <button onClick={() => startEdit(s)} className="btn btn-secondary" style={{padding: '0.4rem'}} title="Editar"><Edit2 size={16} /></button>
                       <button onClick={() => deleteStudent(s.id, s.nombreCompleto)} className="btn btn-danger" style={{padding: '0.4rem'}} title="Eliminar"><Trash2 size={16} /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No se encontraron estudiantes para el curso o término de búsqueda seleccionado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{width: '90%', maxWidth: '500px', padding: '2rem'}}>
            <div className="flex justify-between items-center mb-6">
              <h3>Agregar Nuevo Estudiante</h3>
              <button onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{padding: '0.5rem'}}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddStudent} className="grid gap-4">
              <div>
                <label>Nombre(s)</label>
                <input 
                  type="text" 
                  required 
                  value={newData.nombres} 
                  onChange={e => setNewData({...newData, nombres: e.target.value})}
                  placeholder="Ej: Juan Pedro"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Apellido Paterno</label>
                  <input 
                    type="text" 
                    required 
                    value={newData.apellidoPaterno} 
                    onChange={e => setNewData({...newData, apellidoPaterno: e.target.value})}
                    placeholder="Pérez"
                  />
                </div>
                <div>
                  <label>Apellido Materno</label>
                  <input 
                    type="text" 
                    required 
                    value={newData.apellidoMaterno} 
                    onChange={e => setNewData({...newData, apellidoMaterno: e.target.value})}
                    placeholder="González"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>RUT</label>
                  <input 
                    type="text" 
                    required 
                    value={newData.rut} 
                    onChange={e => setNewData({...newData, rut: e.target.value})}
                    placeholder="12.345.678-9"
                  />
                </div>
                <div>
                  <label>Curso</label>
                  <select 
                    value={newData.curso} 
                    onChange={e => setNewData({...newData, curso: e.target.value})}
                  >
                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-4">
                <button type="submit" className="btn btn-primary flex-1">Agregar Estudiante</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary flex-1">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

