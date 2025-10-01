import React from 'react';
import { Dice } from '../types';
import D20Icon from './icons/D20Icon';
import CoinIcon from './icons/CoinIcon';
import D4Icon from './icons/D4Icon';
import D6Icon from './icons/D6Icon';
import D8Icon from './icons/D8Icon';
import D10Icon from './icons/D10Icon';
import D12Icon from './icons/D12Icon';
import PercentIcon from './icons/PercentIcon';

interface DiceRollerProps {
  onRoll: (dice: Dice, result: number) => void;
  disabled: boolean;
}

const diceTypes: Dice[] = ['d2', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

const DieButton: React.FC<{ die: Dice; onRoll: () => void; disabled: boolean }> = ({ die, onRoll, disabled }) => {
  const iconProps = {
    className: "w-6 h-6 mb-1 text-amber-300 group-hover:text-white transition-colors"
  };

  const getIcon = () => {
    switch (die) {
      case 'd2': return <CoinIcon {...iconProps} />;
      case 'd4': return <D4Icon {...iconProps} />;
      case 'd6': return <D6Icon {...iconProps} />;
      case 'd8': return <D8Icon {...iconProps} />;
      case 'd10': return <D10Icon {...iconProps} />;
      case 'd12': return <D12Icon {...iconProps} />;
      case 'd20': return <D20Icon {...iconProps} />;
      case 'd100': return <PercentIcon {...iconProps} />;
      default: return null;
    }
  };

  const getLabel = () => {
    switch (die) {
        case 'd2': return 'Coin';
        case 'd100': return '%';
        default: return die.toUpperCase();
    }
  }

  return (
    <button
      onClick={onRoll}
      disabled={disabled}
      className="flex flex-col items-center justify-center p-2 rounded-md bg-[var(--dnd5e-color-olive)] hover:bg-red-900 border border-amber-800 text-white transition-all duration-200 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed group"
    >
      {getIcon()}
      <span className="font-bold font-modesto tracking-wider">{getLabel()}</span>
    </button>
  );
};


const DiceRoller: React.FC<DiceRollerProps> = ({ onRoll, disabled }) => {
  const handleRoll = (die: Dice) => {
    const sides = parseInt(die.slice(1));
    const result = Math.floor(Math.random() * sides) + 1;
    onRoll(die, result);
  };

  return (
    <div className="mb-4">
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {diceTypes.map((die) => (
          <DieButton key={die} die={die} onRoll={() => handleRoll(die)} disabled={disabled} />
        ))}
      </div>
    </div>
  );
};

export default DiceRoller;