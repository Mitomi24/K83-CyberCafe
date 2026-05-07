import React, { useState } from 'react';
import { UserSettings, AppBackup, KwhRateRange } from '../types';
import { Settings as SettingsIcon, Info, Database, Trash2, AlertTriangle, Calendar, Plus, RefreshCw, Download, UploadCloud, Link as LinkIcon, CheckCircle2, CloudOff, HardDrive, Pencil, X, History as HistoryIcon, Zap } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/useData';
import { APP_VERSION } from '../version';
import { getApiUrl } from '../lib/utils';

interface SettingsProps {
  settings: UserSettings;
  onUpdate: (newSettings: UserSettings) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onUpdate }) => {
  const { user } = useAuth();
  const { clearAllData, restoreBackup, recalculateAllEntryCosts, entries, expenses, uploadToDrive } = useData();
  const [kwhRate, setKwhRate] = useState(settings.kwhRate.toString());
  const [currency, setCurrency] = useState(settings.currency);
  const [rateHistory, setRateHistory] = useState(settings.rateHistory || []);

  // Sync state with props
  React.useEffect(() => {
    setKwhRate(settings.kwhRate.toString());
    setCurrency(settings.currency);
    setRateHistory(settings.rateHistory || []);
  }, [settings]);

  const [newRange, setNewRange] = useState({ startDate: '', endDate: '', rate: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState<{ current: number, total: number, active: boolean, phase: 'entries' | 'expenses' | null }>({
    current: 0,
    total: 0,
    active: false,
    phase: null
  });

  const [restoreProgress, setRestoreProgress] = useState<{ current: number, total: number, active: boolean, phase: 'settings' | 'entries' | 'expenses' | null }>({
    current: 0,
    total: 0,
    active: false,
    phase: null
  });

  const [isConfirmingWipe, setIsConfirmingWipe] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [apiOverride, setApiOverride] = useState(typeof window !== 'undefined' ? localStorage.getItem('K83_API_URL_OVERRIDE') || '' : '');

  const saveApiOverride = (url: string) => {
    const cleanUrl = url.trim();
    setApiOverride(cleanUrl);
    if (cleanUrl) {
      localStorage.setItem('K83_API_URL_OVERRIDE', cleanUrl);
    } else {
      localStorage.removeItem('K83_API_URL_OVERRIDE');
    }
  };

  const handleManualCloudBackup = async () => {
    setIsUploadingToDrive(true);
    try {
      await uploadToDrive();
      alert("Manual backup uploaded to Google Drive successfully.");
      await fetchDriveBackups(); // Refresh list
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.message || "Failed to upload manual backup to Drive.";
      alert(errorMsg);
    }
    setIsUploadingToDrive(false);
  };

  const fetchDriveBackups = async () => {
    if (!settings.googleDriveBackup?.tokens || !settings.googleDriveBackup?.folderId) {
      alert("Google Drive is not connected or configured. Please connect your account first.");
      return;
    }
    
    setIsLoadingDriveFiles(true);
    try {
      const apiUrl = getApiUrl('/api/backup/drive/list');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: settings.googleDriveBackup.tokens,
          folderId: settings.googleDriveBackup.folderId
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an invalid response (non-JSON).");
      }

      const data = await response.json();
      if (data.success) {
        setDriveFiles(data.files);
        if (data.newTokens) {
          await onUpdate({
            ...settings,
            googleDriveBackup: {
              ...settings.googleDriveBackup,
              tokens: data.newTokens
            }
          });
        }
      } else {
        alert("Cloud check error: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Network error: Failed to reach cloud backup service.");
    }
    setIsLoadingDriveFiles(false);
  };

  const handleRestoreFromDrive = async (fileId: string) => {
    if (!settings.googleDriveBackup?.tokens) return;

    try {
      const confirmRestore = window.confirm("WARNING: Restoring a cloud backup will wipe all current data and replace it with the backup content. This cannot be undone. Proceed?");
      if (!confirmRestore) return;

      setRestoreProgress({ current: 0, total: 0, active: true, phase: null });
      
      const apiUrl = getApiUrl('/api/backup/drive/fetch');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: settings.googleDriveBackup.tokens,
          fileId
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an invalid response (non-JSON).");
      }

      const data = await response.json();
      
      if (data.success) {
        let backup: AppBackup = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        
        if (!backup.version || !backup.settings || !Array.isArray(backup.entries)) {
          alert("Invalid cloud backup format.");
          setRestoreProgress({ current: 0, total: 0, active: false, phase: null });
          return;
        }

        // Optimization: Preserve the current Drive tokens even if the backup has old ones
        if (settings.googleDriveBackup?.tokens) {
          backup = {
            ...backup,
            settings: {
              ...backup.settings,
              googleDriveBackup: {
                ...(backup.settings.googleDriveBackup || { enabled: false }),
                enabled: settings.googleDriveBackup.enabled,
                tokens: settings.googleDriveBackup.tokens,
                folderId: settings.googleDriveBackup.folderId,
                lastBackupDate: settings.googleDriveBackup.lastBackupDate
              }
            }
          };
        }

        await restoreBackup(backup, (current, total, phase) => {
          setRestoreProgress({ current, total, active: true, phase });
        });

        alert("Cloud backup restored successfully!");
      } else {
        alert("Failed to fetch backup content: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to restore cloud backup.");
    }
    setRestoreProgress({ current: 0, total: 0, active: false, phase: null });
  };

  const handleSystemWipe = async () => {
    if (wipeConfirmText !== 'DELETE ALL') return;

    setIsConfirmingWipe(false);
    setWipeConfirmText('');
    setDeletionProgress({ current: 0, total: 0, active: true, phase: 'entries' });
    try {
      await clearAllData((current, total, phase) => {
        setDeletionProgress(prev => ({ ...prev, current, total, phase }));
      });
    } catch (e) {
      console.error(e);
    }
    setDeletionProgress({ current: 0, total: 0, active: false, phase: null });
  };

  const handleConnectDrive = async () => {
    try {
      const apiUrl = getApiUrl(`/api/auth/google/url?uid=${user?.uid}`);
      const response = await fetch(apiUrl);
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an invalid response (non-JSON).");
      }

      const { url } = await response.json();
      const popup = window.open(url, 'google_auth', 'width=600,height=700');
      
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_DRIVE_AUTH_SUCCESS') {
          const { tokens, folderId } = event.data;
          await onUpdate({
            ...settings,
            googleDriveBackup: {
              enabled: true,
              tokens,
              folderId: folderId || settings.googleDriveBackup?.folderId,
              lastBackupDate: settings.googleDriveBackup?.lastBackupDate || null
            }
          });
          window.removeEventListener('message', handleMessage);
          alert("Google Drive connected successfully! Folder 'K83_Backups' created/linked.");
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (e) {
      console.error(e);
      alert("Failed to connect to Google Drive");
    }
  };

  const toggleDriveBackup = async (enabled: boolean) => {
    await onUpdate({
      ...settings,
      googleDriveBackup: {
        ...(settings.googleDriveBackup || { enabled: false }),
        enabled
      }
    });
  };

  const autoApplyChanges = async (history: KwhRateRange[]) => {
    setIsRecalculating(true);
    try {
      const newSettings = { ...settings, rateHistory: history };
      await onUpdate(newSettings);
      await recalculateAllEntryCosts(newSettings);
    } catch (e) {
      console.error('Failed to auto-apply rates:', e);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleAddRange = () => {
    if (!newRange.startDate || !newRange.endDate || !newRange.rate) return;
    
    let updatedHistory;
    if (editingIndex !== null) {
      updatedHistory = [...rateHistory];
      updatedHistory[editingIndex] = {
        startDate: newRange.startDate,
        endDate: newRange.endDate,
        rate: Number(newRange.rate)
      };
      updatedHistory.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      setEditingIndex(null);
    } else {
      updatedHistory = [...rateHistory, {
        startDate: newRange.startDate,
        endDate: newRange.endDate,
        rate: Number(newRange.rate)
      }].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }
    
    setRateHistory(updatedHistory);
    setNewRange({ startDate: '', endDate: '', rate: '' });
    
    // Auto-apply to ledger
    autoApplyChanges(updatedHistory);
  };

  const handleEditRange = (index: number) => {
    const range = rateHistory[index];
    setNewRange({
      startDate: range.startDate,
      endDate: range.endDate,
      rate: range.rate.toString()
    });
    setEditingIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setNewRange({ startDate: '', endDate: '', rate: '' });
  };

  const handleRemoveRange = (index: number) => {
    const updatedHistory = rateHistory.filter((_, i) => i !== index);
    setRateHistory(updatedHistory);
    autoApplyChanges(updatedHistory);
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    // Pass the current state values directly to ensure the latest ranges are used
    await recalculateAllEntryCosts({ 
      kwhRate: Number(kwhRate), 
      currency, 
      rateHistory 
    });
    setIsRecalculating(false);
  };

  const handleExportBackup = () => {
    const backup: AppBackup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      settings,
      entries,
      expenses
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mining_ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let backup: AppBackup = JSON.parse(text);
      
      if (!backup.version || !backup.settings || !Array.isArray(backup.entries)) {
        alert("Invalid backup file format.");
        return;
      }

      const confirmRestore = window.confirm("WARNING: Restoring a backup will wipe all current data and replace it with the backup content. This cannot be undone. Proceed?");
      if (!confirmRestore) return;

      // Optimization: Preserve the current Drive tokens even if the backup has old ones
      if (settings.googleDriveBackup?.tokens) {
        backup = {
          ...backup,
          settings: {
            ...backup.settings,
            googleDriveBackup: {
              ...(backup.settings.googleDriveBackup || { enabled: false }),
              enabled: settings.googleDriveBackup.enabled,
              tokens: settings.googleDriveBackup.tokens,
              folderId: settings.googleDriveBackup.folderId,
              lastBackupDate: settings.googleDriveBackup.lastBackupDate
            }
          }
        };
      }

      setRestoreProgress({ current: 0, total: 0, active: true, phase: null });
      
      await restoreBackup(backup, (current, total, phase) => {
        setRestoreProgress({ current, total, active: true, phase });
      });

      alert("Backup restored successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to read or restore backup file.");
    }
    setRestoreProgress({ current: 0, total: 0, active: false, phase: null });
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">System Configuration</h2>
          <p className="text-sm text-slate-500">Maintain constant parameters for the calculation engine</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">App Version</span>
          <p className="text-xs font-mono font-bold text-indigo-600">v{APP_VERSION}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* General Settings Section Hidden */}
        {/*
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-indigo-50/10 flex items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <SettingsIcon size={18} className="text-indigo-600 transition-all" />
              General Settings
            </h3>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Baseline Rate ({currency}/kWh)</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="number"
                      step="0.01"
                      value={kwhRate}
                      onChange={(e) => setKwhRate(e.target.value)}
                      onBlur={() => onUpdate({ ...settings, kwhRate: Number(kwhRate) })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-mono font-bold focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <p className="text-[9px] text-amber-600 font-medium italic">Note: If Billing Ranges are defined, this baseline is ignored and 0 is used for unmapped dates.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">System Currency</label>
                <select
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    onUpdate({ ...settings, currency: e.target.value });
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none transition-all appearance-none"
                >
                  <option value="₱">PHP (₱)</option>
                  <option value="$">USD ($)</option>
                  <option value="€">EUR (€)</option>
                  <option value="£">GBP (£)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        */}

        {/* Billing History Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-indigo-50/10 flex items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" />
              Billing Ranges & History
            </h3>
          </div>
          
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={12} className="text-emerald-500" /> 
              Automation Active: Billing ranges are now automatically applied to your records.
            </p>
          </div>
          
          <div className="p-8 space-y-10">
            {/* Rate Adding Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {editingIndex !== null ? 'Update Billing Range' : 'Add Billing Range'}
                </h4>
                {editingIndex !== null && (
                  <button 
                    onClick={cancelEdit}
                    className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1"
                  >
                    <X size={12} /> Cancel Edit
                  </button>
                )}
              </div>
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-dashed ${editingIndex !== null ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-300'}`}>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Start Date</label>
                  <input 
                    type="date" 
                    value={newRange.startDate} 
                    onChange={e => setNewRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded p-2 text-sm font-mono text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">End Date</label>
                  <input 
                    type="date" 
                    value={newRange.endDate} 
                    onChange={e => setNewRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded p-2 text-sm font-mono text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Range Rate ({currency})</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      step="0.1" 
                      value={newRange.rate} 
                      onChange={e => setNewRange(prev => ({ ...prev, rate: e.target.value }))}
                      placeholder="e.g. 14.19"
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm font-mono text-slate-800"
                    />
                    <button 
                      onClick={handleAddRange}
                      type="button"
                      className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* History List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Rate History</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {rateHistory.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-lg">No historical rate ranges defined.</p>
                ) : (
                  rateHistory.map((range, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-indigo-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Billing Period</span>
                          <span className="text-xs font-mono font-bold text-slate-700">
                            {range.startDate} → {range.endDate}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">Applied Rate</span>
                          <span className="text-sm font-mono font-black text-indigo-600">{Number(range.rate || 0).toFixed(4)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditRange(idx)}
                            type="button"
                            className="text-slate-300 hover:text-indigo-500 transition-colors"
                            title="Edit range"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => handleRemoveRange(idx)}
                            type="button"
                            className="text-slate-300 hover:text-red-500 transition-colors"
                            title="Remove range"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 space-y-8">
        {/* Google Drive Auto-Backup */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit mt-8">
          <div className="p-6 border-b border-slate-100 bg-indigo-50/10 flex items-center gap-2">
            <UploadCloud size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">
              Google Drive Auto-Backup
            </h3>
          </div>
          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-slate-800 tracking-tight">Cloud Data Protection</span>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Automatically upload a secure JSON backup to your Google Drive every day when you access the system.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <LinkIcon size={12} className="text-indigo-500" /> Backend API Connection
                    </span>
                    <button
                      onClick={() => {
                        const url = window.location.origin.includes('github.io') ? (import.meta.env.VITE_API_URL || '') : window.location.origin;
                        if (!url) {
                          alert('API URL is not set yet.');
                          return;
                        }
                        navigator.clipboard.writeText(url);
                        alert('URL copied! Set this as VITE_API_URL in your environment secrets.');
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 transition-colors"
                    >
                      Copy App URL
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-600 leading-relaxed italic">
                      If you see <span className="font-mono bg-slate-100 px-1 rounded text-red-500">Unexpected token &lt;</span>, it means your frontend is served from a different domain (like GitHub) and cannot find the backend.
                    </p>
                    
                    <div className="space-y-2">
                       <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Manual API Override (Runtime)</label>
                       <div className="flex gap-2">
                        <input 
                          type="text"
                          value={apiOverride}
                          onChange={(e) => saveApiOverride(e.target.value)}
                          placeholder="Paste AI Studio App URL here..."
                          className="flex-1 font-mono text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-1.5 rounded outline-none focus:border-indigo-500 transition-all"
                        />
                        {apiOverride && (
                          <button 
                            onClick={() => {
                              saveApiOverride('');
                              window.location.reload();
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 bg-white border border-slate-200 rounded"
                            title="Clear override"
                          >
                            <X size={14} />
                          </button>
                        )}
                       </div>
                       <p className="text-[9px] text-slate-400 italic">Overrides VITE_API_URL. Requires reload to apply fully.</p>
                    </div>

                    <div className="bg-slate-100/50 p-2 rounded space-y-1">
                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-tight">
                        <span>Current Active API</span>
                        {import.meta.env.VITE_API_URL ? <span className="text-emerald-500">Build-set</span> : <span className="text-slate-400">Not set in build</span>}
                      </div>
                      <div className="font-mono text-[10px] text-slate-600 break-all px-1">
                        {apiOverride || import.meta.env.VITE_API_URL || 'Local / Same-Origin'}
                      </div>
                    </div>

                    {window.location.origin.includes('github.io') && !import.meta.env.VITE_API_URL && !apiOverride && (
                      <div className="bg-amber-50 border border-amber-200 p-2 rounded text-[10px] text-amber-800 animate-pulse">
                        <strong>Action Required:</strong> Copy the "App URL" from AI Studio and paste it in the "Manual API Override" box above.
                      </div>
                    )}
                  </div>
                </div>

                {!settings.googleDriveBackup?.tokens ? (
                  <div className="space-y-4">
                    <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-3 rounded-lg border border-amber-100 italic">
                      Drive permissions were not granted during login. You must manually link your account to enable cloud backups.
                    </p>
                    <button
                      type="button"
                      onClick={handleConnectDrive}
                      className="w-fit px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest shadow-md hover:bg-slate-900"
                    >
                      <LinkIcon size={16} />
                      Grant Drive Permissions
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg w-fit border border-indigo-100">
                      <CheckCircle2 size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Linked to Account: {user?.email}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleDriveBackup(!settings.googleDriveBackup?.enabled)}
                        className={`px-6 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest shadow-sm border-2 ${settings.googleDriveBackup?.enabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                      >
                        {settings.googleDriveBackup?.enabled ? 'Auto-Backup: Enabled' : 'Auto-Backup: Disabled'}
                      </button>

                      <button
                        type="button"
                        onClick={handleManualCloudBackup}
                        disabled={isUploadingToDrive}
                        className="px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-50"
                      >
                        <UploadCloud size={16} className={isUploadingToDrive ? 'animate-bounce' : ''} />
                        {isUploadingToDrive ? 'Upload Backup Now' : 'Upload Backup Now'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleConnectDrive}
                        className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 underline underline-offset-4 ml-auto"
                      >
                        Sync New Permissions
                      </button>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <HistoryIcon size={16} className="text-slate-400" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cloud Recovery Points</h4>
                        </div>
                        <button 
                          onClick={fetchDriveBackups}
                          disabled={isLoadingDriveFiles}
                          className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-1 hover:underline disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={isLoadingDriveFiles ? 'animate-spin' : ''} />
                          Check Drive
                        </button>
                      </div>

                      {driveFiles.length > 0 ? (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                          {driveFiles.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors group">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-700">{file.name}</span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {new Date(file.createdTime).toLocaleString()} • {(file.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              <button
                                onClick={() => handleRestoreFromDrive(file.id)}
                                className="px-3 py-1 bg-white border border-slate-200 rounded-md text-[9px] font-bold uppercase tracking-widest text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-[10px] text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          {isLoadingDriveFiles ? (
                            <div className="flex flex-col items-center gap-2">
                              <RefreshCw size={16} className="animate-spin text-indigo-400" />
                              <span>Accessing Drive...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <HardDrive size={16} className="text-slate-300" />
                              <span>No recent cloud backups found. Click "Check Drive" to scan.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

                {settings.googleDriveBackup?.lastBackupDate && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 w-full md:w-fit min-w-[200px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Last Cloud Sync</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-slate-800">{settings.googleDriveBackup.lastBackupDate}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 italic">Backup verified in Drive Folder</p>
                    {settings.googleDriveBackup.folderId && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
                        <HardDrive size={12} className="text-slate-400" />
                        <span className="text-[9px] font-mono text-slate-400 uppercase">Remote ID: {settings.googleDriveBackup.folderId.slice(0, 8)}...</span>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Local Backup & Recovery */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit mt-8">
          <div className="p-6 border-b border-slate-100 bg-indigo-50/10 flex items-center gap-2">
            <Database size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">
              Backup & Recovery
            </h3>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-slate-800 tracking-tight">Export System Backup</span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Download a complete snapshot of your billing configuration, profit history, and expense ledger as a high-integrity JSON file.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-fit px-6 py-2.5 bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 font-bold rounded-xl transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest shadow-sm"
              >
                <Download size={16} />
                Generate Backup File
              </button>
            </div>

            <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 md:pl-10 pt-6 md:pt-0">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-slate-800 tracking-tight">Restore System Backup</span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Upload a previously generated backup file to restore your entire database state. <strong>This will overwrite all current data.</strong>
                </p>
              </div>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  disabled={restoreProgress.active}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />
                <button
                  type="button"
                  disabled={restoreProgress.active}
                  className="px-6 py-2.5 bg-white border-2 border-slate-100 text-slate-600 hover:bg-slate-50 font-bold rounded-xl transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest shadow-sm disabled:opacity-50"
                >
                  <UploadCloud size={16} />
                  {restoreProgress.active ? 'Restoring...' : 'Upload & Restore'}
                </button>
              </div>
            </div>
          </div>

          {restoreProgress.active && (
            <div className="mx-8 mb-8 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-indigo-600 font-bold">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    <span className="text-[10px] uppercase tracking-widest">
                      Processing {restoreProgress.phase}: {restoreProgress.current} / {restoreProgress.total}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono">
                    {Math.round((restoreProgress.current / (restoreProgress.total || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden shadow-inner">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-500 ease-out" 
                    style={{ width: `${Math.min(100, (restoreProgress.current / (restoreProgress.total || 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic"> Restoring system state. Please do not close windows. </p>
              </div>
            </div>
          )}
        </div>

        {!window.location.href.includes('https://mitomi24.github.io/K83-CyberCafe/') && (
          <div className="bg-red-50/50 rounded-xl border border-red-100 overflow-hidden mt-8">
            <div className="p-6 border-b border-red-100 bg-red-50/30 flex items-center justify-between">
              <h3 className="font-bold text-red-800 flex items-center gap-2 uppercase tracking-widest text-xs">
                <AlertTriangle size={18} className="text-red-600" />
                Danger Zone
              </h3>
            </div>
            <div className="p-8">
              <div className="max-w-2xl">
                <div className="flex flex-col gap-2 mb-6">
                  <span className="text-sm font-bold text-slate-800">Complete Database Reset</span>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This will permanently wipe <strong>all operational history</strong> and <strong>business expenses</strong>. 
                    This action is intended for a full system reset and cannot be undone.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {!isConfirmingWipe ? (
                    <button
                      type="button"
                      disabled={deletionProgress.active}
                      onClick={() => setIsConfirmingWipe(true)}
                      className="w-fit px-8 py-3 bg-white border-2 border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 font-bold rounded-xl transition-all flex items-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50 shadow-sm"
                    >
                      <Trash2 size={18} />
                      Reset System Data
                    </button>
                  ) : (
                    <div className="p-6 bg-white border-2 border-red-200 rounded-xl space-y-4 shadow-lg animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-start gap-3 text-red-600">
                        <AlertTriangle size={20} className="shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-black uppercase tracking-tight">Destructive Action Required</p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            To confirm permanent deletion of ALL records, please type <span className="font-mono font-bold text-red-600 tracking-widest">DELETE ALL</span> below. This cannot be undone.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          value={wipeConfirmText}
                          onChange={(e) => setWipeConfirmText(e.target.value)}
                          placeholder="Type DELETE ALL"
                          className="flex-1 px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-mono font-bold focus:border-red-500 outline-none transition-all uppercase"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSystemWipe}
                            disabled={wipeConfirmText !== 'DELETE ALL'}
                            className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-red-700 transition-all shadow-md"
                          >
                            Confirm Wipe
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsConfirmingWipe(false);
                              setWipeConfirmText('');
                            }}
                            className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {deletionProgress.active && (
                    <div className="space-y-2 p-4 bg-white rounded-xl border border-red-100 shadow-sm">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">
                          Wiping Database ({deletionProgress.phase === 'entries' ? 'Operations' : 'Expenses'}): {deletionProgress.current}/{deletionProgress.total}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {Math.round((deletionProgress.current / (deletionProgress.total || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-red-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <div 
                          className="bg-red-600 h-full transition-all duration-500 ease-out" 
                          style={{ width: `${Math.min(100, (deletionProgress.current / (deletionProgress.total || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

