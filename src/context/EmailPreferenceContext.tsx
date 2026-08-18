import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type EmailClientType = 'gmail' | 'native' | 'ask';

export interface EmailPayload {
  to: string;
  subject?: string;
  body?: string;
}

interface EmailPreferenceContextType {
  emailPreference: EmailClientType;
  gmailAccount: string;
  setEmailPreference: (pref: EmailClientType, gmailAccount?: string, syncCloud?: boolean) => Promise<void>;
  openEmail: (payload: EmailPayload) => void;
  isChooserOpen: boolean;
  pendingPayload: EmailPayload | null;
  openChooser: (payload?: EmailPayload) => void;
  closeChooser: () => void;
}

const STORAGE_KEY_PREF = 'simpl_email_client_pref';
const STORAGE_KEY_GMAIL = 'simpl_email_gmail_account';

const EmailPreferenceContext = createContext<EmailPreferenceContextType | undefined>(undefined);

export function EmailPreferenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [emailPreference, setEmailPreferenceState] = useState<EmailClientType>('ask');
  const [gmailAccount, setGmailAccountState] = useState<string>('');
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<EmailPayload | null>(null);

  // Initialize from LocalStorage
  useEffect(() => {
    try {
      const savedPref = localStorage.getItem(STORAGE_KEY_PREF) as EmailClientType | null;
      const savedGmail = localStorage.getItem(STORAGE_KEY_GMAIL) || '';
      
      if (savedPref && ['gmail', 'native', 'ask'].includes(savedPref)) {
        setEmailPreferenceState(savedPref);
      }
      if (savedGmail) {
        setGmailAccountState(savedGmail);
      }
    } catch (e) {
      console.warn('Could not read email preferences from localStorage', e);
    }
  }, []);

  // Fetch from Firestore when user logs in
  useEffect(() => {
    if (!user) return;
    const fetchCloudPreferences = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.emailClientPreference) {
            setEmailPreferenceState(data.emailClientPreference);
            localStorage.setItem(STORAGE_KEY_PREF, data.emailClientPreference);
          }
          if (data.gmailAccount !== undefined) {
            setGmailAccountState(data.gmailAccount || '');
            localStorage.setItem(STORAGE_KEY_GMAIL, data.gmailAccount || '');
          }
        }
      } catch (err) {
        console.error('Error fetching cloud email preferences:', err);
      }
    };
    fetchCloudPreferences();
  }, [user]);

  const setEmailPreference = async (pref: EmailClientType, account?: string, syncCloud: boolean = true) => {
    setEmailPreferenceState(pref);
    try {
      localStorage.setItem(STORAGE_KEY_PREF, pref);
      if (account !== undefined) {
        setGmailAccountState(account);
        localStorage.setItem(STORAGE_KEY_GMAIL, account);
      }
    } catch (e) {
      console.warn('Could not save email preference to localStorage', e);
    }

    if (user && syncCloud) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          emailClientPreference: pref,
          gmailAccount: account !== undefined ? account : gmailAccount
        }, { merge: true });
      } catch (err) {
        console.error('Error syncing email preference to Firestore:', err);
      }
    }
  };

  const launchGmail = (payload: EmailPayload, account?: string) => {
    const to = encodeURIComponent(payload.to.trim());
    const subject = encodeURIComponent(payload.subject || '');
    const body = encodeURIComponent(payload.body || '');
    const targetAccount = account !== undefined ? account : gmailAccount;

    let gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
    if (targetAccount && targetAccount.trim()) {
      gmailUrl += `&authuser=${encodeURIComponent(targetAccount.trim())}`;
    }

    // Open in a new tab
    const win = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      // Popup blocked fallback
      window.location.href = gmailUrl;
    }
  };

  const launchNativeMail = (payload: EmailPayload) => {
    const to = encodeURIComponent(payload.to.trim());
    const subject = encodeURIComponent(payload.subject || '');
    const body = encodeURIComponent(payload.body || '');
    const mailtoUrl = `mailto:${to}?subject=${subject}&body=${body}`;

    // Trigger via hidden anchor or window location
    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openEmail = (payload: EmailPayload) => {
    if (!payload.to || !payload.to.trim()) return;

    if (emailPreference === 'gmail') {
      launchGmail(payload);
    } else if (emailPreference === 'native') {
      launchNativeMail(payload);
    } else {
      // Prompt user with chooser modal
      setPendingPayload(payload);
      setIsChooserOpen(true);
    }
  };

  const openChooser = (payload?: EmailPayload) => {
    if (payload) {
      setPendingPayload(payload);
    }
    setIsChooserOpen(true);
  };

  const closeChooser = () => {
    setIsChooserOpen(false);
    setPendingPayload(null);
  };

  return (
    <EmailPreferenceContext.Provider
      value={{
        emailPreference,
        gmailAccount,
        setEmailPreference,
        openEmail,
        isChooserOpen,
        pendingPayload,
        openChooser,
        closeChooser,
      }}
    >
      {children}
    </EmailPreferenceContext.Provider>
  );
}

export function useEmailPreference() {
  const context = useContext(EmailPreferenceContext);
  if (!context) {
    throw new Error('useEmailPreference must be used within an EmailPreferenceProvider');
  }
  return context;
}
