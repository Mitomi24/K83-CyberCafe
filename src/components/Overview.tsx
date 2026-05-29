import React from 'react';
import { DailyEntry, BusinessExpense, UserSettings } from '../types';
import { formatCurrency, getEntryEnergyCost } from '../lib/utils';
import { Wallet, TrendingUp, Zap, Activity, User, ReceiptText } from 'lucide-react';
import { motion } from 'motion/react';

interface OverviewProps {
  entries: DailyEntry[];
  expenses: BusinessExpense[];
  settings: UserSettings;
  category?: 'cybercafe' | 'printing';
}

export const Overview: React.FC<OverviewProps> = ({ entries, expenses, settings, category = 'cybercafe' }) => {
  const totalIncome = entries.reduce((acc, curr) => acc + curr.grossIncome, 0);
  const totalEnergyCost = entries.reduce((acc, curr) => acc + getEntryEnergyCost(curr, entries, settings.kwhRate), 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalIncome - totalEnergyCost - totalExpenses;
  
  const uniqueDays = Array.from(new Set(entries.map(e => {
    const d = e.date.toDate();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }))).length || 1;

  const dailyAvgIncome = totalIncome / uniqueDays;
  const dailyAvgEnergy = totalEnergyCost / uniqueDays;
  const forecastMonthEnergy = dailyAvgEnergy * 30;
  const forecastMonthProfit = (dailyAvgIncome - dailyAvgEnergy) * 30 - totalExpenses;

  const stats = [
    { 
      label: 'Net Profit (Total)', 
      value: formatCurrency(netProfit, settings.currency), 
      icon: Wallet, 
      borderColor: 'border-l-emerald-500',
      textColor: 'text-slate-900',
      description: 'Total earnings after all overhead'
    },
    { 
      label: 'Gross Income', 
      value: formatCurrency(totalIncome, settings.currency), 
      icon: TrendingUp, 
      borderColor: 'border-l-indigo-500',
      textColor: 'text-slate-900',
      description: 'Total revenue incoming'
    },
    ...(category === 'cybercafe' ? [
      { 
        label: 'Energy Overhead', 
        value: formatCurrency(totalEnergyCost, settings.currency), 
        icon: Zap, 
        borderColor: 'border-l-amber-500',
        textColor: 'text-slate-900',
        description: 'Cumulative energy consumption cost'
      },
      { 
        label: 'Monthly Forecast', 
        value: formatCurrency(forecastMonthProfit, settings.currency), 
        icon: Activity, 
        borderColor: 'border-l-purple-500',
        textColor: 'text-slate-900',
        description: `Est. monthly bill: ${formatCurrency(forecastMonthEnergy, settings.currency)}`
      }
    ] : [
      { 
        label: 'Operating Expenses', 
        value: formatCurrency(totalExpenses, settings.currency), 
        icon: ReceiptText, 
        borderColor: 'border-l-amber-500',
        textColor: 'text-slate-900',
        description: 'Total category specific costs'
      },
      { 
        label: 'Projected Monthly', 
        value: formatCurrency(forecastMonthProfit, settings.currency), 
        icon: Activity, 
        borderColor: 'border-l-purple-500',
        textColor: 'text-slate-900',
        description: 'Statistical monthly projection'
      }
    ]),
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 ${stat.borderColor}`}
          id={`stat-card-${idx}`}
        >
          <div className="flex flex-col">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <h3 className="text-3xl font-bold text-slate-900 font-mono tracking-tight">{stat.value}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">{stat.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
