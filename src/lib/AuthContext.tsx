import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserSettings } from '../types';
import { APP_VERSION } from '../version';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  settings: UserSettings | null;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (newSettings: UserSettings) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle version-based logout
  useEffect(() => {
    const storedVersion = localStorage.getItem('k83_app_version');
    
    if (storedVersion && storedVersion !== APP_VERSION) {
      console.log(`Version mismatch: ${storedVersion} vs ${APP_VERSION}. Forcing logout.`);
      signOut(auth).then(() => {
        localStorage.setItem('k83_app_version', APP_VERSION);
        // Optional: reload to ensure clinical state
        window.location.reload();
      });
    } else {
      localStorage.setItem('k83_app_version', APP_VERSION);
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setSettings(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    
    // Use onSnapshot to keep settings in sync across devices
    const unsubscribeSettings = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as UserSettings);
      } else {
        // Initial setup for new user
        const defaultSettings: UserSettings = { kwhRate: 12, currency: 'Php', theme: 'light' };
        setDoc(userDocRef, defaultSettings).catch(err => {
          console.error("Initial settings setup failed:", err);
        });
        setSettings(defaultSettings);
      }
      setLoading(false);
    }, (error) => {
      console.error("Settings listener error:", error);
      // Fallback if settings can't be fetched
      if (!settings) {
        setSettings({ kwhRate: 12, currency: 'Php' });
      }
      setLoading(false);
    });

    return () => unsubscribeSettings();
  }, [user]);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Add scopes if we want to try getting access token, but Firebase doesn't return refresh tokens
      // provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      alert(error.message || "Login failed. Please try again.");
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateSettings = async (newSettings: UserSettings) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), newSettings, { merge: true });
    setSettings(prev => prev ? { ...prev, ...newSettings } : newSettings);
  };

  return (
    <AuthContext.Provider value={{ user, loading, settings, signIn, logout, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
