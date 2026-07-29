import { useState, useEffect, useCallback } from 'react';
import { AgentGoals } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';

export const DEFAULT_GOALS: AgentGoals = {
  year: new Date().getFullYear().toString(),
  targetCommission: 150000,
  targetDeals: 12,
};

export const STORAGE_KEY_GOALS = 'munr_agent_goals';

export function getStoredGoalsLocal(year: string): AgentGoals {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_GOALS}_${year}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        year,
        targetCommission: Number(parsed.targetCommission) || 150000,
        targetDeals: Number(parsed.targetDeals) || 12,
      };
    }
  } catch (e) {
    console.error('Error reading goals from localStorage:', e);
  }
  return { ...DEFAULT_GOALS, year };
}

export function saveStoredGoalsLocal(goals: AgentGoals) {
  try {
    localStorage.setItem(`${STORAGE_KEY_GOALS}_${goals.year}`, JSON.stringify(goals));
  } catch (e) {
    console.error('Error saving goals to localStorage:', e);
  }
}

export function useGoals() {
  const { user } = useAuth();
  const [goalsMap, setGoalsMap] = useState<Record<string, AgentGoals>>({});
  const [loading, setLoading] = useState(true);

  // Sync from Firestore when user is logged in
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const goalsRef = collection(db, 'users', user.uid, 'goals');

    const unsubscribe = onSnapshot(goalsRef, (snapshot) => {
      const updatedMap: Record<string, AgentGoals> = {};
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const year = docSnapshot.id || data.year || new Date().getFullYear().toString();
        const goalsObj: AgentGoals = {
          year,
          targetCommission: Number(data.targetCommission) ?? 150000,
          targetDeals: Number(data.targetDeals) ?? 12,
        };
        updatedMap[year] = goalsObj;
        // Also save to local storage as fallback/cache
        saveStoredGoalsLocal(goalsObj);
      });

      setGoalsMap(updatedMap);
      setLoading(false);
    }, (err) => {
      console.error('Error syncing goals from Firestore:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getGoals = useCallback((year: string): AgentGoals => {
    if (goalsMap[year]) {
      return goalsMap[year];
    }
    return getStoredGoalsLocal(year);
  }, [goalsMap]);

  const updateGoals = useCallback(async (updated: AgentGoals) => {
    // 1. Update local state
    setGoalsMap((prev) => ({
      ...prev,
      [updated.year]: updated,
    }));

    // 2. Save to local storage
    saveStoredGoalsLocal(updated);

    // 3. Save to Firestore if user is authenticated
    if (user) {
      try {
        const goalDocRef = doc(db, 'users', user.uid, 'goals', updated.year);
        await setDoc(goalDocRef, {
          year: updated.year,
          targetCommission: updated.targetCommission,
          targetDeals: updated.targetDeals,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.error('Failed to save goals to Firestore:', err);
      }
    }
  }, [user]);

  return {
    goalsMap,
    getGoals,
    updateGoals,
    loading,
  };
}
