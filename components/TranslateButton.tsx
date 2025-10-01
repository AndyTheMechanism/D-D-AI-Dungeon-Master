import React, { forwardRef } from 'react';
import TranslateIcon from './icons/TranslateIcon';

interface TranslateButtonProps {
  position: { x: number; y: number };
  onClick: () => void;
}

const TranslateButton = forwardRef<HTMLButtonElement, TranslateButtonProps>(({ position, onClick }, ref) => {
  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%)',
      }}
      className="fixed z-50 p-2 bg-slate-800 border border-slate-600 rounded-full shadow-lg hover:bg-amber-600 hover:border-amber-400 text-slate-300 hover:text-slate-900 transition-all duration-200"
      aria-label="Translate selection"
    >
      <TranslateIcon className="w-5 h-5" />
    </button>
  );
});

export default TranslateButton;
