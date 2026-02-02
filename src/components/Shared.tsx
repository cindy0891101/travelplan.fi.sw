
import React from 'react';

export const NordicCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white/80 backdrop-blur-sm rounded-3xl p-5 nordic-shadow border-2 border-paper/40 ${className} active:scale-[0.98] transition-all duration-200 cursor-pointer`}
  >
    {children}
  </div>
);

// Added disabled prop to NordicButton to fix TypeScript error in views/ExpenseView.tsx
export const NordicButton: React.FC<{ 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger'; 
  className?: string;
  disabled?: boolean;
}> = ({ 
  children, onClick, variant = 'primary', className = '', disabled = false 
}) => {
  const base = "px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-harbor text-cream border-2 border-harbor/20",
    secondary: "bg-paper/40 text-harbor border-2 border-paper",
    danger: "bg-stamp text-cream border-2 border-stamp/20"
  };
  
  return (
    <button 
      onClick={onClick} 
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-ink/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-cream w-full max-w-sm rounded-4xl p-6 relative animate-in zoom-in duration-300 border-2 border-paper/50 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-6 flex-shrink-0 bg-transparent">
          <h2 className="text-xl font-bold text-harbor bg-transparent">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-paper/50 text-harbor hover:bg-paper text-2xl transition-all">&times;</button>
        </div>
        <div className="overflow-y-auto no-scrollbar flex-grow bg-transparent">
          {children}
        </div>
      </div>
    </div>
  );
};
