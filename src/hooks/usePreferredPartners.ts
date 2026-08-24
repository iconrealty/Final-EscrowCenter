import { useState, useEffect } from 'react';
import { PreferredPartner, DEFAULT_PARTNERS, PartnerCategory } from '../types/partners';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STORAGE_KEY = 'preferred_partners_list_v4';

export function usePreferredPartners() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<PreferredPartner[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as PreferredPartner[];
        // Filter out any stale system defaults and keep only custom partners
        const customOnly = parsed.filter(p => !p.id.startsWith('sys_') && !p.isSystemDefault);
        return [...DEFAULT_PARTNERS, ...customOnly];
      }
    } catch (e) {
      console.warn('Error loading cached partners', e);
    }
    return DEFAULT_PARTNERS;
  });

  const [loading, setLoading] = useState(false);

  // Sync from Firestore if user is logged in
  useEffect(() => {
    if (!user) return;
    async function loadPartners() {
      try {
        setLoading(true);
        const docRef = doc(db, 'users', user.uid, 'settings', 'preferred_partners');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data()?.customPartners) {
          const customList = snap.data().customPartners as PreferredPartner[];
          const customOnly = customList.filter(p => !p.id.startsWith('sys_') && !p.isSystemDefault);
          const merged = [...DEFAULT_PARTNERS, ...customOnly];
          setPartners(merged);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } else {
          // Initialize user profile settings with empty custom list
          await setDoc(docRef, { customPartners: [] }, { merge: true });
        }
      } catch (err) {
        console.warn('Could not load partners from cloud, using local fallback:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPartners();
  }, [user]);

  const savePartners = async (newPartners: PreferredPartner[]) => {
    setPartners(newPartners);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPartners));
    if (user) {
      try {
        const customOnly = newPartners.filter(p => !p.id.startsWith('sys_') && !p.isSystemDefault);
        const docRef = doc(db, 'users', user.uid, 'settings', 'preferred_partners');
        await setDoc(docRef, { customPartners: customOnly }, { merge: true });
      } catch (err) {
        console.error('Failed to sync partners to user profile in cloud', err);
      }
    }
  };

  const addPartner = async (partner: Omit<PreferredPartner, 'id'>) => {
    const newPartner: PreferredPartner = {
      ...partner,
      id: `custom_${partner.category}_${Date.now()}`,
      isSystemDefault: false,
    };
    const customOnly = partners.filter(p => !p.id.startsWith('sys_') && !p.isSystemDefault);
    const updated = [...DEFAULT_PARTNERS, ...customOnly, newPartner];
    await savePartners(updated);
    return newPartner;
  };

  const deletePartner = async (id: string) => {
    // Prevent deleting system defaults
    if (id.startsWith('sys_')) return;
    const updated = partners.filter(p => p.id !== id);
    await savePartners(updated);
  };

  const getPartnersByCategory = (category: PartnerCategory) => {
    return partners.filter(p => p.category === category);
  };

  const getDefaultPartner = (category: PartnerCategory) => {
    return partners.find(p => p.category === category && p.isDefault) || partners.find(p => p.category === category);
  };

  return {
    partners,
    loading,
    addPartner,
    deletePartner,
    savePartners,
    getPartnersByCategory,
    getDefaultPartner,
  };
}
