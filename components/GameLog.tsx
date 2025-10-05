import React, { useRef, useEffect } from 'react';
import { GameMessage } from '../types';

interface GameLogProps {
  log: GameMessage[];
  isLoading: boolean;
  onTextSelect: (text: string) => void;
  onImageClick: (url: string) => void;
}

const GameLog: React.FC<GameLogProps> = ({ log, isLoading, onTextSelect, onImageClick }) => {
  const endOfLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A slight delay ensures the scroll happens after the new content is fully rendered.
    setTimeout(() => endOfLogRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [log, isLoading]);

  const handleMouseUp = () => {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed) {
      onTextSelect('');
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) {
      onTextSelect('');
      return;
    }
    
    let parentElement = selection.getRangeAt(0).commonAncestorContainer;
    if (parentElement.nodeType === Node.TEXT_NODE) {
      parentElement = parentElement.parentElement!;
    }

    if ((parentElement as HTMLElement).closest('.dm-message')) {
      onTextSelect(selectedText);
    } else {
      onTextSelect('');
    }
  };


  const renderFormattedText = (text: string) => {
    // Split text into paragraphs based on one or more newlines, and filter out empty lines
    const paragraphs = text.split(/\n+/).filter(p => p.trim() !== '');

    const formatInlines = (paragraph: string) => {
        // This regex handles bold (**) and italic (*) markdown
        const parts = paragraph.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-bold text-amber-300">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={index} className="italic text-slate-300">{part.slice(1, -1)}</em>;
            }
            return part; // Return string for React to render as a text node
        });
    };

    return paragraphs.map((p, index) => (
        // Render each paragraph in its own <p> tag for better DOM structure and event handling.
        <p key={index} className="leading-relaxed font-roboto-condensed text-lg">
            {formatInlines(p)}
        </p>
    ));
  };

  return (
    <div onMouseUp={handleMouseUp} className="p-4 sm:p-6">
      <div className="space-y-6">
        {log.map((message, index) => {
          if (message.sender === 'system') {
            return (
              <div key={index} className="py-2">
                <p className="text-slate-400 italic text-sm text-center font-signika">{message.text}</p>
              </div>
            );
          }
          return (
            <div
              key={index}
              className={`flex items-start gap-4 ${message.sender === 'player' ? 'justify-end' : ''}`}
            >
              {message.sender === 'dm' && (
                <div className="flex-shrink-0 w-10 h-10 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center font-modesto text-blue-300 shadow-md">
                  DM
                </div>
              )}
              <div
                className={`p-4 shadow-md text-slate-200 ${
                  message.sender === 'dm'
                    ? 'max-w-xl bg-slate-800/90 backdrop-blur-sm space-y-3 border border-slate-700 rounded-xl dm-message'
                    : 'max-w-md bg-red-950/90 border border-red-800 rounded-lg'
                }`}
              >
                {message.sender === 'dm'
                  ? renderFormattedText(message.text)
                  : (
                    <>
                      {message.imageUrl && (
                        <img
                          src={message.imageUrl}
                          alt={message.attachmentName || 'Attached image'}
                          className="max-w-full h-auto rounded-md mb-2 border border-red-800 hover:opacity-80 transition-opacity cursor-pointer"
                          onClick={() => message.imageUrl && onImageClick(message.imageUrl)}
                        />
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed font-roboto-condensed text-lg">{message.text}</p>
                    </>
                  )
                }
              </div>
            </div>
          )
        })}
        {isLoading && (
          <div className="flex items-start gap-4">
             <div className="flex-shrink-0 w-10 h-10 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center font-modesto text-blue-300 shadow-md">
                DM
              </div>
            <div className="max-w-md lg:max-w-lg p-4 rounded-lg shadow-md bg-slate-800 border border-slate-600 text-slate-300">
                <div className="flex items-center space-x-2 italic font-roboto-condensed">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    <span>The DM is crafting a response...</span>
                </div>
            </div>
          </div>
        )}
      </div>
      <div ref={endOfLogRef} />
    </div>
  );
};

export default GameLog;
