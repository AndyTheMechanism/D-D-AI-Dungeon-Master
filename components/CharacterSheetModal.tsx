import React, { useState } from 'react';
import { CharacterSheet } from '../types';
import CharacterSheetForm from './CharacterSheetForm';

interface CharacterSheetModalProps {
    sheet: CharacterSheet;
    onClose: () => void;
    onStatRoll: (name: string, modifier: number) => void;
    onSave: (updatedSheet: CharacterSheet) => void;
}

const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({ sheet, onClose, onStatRoll, onSave }) => {
    const [draftSheet, setDraftSheet] = useState<CharacterSheet>(() => JSON.parse(JSON.stringify(sheet)));

    const isDirty = JSON.stringify(sheet) !== JSON.stringify(draftSheet);
    
    const handleSave = () => {
        if (isDirty) {
            onSave(draftSheet);
        } else {
            onClose();
        }
    };

    return (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2"
          onClick={onClose}
          aria-modal="true"
          role="dialog"
        >
            <div 
              className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800 flex-shrink-0">
                    <h2 className="text-2xl font-modesto text-amber-300">
                        {draftSheet.coreIdentity.characterName || "Character Sheet"}
                    </h2>
                    <div className="flex items-center gap-4">
                         <button 
                            type="submit"
                            form="sheet-modal-form"
                            disabled={!isDirty}
                            className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold font-roboto-slab transition-colors disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                        >
                            Save
                        </button>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-3xl">&times;</button>
                    </div>
                </header>
                <div className="overflow-y-auto text-black" style={{ scrollbarWidth: 'thin' }}>
                    <CharacterSheetForm
                        formId="sheet-modal-form"
                        sheet={draftSheet}
                        onSheetChange={setDraftSheet}
                        onSubmit={(e) => { e.preventDefault(); handleSave(); }}
                        onStatRoll={onStatRoll}
                    >
                      {/* Save button is in the header, no children needed */}
                    </CharacterSheetForm>
                </div>
            </div>
        </div>
    );
};

export default CharacterSheetModal;