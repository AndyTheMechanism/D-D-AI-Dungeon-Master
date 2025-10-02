import React, { useState, useRef, useEffect } from 'react';
import ModelIcon from './icons/ModelIcon';
import { DmModel } from '../types';

interface ModelSwitcherProps {
  currentModel: DmModel;
  onModelChange: (model: DmModel) => void;
  disabled: boolean;
}

const ModelSwitcher: React.FC<ModelSwitcherProps> = ({ currentModel, onModelChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const availableModels: DmModel[] = ['gemini-2.5-flash', 'gemini-2.5-pro'];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (model: DmModel) => {
    setIsOpen(false);
    onModelChange(model);
  };

  const displayName = (model: DmModel) => {
    switch(model) {
        case 'gemini-2.5-flash': return '2.5 Flash';
        case 'gemini-2.5-pro': return '2.5 Pro';
        default: return model;
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--dnd5e-color-olive)] hover:bg-red-900 border border-amber-800 text-white transition-all duration-200 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed group"
        aria-label="Switch DM Model"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <ModelIcon className="w-5 h-5 text-amber-300 group-hover:text-white transition-colors" />
        <span className="text-sm font-roboto-slab font-bold capitalize">{displayName(currentModel)}</span>
        <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 w-full min-w-max bg-slate-800 border border-slate-600 rounded-md shadow-lg z-10">
          <ul className="text-sm">
            {availableModels.map((model) => (
              <li key={model}>
                <button
                  onClick={() => handleSelect(model)}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-700 ${currentModel === model ? 'font-bold text-amber-300' : 'text-white'}`}
                >
                  {displayName(model)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ModelSwitcher;
