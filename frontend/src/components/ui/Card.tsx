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
      className={`bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl p-5 shadow-xl transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-700 hover:bg-slate-800/80' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
