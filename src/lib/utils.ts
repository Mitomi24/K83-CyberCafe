import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = '$') {
  return `${currency}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getApiUrl(path: string) {
  // Use VITE_API_URL if provided
  let baseUrl = import.meta.env.VITE_API_URL || '';
  
  // If we're on localhost or the same domain as the backend, we don't need a baseUrl.
  // However, if we're on a static host like github.io and VITE_API_URL is missing,
  // we will fail to connect.
  if (!baseUrl && (window.location.hostname.includes('github.io') || window.location.hostname.includes('vercel.app'))) {
    console.warn('Backend API URL is missing! Since you are on a static host, you must set VITE_API_URL to your AI Studio application URL.');
  }

  // Clean the paths
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${cleanBase}${cleanPath}`;
}
