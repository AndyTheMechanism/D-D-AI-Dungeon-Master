import React, { useState } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveGame: () => Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaveGame }) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveClick = async () => {
        setIsSaving(true);
        try {
            await onSaveGame();
        } catch (error) {
            console.error("Failed to save game:", error);
            // Here you could show an error message to the user
        } finally {
            setIsSaving(false);
            onClose(); // Close modal after saving
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800 flex-shrink-0">
                    <h2 className="text-2xl font-modesto text-amber-300">Settings</h2>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-3xl">&times;</button>
                </header>

                <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-300 mb-4">Game Data</h3>
                    <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="w-full px-6 py-3 bg-[var(--dnd5e-color-olive)] hover:bg-red-900 text-white font-bold rounded-md shadow-lg transition-transform transform hover:scale-105 disabled:bg-slate-500 disabled:cursor-not-allowed font-modesto text-xl"
                    >
                        {isSaving ? 'Saving...' : 'Save Game Progress'}
                    </button>
                    <p className="text-sm text-slate-500 mt-2 text-center">
                        This will download a file with your current progress.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
