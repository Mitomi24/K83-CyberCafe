import React, { useState } from 'react';
import { BusinessExpense, UserSettings } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Trash2, Plus, ReceiptText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface ExpensesProps {
  expenses: BusinessExpense[];
  settings: UserSettings;
  onAdd: (name: string, amount: number, date?: Date, quantity?: number, unitPrice?: number) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  isCompact?: boolean;
}

export const Expenses: React.FC<ExpensesProps> = ({ expenses, settings, onAdd, onRemove, isCompact }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate total
  const totalAmount = Number(quantity || 0) * Number(unitPrice || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !unitPrice || !quantity) return;
    setIsSubmitting(true);
    await onAdd(name, totalAmount, new Date(date), Number(quantity), Number(unitPrice));
    setName('');
    setUnitPrice('');
    setQuantity('1');
    setIsSubmitting(false);
  };

  return (
    <div className={cn("max-w-none mx-auto", isCompact ? "py-0" : "py-8 px-4 sm:px-6 lg:px-12")}>
      {!isCompact && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Overhead & Recurring Expenses</h2>
          <p className="text-sm text-slate-500">Track miscellaneous business costs outside of energy consumption</p>
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-24">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">New Expense Record</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Service/Item Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cloud Hosting, ISP"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Unit Price ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono font-bold"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
                  Total Calculated Amount
                </label>
                <div className="w-full px-4 py-3 bg-indigo-50/50 border-2 border-indigo-100 rounded-lg text-indigo-600 font-mono font-black text-lg shadow-inner flex items-center justify-between">
                  <span className="text-xs text-indigo-300 opacity-50 uppercase tracking-tighter">Automatic</span>
                  {formatCurrency(totalAmount, settings.currency)}
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs uppercase tracking-widest"
              >
                <Plus size={16} />
                {isSubmitting ? 'Recording...' : 'Append Expense'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/30">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ReceiptText size={18} className="text-slate-400" />
                Expense Ledger
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              <AnimatePresence mode="popLayout">
                {expenses.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm italic">
                    No expense records found. Use the form to your left to begin.
                  </div>
                ) : (
                  expenses.map((expense) => (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-all border-l-2 border-transparent hover:border-indigo-500 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                          <ReceiptText size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">{expense.name}</h4>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-black tracking-tighter">
                              <Calendar size={10} />
                              {format(expense.date.toDate(), 'PPP')}
                            </div>
                            {expense.quantity && (
                              <div className="flex items-center gap-1 text-[10px] text-indigo-400 uppercase font-black tracking-tighter border-l border-slate-200 pl-3">
                                {expense.quantity} × {formatCurrency(expense.unitPrice || (expense.amount / expense.quantity), settings.currency)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <span className="text-sm font-mono font-bold text-red-500">
                          -{formatCurrency(expense.amount, settings.currency)}
                        </span>
                        <button 
                          onClick={() => expense.id && onRemove(expense.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
