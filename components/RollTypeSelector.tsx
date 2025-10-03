import React from 'react';
import { RollType } from '../types';
import AdvantageIcon from './icons/AdvantageIcon';
import DisadvantageIcon from './icons/DisadvantageIcon';

interface RollTypeSelectorProps {
  currentRollType: RollType;
  onRollTypeChange: (rollType: RollType) => void;
  disabled: boolean;
}

const RollTypeSelector: React.FC<RollTypeSelectorProps> = ({ currentRollType, onRollTypeChange, disabled }) => {
    const options: { type: RollType; label: string; icon?: React.ReactNode }[] = [
        { type: 'advantage', label: 'Advantage', icon: <AdvantageIcon className="w-4 h-4" /> },
        { type: 'normal', label: 'Normal' },
        { type: 'disadvantage', label: 'Disadvantage', icon: <DisadvantageIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="flex items-center justify-center bg-slate-900 border border-slate-700 rounded-md p-1" role="radiogroup" aria-label="Dice roll type">
            {options.map(({ type, label, icon }) => (
                <button
                    key={type}
                    role="radio"
                    aria-checked={currentRollType === type}
                    onClick={() => onRollTypeChange(type)}
                    disabled={disabled}
                    className={`px-3 py-1 text-xs font-bold font-roboto-slab rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                        currentRollType === type
                            ? (type === 'advantage' ? 'bg-green-600 text-white shadow' : type === 'disadvantage' ? 'bg-red-700 text-white shadow' : 'bg-amber-600 text-white shadow')
                            : 'bg-transparent text-slate-400 hover:bg-slate-700/50'
                    }`}
                    title={`Set next d20 roll to ${label}`}
                >
                    {icon}
                    <span>{label}</span>
                </button>
            ))}
        </div>
    );
};

export default RollTypeSelector;
