import React, { useState, useRef } from 'react';
import PaperclipIcon from './icons/PaperclipIcon';

interface PlayerInputProps {
  onSend: (message: string, attachment?: { data: string; mimeType: string; name: string }) => void;
  disabled: boolean;
}

const PlayerInput: React.FC<PlayerInputProps> = ({ onSend, disabled }) => {
  const [inputValue, setInputValue] = useState('');
  const [attachment, setAttachment] = useState<{ file: File; data: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string)?.split(',')[1];
        if (base64Data) {
          setAttachment({
            file: file,
            data: base64Data,
            mimeType: file.type,
          });
        }
      };
      reader.onerror = () => {
        console.error("Failed to read file for attachment.");
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((inputValue.trim() || attachment) && !disabled) {
      onSend(
        inputValue.trim(),
        attachment ? { data: attachment.data, mimeType: attachment.mimeType, name: attachment.file.name } : undefined
      );
      setInputValue('');
      setAttachment(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      {attachment && (
        <div className="mb-2 flex items-center justify-between text-sm bg-slate-700/50 p-2 rounded-md">
          <span className="text-slate-300 truncate" title={attachment.file.name}>
            Attached: {attachment.file.name}
          </span>
          <button
            type="button"
            onClick={removeAttachment}
            className="text-slate-400 hover:text-red-400 text-lg font-bold ml-2"
            aria-label="Remove attachment"
          >
            &times;
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,application/pdf,.txt,.md"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleAttachClick}
          disabled={disabled}
          className="p-3 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--dnd5e-color-gold)] disabled:bg-slate-700 disabled:cursor-not-allowed flex-shrink-0"
          aria-label="Attach file"
        >
          <PaperclipIcon className="w-5 h-5 text-slate-400" />
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="What do you do?"
          disabled={disabled}
          className="flex-grow bg-slate-900 border border-slate-700 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dnd5e-color-gold)] focus:border-transparent transition-shadow disabled:bg-slate-700 font-roboto-slab"
          autoComplete="off"
        />
      </div>
    </form>
  );
};

export default PlayerInput;
