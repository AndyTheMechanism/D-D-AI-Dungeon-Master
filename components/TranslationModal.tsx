import React from 'react';

interface TranslationModalProps {
  originalText: string;
  translatedText: string | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

const TranslationModal: React.FC<TranslationModalProps> = ({ originalText, translatedText, isLoading, error, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-medieval text-amber-300">Translate Text</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl">&times;</button>
        </header>
        <div className="p-6 space-y-4">
            <div>
                <h3 className="font-bold text-slate-400 mb-2">Original Text</h3>
                <p className="p-3 bg-slate-900/50 border border-slate-700 rounded-md whitespace-pre-wrap">{originalText}</p>
            </div>
            <div>
                <h3 className="font-bold text-slate-400 mb-2">Translated Text (Russian)</h3>
                <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-md min-h-[6rem]">
                    {isLoading && (
                         <div className="flex items-center space-x-2 text-slate-400 italic">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                            <span>Translating...</span>
                        </div>
                    )}
                    {error && <p className="text-red-400">{error}</p>}
                    {translatedText && <p className="whitespace-pre-wrap">{translatedText}</p>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationModal;