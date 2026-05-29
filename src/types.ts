import { Timestamp } from 'firebase/firestore';

export interface DailyEntry {
  id?: string;
  date: Timestamp;
  grossIncome: number;
  wattageUsage: number;
  durationHours: number;
  energyCost: number;
  kwhRate: number;
  loggedBy?: 'Tom' | 'Gen' | 'CLOSE';
  meterReading?: number;
  category?: 'cybercafe' | 'printing';
  // Printing specific
  platform?: 'email' | 'messenger' | 'bluetooth' | 'flashdrive' | 'network' | 'verbal';
  customerName?: string;
  fileLink?: string;
  remarks?: string;
}

export interface BusinessExpense {
  id?: string;
  name: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  date: Timestamp;
  category?: 'cybercafe' | 'printing';
}

export interface AppBackup {
  version: string;
  timestamp: string;
  settings: UserSettings;
  entries: DailyEntry[];
  expenses: BusinessExpense[];
}

export interface KwhRateRange {
  startDate: string;
  endDate: string;
  rate: number;
}

export interface UserSettings {
  kwhRate: number;
  currency: string;
  theme?: 'light' | 'dark';
  rateHistory?: KwhRateRange[];
  googleDriveBackup?: {
    enabled: boolean;
    folderId?: string;
    lastBackupDate?: string | null;
    tokens?: any;
  };
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface SystemNote {
  id?: string;
  content: string;
  updatedAt: Timestamp;
  category?: 'cybercafe' | 'printing';
}
