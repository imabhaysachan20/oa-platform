import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-sm dark:shadow-md transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-ubi-300 dark:hover:border-slate-700 hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
