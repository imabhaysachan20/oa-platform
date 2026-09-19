import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="sticky bottom-0 z-40 border-t border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md text-slate-600 dark:text-slate-400 text-xs transition-colors duration-150 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
        <div>
          © {new Date().getFullYear()} UsefulBI Corporation. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition">Privacy Policy</span>
          <span>•</span>
          <span className="hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition">Terms of Service</span>
          <span>•</span>
          <span className="font-mono text-[10px] text-slate-400">v2.4 Enterprise</span>
        </div>
      </div>
    </footer>
  );
};
