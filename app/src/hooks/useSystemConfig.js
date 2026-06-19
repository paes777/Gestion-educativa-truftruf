import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const defaultConfig = {
   aproxAsignatura: 'truncar', // 'truncar' | 'redondear'
   aproxSemestral: 'truncar',
   aproxAnual: 'truncar',
   portalApoderadosActivo: true,
   ingresoNotasAbierto: true,
   mensajeGlobal: ''
};

export function useSystemConfig() {
   const [config, setConfig] = useState(defaultConfig);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const docRef = doc(db, 'configuracion', 'global');
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
         if (docSnap.exists()) {
            setConfig({ ...defaultConfig, ...docSnap.data() });
         } else {
            // Document doesn't exist yet, we stick to default
            setConfig(defaultConfig);
         }
         setLoading(false);
      }, (err) => {
         console.error("Error fetching global config:", err);
         setLoading(false);
      });

      return () => unsubscribe();
   }, []);

   return { config, loading };
}

// Utility math function that uses config
export const calculateAverageWithConfig = (gradesArray, configMode) => {
    if (!gradesArray) return '';
    const validGrades = gradesArray.map(g => Number(g)).filter(g => !isNaN(g) && g > 0 && g <= 7);
    if (validGrades.length === 0) return '';
    
    // Normal average calculation: summing all grades
    const sum = validGrades.reduce((a,b) => a + b, 0);
    const rawAvg = sum / validGrades.length;

    if (configMode === 'redondear') {
       return (Math.round(rawAvg * 10) / 10).toFixed(1);
    } else {
       // truncar (default old behavior)
       const sumInt = validGrades.reduce((a,b) => a + Math.round(b * 10), 0);
       return (Math.floor(sumInt / validGrades.length) / 10).toFixed(1);
    }
};

export const calculateSimpleAverageWithConfig = (avgArray, configMode) => {
    if (!avgArray) return '-';
    const valid = avgArray.map(g => Number(g)).filter(g => !isNaN(g) && g > 0 && g <= 7);
    if (valid.length === 0) return '-';
    
    const sum = valid.reduce((a,b) => a + b, 0);
    const rawAvg = sum / valid.length;

    if (configMode === 'redondear') {
       return (Math.round(rawAvg * 10) / 10).toFixed(1);
    } else {
       // truncar
       const sumInt = valid.reduce((a,b) => a + Math.round(b * 10), 0);
       return (Math.floor(sumInt / valid.length) / 10).toFixed(1);
    }
};
