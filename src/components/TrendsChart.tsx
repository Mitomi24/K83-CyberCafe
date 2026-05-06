import React, { useMemo, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { DailyEntry, BusinessExpense, UserSettings } from '../types';
import { format } from 'date-fns';
import { TrendingUp, BarChart3, LineChart as LucideLineChart, AreaChart as LucideAreaChart } from 'lucide-react';

interface TrendsChartProps {
  entries: DailyEntry[];
  expenses: BusinessExpense[];
  settings: UserSettings;
  category?: 'cybercafe' | 'printing';
}

export const TrendsChart: React.FC<TrendsChartProps> = ({ entries, expenses, settings, category = 'cybercafe' }) => {
  const [timeFrame, setTimeFrame] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');

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

    const renderChart = () => {
      const commonProps = {
        data: chartData,
        margin: { top: 10, right: 30, left: 0, bottom: 0 },
      };

      if (chartType === 'bar') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
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
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                  padding: '12px',
                  color: '#1e293b'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                formatter={(value, name) => {
                  if (name === 'Customers') return [value, name];
                  return [`${settings.currency}${value}`, name];
                }}
              />
              <Legend iconType="circle" />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name={category === 'printing' ? "Net Earnings" : "Net Profit"} />
              <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} name={category === 'printing' ? "Expenses" : "Energy Cost"} />
              {category === 'printing' && <Bar dataKey="customers" fill="#6366f1" radius={[4, 4, 0, 0]} name="Customers" />}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      if (chartType === 'line') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
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
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                  padding: '12px',
                  color: '#1e293b'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                formatter={(value, name) => {
                  if (name === 'Customers') return [value, name];
                  return [`${settings.currency}${value}`, name];
                }}
              />
              <Legend iconType="circle" />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 6 }} name={category === 'printing' ? "Net Earnings" : "Net Profit"} />
              <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 6 }} name={category === 'printing' ? "Expenses" : "Energy Cost"} />
              {category === 'printing' && <Line type="monotone" dataKey="customers" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Customers" />}
            </LineChart>
          </ResponsiveContainer>
        );
      }

      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart {...commonProps}>
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
              contentStyle={{ 
                backgroundColor: '#fff', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                padding: '12px',
                color: '#1e293b'
              }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              formatter={(value, name) => {
                if (name === 'Customers') return [value, name];
                return [`${settings.currency}${value}`, name];
              }}
            />
            <Legend iconType="circle" />
            <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" name={category === 'printing' ? "Net Earnings" : "Net Profit"} strokeWidth={3} />
            <Area type="monotone" dataKey="cost" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCost)" name={category === 'printing' ? "Expenses" : "Energy Cost"} strokeWidth={3} />
            {category === 'printing' && <Area type="monotone" dataKey="customers" stroke="#6366f1" fillOpacity={0.1} fill="#6366f1" name="Customers" strokeWidth={2} strokeDasharray="5 5" />}
          </AreaChart>
        </ResponsiveContainer>
      );
    };

    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Performance Analytics</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time revenue & overhead tracking</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => setChartType('area')}
                className={`p-1.5 rounded-md transition-all ${chartType === 'area' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400'}`}
                title="Area Chart"
              >
                <LucideAreaChart size={16} />
              </button>
              <button 
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400'}`}
                title="Bar Chart"
              >
                <BarChart3 size={16} />
              </button>
              <button 
                onClick={() => setChartType('line')}
                className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400'}`}
                title="Line Chart"
              >
                <LucideLineChart size={16} />
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
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
        </div>

      <div className="h-[300px] w-full">
        {renderChart()}
      </div>
    </div>
  );
};
