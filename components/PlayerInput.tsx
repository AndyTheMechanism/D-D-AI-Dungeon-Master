import React, { useState } from 'react';

interface PlayerInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

const PlayerInput: React.FC<PlayerInputProps> = ({ onSend, disabled }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      onSend(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="What do you do?"
        disabled={disabled}
        className="flex-grow bg-slate-900 border border-slate-700 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dnd5e-color-gold)] focus:border-transparent transition-shadow disabled:bg-slate-700 font-roboto-slab"
        autoComplete="off"
      />
    </form>
  );
};

export default PlayerInput;