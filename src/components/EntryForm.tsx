import React, { useState, useEffect } from 'react';
import { Zap, DollarSign, Clock, X, Save } from 'lucide-react';
import { DailyEntry, KwhRateRange } from '../types';

interface EntryFormProps {
  onAdd: (income: number, wattage: number, hours: number, date?: Date, kwhRate?: number, loggedBy?: 'Tom' | 'Gen', meterReading?: number) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<DailyEntry>) => Promise<void>;
  editingEntry?: DailyEntry | null;
  onCancel?: () => void;
  currency: string;
  defaultKwhRate: number;
  rateHistory?: KwhRateRange[];
  latestMeterReading?: number;
}

export const EntryForm: React.FC<EntryFormProps> = ({ 
  onAdd, 
  onUpdate,
  editingEntry,
  onCancel,
  currency, 
  defaultKwhRate, 
  rateHistory,
  latestMeterReading 
}) => {
  const [income, setIncome] = useState('');
  const [wattage, setWattage] = useState('');
  const [meterReading, setMeterReading] = useState('');
  const [hours, setHours] = useState('12');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [kwhRate, setKwhRate] = useState('0');
  const [loggedBy, setLoggedBy] = useState<'Tom' | 'Gen'>('Gen');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Auto-rate selection logic based on date
  useEffect(() => {
    if (editingEntry) return; // Don't auto-update if editing existing entry
    
    if (rateHistory && rateHistory.length > 0) {
      const range = rateHistory.find(r => {
        if (!r.startDate || !r.endDate) return false;
        return date >= r.startDate && date <= r.endDate;
      });
      if (range) {
        setKwhRate(range.rate.toString());
      } else {
        // As per user request: "records that are not within those ranges should be defaulted to 0"
        setKwhRate('0');
      }
    } else {
      // If no history, default to 0 as requested
      setKwhRate('0');
    }
  }, [date, rateHistory, editingEntry]);

  useEffect(() => {
    if (editingEntry) {
      setIncome(editingEntry.grossIncome.toString());
      setWattage(editingEntry.wattageUsage.toString());
      setMeterReading(editingEntry.meterReading?.toString() || '');
      setHours(editingEntry.durationHours.toString());
      setDate(editingEntry.date.toDate().toISOString().split('T')[0]);
      setKwhRate((editingEntry.kwhRate || 0).toString());
      setLoggedBy(editingEntry.loggedBy as any || 'Gen');
    } else {
      setIncome('');
      setWattage('');
      setMeterReading('');
      setHours('12');
      setDate(new Date().toISOString().split('T')[0]);
      setKwhRate('0');
      setLoggedBy('Gen');
    }
  }, [editingEntry]);

  // Auto-calculate wattage if meter reading is provided
  useEffect(() => {
    if (meterReading && latestMeterReading != null) {
      const current = parseFloat(meterReading);
      const diff = current - latestMeterReading;
      if (diff >= 0) {
        const h = parseFloat(hours) || 12;
        const computedWatts = (diff * 1000) / h;
        setWattage(computedWatts.toFixed(0));
      }
    }
  }, [meterReading, latestMeterReading, hours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!income || !meterReading) return;
    
    setIsSubmitting(true);
    const selectedDate = new Date(date);
    const wattageNum = Number(wattage) || 0;

    if (editingEntry && onUpdate && editingEntry.id) {
      await onUpdate(editingEntry.id, {
        grossIncome: Number(income),
        wattageUsage: wattageNum,
        durationHours: Number(hours),
        date: selectedDate,
        kwhRate: Number(kwhRate),
        loggedBy,
        meterReading: Number(meterReading)
      });
      if (onCancel) onCancel();
    } else {
      await onAdd(
        Number(income), 
        wattageNum, 
        Number(hours), 
        selectedDate, 
        Number(kwhRate), 
        loggedBy, 
        Number(meterReading)
      );
      setIncome('');
      setWattage('0');
      setMeterReading('');
    }
    setIsSubmitting(false);
  };

  return (
    <div className={`bg-white p-5 rounded-xl border transition-all ${editingEntry ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {editingEntry ? 'Edit Financial Data' : 'Record Financial Data'}
        </h2>
        {editingEntry && (
          <button 
            type="button"
            onClick={onCancel}
            className="p-1 hover:bg-amber-100 rounded-full transition-colors text-amber-700"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ... rest of the form is the same ... */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Log Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Gross Income ({currency})
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">{currency}</span>
            <input
              type="number"
              step="0.01"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              placeholder="0.00"
              className="w-full pl-12 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              required
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 mt-2">
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-bold text-indigo-600 uppercase tracking-tight">
              Current kWh Meter Reading
            </label>
            {latestMeterReading == null && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase">First Record</span>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.001"
              value={meterReading}
              onChange={(e) => setMeterReading(e.target.value)}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              placeholder={latestMeterReading != null ? `Last: ${latestMeterReading}` : "Enter Current Reading"}
              className="w-full px-3 py-3 bg-indigo-50/50 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xl font-mono font-bold text-indigo-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              required
            />
          </div>
          
          {latestMeterReading == null && (
             <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
               <div className="flex items-center gap-2 text-slate-500 mb-1">
                 <span className="text-[9px] font-black uppercase tracking-widest">Initial Reading Calc Seed</span>
               </div>
               
               <div>
                 <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Baseline/Prev Reading</label>
                 <input
                   type="number"
                   step="0.001"
                   placeholder="Meter value before this entry"
                   className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                   onChange={(e) => {
                     const prev = parseFloat(e.target.value);
                     const current = parseFloat(meterReading);
                     if (!isNaN(prev) && !isNaN(current)) {
                       const diff = current - prev;
                       const h = parseFloat(hours) || 12;
                       if (diff >= 0) setWattage(((diff * 1000) / h).toFixed(0));
                     }
                   }}
                 />
               </div>
             </div>
          )}

          <div className="flex justify-between items-center mt-2 px-1">
            <p className="text-[10px] text-slate-400 uppercase font-bold">
              {latestMeterReading != null ? `Prev: ${latestMeterReading.toFixed(3)}` : ""}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Duration (Hours)
          </label>
          <div className="relative">
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              placeholder="12"
              max="24"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            kWh Rate ({currency}/kWh)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={kwhRate}
              onChange={(e) => setKwhRate(e.target.value)}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              required
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Historical rate for accurate backdated math</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Logged By
          </label>
          <div className="flex gap-2">
            {(['Tom', 'Gen'] as const).map(person => (
              <button
                key={person}
                type="button"
                onClick={() => setLoggedBy(person)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${loggedBy === person ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
              >
                {person}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full font-bold py-3 rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-widest ${editingEntry ? 'bg-amber-600 hover:bg-slate-900' : 'bg-slate-800 hover:bg-slate-900'} text-white`}
        >
          {isSubmitting ? 'Processing...' : (editingEntry ? 'Update Metrics' : 'Record Metrics')}
        </button>
      </form>
    </div>
  );
};
