import React, { useState, useEffect } from 'react';
import { DollarSign, User, Link as LinkIcon, MessageSquare, Send, Calendar, X, Save } from 'lucide-react';
import { DailyEntry } from '../types';
import { format } from 'date-fns';

interface PrintingFormProps {
  onAdd: (
    income: number, 
    wattage: number, 
    hours: number, 
    date?: Date, 
    kwhRate?: number, 
    loggedBy?: 'Tom' | 'Gen', 
    meterReading?: number,
    printingData?: {
      platform?: 'email' | 'messenger' | 'bluetooth' | 'flashdrive' | 'network' | 'verbal';
      customerName?: string;
      fileLink?: string;
      remarks?: string;
    }
  ) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<DailyEntry>) => Promise<void>;
  editingEntry?: DailyEntry | null;
  onCancel?: () => void;
  currency: string;
}

export const PrintingForm: React.FC<PrintingFormProps> = ({ onAdd, onUpdate, editingEntry, onCancel, currency }) => {
  const [income, setIncome] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [platform, setPlatform] = useState<'email' | 'messenger' | 'bluetooth' | 'flashdrive' | 'network' | 'verbal'>('messenger');
  const [fileLink, setFileLink] = useState('');
  const [remarks, setRemarks] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [loggedBy, setLoggedBy] = useState<'Tom' | 'Gen'>('Gen');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingEntry) {
      setIncome(editingEntry.grossIncome.toString());
      setCustomerName(editingEntry.customerName || '');
      setPlatform(editingEntry.platform as any || 'messenger');
      setFileLink(editingEntry.fileLink || '');
      setRemarks(editingEntry.remarks || '');
      setCustomDate(format(editingEntry.date.toDate(), 'yyyy-MM-dd'));
      setLoggedBy(editingEntry.loggedBy as any || 'Gen');
    } else {
      setIncome('');
      setCustomerName('');
      setPlatform('messenger');
      setFileLink('');
      setRemarks('');
      setCustomDate('');
      setLoggedBy('Gen');
    }
  }, [editingEntry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!income || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingEntry && onUpdate && editingEntry.id) {
        await onUpdate(editingEntry.id, {
          grossIncome: Number(income),
          date: customDate ? new Date(customDate) : editingEntry.date.toDate(),
          loggedBy,
          platform,
          customerName: customerName.trim() || "",
          fileLink: fileLink.trim() || "",
          remarks: remarks.trim() || "",
        });
        if (onCancel) onCancel();
      } else {
        await onAdd(
          Number(income),
          0, // No wattage for printing
          0, // No hours for printing
          customDate ? new Date(customDate) : undefined,
          undefined,
          loggedBy,
          undefined,
          {
            platform,
            customerName: customerName.trim() || "",
            fileLink: fileLink.trim() || "",
            remarks: remarks.trim() || "",
          }
        );
        
        // Reset form
        setIncome('');
        setCustomerName('');
        setFileLink('');
        setRemarks('');
        setCustomDate('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden h-fit transition-all ${editingEntry ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
      <div className={`p-6 border-b flex items-center justify-between ${editingEntry ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50/10 border-slate-100'}`}>
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          {editingEntry ? (
            <>
              <Save size={18} className="text-amber-600" />
              Edit Printing Job
            </>
          ) : (
            <>
              <Send size={18} className="text-indigo-600" />
              Record Printing Job
            </>
          )}
        </h3>
        {editingEntry && (
          <button 
            type="button"
            onClick={onCancel}
            className="p-1 hover:bg-amber-200 rounded-full transition-colors text-amber-700"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount ({currency})</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{currency}</div>
            <input
              type="number"
              step="0.01"
              required
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="0.00"
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="messenger">Messenger</option>
              <option value="email">Email</option>
              <option value="flashdrive">Flashdrive</option>
              <option value="bluetooth">Bluetooth</option>
              <option value="network">Local Network</option>
              <option value="verbal">Verbal</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logged By</label>
            <select
              value={loggedBy}
              onChange={(e) => setLoggedBy(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="Tom">Tom</option>
              <option value="Gen">Gen</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Optional"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">File Link / URL</label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="url"
              value={fileLink}
              onChange={(e) => setFileLink(e.target.value)}
              placeholder="Optional"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remarks / Description</label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 text-slate-400" size={16} />
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Job details..."
              rows={3}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Backdate (Optional)</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !income}
          className={`w-full py-4 font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-xs uppercase tracking-widest mt-2 ${editingEntry ? 'bg-amber-600 hover:bg-slate-900' : 'bg-indigo-600 hover:bg-slate-900'} text-white`}
        >
          {isSubmitting ? (editingEntry ? 'Updating...' : 'Recording...') : (editingEntry ? 'Update Transaction' : 'Submit Transaction')}
        </button>
      </form>
    </div>
  );
};
