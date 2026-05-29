import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DailyEntry } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = '$') {
  return `${currency}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function isDevMode(): boolean {
  return (
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('ais-dev')
  );
}

export function getApiUrl(path: string) {
  // Check for local storage override first (useful for static apps like GitHub Pages)
  const override = typeof window !== 'undefined' ? localStorage.getItem('K83_API_URL_OVERRIDE') : null;
  
  // Try override, then VITE_API_URL, then default to empty (same-origin)
  let baseUrl = override || import.meta.env.VITE_API_URL || '';
  
  // If we're on localhost or the same domain as the backend, we don't need a baseUrl.
  // However, if we're on a static host like github.io and VITE_API_URL is missing,
  // we will fail to connect.
  if (!baseUrl && (window.location.hostname.includes('github.io') || window.location.hostname.includes('vercel.app'))) {
    console.warn('Backend API URL is missing! Since you are on a static host, you must set VITE_API_URL to your AI Studio application URL or set an override in Settings.');
  }

  // Clean the paths
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${cleanBase}${cleanPath}`;
}

export function getEntryUsageKwh(entry: DailyEntry, allEntries: DailyEntry[]): number {
  if (entry.category === 'printing') return 0;
  
  if (entry.meterReading != null) {
    // Find previous chronological record with a non-null meter reading
    const sortedMeters = allEntries
      .filter(e => (e.category || 'cybercafe') === 'cybercafe' && e.meterReading != null)
      .sort((a, b) => a.date.toMillis() - b.date.toMillis());
    
    const idx = sortedMeters.findIndex(e => e.id === entry.id);
    if (idx > 0) {
      const prev = sortedMeters[idx - 1];
      const diff = entry.meterReading - (prev.meterReading || 0);
      return diff >= 0 ? diff : 0;
    }
  }
  
  // Fallback to wattage & hours
  return ((entry.wattageUsage || 0) * (entry.durationHours || 0)) / 1000;
}

export function getEntryEnergyCost(entry: DailyEntry, allEntries: DailyEntry[], defaultKwhRate: number): number {
  if (entry.category === 'printing') return 0;
  const usage = getEntryUsageKwh(entry, allEntries);
  const rate = entry.kwhRate != null ? entry.kwhRate : defaultKwhRate;
  return usage * rate;
}

export function getEntryNetProfit(entry: DailyEntry, allEntries: DailyEntry[], defaultKwhRate: number): number {
  if (entry.category === 'printing') return entry.grossIncome;
  const cost = getEntryEnergyCost(entry, allEntries, defaultKwhRate);
  return entry.grossIncome - cost;
}
