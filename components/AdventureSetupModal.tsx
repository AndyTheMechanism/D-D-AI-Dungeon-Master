import React, { useState, useCallback } from 'react';
import { CharacterSheet, AdventureDifficulty, ThematicTone } from '../types';
import GenerateIcon from './icons/GenerateIcon';

interface AdventureSetupModalProps {
    sheet: CharacterSheet;
    onClose: () => void;
    onStartAdventure: (sheet: CharacterSheet, details: { difficulty: AdventureDifficulty, worldName: string, additionalInfo: string, tone: ThematicTone }) => void;
    onGenerateDetails: (difficulty: AdventureDifficulty) => Promise<{ worldName: string, additionalInfo: string }>;
}

const difficulties: AdventureDifficulty[] = ['Easy', 'Medium', 'Hard', 'Hardcore'];

const AdventureSetupModal: React.FC<AdventureSetupModalProps> = ({ sheet, onClose, onStartAdventure, onGenerateDetails }) => {
    const [difficulty, setDifficulty] = useState<AdventureDifficulty>('Medium');
    const [tone, setTone] = useState<ThematicTone>('Heroic Fantasy');
    const [worldName, setWorldName] = useState('');
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = useCallback(async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const details = await onGenerateDetails(difficulty);
            setWorldName(details.worldName);
            setAdditionalInfo(details.additionalInfo);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    }, [difficulty, onGenerateDetails]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onStartAdventure(sheet, { difficulty, worldName, additionalInfo, tone });
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <form
                className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <header className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800 flex-shrink-0">
                    <h2 className="text-2xl font-modesto text-amber-300">
                        Set Up Your Adventure
                    </h2>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-3xl">&times;</button>
                </header>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Difficulty Selector */}
                    <div>
                        <label className="block text-lg font-bold font-signika text-slate-300 mb-2">1. Set World Difficulty</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {difficulties.map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setDifficulty(d)}
                                    className={`px-4 py-3 rounded-md font-bold transition-all border-2 ${
                                        difficulty === d
                                            ? 'bg-amber-600 border-amber-400 text-white shadow-lg'
                                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500'
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Thematic Tone Selector */}
                    <div>
                        <label className="block text-lg font-bold font-signika text-slate-300 mb-2">2. Set Thematic Tone</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setTone('Heroic Fantasy')}
                                className={`px-4 py-3 rounded-md font-bold transition-all border-2 ${
                                    tone === 'Heroic Fantasy'
                                        ? 'bg-sky-600 border-sky-400 text-white shadow-lg'
                                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500'
                                }`}
                            >
                                Heroic Fantasy
                            </button>
                             <button
                                type="button"
                                onClick={() => setTone('Gritty Realism')}
                                className={`px-4 py-3 rounded-md font-bold transition-all border-2 ${
                                    tone === 'Gritty Realism'
                                        ? 'bg-red-800 border-red-600 text-white shadow-lg'
                                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500'
                                }`}
                            >
                                Gritty Realism
                            </button>
                            <button
                                type="button"
                                onClick={() => setTone('Unrestricted')}
                                className={`px-4 py-3 rounded-md font-bold transition-all border-2 ${
                                    tone === 'Unrestricted'
                                        ? 'bg-purple-800 border-purple-600 text-white shadow-lg'
                                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500'
                                }`}
                            >
                                Unrestricted
                            </button>
                        </div>
                         {tone === 'Gritty Realism' && (
                            <p className="text-xs text-slate-400 mt-2 p-2 bg-slate-800 rounded">
                                This tone creates a more challenging and somber world with mature themes like moral ambiguity and the consequences of violence. It also creates the opportunity to create and describe any descriptions and scenes without moral restrictions.
                                Note: Descriptions will only be created where it is logical and appropriate to the roleplaying scene.
                            </p>
                        )}
                        {tone === 'Unrestricted' && (
                            <div className="text-xs text-amber-300 mt-2 p-3 bg-red-900/50 border border-red-700 rounded-md">
                                <p className="font-bold text-base">⚠️ WARNING: Mature Content</p>
                                <p className="mt-1">This mode removes content filters and is intended for mature audiences. It may generate explicit, graphic, or otherwise sensitive content. Player discretion is strongly advised.</p>
                            </div>
                        )}
                    </div>

                    {/* World Name */}
                    <div>
                        <label htmlFor="worldName" className="block text-lg font-bold font-signika text-slate-300 mb-2">3. Set World Name</label>
                        <input
                            id="worldName"
                            type="text"
                            value={worldName}
                            onChange={(e) => setWorldName(e.target.value)}
                            placeholder="e.g., The Shattered Isles of Aerthos"
                            className="w-full bg-slate-800 border border-slate-600 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-shadow font-roboto-slab"
                        />
                    </div>

                    {/* Additional Info */}
                    <div>
                        <label htmlFor="additionalInfo" className="block text-lg font-bold font-signika text-slate-300 mb-2">4. Provide Additional Information (Optional)</label>
                        <textarea
                            id="additionalInfo"
                            value={additionalInfo}
                            onChange={(e) => setAdditionalInfo(e.target.value)}
                            placeholder="e.g., A world where magic is dying, and the gods have fallen silent. I want a gritty, low-magic setting."
                            rows={4}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-shadow font-roboto-slab resize-y"
                        />
                    </div>
                     {error && <p className="text-red-400 text-center">{error}</p>}
                </div>

                <footer className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-6 py-3 rounded-md bg-slate-600 hover:bg-slate-500 border border-slate-500 text-white transition-all duration-200 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-wait group font-roboto-slab"
                    >
                        <GenerateIcon className={`w-5 h-5 text-amber-300 group-hover:text-white transition-colors ${isGenerating ? 'animate-spin' : ''}`} />
                        <span className="font-bold">{isGenerating ? 'Generating...' : 'Generate with AI'}</span>
                    </button>
                    <button
                        type="submit"
                        className="px-10 py-3 bg-[var(--dnd5e-color-olive)] hover:bg-red-900 text-white font-bold rounded-md shadow-lg transition-transform transform hover:scale-105 disabled:bg-slate-500 disabled:cursor-not-allowed font-modesto text-xl"
                    >
                        Start Adventure
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default AdventureSetupModal;