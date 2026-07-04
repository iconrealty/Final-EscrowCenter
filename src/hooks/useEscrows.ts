import { useState, useEffect } from 'react';
import { Escrow, ALL_TASKS } from '../types';

const SEED_ESCROWS: Escrow[] = [];

export function useEscrows() {
  const [escrows, setEscrows] = useState<Escrow[]>(() => {
    try {
      const saved = localStorage.getItem('escrows');
      let parsed = saved ? JSON.parse(saved) : [];
      
      // Filter out '123 main st' and any seed escrows
      parsed = parsed.filter((e: any) => 
        !e.address?.toLowerCase().includes('123 main st') && 
        !e.id?.toString().startsWith('seed-')
      );

      // Migrate existing/legacy escrows that don't have split client name fields
      parsed = parsed.map((e: any) => {
        if (!e.clientFirstName && !e.clientLastName) {
          const rawName = e.clientName || '';
          const parts = rawName.trim().split(/\s+/);
          e.clientFirstName = parts[0] || '';
          e.clientLastName = parts.slice(1).join(' ') || '';
        }
        return e;
      });

      return parsed.map((e: any) => ({
        ...e,
        tasks: e.tasks || {}
      }));
    } catch (err) {
      console.error("Error parsing escrows from local storage", err);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('escrows', JSON.stringify(escrows));
  }, [escrows]);

  const addEscrow = (data: Omit<Escrow, 'id' | 'lastUpdated' | 'tasks'>) => {
    const newEscrow: Escrow = {
      ...data,
      id: crypto.randomUUID(),
      tasks: ALL_TASKS.reduce((acc, task) => ({ ...acc, [task.key]: false }), {}),
      lastUpdated: new Date().toISOString(),
    };
    setEscrows((prev) => [...prev, newEscrow]);
  };

  const editEscrow = (id: string, data: Partial<Escrow>) => {
    setEscrows((prev) =>
      prev.map((escrow) => {
        if (escrow.id === id) {
          const updated = { ...escrow, ...data, lastUpdated: new Date().toISOString() };
          
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
  };

  const deleteEscrow = (id: string) => {
    setEscrows((prev) => prev.filter((e) => e.id !== id));
  };

  const toggleTask = (escrowId: string, taskKey: string) => {
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
  };

  const importEscrows = (importedData: Partial<Escrow>[]) => {
    const newEscrows: Escrow[] = importedData.map(data => {
      // Split name if only full clientName is available in imported data
      let clientFirstName = data.clientFirstName || '';
      let clientLastName = data.clientLastName || '';
      if (!clientFirstName && !clientLastName && (data as any).clientName) {
        const parts = ((data as any).clientName || '').trim().split(/\s+/);
        clientFirstName = parts[0] || '';
        clientLastName = parts.slice(1).join(' ') || '';
      }

      return {
        id: crypto.randomUUID(),
        escrowNumber: data.escrowNumber || '',
        escrowCompany: data.escrowCompany || '',
        address: data.address || 'Unknown Address',
        clientFirstName,
        clientLastName,
        clientPhone: data.clientPhone || '',
        clientEmail: data.clientEmail || '',
        collaborator: data.collaborator || '',
        escrowOfficer: data.escrowOfficer || '',
        escrowPhone: data.escrowPhone || '',
        escrowEmail: data.escrowEmail || '',
        agentName: data.agentName || '',
        agentPhone: data.agentPhone || '',
        agentEmail: data.agentEmail || '',
        lenderName: data.lenderName || '',
        lenderPhone: data.lenderPhone || '',
        lenderEmail: data.lenderEmail || '',
        price: data.price || 0,
        netCommission: data.netCommission || 0,
        acceptanceDate: data.acceptanceDate,
        coeDate: data.coeDate || new Date().toISOString(),
        notes: data.notes || '',
        status: data.status || 'Open',
        contingencyDays: data.contingencyDays || {
          'L1': 7, 'L2': 7, 'L3': 7, 'L4': 7, 'L5': 7, 'L6': 7, 'L7': 7, 'L8': 7, 'L9': 7
        },
        tasks: ALL_TASKS.reduce((acc, task) => ({ ...acc, [task.key]: false }), {}),
        lastUpdated: new Date().toISOString(),
      };
    });

    setEscrows((prev) => [...prev, ...newEscrows]);
  };

  return { escrows, addEscrow, editEscrow, deleteEscrow, toggleTask, importEscrows };
}
