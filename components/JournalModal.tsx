import React, { useState, useEffect } from 'react';
import { Quest, PersonalNote, QuestStatus } from '../types';

interface JournalModalProps {
    isOpen: boolean;
    quests: Quest[];
    notes: PersonalNote[];
    onClose: () => void;
    onNotesSave: (updatedNotes: PersonalNote[]) => void;
}

const JournalModal: React.FC<JournalModalProps> = ({ isOpen, quests, notes, onClose, onNotesSave }) => {
    const [activeTab, setActiveTab] = useState<'quests' | 'notes'>('quests');
    const [draftNotes, setDraftNotes] = useState<PersonalNote[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Deep copy notes into draft when modal opens
            setDraftNotes(JSON.parse(JSON.stringify(notes)));
        }
    }, [isOpen, notes]);

    if (!isOpen) return null;

    const handleNoteChange = (id: string, content: string) => {
        setDraftNotes(draftNotes.map(note => note.id === id ? { ...note, content } : note));
    };

    const handleAddNote = () => {
        const newNote: PersonalNote = {
            id: Date.now().toString(),
            content: ''
        };
        setDraftNotes([...draftNotes, newNote]);
    };

    const handleDeleteNote = (id: string) => {
        setDraftNotes(draftNotes.filter(note => note.id !== id));
    };

    const handleSave = () => {
        onNotesSave(draftNotes);
        onClose();
    };

    const renderQuestsByStatus = (status: QuestStatus) => {
        const filteredQuests = quests.filter(q => q.status === status);
        if (filteredQuests.length === 0) {
            return <p className="text-slate-500 italic px-4">No {status} quests.</p>;
        }
        return (
            <div className="space-y-4">
                {filteredQuests.map(quest => (
                    <div key={quest.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                        <h4 className="font-bold text-amber-300 font-modesto tracking-wide text-lg">{quest.title}</h4>
                        <p className="text-slate-300 mt-1 whitespace-pre-wrap">{quest.description}</p>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800 flex-shrink-0">
                    <h2 className="text-2xl font-modesto text-amber-300">Journal</h2>
                    <div className="flex items-center gap-4">
                        {activeTab === 'notes' && (
                             <button
                                onClick={handleSave}
                                className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold font-roboto-slab transition-colors"
                            >
                                Save Notes
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-3xl">&times;</button>
                    </div>
                </header>

                <div className="border-b border-slate-700 flex-shrink-0">
                    <nav className="flex">
                        <button
                            onClick={() => setActiveTab('quests')}
                            className={`px-6 py-3 font-bold font-roboto-slab ${activeTab === 'quests' ? 'bg-slate-700/50 text-amber-300 border-b-2 border-amber-400' : 'text-slate-400 hover:bg-slate-800'}`}
                        >
                            Quests
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`px-6 py-3 font-bold font-roboto-slab ${activeTab === 'notes' ? 'bg-slate-700/50 text-amber-300 border-b-2 border-amber-400' : 'text-slate-400 hover:bg-slate-800'}`}
                        >
                            Personal Notes
                        </button>
                    </nav>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {activeTab === 'quests' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-modesto text-slate-300 border-b-2 border-[var(--dnd5e-color-olive)] pb-2 mb-3">Active Quests</h3>
                                {renderQuestsByStatus('active')}
                            </div>
                            <div>
                                <h3 className="text-xl font-modesto text-slate-400 border-b-2 border-slate-700 pb-2 mb-3">Completed Quests</h3>
                                {renderQuestsByStatus('completed')}
                            </div>
                             <div>
                                <h3 className="text-xl font-modesto text-slate-500 border-b-2 border-slate-700 pb-2 mb-3">Failed Quests</h3>
                                {renderQuestsByStatus('failed')}
                            </div>
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                               <p className="text-slate-400 italic">Your personal thoughts, clues, and reminders.</p>
                                <button
                                    onClick={handleAddNote}
                                    className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors"
                                >
                                    + Add Note
                                </button>
                            </div>
                            <div className="space-y-4">
                                {draftNotes.map((note, index) => (
                                    <div key={note.id} className="flex items-start gap-2">
                                        <textarea
                                            value={note.content}
                                            onChange={(e) => handleNoteChange(note.id, e.target.value)}
                                            placeholder={`Note ${index + 1}`}
                                            className="w-full h-24 bg-slate-800/70 border border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-200 resize-y"
                                        />
                                        <button
                                            onClick={() => handleDeleteNote(note.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                                            aria-label="Delete note"
                                        >
                                           &times;
                                        </button>
                                    </div>
                                ))}
                                {draftNotes.length === 0 && (
                                     <p className="text-slate-500 italic text-center py-8">You haven't written any notes yet.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JournalModal;