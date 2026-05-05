import React from 'react';
import { Overview } from './Overview';
import { TrendsChart } from './TrendsChart';
import { EntryForm } from './EntryForm';
import { useData } from '../lib/useData';
import { useAuth } from '../lib/AuthContext';
import { format } from 'date-fns';
import { Trash2, History, Download, ChevronLeft, ChevronRight, ArrowUpDown, TrendingUp, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import * as XLSX from 'xlsx';

import { PrintingForm } from './PrintingForm';
import { Expenses } from './Expenses';
import { MissingRecordsAlert } from './MissingRecordsAlert';
import { isWithinInterval, parseISO, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { DailyEntry } from '../types';

type SortKey = 'date' | 'revenue' | 'usage' | 'cost' | 'profit' | 'meter';

interface DashboardProps {
  category: 'cybercafe' | 'printing';
}

export const Dashboard: React.FC<DashboardProps> = ({ category }) => {
  const { entries, loading, addEntry, removeEntry, updateEntry, expenses, addExpense, removeExpense } = useData();
  const { settings, user } = useAuth();
  const [activeSubTab, setActiveSubTab] = React.useState<'operations' | 'expenses'>('operations');
  const [editingEntry, setEditingEntry] = React.useState<DailyEntry | null>(null);
  const [exportRange, setExportRange] = React.useState({
    start: '',
    end: ''
  });
  const [showExportOptions, setShowExportOptions] = React.useState(false);
  
  // Pagination and Sorting state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortConfig, setSortConfig] = React.useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });
  const ITEMS_PER_PAGE = 15;

  // Filter content by category
  const filteredEntries = React.useMemo(() => {
    return entries.filter(e => (e.category || 'cybercafe') === category);
  }, [entries, category]);

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter(ex => (ex.category || 'cybercafe') === category);
  }, [expenses, category]);

  const handleMarkClosed = async (date: Date) => {
    await addEntry(0, 0, 0, date, undefined, undefined, undefined, category);
  };

  const sortedEntries = React.useMemo(() => {
    const sorted = [...filteredEntries].sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortConfig.key) {
        case 'date':
          valA = a.date.toMillis();
          valB = b.date.toMillis();
          break;
        case 'revenue':
          valA = a.grossIncome;
          valB = b.grossIncome;
          break;
        case 'usage':
          valA = (a.wattageUsage * a.durationHours) / 1000;
          valB = (b.wattageUsage * b.durationHours) / 1000;
          break;
        case 'cost':
          valA = a.energyCost;
          valB = b.energyCost;
          break;
        case 'profit':
          valA = a.grossIncome - a.energyCost;
          valB = b.grossIncome - b.energyCost;
          break;
        case 'meter':
          valA = a.meterReading || 0;
          valB = b.meterReading || 0;
          break;
      }

      if (sortConfig.direction === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });
    return sorted;
  }, [filteredEntries, sortConfig]);

  const paginatedEntries = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedEntries.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedEntries, currentPage]);

  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);

  const toggleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const peakStats = React.useMemo(() => {
    if (filteredEntries.length === 0) return { 
      daily: null, 
      weekly: { amount: 0, customers: 0, period: null }, 
      monthly: { amount: 0, customers: 0, period: null }, 
      yearly: { amount: 0, customers: 0, period: null } 
    };
    
    // Daily
    const dailyMap = new Map<string, { income: number, count: number, entry: DailyEntry }>();
    filteredEntries.forEach(e => {
      const key = format(e.date.toDate(), 'yyyy-MM-dd');
      const current = dailyMap.get(key) || { income: 0, count: 0, entry: e };
      dailyMap.set(key, { 
        income: current.income + e.grossIncome, 
        count: current.count + 1,
        entry: e 
      });
    });

    let dailyPeak = { amount: 0, customers: 0, entry: null as DailyEntry | null };
    dailyMap.forEach((data) => {
      if (data.income > dailyPeak.amount) {
        dailyPeak = { amount: data.income, customers: data.count, entry: data.entry };
      }
    });
    
    // Weekly
    const weeklyMap = new Map<string, { income: number, customers: number }>();
    filteredEntries.forEach(e => {
      const date = e.date.toDate();
      const weekStart = startOfWeek(date).toISOString();
      const current = weeklyMap.get(weekStart) || { income: 0, customers: 0 };
      weeklyMap.set(weekStart, { 
        income: current.income + e.grossIncome, 
        customers: current.customers + 1 
      });
    });
    let weeklyPeak = { amount: 0, customers: 0, period: null as string | null };
    weeklyMap.forEach((data, period) => {
      if (data.income > weeklyPeak.amount) {
        weeklyPeak = { amount: data.income, customers: data.customers, period };
      }
    });
    
    // Monthly
    const monthlyMap = new Map<string, { income: number, customers: number }>();
    filteredEntries.forEach(e => {
      const date = e.date.toDate();
      const monthStart = startOfMonth(date).toISOString();
      const current = monthlyMap.get(monthStart) || { income: 0, customers: 0 };
      monthlyMap.set(monthStart, { 
        income: current.income + e.grossIncome, 
        customers: current.customers + 1 
      });
    });
    let monthlyPeak = { amount: 0, customers: 0, period: null as string | null };
    monthlyMap.forEach((data, period) => {
      if (data.income > monthlyPeak.amount) {
        monthlyPeak = { amount: data.income, customers: data.customers, period };
      }
    });

    // Yearly
    const yearlyMap = new Map<string, { income: number, customers: number }>();
    filteredEntries.forEach(e => {
      const date = e.date.toDate();
      const yearStart = startOfYear(date).toISOString();
      const current = yearlyMap.get(yearStart) || { income: 0, customers: 0 };
      yearlyMap.set(yearStart, { 
        income: current.income + e.grossIncome, 
        customers: current.customers + 1 
      });
    });
    let yearlyPeak = { amount: 0, customers: 0, period: null as string | null };
    yearlyMap.forEach((data, period) => {
      if (data.income > yearlyPeak.amount) {
        yearlyPeak = { amount: data.income, customers: data.customers, period };
      }
    });

    return { 
      daily: dailyPeak.entry ? { ...dailyPeak.entry, peakTotal: dailyPeak.amount, peakCustomers: dailyPeak.customers } : null, 
      weekly: weeklyPeak, 
      monthly: monthlyPeak, 
      yearly: yearlyPeak 
    };
  }, [filteredEntries]);

  const exportToExcel = () => {
    if (!settings) return;

    let exportEntries = filteredEntries;
    let exportExpenses = filteredExpenses;

    if (exportRange.start && exportRange.end) {
      const start = startOfDay(parseISO(exportRange.start));
      const end = endOfDay(parseISO(exportRange.end));
      
      exportEntries = filteredEntries.filter(e => 
        isWithinInterval(e.date.toDate(), { start, end })
      );
      exportExpenses = filteredExpenses.filter(ex => 
        isWithinInterval(ex.date.toDate(), { start, end })
      );
    }

    const entrySheetData = exportEntries.map(e => ({
      Date: format(e.date.toDate(), 'yyyy-MM-dd'),
      Income: e.grossIncome,
      Category: e.category || 'cybercafe',
      'Logged By': e.loggedBy || 'Unknown',
      ...(category === 'cybercafe' ? {
        'Wattage (W)': e.wattageUsage,
        'Duration (h)': e.durationHours,
        'kWh Rate Used': e.kwhRate || settings.kwhRate,
        'Energy Cost': e.energyCost,
        'Net Profit': e.grossIncome - e.energyCost,
        'Cumulative kWh': e.meterReading || 0
      } : {
        Platform: e.platform || 'N/A',
        Customer: e.customerName || 'Anonymous',
        Remarks: e.remarks || '',
        'File Link': e.fileLink || ''
      })
    }));

    const expenseSheetData = exportExpenses.map(ex => ({
      Date: format(ex.date.toDate(), 'yyyy-MM-dd'),
      Name: ex.name,
      Amount: ex.amount,
      Category: ex.category || 'cybercafe'
    }));

    const wb = XLSX.utils.book_new();
    const wsEntries = XLSX.utils.json_to_sheet(entrySheetData);
    const wsExpenses = XLSX.utils.json_to_sheet(expenseSheetData);

    XLSX.utils.book_append_sheet(wb, wsEntries, "Daily Logs");
    XLSX.utils.book_append_sheet(wb, wsExpenses, "Business Expenses");

    XLSX.writeFile(wb, `K83_${category.toUpperCase()}_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleAddCategoryEntry = (
    income: number, 
    wattage: number, 
    hours: number, 
    date?: Date, 
    kwhRate?: number, 
    loggedBy?: 'Tom' | 'Gen', 
    meterReading?: number,
    printingData?: any
  ) => {
    return addEntry(income, wattage, hours, date, kwhRate, loggedBy, meterReading, category, printingData);
  };

  const handleAddCategoryExpense = (name: string, amount: number, date?: Date, quantity?: number, unitPrice?: number) => {
    return addExpense(name, amount, date, quantity, unitPrice, category);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded-full">Administrator</span>
            <p className="text-xs font-bold text-slate-400">Target Module: {category === 'cybercafe' ? 'Cyber Cafe' : 'Printing Services'}</p>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">K83 Command Center</h2>
          <p className="text-slate-500 text-sm">System management for {category === 'cybercafe' ? 'cafe operations' : 'commercial printing'}</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
          <button
            onClick={() => setActiveSubTab('operations')}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeSubTab === 'operations' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Operations
          </button>
          <button
            onClick={() => setActiveSubTab('expenses')}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeSubTab === 'expenses' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Expenses
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'operations' ? (
          <motion.div
            key="operations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-12 gap-6"
          >
            {/* Left Sidebar: Inputs and Stats summary */}
            <aside className="col-span-12 lg:col-span-4 space-y-6">
              {category === 'cybercafe' ? (
                <EntryForm 
                  onAdd={handleAddCategoryEntry} 
                  onUpdate={updateEntry}
                  editingEntry={editingEntry}
                  onCancel={() => setEditingEntry(null)}
                  currency={settings.currency} 
                  defaultKwhRate={settings.kwhRate} 
                  latestMeterReading={filteredEntries[0]?.meterReading}
                />
              ) : (
                <PrintingForm
                  onAdd={handleAddCategoryEntry}
                  onUpdate={updateEntry}
                  editingEntry={editingEntry}
                  onCancel={() => setEditingEntry(null)}
                  currency={settings.currency}
                />
              )}
              
              <div className="space-y-3">
                <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest opacity-60">
                      {category === 'cybercafe' ? 'Gross Revenue' : 'Total Revenue'}
                    </p>
                    <h4 className="text-2xl font-black mt-1">
                      {formatCurrency(filteredEntries.reduce((acc, curr) => acc + curr.grossIncome, 0), settings.currency)}
                    </h4>
                    {category === 'printing' && (
                      <p className="text-[10px] font-bold text-emerald-400 mt-1 uppercase tracking-tighter">
                        {filteredEntries.length} Transactions Recorded
                      </p>
                    )}
                  </div>
                  <TrendingUp className="text-emerald-400" size={24} />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Peak Daily</p>
                      <p className="text-[10px] font-bold text-slate-600 mt-0.5 italic">
                        {peakStats.daily ? format(peakStats.daily.date.toDate(), 'MMMM dd, yyyy') : 'No Records'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-indigo-600 font-mono font-black text-lg">
                        {peakStats.daily ? formatCurrency((peakStats.daily as any).peakTotal, settings.currency) : '—'}
                      </div>
                      {category === 'printing' && peakStats.daily && (
                        <div className="text-[9px] font-bold text-slate-400 uppercase">
                          {(peakStats.daily as any).peakCustomers} Customers
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Peak Weekly</p>
                      <p className="text-[10px] font-bold text-slate-600 mt-0.5 italic">
                        {peakStats.weekly.period ? `Week of ${format(parseISO(peakStats.weekly.period), 'MMM dd')}` : 'Rolling 7-Day High'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-indigo-600 font-mono font-black text-lg">
                        {peakStats.weekly.amount > 0 ? formatCurrency(peakStats.weekly.amount, settings.currency) : '—'}
                      </div>
                      {category === 'printing' && peakStats.weekly.amount > 0 && (
                        <div className="text-[9px] font-bold text-slate-400 uppercase">
                          {peakStats.weekly.customers} Customers
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Peak Monthly</p>
                      <p className="text-[10px] font-bold text-slate-600 mt-0.5 italic">
                        {peakStats.monthly.period ? format(parseISO(peakStats.monthly.period), 'MMMM yyyy') : 'Calendar Month High'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-indigo-600 font-mono font-black text-lg">
                        {peakStats.monthly.amount > 0 ? formatCurrency(peakStats.monthly.amount, settings.currency) : '—'}
                      </div>
                      {category === 'printing' && peakStats.monthly.amount > 0 && (
                        <div className="text-[9px] font-bold text-slate-400 uppercase">
                          {peakStats.monthly.customers} Customers
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Peak Yearly</p>
                      <p className="text-[10px] font-bold text-slate-600 mt-0.5 italic">
                        {peakStats.yearly.period ? format(parseISO(peakStats.yearly.period), 'yyyy') : 'Annual Record High'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-indigo-600 font-mono font-black text-lg">
                        {peakStats.yearly.amount > 0 ? formatCurrency(peakStats.yearly.amount, settings.currency) : '—'}
                      </div>
                      {category === 'printing' && peakStats.yearly.amount > 0 && (
                        <div className="text-[9px] font-bold text-slate-400 uppercase">
                          {peakStats.yearly.customers} Customers
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Section */}
            <section className="col-span-12 lg:col-span-8 flex flex-col gap-6">
              <MissingRecordsAlert entries={filteredEntries} onMarkClosed={handleMarkClosed} />
              <Overview entries={filteredEntries} expenses={filteredExpenses} settings={settings} category={category} />
              
              <TrendsChart entries={filteredEntries} expenses={filteredExpenses} settings={settings} category={category} />
              
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <History size={18} className="text-slate-400" />
                    {category === 'cybercafe' ? 'Operational History' : 'Transaction History'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {showExportOptions && (
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 animate-in fade-in slide-in-from-right-4">
                        <input 
                          type="date" 
                          value={exportRange.start}
                          onChange={(e) => setExportRange(prev => ({ ...prev, start: e.target.value }))}
                          className="text-[10px] p-1 outline-none border-r border-slate-100"
                        />
                        <input 
                          type="date" 
                          value={exportRange.end}
                          onChange={(e) => setExportRange(prev => ({ ...prev, end: e.target.value }))}
                          className="text-[10px] p-1 outline-none"
                        />
                      </div>
                    )}
                    <button 
                      onClick={() => setShowExportOptions(!showExportOptions)}
                      className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 ${showExportOptions ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                      Range
                    </button>
                    <button 
                      onClick={exportToExcel}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest hover:bg-slate-900 transition-all shadow-sm active:scale-95"
                    >
                      <Download size={14} />
                      Export {exportRange.start && exportRange.end ? 'Range' : 'All'}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <th onClick={() => toggleSort('date')} className="px-6 py-4 cursor-pointer hover:text-indigo-600 group">
                          <div className="flex items-center gap-1">
                            Date <ArrowUpDown size={12} className={cn("transition-colors", sortConfig.key === 'date' ? "text-indigo-600" : "text-slate-300")} />
                          </div>
                        </th>
                        <th className="px-6 py-4">By</th>
                        <th onClick={() => toggleSort('revenue')} className="px-6 py-4 cursor-pointer hover:text-indigo-600">
                          <div className="flex items-center gap-1">
                            {category === 'cybercafe' ? 'Revenue' : 'Amount'} <ArrowUpDown size={12} className={cn("transition-colors", sortConfig.key === 'revenue' ? "text-indigo-600" : "text-slate-300")} />
                          </div>
                        </th>
                        {category === 'cybercafe' ? (
                          <>
                            <th onClick={() => toggleSort('usage')} className="px-6 py-4 cursor-pointer hover:text-indigo-600">
                              <div className="flex items-center gap-1">
                                Usage (kWh) <ArrowUpDown size={12} className={cn("transition-colors", sortConfig.key === 'usage' ? "text-indigo-600" : "text-slate-300")} />
                              </div>
                            </th>
                            <th className="px-6 py-4 text-slate-400 font-bold">
                              <div className="flex items-center gap-1 uppercase tracking-widest text-[10px]">
                                P/kWh
                              </div>
                            </th>
                            <th onClick={() => toggleSort('cost')} className="px-6 py-4 cursor-pointer hover:text-indigo-600">
                              <div className="flex items-center gap-1">
                                Energy Cost <ArrowUpDown size={12} className={cn("transition-colors", sortConfig.key === 'cost' ? "text-indigo-600" : "text-slate-300")} />
                              </div>
                            </th>
                            <th onClick={() => toggleSort('profit')} className="px-6 py-4 cursor-pointer hover:text-indigo-600">
                              <div className="flex items-center gap-1">
                                Profit <ArrowUpDown size={12} className={cn("transition-colors", sortConfig.key === 'profit' ? "text-indigo-600" : "text-slate-300")} />
                              </div>
                            </th>
                            <th onClick={() => toggleSort('meter')} className="px-6 py-4 cursor-pointer hover:text-indigo-600 bg-slate-50/80">
                              <div className="flex items-center gap-1">
                                kWh (Cumulative) <ArrowUpDown size={12} className={cn("transition-colors", sortConfig.key === 'meter' ? "text-indigo-600" : "text-slate-300")} />
                              </div>
                            </th>
                          </>
                        ) : (
                          <>
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4">Source</th>
                            <th className="px-6 py-4">Remarks</th>
                          </>
                        )}
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence mode="popLayout">
                        {paginatedEntries.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                              No logging data available for this category.
                            </td>
                          </tr>
                        ) : (
                          paginatedEntries.map((entry) => (
                            <motion.tr 
                              key={entry.id} 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-sm border-l-2 border-transparent hover:border-indigo-500 hover:bg-slate-50/50 transition-all"
                            >
                              <td className="px-6 py-4 font-bold text-slate-700">
                                {format(entry.date.toDate(), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${entry.loggedBy === 'Tom' ? 'bg-blue-100 text-blue-700' : entry.loggedBy === 'Gen' ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {entry.loggedBy || '???'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-emerald-600 font-mono font-bold">
                                {formatCurrency(entry.grossIncome, settings.currency)}
                              </td>
                              {category === 'cybercafe' ? (
                                <>
                                  <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                                    {(((entry.wattageUsage || 0) * (entry.durationHours || 0)) / 1000).toFixed(2)} kWh
                                  </td>
                                  <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                                    {entry.kwhRate?.toFixed(2) || settings.kwhRate.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-amber-600 font-mono font-bold">
                                    {formatCurrency(entry.energyCost, settings.currency)}
                                  </td>
                                  <td className="px-6 py-4 text-indigo-600 font-mono font-bold">
                                    {formatCurrency(entry.grossIncome - entry.energyCost, settings.currency)}
                                  </td>
                                  <td className="px-6 py-4 text-slate-600 font-mono text-[11px] font-bold bg-slate-50/30">
                                    {entry.meterReading != null ? entry.meterReading.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '—'}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-6 py-4">
                                    <p className="text-xs font-bold text-slate-700">{entry.customerName || 'Anonymous'}</p>
                                    {entry.fileLink && (
                                      <a href={entry.fileLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1">
                                        View File
                                      </a>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase tracking-widest">
                                      {entry.platform || 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-[11px] text-slate-500 max-w-[200px] truncate italic">
                                    {entry.remarks || '—'}
                                  </td>
                                </>
                              )}
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button 
                                    onClick={() => {
                                      setEditingEntry(entry);
                                      // Scroll to form
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="text-slate-300 hover:text-amber-500 p-2 transition-colors rounded-lg hover:bg-amber-50"
                                    title="Edit Entry"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if (window.confirm("Permanently delete this entry?")) {
                                        entry.id && removeEntry(entry.id);
                                      }
                                    }}
                                    className="text-slate-300 hover:text-red-500 p-2 transition-colors rounded-lg hover:bg-red-50"
                                    title="Delete Entry"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
                
                {filteredEntries.length > ITEMS_PER_PAGE && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-400 font-medium order-2 sm:order-1">
                      Showing <span className="font-bold text-slate-600">{(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredEntries.length)}</span> of <span className="font-bold text-slate-600">{filteredEntries.length}</span> entries
                    </p>
                    <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                      >
                        <ChevronLeft size={16} className="text-slate-600" />
                      </button>
                      
                      {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                        let end = Math.min(totalPages, start + maxVisible - 1);
                        
                        if (end - start + 1 < maxVisible) {
                          start = Math.max(1, end - maxVisible + 1);
                        }
                        start = Math.max(1, start);

                        for (let i = start; i <= end; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i)}
                              className={cn(
                                "w-8 h-8 rounded-lg text-xs font-bold transition-all border",
                                currentPage === i 
                                  ? "bg-slate-800 border-slate-800 text-white shadow-md scale-105 z-10" 
                                  : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                              )}
                            >
                              {i}
                            </button>
                          );
                        }
                        return pages;
                      })()}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                      >
                        <ChevronRight size={16} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="expenses"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Expenses 
              expenses={filteredExpenses} 
              settings={settings} 
              onAdd={handleAddCategoryExpense} 
              onRemove={removeExpense} 
              isCompact={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
