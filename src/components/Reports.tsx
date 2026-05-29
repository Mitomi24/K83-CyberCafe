import React from 'react';
import { useData } from '../lib/useData';
import { useAuth } from '../lib/AuthContext';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { FileText, Filter, Calendar, Download, Monitor, Printer, History as HistoryIcon, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency, cn, getEntryUsageKwh, getEntryEnergyCost, getEntryNetProfit } from '../lib/utils';
import * as XLSX from 'xlsx';

export const Reports: React.FC = () => {
  const { entries, expenses, loading } = useData();
  const { settings } = useAuth();
  
  const [activeModule, setActiveModule] = React.useState<'cybercafe' | 'printing'>('cybercafe');
  const [dateRange, setDateRange] = React.useState({
    start: format(new Date(), 'yyyy-MM-01'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const filteredData = React.useMemo(() => {
    const start = startOfDay(parseISO(dateRange.start));
    const end = endOfDay(parseISO(dateRange.end));

    const moduleEntries = entries.filter(e => {
      const matchesModule = (e.category || 'cybercafe') === activeModule;
      if (activeModule === 'printing' && (e.loggedBy === 'CLOSE' || e.grossIncome === 0)) {
        return false;
      }
      return matchesModule && isWithinInterval(e.date.toDate(), { start, end });
    });

    const moduleExpenses = expenses.filter(ex => 
      (ex.category || 'cybercafe') === activeModule &&
      isWithinInterval(ex.date.toDate(), { start, end })
    );

    return { entries: moduleEntries, expenses: moduleExpenses };
  }, [entries, expenses, activeModule, dateRange]);

  const stats = React.useMemo(() => {
    const totalIncome = filteredData.entries.reduce((acc, curr) => acc + curr.grossIncome, 0);
    const totalCosts = filteredData.entries.reduce((acc, curr) => acc + getEntryEnergyCost(curr, filteredData.entries, settings?.kwhRate || 0), 0);
    const totalExpenses = filteredData.expenses.reduce((acc, curr) => acc + curr.amount, 0);
    
    return {
      income: totalIncome,
      operationalCosts: totalCosts,
      expenses: totalExpenses,
      netProfit: totalIncome - totalCosts - totalExpenses
    };
  }, [filteredData, settings?.kwhRate]);

  const exportReport = () => {
    if (!settings) return;

    const entrySheetData = filteredData.entries.map(e => {
      const isClosed = e.loggedBy === 'CLOSE' || (activeModule === 'cybercafe' && e.grossIncome === 0 && (e.wattageUsage || 0) === 0 && (e.durationHours || 0) === 0);
      return {
        Date: format(e.date.toDate(), 'yyyy-MM-dd HH:mm'),
        Revenue: e.grossIncome,
        ...(activeModule === 'cybercafe' ? {
          'kWh Usage': getEntryUsageKwh(e, filteredData.entries).toFixed(2),
          'kWh Rate': e.kwhRate || settings.kwhRate,
          'Energy Cost': getEntryEnergyCost(e, filteredData.entries, settings.kwhRate),
          'Net Profit': getEntryNetProfit(e, filteredData.entries, settings.kwhRate)
        } : {
          Customer: e.customerName || 'Anonymous',
          Platform: e.platform || 'N/A',
          Remarks: e.remarks || ''
        }),
        'Logged By': isClosed ? 'CLOSE' : (e.loggedBy || 'Unknown')
      };
    });

    const expenseSheetData = filteredData.expenses.map(ex => ({
      Date: format(ex.date.toDate(), 'yyyy-MM-dd'),
      'Expense Name': ex.name,
      Amount: ex.amount,
      Quantity: ex.quantity || 1,
      'Unit Price': ex.unitPrice || ex.amount
    }));

    const wb = XLSX.utils.book_new();
    const wsEntries = XLSX.utils.json_to_sheet(entrySheetData);
    const wsExpenses = XLSX.utils.json_to_sheet(expenseSheetData);

    // Summary Sheet
    const summaryData = [
      ['K83 Operational Report', ''],
      ['Generated On', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
      ['Module', activeModule === 'cybercafe' ? 'Cyber Cafe' : 'Printing Services'],
      ['Date Range', `${dateRange.start} to ${dateRange.end}`],
      ['', ''],
      ['FINANCIAL SUMMARY', ''],
      ['Total Gross Revenue', stats.income],
      ['Total Operational Costs', stats.operationalCosts],
      ['Total Business Expenses', stats.expenses],
      ['Net Profit', stats.netProfit],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    XLSX.utils.book_append_sheet(wb, wsEntries, "Operational Logs");
    XLSX.utils.book_append_sheet(wb, wsExpenses, "Expenses");

    XLSX.writeFile(wb, `K83_Report_${activeModule.toUpperCase()}_${dateRange.start}_to_${dateRange.end}.xlsx`);
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-none mx-auto py-8 px-4 sm:px-6 lg:px-12">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Management Reports</h2>
          <p className="text-slate-500 text-sm">Analyze operational performance and financial health</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Module</label>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => setActiveModule('cybercafe')}
                className={cn(
                  "p-2 rounded-md transition-all flex items-center gap-2 text-[10px] font-bold uppercase",
                  activeModule === 'cybercafe' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-500"
                )}
              >
                <Monitor size={14} /> Cyber Cafe
              </button>
              <button 
                onClick={() => setActiveModule('printing')}
                className={cn(
                  "p-2 rounded-md transition-all flex items-center gap-2 text-[10px] font-bold uppercase",
                  activeModule === 'printing' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-500"
                )}
              >
                <Printer size={14} /> Printing
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Date</label>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End Date</label>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-1 self-end">
            <button 
              onClick={exportReport}
              className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md active:scale-95"
            >
              <Download size={16} />
              Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Revenue</p>
          <h4 className="text-2xl font-black text-indigo-600">
            {formatCurrency(stats.income, settings.currency)}
          </h4>
          <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Total collected income</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Op. Costs (Energy)</p>
          <h4 className="text-2xl font-black text-amber-600">
            {formatCurrency(stats.operationalCosts, settings.currency)}
          </h4>
          <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Calculated energy cost</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Biz Expenses</p>
          <h4 className="text-2xl font-black text-red-500">
            {formatCurrency(stats.expenses, settings.currency)}
          </h4>
          <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Material & overhead cost</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm bg-emerald-50/20 border-emerald-100">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Net Period Profit</p>
          <h4 className="text-2xl font-black text-emerald-700">
            {formatCurrency(stats.netProfit, settings.currency)}
          </h4>
          <p className="text-[10px] text-emerald-600 mt-2 font-bold uppercase">Actual bottom line</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <HistoryIcon size={18} className="text-slate-400" />
            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">Operational Detail Ledger</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Logged By</th>
                  <th className="px-6 py-4 text-right">Revenue</th>
                  {activeModule === 'cybercafe' ? (
                    <>
                      <th className="px-6 py-4 text-right">Usage (kWh)</th>
                      <th className="px-6 py-4 text-right">Energy Cost</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Platform</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">No operational records found for this period.</td>
                  </tr>
                ) : (
                  filteredData.entries.map((entry) => (
                    <tr key={entry.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {format(entry.date.toDate(), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          entry.loggedBy === 'CLOSE' || (activeModule === 'cybercafe' && entry.grossIncome === 0 && (entry.wattageUsage || 0) === 0 && (entry.durationHours || 0) === 0)
                            ? 'bg-amber-100 border-amber-200 text-amber-700 font-extrabold'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {entry.loggedBy === 'CLOSE' || (activeModule === 'cybercafe' && entry.grossIncome === 0 && (entry.wattageUsage || 0) === 0 && (entry.durationHours || 0) === 0) ? 'CLOSE' : (entry.loggedBy || 'Unknown')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(entry.grossIncome, settings.currency)}
                      </td>
                      {activeModule === 'cybercafe' ? (
                        <>
                          <td className="px-6 py-4 text-right font-mono text-slate-500">
                            {getEntryUsageKwh(entry, filteredData.entries).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-amber-600">
                            {formatCurrency(getEntryEnergyCost(entry, filteredData.entries, settings?.kwhRate || 0), settings?.currency)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 font-bold text-slate-700">{entry.customerName || 'Anonymous'}</td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entry.platform || 'N/A'}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <DollarSign size={18} className="text-slate-400" />
            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">Expense Ledger</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Qty</th>
                  <th className="px-6 py-4 text-right">Unit Price</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">No expenses found for this period.</td>
                  </tr>
                ) : (
                  filteredData.expenses.map((expense) => (
                    <tr key={expense.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-500">
                        {format(expense.date.toDate(), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">{expense.name}</td>
                      <td className="px-6 py-4 text-right text-slate-500">{expense.quantity || 1}</td>
                      <td className="px-6 py-4 text-right text-slate-500 font-mono">
                        {formatCurrency(expense.unitPrice || expense.amount, settings.currency)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-red-600">
                        {formatCurrency(expense.amount, settings.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
