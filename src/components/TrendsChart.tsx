import React, { useMemo, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { DailyEntry, BusinessExpense, UserSettings } from '../types';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

interface TrendsChartProps {
  entries: DailyEntry[];
  expenses: BusinessExpense[];
  settings: UserSettings;
  category?: 'cybercafe' | 'printing';
}

export const TrendsChart: React.FC<TrendsChartProps> = ({ entries, expenses, settings, category = 'cybercafe' }) => {
  const [timeFrame, setTimeFrame] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  const chartData = useMemo(() => {
    const isPrinting = category === 'printing';
    const dateMap = new Map<string, { dateObj: Date, income: number, cost: number, profit: number, customers: number }>();

    // Helper to get consistent keys for grouping
    const getGroupKey = (date: Date) => {
      if (timeFrame === 'daily') return format(date, 'MMM dd_yyyy');
      if (timeFrame === 'monthly') return format(date, 'MMM yyyy');
      return format(date, 'yyyy');
    };

    // Process entries (Daily Jobs)
    entries.forEach(e => {
      const d = e.date.toDate();
      const key = getGroupKey(d);
      const current = dateMap.get(key) || { dateObj: d, income: 0, cost: 0, profit: 0, customers: 0 };
      
      current.income += e.grossIncome;
      current.customers = (current.customers || 0) + 1;
      if (!isPrinting) {
        current.cost += (e.energyCost || 0);
      }
      dateMap.set(key, current);
    });

    // Process expenses if printing
    if (isPrinting) {
      expenses.forEach(ex => {
        const d = ex.date.toDate();
        const key = getGroupKey(d);
        const current = dateMap.get(key) || { dateObj: d, income: 0, cost: 0, profit: 0, customers: 0 };
        current.cost += ex.amount;
        dateMap.set(key, current);
      });
    }

    // Sort keys and format for chart
    return Array.from(dateMap.entries())
      .sort((a, b) => a[1].dateObj.getTime() - b[1].dateObj.getTime())
      .map(([key, data]) => {
        const displayDate = timeFrame === 'daily' ? key.split('_')[0] : key;
        return {
          date: displayDate,
          income: data.income,
          cost: data.cost,
          profit: data.income - data.cost,
          customers: data.customers
        };
      });
  }, [entries, expenses, timeFrame, category]);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Performance Analytics</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time revenue & overhead tracking</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setTimeFrame('daily')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeFrame === 'daily' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}
          >
            Daily
          </button>
          <button 
            onClick={() => setTimeFrame('monthly')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeFrame === 'monthly' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setTimeFrame('yearly')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeFrame === 'yearly' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: '#64748b' }}
            />
            <YAxis 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => `${settings.currency}${value}`}
              tick={{ fill: '#64748b' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              formatter={(value, name) => {
                if (name === 'Customers') return [value, name];
                return [`${settings.currency}${value}`, name];
              }}
            />
            <Legend iconType="circle" />
            <Area 
              type="monotone" 
              dataKey="profit" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorProfit)" 
              name={category === 'printing' ? "Net Earnings" : "Net Profit"}
              strokeWidth={3}
            />
            <Area 
              type="monotone" 
              dataKey="cost" 
              stroke="#f59e0b" 
              fillOpacity={1} 
              fill="url(#colorCost)"
              name={category === 'printing' ? "Expenses" : "Energy Cost"}
              strokeWidth={3}
            />
            {category === 'printing' && (
              <Area 
                type="monotone" 
                dataKey="customers" 
                stroke="#6366f1" 
                fillOpacity={0.1} 
                fill="#6366f1"
                name="Customers"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
