import React, { useState, useRef } from 'react';
import type { CharacterSheet } from '../types';
import { parseCharacterSheet } from '../services/geminiService';
import CharacterSheetForm, { initialSheetState } from './CharacterSheetForm';

interface CharacterCreationProps {
  onCharacterFinalized: (sheet: CharacterSheet) => void;
  isProcessing: boolean;
  onGameLoad: (fileContent: string) => void;
}

const CharacterCreation: React.FC<CharacterCreationProps> = ({ onCharacterFinalized, isProcessing, onGameLoad }) => {
  const [sheet, setSheet] = useState<CharacterSheet>(initialSheetState);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadGameInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setError(null);
    try {
      const content = await file.text();
      const parsedSheet = await parseCharacterSheet(content);
      setSheet(() => {
        const deepMerge = (target: any, source: any): any => {
          const output = { ...target };
          if (target && typeof target === 'object' && source && typeof source === 'object') {
            Object.keys(source).forEach(key => {
              const targetValue = target[key];
              const sourceValue = source[key];
              if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
                output[key] = deepMerge(targetValue || {}, sourceValue);
              } else if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
                output[key] = sourceValue;
              }
            });
          }
          return output;
        };
        return deepMerge(initialSheetState, parsedSheet);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred during parsing.');
      console.error(e);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadGameFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const content = await file.text();
        onGameLoad(content);
    } catch (e) {
        setError(e instanceof Error ? `Failed to read save file: ${e.message}` : 'An unknown error occurred.');
        console.error(e);
    } finally {
        if (loadGameInputRef.current) loadGameInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleLoadGameClick = () => loadGameInputRef.current?.click();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheet.coreIdentity.characterName || !sheet.coreIdentity.class) {
        setError("Character Name and Class are required to start.");
        return;
    }
    setError(null);
    onCharacterFinalized(sheet);
  }

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="text-center mb-6">
            <h2 className="text-3xl font-modesto text-amber-200">Create Your Character</h2>
            <p className="text-slate-400 mt-2 font-signika">Fill the sheet manually or upload a file to have the AI do it for you.</p>
        </div>

        <div className="flex justify-center gap-4 mb-6">
             <button
                onClick={handleUploadClick}
                disabled={isParsing || isProcessing}
                className="px-6 py-3 border-2 border-dashed border-slate-500 rounded-lg text-slate-300 hover:bg-slate-600 hover:border-[var(--dnd5e-color-gold)] hover:text-[var(--dnd5e-color-gold)] transition-colors disabled:opacity-50 disabled:cursor-wait font-roboto-slab"
            >
                {isParsing ? 'Reading the Scrolls...' : 'Upload & Auto-fill with AI'}
            </button>
            <button
                onClick={handleLoadGameClick}
                disabled={isParsing || isProcessing}
                className="px-6 py-3 border-2 border-dashed border-slate-500 rounded-lg text-slate-300 hover:bg-slate-600 hover:border-[var(--dnd5e-color-gold)] hover:text-[var(--dnd5e-color-gold)] transition-colors disabled:opacity-50 disabled:cursor-wait font-roboto-slab"
            >
                Load Game
            </button>
        </div>
        
        {error && <p className="text-red-400 my-4 text-center">{error}</p>}
        
        <CharacterSheetForm
          sheet={sheet}
          onSheetChange={setSheet}
          onSubmit={handleSubmit}
        >
          <button
            type="submit"
            disabled={isParsing || isProcessing}
            className="px-10 py-4 bg-[var(--dnd5e-color-olive)] hover:bg-red-900 text-white font-bold rounded-md shadow-lg transition-transform transform hover:scale-105 disabled:bg-slate-500 disabled:cursor-not-allowed font-modesto text-2xl"
          >
              {isProcessing ? 'Please Wait...' : 'Set Up Adventure'}
          </button>
        </CharacterSheetForm>
        
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".txt, .md"
            disabled={isParsing || isProcessing}
        />
        <input
            type="file"
            ref={loadGameInputRef}
            onChange={handleLoadGameFile}
            className="hidden"
            accept=".json"
            disabled={isParsing || isProcessing}
        />
    </div>
  );
};

export default CharacterCreation;