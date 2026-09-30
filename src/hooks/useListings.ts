import { useState, useEffect } from 'react';
import { Listing } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';

const STORAGE_KEY = 'simpl_listings_v1';

const generateSafeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'list_' + Math.random().toString(36).substring(2, 11);
};

const cleanUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj
      .map(item => (typeof item === 'object' && item !== null ? cleanUndefined(item) : item))
      .filter(item => item !== undefined);
  }
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanUndefined(value);
      } else if (Array.isArray(value)) {
        result[key] = value
          .map(v => (typeof v === 'object' && v !== null ? cleanUndefined(v) : v))
          .filter(v => v !== undefined);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
};

const sanitizeForFirestore = (data: any): any => {
  const cleaned = cleanUndefined(data);
  // Ensure document URLs do not store massive inline base64 (>50KB) that blow past Firestore 1MB doc limits
  if (cleaned.documents && Array.isArray(cleaned.documents)) {
    cleaned.documents = cleaned.documents.map((doc: any) => {
      if (doc.url && typeof doc.url === 'string' && doc.url.startsWith('data:') && doc.url.length > 50000) {
        return {
          ...doc,
          url: '#'
        };
      }
      return doc;
    });
  }
  return cleaned;
};

export function useListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading listings from localStorage:', e);
    }
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Sync with Firestore if logged in, otherwise localStorage
  useEffect(() => {
    if (!user) {
      // LocalStorage mode
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        setListings(saved ? JSON.parse(saved) : []);
      } catch (err) {
        console.warn('Error loading local listings', err);
      }
      return;
    }

    setLoading(true);
    const listingsRef = collection(db, 'users', user.uid, 'listings');
    const unsubscribe = onSnapshot(
      listingsRef,
      (snapshot) => {
        const cloudList: Listing[] = [];
        snapshot.forEach((docSnap) => {
          cloudList.push(docSnap.data() as Listing);
        });
        cloudList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setListings(cloudList);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudList));
        } catch (e) {
          // ignore storage limit warning
        }
        setLoading(false);
      },
      (error) => {
        console.error('Firestore listings onSnapshot error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addListing = async (listingData: Omit<Listing, 'id' | 'createdAt' | 'lastUpdated'> & { id?: string }): Promise<Listing> => {
    const id = listingData.id || generateSafeId();
    const now = new Date().toISOString();
    const newListing: Listing = {
      ...listingData,
      id,
      createdAt: now,
      lastUpdated: now,
    };

    const sanitized = sanitizeForFirestore(newListing);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'listings', id), sanitized, { merge: true });
      } catch (err) {
        console.error('Error saving listing to Firestore:', err);
      }
    }

    setListings(prev => {
      const updated = [sanitized, ...prev.filter(l => l.id !== id)];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    return sanitized;
  };

  const editListing = async (id: string, updates: Partial<Listing>): Promise<void> => {
    const now = new Date().toISOString();
    const currentListing = listings.find(l => l.id === id);
    const updated = {
      ...(currentListing || {}),
      ...updates,
      id,
      lastUpdated: now,
    } as Listing;

    const sanitized = sanitizeForFirestore(updated);

    // Optimistically update local state immediately
    setListings(prev => {
      const next = prev.map(l => (l.id === id ? { ...l, ...sanitized } : l));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'listings', id), sanitized, { merge: true });
      } catch (err) {
        console.error('Error updating listing in Firestore:', err);
      }
    }
  };

  const deleteListing = async (id: string): Promise<void> => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'listings', id));
      } catch (err) {
        console.error('Error deleting listing from Firestore:', err);
      }
    }

    setListings(prev => {
      const updated = prev.filter(l => l.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  return {
    listings,
    loading,
    addListing,
    editListing,
    deleteListing,
  };
}
