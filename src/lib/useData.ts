import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  Timestamp, 
  doc, 
  addDoc, 
  deleteDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  limit,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { getApiUrl, isDevMode } from './utils';
import { DailyEntry, BusinessExpense, UserSettings, AppBackup, SystemNote } from '../types';
import { handleFirestoreError, OperationType } from './error-handler';

export function useData() {
  const { user, settings } = useAuth();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [notes, setNotes] = useState<SystemNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const entriesRef = collection(db, 'users', user.uid, 'entries');
    const expensesRef = collection(db, 'users', user.uid, 'expenses');
    const notesRef = collection(db, 'users', user.uid, 'notes');

    const qEntries = query(entriesRef, orderBy('date', 'desc'));
    const qExpenses = query(expensesRef, orderBy('date', 'desc'));

    const unsubEntries = onSnapshot(qEntries, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyEntry));
      setEntries(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/entries`));

    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusinessExpense));
      setExpenses(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/expenses`));

    const unsubNotes = onSnapshot(notesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemNote));
      setNotes(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notes`));

    return () => {
      unsubEntries();
      unsubExpenses();
      unsubNotes();
    };
  }, [user]);

  const updateNote = async (content: string, category: 'cybercafe' | 'printing' = 'cybercafe') => {
    if (!user) return;
    const noteId = `note_${category}`;
    const path = `users/${user.uid}/notes/${noteId}`;
    try {
      await setDoc(doc(db, path), {
        content,
        updatedAt: Timestamp.now(),
        category
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const addEntry = async (
    income: number, 
    wattage: number, 
    hours: number, 
    customDate?: Date, 
    customKwhRate?: number, 
    loggedBy?: 'Tom' | 'Gen' | 'CLOSE', 
    meterReading?: number, 
    category: 'cybercafe' | 'printing' = 'cybercafe',
    printingData?: {
      platform?: 'email' | 'messenger' | 'bluetooth' | 'flashdrive' | 'network' | 'verbal';
      customerName?: string;
      fileLink?: string;
      remarks?: string;
    }
  ) => {
    if (!user || !settings) return;
    
    const entryDate = customDate || new Date();
    
    // Convert entry date to YYYY-MM-DD string consistently using local time
    // This ensures comparing against billing ranges matches the user's intended calendar day
    const getDStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const dStr = getDStr(entryDate);
    
    // Logic to find rate from history if not provided
    let rateToUse = customKwhRate;
    if (rateToUse === undefined) {
      // Find range in history
      const range = (settings.rateHistory || []).find(r => {
        if (!r.startDate || !r.endDate) return false;
        // Direct string comparison of YYYY-MM-DD is safe and correct here
        return dStr >= r.startDate && dStr <= r.endDate;
      });
      
      // Default to 0 if not within any range (as requested)
      // If history is completely empty, we still default to 0 as per instructions
      rateToUse = range ? range.rate : 0;
    }

    const energyCost = (wattage / 1000) * hours * (rateToUse || 0);
    const entryPath = `users/${user.uid}/entries`;
    try {
      await addDoc(collection(db, entryPath), {
        date: Timestamp.fromDate(entryDate),
        grossIncome: income,
        wattageUsage: wattage,
        durationHours: hours,
        energyCost: energyCost,
        kwhRate: rateToUse,
        loggedBy: loggedBy || null,
        meterReading: meterReading || null,
        category,
        ...printingData
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, entryPath);
    }
  };

  const addExpense = async (name: string, amount: number, customDate?: Date, quantity?: number, unitPrice?: number, category: 'cybercafe' | 'printing' = 'cybercafe') => {
    if (!user) return;
    const expensePath = `users/${user.uid}/expenses`;
    try {
      await addDoc(collection(db, expensePath), {
        name,
        amount,
        quantity: quantity || 1,
        unitPrice: unitPrice || amount,
        date: customDate ? Timestamp.fromDate(customDate) : Timestamp.now(),
        category
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, expensePath);
    }
  };

  const removeEntry = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/entries/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const removeExpense = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/expenses/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const updateEntry = async (id: string, updates: Partial<DailyEntry>) => {
    if (!user) return;
    const path = `users/${user.uid}/entries/${id}`;
    try {
      const dataToUpdate = { ...updates };
      
      // Handle date conversion if it's a Date object
      if (updates.date && updates.date instanceof Date) {
        dataToUpdate.date = Timestamp.fromDate(updates.date);
      }

      // If this is a cybercafe entry, recalculate energy cost if dependencies changed
      const existingEntry = entries.find(e => e.id === id);
      if (existingEntry && (existingEntry.category || 'cybercafe') === 'cybercafe') {
        const wattage = updates.wattageUsage !== undefined ? updates.wattageUsage : (existingEntry.wattageUsage || 0);
        const hours = updates.durationHours !== undefined ? updates.durationHours : (existingEntry.durationHours || 0);
        const rate = updates.kwhRate !== undefined ? updates.kwhRate : (existingEntry.kwhRate || settings?.kwhRate || 0);
        
        if (updates.wattageUsage !== undefined || updates.durationHours !== undefined || updates.kwhRate !== undefined) {
          (dataToUpdate as any).energyCost = (wattage / 1000) * hours * rate;
        }
      }

      await updateDoc(doc(db, path), dataToUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const clearAllEntries = async (onProgress?: (deleted: number, total: number) => void) => {
    if (!user) return;
    const entryPath = `users/${user.uid}/entries`;
    
    try {
      // First, get the total count for progress reporting
      const totalSnap = await getDocs(collection(db, entryPath));
      const total = totalSnap.size;
      if (total === 0) return;

      let deletedCount = 0;
      
      // Process in batches of 500
      while (true) {
        const q = query(collection(db, entryPath), limit(500));
        const snap = await getDocs(q);
        
        if (snap.empty) break;

        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        
        deletedCount += snap.size;
        if (onProgress) onProgress(deletedCount, total);
        
        if (snap.size < 500) break;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, entryPath);
    }
  };

  const clearAllExpenses = async (onProgress?: (deleted: number, total: number) => void) => {
    if (!user) return;
    const expensePath = `users/${user.uid}/expenses`;
    
    try {
      const totalSnap = await getDocs(collection(db, expensePath));
      const total = totalSnap.size;
      if (total === 0) return;

      let deletedCount = 0;

      while (true) {
        const q = query(collection(db, expensePath), limit(500));
        const snap = await getDocs(q);
        
        if (snap.empty) break;

        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        
        deletedCount += snap.size;
        if (onProgress) onProgress(deletedCount, total);

        if (snap.size < 500) break;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, expensePath);
    }
  };

  const clearAllData = async (onProgress?: (deleted: number, total: number, phase: 'entries' | 'expenses') => void) => {
    if (!user) return;
    
    // Process entries first
    await clearAllEntries((curr, total) => {
      if (onProgress) onProgress(curr, total, 'entries');
    });

    // Then expenses
    await clearAllExpenses((curr, total) => {
      if (onProgress) onProgress(curr, total, 'expenses');
    });
  };

  const updateSettings = async (newSettings: UserSettings) => {
    if (!user) return;
    const settingsPath = `users/${user.uid}`;
    try {
      await setDoc(doc(db, settingsPath), newSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, settingsPath);
    }
  };

  const restoreBackup = async (
    backup: AppBackup, 
    onProgress?: (current: number, total: number, phase: 'settings' | 'entries' | 'expenses') => void
  ) => {
    if (!user) return;

    // 1. Restore Settings
    if (onProgress) onProgress(0, 1, 'settings');
    await updateSettings(backup.settings);
    if (onProgress) onProgress(1, 1, 'settings');

    // 2. Clear Existing Data
    await clearAllData();

    // 3. Restore Entries
    if (backup.entries.length > 0) {
      const total = backup.entries.length;
      let current = 0;
      const chunks = [];
      for (let i = 0; i < backup.entries.length; i += 500) {
        chunks.push(backup.entries.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(entry => {
          const ref = doc(collection(db, `users/${user.uid}/entries`));
          // Convert serialized timestamps back to Firestore Timestamps
          const entryData = { 
            ...entry, 
            date: entry.date instanceof Timestamp 
              ? entry.date 
              : Timestamp.fromMillis((entry.date as any).seconds * 1000) 
          };
          delete entryData.id;
          batch.set(ref, entryData);
        });
        await batch.commit();
        current += chunk.length;
        if (onProgress) onProgress(current, total, 'entries');
      }
    }

    // 4. Restore Expenses
    if (backup.expenses.length > 0) {
      const total = backup.expenses.length;
      let current = 0;
      const chunks = [];
      for (let i = 0; i < backup.expenses.length; i += 500) {
        chunks.push(backup.expenses.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(exp => {
          const ref = doc(collection(db, `users/${user.uid}/expenses`));
          const expData = { 
            ...exp, 
            date: exp.date instanceof Timestamp 
              ? exp.date 
              : Timestamp.fromMillis((exp.date as any).seconds * 1000) 
          };
          delete expData.id;
          batch.set(ref, expData);
        });
        await batch.commit();
        current += chunk.length;
        if (onProgress) onProgress(current, total, 'expenses');
      }
    }
  };

  const recalculateAllEntryCosts = async (manualSettings?: UserSettings) => {
    const settingsToUse = manualSettings || settings;
    if (!user || !settingsToUse || entries.length === 0) return;
    const entryPath = `users/${user.uid}/entries`;
    
    try {
      // Process in batches of 500 for Firestore limits
      const entryChunks = [];
      for (let i = 0; i < entries.length; i += 500) {
        entryChunks.push(entries.slice(i, i + 500));
      }

      for (const chunk of entryChunks) {
        const batch = writeBatch(db);
        let count = 0;

        chunk.forEach(entry => {
          if (!entry.id) return;
          
          const entryDate = entry.date.toDate();
          const year = entryDate.getFullYear();
          const month = String(entryDate.getMonth() + 1).padStart(2, '0');
          const day = String(entryDate.getDate()).padStart(2, '0');
          const dStr = `${year}-${month}-${day}`;
          
          // Default to 0 as per user request if not within any range
          let newRate = 0; 
          if (settingsToUse.rateHistory && settingsToUse.rateHistory.length > 0) {
            const range = settingsToUse.rateHistory.find(r => {
              if (!r.startDate || !r.endDate) return false;
              return dStr >= r.startDate && dStr <= r.endDate;
            });
            if (range) newRate = range.rate;
          }

          const wattage = entry.wattageUsage || 0;
          const hours = entry.durationHours || 0;
          const newEnergyCost = (wattage / 1000) * hours * newRate;
          
          batch.update(doc(db, entryPath, entry.id), {
            kwhRate: newRate,
            energyCost: newEnergyCost
          });
          count++;
        });

        if (count > 0) await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, entryPath);
    }
  };

  const createBackup = (): AppBackup => {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      settings: settings || { kwhRate: 0, currency: '₱' },
      entries,
      expenses
    };
  };

  const uploadToDrive = async (manualBackup?: AppBackup) => {
    if (!settings?.googleDriveBackup?.enabled || !settings?.googleDriveBackup?.tokens) {
      return;
    }

    const backup = manualBackup || createBackup();
    
    try {
      const apiUrl = getApiUrl('/api/backup/drive');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: settings.googleDriveBackup.tokens,
          backup,
          folderId: settings.googleDriveBackup.folderId
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an invalid response (non-JSON).");
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Drive upload failed');
      }

      const result = await response.json();
      
      // Update last backup date and tokens if refreshed
      const today = new Date().toISOString().split('T')[0];
      await updateSettings({
        ...settings,
        googleDriveBackup: {
          ...settings.googleDriveBackup,
          lastBackupDate: today,
          tokens: result.newTokens || settings.googleDriveBackup.tokens
        }
      });

      return result.fileId;
    } catch (error) {
      console.error('Auto backup error:', error);
      throw error;
    }
  };

  const triggerAutoBackup = async () => {
    if (!isDevMode()) return;
    if (!settings?.googleDriveBackup?.enabled || !settings?.googleDriveBackup?.tokens) return;
    
    const today = new Date().toISOString().split('T')[0];
    if (settings.googleDriveBackup.lastBackupDate === today) return;

    console.log('Triggering daily auto-backup to Google Drive...');
    try {
      await uploadToDrive();
    } catch (e) {
      console.error('Daily backup failed:', e);
    }
  };

  return { entries, expenses, notes, loading, addEntry, addExpense, removeEntry, removeExpense, updateEntry, clearAllEntries, clearAllExpenses, clearAllData, restoreBackup, recalculateAllEntryCosts, createBackup, uploadToDrive, triggerAutoBackup, updateSettings, updateNote };
}
