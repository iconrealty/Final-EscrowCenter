import { useState, useEffect } from 'react';
import { Escrow, ALL_TASKS } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  writeBatch,
  query
} from 'firebase/firestore';

const generateSafeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const cleanUndefined = (obj: any): any => {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanUndefined(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
};

export function useEscrows() {
  const { user } = useAuth();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [firestoreLoading, setFirestoreLoading] = useState(false);

  // 1. Sync from either LocalStorage (when user is offline/guest) or Firestore (when user is logged in)
  useEffect(() => {
    if (!user) {
      // Offline / guest mode: load from LocalStorage
      try {
        const saved = localStorage.getItem('escrows');
        let parsed = saved ? JSON.parse(saved) : [];
        
        // Filter out dummy/seed escrows
        parsed = parsed.filter((e: any) => 
          !e.address?.toLowerCase().includes('123 main st') && 
          !e.id?.toString().startsWith('seed-')
        );

        const sanitizeBday = (bday: any, acceptance?: any, coe?: any) => {
          if (!bday || typeof bday !== 'string') return '';
          const str = bday.trim();
          if (!str) return '';
          if (acceptance && typeof acceptance === 'string' && str === acceptance.trim()) return '';
          if (coe && typeof coe === 'string' && str === coe.trim()) return '';
          return str;
        };

        parsed = parsed.map((e: any) => {
          if (!e.clientFirstName && !e.clientLastName) {
            const rawName = e.clientName || '';
            const parts = rawName.trim().split(/\s+/);
            e.clientFirstName = parts[0] || '';
            e.clientLastName = parts.slice(1).join(' ') || '';
          }
          if (e.tasks) {
            if (e.tasks.INS !== undefined && e.tasks.Insurance === undefined) {
              e.tasks.Insurance = e.tasks.INS;
            }
          }
          e.clientBirthday = sanitizeBday(e.clientBirthday, e.acceptanceDate, e.coeDate);
          e.client2Birthday = sanitizeBday(e.client2Birthday, e.acceptanceDate, e.coeDate);
          return e;
        });

        setEscrows(parsed.map((e: any) => ({
          ...e,
          tasks: e.tasks || {}
        })));
      } catch (err) {
        console.error("Error parsing escrows from local storage", err);
        setEscrows([]);
      }
      setFirestoreLoading(false);
      return;
    }

    // Authenticated mode: subscribe to user's escrows in Firestore
    setFirestoreLoading(true);
    const escrowsRef = collection(db, 'users', user.uid, 'escrows');
    const q = query(escrowsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedEscrows: Escrow[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const tasks = data.tasks || {};
        if (tasks.INS !== undefined && tasks.Insurance === undefined) {
          tasks.Insurance = tasks.INS;
        }

        const sanitizeBday = (bday: any, acceptance?: any, coe?: any) => {
          if (!bday || typeof bday !== 'string') return '';
          const str = bday.trim();
          if (!str) return '';
          if (acceptance && typeof acceptance === 'string' && str === acceptance.trim()) return '';
          if (coe && typeof coe === 'string' && str === coe.trim()) return '';
          return str;
        };

        loadedEscrows.push({
          id: doc.id,
          ...data,
          clientBirthday: sanitizeBday(data.clientBirthday, data.acceptanceDate, data.coeDate),
          client2Birthday: sanitizeBday(data.client2Birthday, data.acceptanceDate, data.coeDate),
          tasks
        } as Escrow);
      });

      // Sort in-memory safely by lastUpdated desc to avoid any Firestore index constraints
      loadedEscrows.sort((a, b) => {
        const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return dateB - dateA;
      });

      setEscrows(loadedEscrows);
      setFirestoreLoading(false);
    }, (error) => {
      console.error("Error syncing with firestore:", error);
      setFirestoreLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // 2. Save offline escrows to LocalStorage ONLY when user is not authenticated
  useEffect(() => {
    if (!user) {
      localStorage.setItem('escrows', JSON.stringify(escrows));
    }
  }, [escrows, user]);

  const addEscrow = async (data: Omit<Escrow, 'id' | 'lastUpdated' | 'tasks'>) => {
    const newId = generateSafeId();
    const newEscrow: Escrow = {
      ...data,
      id: newId,
      tasks: ALL_TASKS.reduce((acc, task) => ({ ...acc, [task.key]: false }), {}),
      lastUpdated: new Date().toISOString(),
    };

    if (user) {
      // Sync to cloud
      try {
        const escrowDocRef = doc(db, 'users', user.uid, 'escrows', newId);
        await setDoc(escrowDocRef, cleanUndefined(newEscrow));
      } catch (error) {
        console.error("Error adding escrow to Firestore:", error);
      }
    } else {
      // Keep local
      setEscrows((prev) => [newEscrow, ...prev]);
    }
  };

  const editEscrow = async (id: string, data: Partial<Escrow>) => {
    if (user) {
      try {
        const escrowDocRef = doc(db, 'users', user.uid, 'escrows', id);
        const escrowToUpdate = escrows.find(e => e.id === id);
        if (escrowToUpdate) {
          const updated = { ...escrowToUpdate, ...data, lastUpdated: new Date().toISOString() };
          
          // Auto-close logic
          const allTasksDone = updated.tasks && ALL_TASKS.length > 0 && ALL_TASKS.every((t) => updated.tasks[t.key]);
          if (allTasksDone && updated.status !== 'Cancelled') {
            updated.status = 'Closed';
          }
          await setDoc(escrowDocRef, cleanUndefined(updated));
        }
      } catch (error) {
        console.error("Error updating escrow in Firestore:", error);
      }
    } else {
      setEscrows((prev) =>
        prev.map((escrow) => {
          if (escrow.id === id) {
            const updated = { ...escrow, ...data, lastUpdated: new Date().toISOString() };
            
            // Auto-close logic
            const allTasksDone = updated.tasks && ALL_TASKS.length > 0 && ALL_TASKS.every((t) => updated.tasks[t.key]);
            if (allTasksDone && updated.status !== 'Cancelled') {
              updated.status = 'Closed';
            }
            
            return updated;
          }
          return escrow;
        })
      );
    }
  };

  const deleteEscrow = async (id: string) => {
    if (user) {
      try {
        const escrowDocRef = doc(db, 'users', user.uid, 'escrows', id);
        await deleteDoc(escrowDocRef);
      } catch (error) {
        console.error("Error deleting escrow from Firestore:", error);
      }
    } else {
      setEscrows((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const clearAllEscrows = async () => {
    if (user) {
      try {
        const batch = writeBatch(db);
        escrows.forEach((escrow) => {
          const docRef = doc(db, 'users', user.uid, 'escrows', escrow.id);
          batch.delete(docRef);
        });
        await batch.commit();
        return { success: true };
      } catch (error: any) {
        console.error("Error clearing all escrows from Firestore:", error);
        return { success: false, error: error.message || String(error) };
      }
    } else {
      setEscrows([]);
      localStorage.removeItem('escrows');
      return { success: true };
    }
  };

  const toggleTask = async (escrowId: string, taskKey: string) => {
    if (user) {
      try {
        const escrowDocRef = doc(db, 'users', user.uid, 'escrows', escrowId);
        const escrowToUpdate = escrows.find(e => e.id === escrowId);
        if (escrowToUpdate) {
          const newTasks = { ...escrowToUpdate.tasks, [taskKey]: !escrowToUpdate.tasks[taskKey] };
          const updated = {
            ...escrowToUpdate,
            tasks: newTasks,
            lastUpdated: new Date().toISOString(),
          };
          
          // Auto-close logic
          const allTasksDone = ALL_TASKS.every((t) => updated.tasks[t.key]);
          if (allTasksDone && updated.status !== 'Cancelled') {
            updated.status = 'Closed';
          }

          await setDoc(escrowDocRef, cleanUndefined(updated));
        }
      } catch (error) {
        console.error("Error toggling task in Firestore:", error);
      }
    } else {
      setEscrows((prev) =>
        prev.map((escrow) => {
          if (escrow.id === escrowId) {
            const newTasks = { ...escrow.tasks, [taskKey]: !escrow.tasks[taskKey] };
            const updated = {
              ...escrow,
              tasks: newTasks,
              lastUpdated: new Date().toISOString(),
            };
            
            // Auto-close logic
            const allTasksDone = ALL_TASKS.every((t) => updated.tasks[t.key]);
            if (allTasksDone && updated.status !== 'Cancelled') {
              updated.status = 'Closed';
            }
            
            return updated;
          }
          return escrow;
        })
      );
    }
  };

  const importEscrows = async (importedData: Partial<Escrow>[]) => {
    const newEscrows: Escrow[] = importedData.map(data => {
      let clientFirstName = data.clientFirstName || '';
      let clientLastName = data.clientLastName || '';
      if (!clientFirstName && !clientLastName && (data as any).clientName) {
        const parts = ((data as any).clientName || '').trim().split(/\s+/);
        clientFirstName = parts[0] || '';
        clientLastName = parts.slice(1).join(' ') || '';
      }

      return {
        id: generateSafeId(),
        escrowNumber: data.escrowNumber || '',
        escrowCompany: data.escrowCompany || '',
        address: data.address || 'Unknown Address',
        clientFirstName,
        clientLastName,
        clientPhone: data.clientPhone || '',
        clientEmail: data.clientEmail || '',
        clientBirthday: data.clientBirthday || '',
        client2FirstName: data.client2FirstName || '',
        client2LastName: data.client2LastName || '',
        client2Phone: data.client2Phone || '',
        client2Email: data.client2Email || '',
        client2Birthday: data.client2Birthday || '',
        collaborator: data.collaborator || '',
        escrowOfficer: data.escrowOfficer || '',
        escrowPhone: data.escrowPhone || '',
        escrowEmail: data.escrowEmail || '',
        agentName: data.agentName || '',
        agentPhone: data.agentPhone || '',
        agentEmail: data.agentEmail || '',
        cooperatingBrokerage: data.cooperatingBrokerage || '',
        lenderName: data.lenderName || '',
        lenderPhone: data.lenderPhone || '',
        lenderEmail: data.lenderEmail || '',
        price: data.price || 0,
        commissionPercent: data.commissionPercent,
        netCommission: data.netCommission || 0,
        acceptanceDate: data.acceptanceDate || '',
        contingencyStartDate: data.contingencyStartDate || data.acceptanceDate || '',
        coeDate: data.coeDate || '',
        notes: data.notes || '',
        status: data.status || 'Open',
        representation: data.representation || 'Buyer',
        leadSource: data.leadSource || 'Zillow',
        contingencyDays: data.contingencyDays || {
          'L1': 14, 'L2': 10, 'L3': 7, 'L4': 7, 'L5': 7, 'L6': 7, 'L7': 7, 'L8': 7, 'L9': 7
        },
        tasks: data.tasks || ALL_TASKS.reduce((acc, task) => ({ ...acc, [task.key]: false }), {}),
        lastUpdated: new Date().toISOString(),
      };
    });

    if (user) {
      try {
        const batch = writeBatch(db);
        newEscrows.forEach((escrow) => {
          const cleaned = cleanUndefined(escrow);
          const docRef = doc(db, 'users', user.uid, 'escrows', escrow.id);
          batch.set(docRef, cleaned);
        });
        await batch.commit();
        return { success: true, count: newEscrows.length };
      } catch (error: any) {
        console.error("Error importing escrows to Firestore:", error);
        return { success: false, count: 0, error: error.message || String(error) };
      }
    } else {
      setEscrows((prev) => [...newEscrows, ...prev]);
      return { success: true, count: newEscrows.length };
    }
  };

  return { 
    escrows, 
    addEscrow, 
    editEscrow, 
    deleteEscrow, 
    clearAllEscrows,
    toggleTask, 
    importEscrows,
    firestoreLoading
  };
}
