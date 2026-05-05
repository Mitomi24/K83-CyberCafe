import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { LogIn, Info } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 mb-8"
        >
          <span className="text-white font-black text-2xl">L</span>
        </motion.div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          K83 Cyber Cafe
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Precision revenue & energy management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100 sm:px-12">
          <div className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-3">
              <Info className="text-indigo-600 flex-shrink-0" size={20} />
              <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                K83 Management system monitors thin margins by integrating real-time energy costs into your daily profit analysis.
              </p>
            </div>

            <button
              onClick={signIn}
              className="w-full flex justify-center items-center gap-3 py-3.5 px-4 border border-slate-300 rounded-xl shadow-sm bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98]"
            >
              <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>
          </div>

          <div className="mt-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-semibold">
                <span className="px-2 bg-white text-gray-400">Enterprise Ready</span>
              </div>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-xs text-gray-400">
          Secure cloud storage powered by Google Cloud & Firebase.
        </p>
      </div>
    </div>
  );
};
