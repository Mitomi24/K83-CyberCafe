import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserSettings } from '../types';

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Fetch user settings
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setSettings(userDoc.data() as UserSettings);
          } else {
            // Default settings
            const defaultSettings: UserSettings = { kwhRate: 12, currency: 'Php', theme: 'light' };
            await setDoc(doc(db, 'users', currentUser.uid), defaultSettings);
            setSettings(defaultSettings);
          }
        } catch (error) {
          console.error("Failed to fetch user settings:", error);
          // Fallback to minimal settings if fetch fails
          if (!settings) {
            setSettings({ kwhRate: 12, currency: 'Php' });
          }
        }
      } else {
        setSettings(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
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
