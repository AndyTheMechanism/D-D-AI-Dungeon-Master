import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CharacterSheet, PersonalNote, AdventureDifficulty, ThematicTone, AdventureDetails, MapEntity } from './types';
import { useGameState } from './context/GameContext';
import { useGameActions } from './hooks/useGameActions';
import GameLog from './components/GameLog';
import PlayerInput from './components/PlayerInput';
import DiceRoller from './components/DiceRoller';
import CharacterCreation from './components/CharacterCreation';
import CharacterSheetModal from './components/CharacterSheetModal';
import CharacterIcon from './components/icons/CharacterIcon';
import TranslateIcon from './components/icons/TranslateIcon';
import ModelSwitcher from './components/ModelSwitcher';
import JournalIcon from './components/icons/JournalIcon';
import JournalModal from './components/JournalModal';
import AdventureSetupModal from './components/AdventureSetupModal';
import StartingGameLoader from './components/StartingGameLoader';
import MapView from './components/MapView';
import RollTypeSelector from './components/RollTypeSelector';
import SettingsIcon from './components/icons/SettingsIcon';
import SettingsModal from './components/SettingsModal';
import ImageModal from './components/ImageModal';
import GenerateIcon from './components/icons/GenerateIcon';


// --- START of Icon Components ---
const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const ExpandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </svg>
);
// --- END of Icon Components ---


// --- START of EntityImagePopup Component ---
interface EntityImagePopupProps {
  entity: MapEntity;
  position: { x: number; y: number };
  isLoading: boolean;
  onClose: () => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onExpand: () => void;
  characterName?: string;
}

const EntityImagePopup: React.FC<EntityImagePopupProps> = ({ entity, position, isLoading, onClose, onGenerate, onRegenerate, onExpand, characterName }) => {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  const imageUrl = entity.imageBase64 ? `data:image/png;base64,${entity.imageBase64}` : null;
  const displayName = entity.type === 'player' ? (characterName || entity.name) : entity.name;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-48 text-white flex flex-col"
      style={{ top: position.y, left: position.x }}
      role="dialog"
      aria-labelledby="entity-popup-title"
    >
      <header className="flex justify-between items-center p-2 border-b border-slate-700">
        <h3 id="entity-popup-title" className="text-sm font-bold text-amber-300 capitalize truncate">{displayName || entity.type}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
      </header>
      <div className="p-2 flex-grow flex items-center justify-center" style={{ minHeight: '120px', minWidth: '120px' }}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-slate-400">
            <GenerateIcon className="w-8 h-8 animate-spin" />
            <span className="text-xs mt-2">Generating...</span>
          </div>
        ) : imageUrl ? (
           <div className="relative group w-24 h-24 flex items-center justify-center">
            <img src={imageUrl} alt={`Portrait of ${displayName || entity.type}`} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button onClick={onExpand} className="p-2 rounded-full bg-slate-700/80 hover:bg-amber-600 text-white" title="Expand Image">
                <ExpandIcon className="w-5 h-5" />
              </button>
              <button onClick={onRegenerate} className="p-2 rounded-full bg-slate-700/80 hover:bg-red-700 text-white" title="Regenerate Image">
                <RefreshIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-2">No portrait available.</p>
            <button
              onClick={onGenerate}
              className="px-3 py-1.5 text-xs bg-[var(--dnd5e-color-olive)] hover:bg-red-900 border border-amber-800 rounded-md font-bold transition-colors"
            >
              Generate Portrait
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
// --- END of EntityImagePopup Component ---


const App: React.FC = () => {
  const {
    gameLog,
    isLoading,
    error,
    gameStarted,
    characterSheet,
    quests,
    personalNotes,
    dmModel,
    mapState,
    rollType,
  } = useGameState();

  const {
    handleStartGame,
    handleGenerateAdventureDetails,
    handlePlayerAction,
    handleDiceRoll,
    handleStatRoll,
    handleSheetSave,
    handleNotesSave,
    handleModelChange,
    handleRollTypeChange,
    handleSaveGame,
    handleLoadGame,
    handleGenerateEntityImage,
  } = useGameActions();

  // Local UI state (modals, selections, etc.)
  const [isSheetVisible, setIsSheetVisible] = useState<boolean>(false);
  const [isJournalVisible, setIsJournalVisible] = useState<boolean>(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);
  const [isAdventureSetupVisible, setIsAdventureSetupVisible] = useState<boolean>(false);
  const [pendingCharacterSheet, setPendingCharacterSheet] = useState<CharacterSheet | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [imagePopup, setImagePopup] = useState<{
    entityId: string;
    position: { x: number; y: number };
    isLoading: boolean;
  } | null>(null);

  // --- START Resizable Panel Logic ---
  const [leftPanelWidth, setLeftPanelWidth] = useState(58.33); // Corresponds to w-7/12
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.userSelect = '';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !mainContainerRef.current) return;
    const container = mainContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    // Clamp the width between 25% and 75% for usability
    const clampedWidth = Math.max(25, Math.min(75, newWidth));
    setLeftPanelWidth(clampedWidth);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  // --- END Resizable Panel Logic ---
  
  const handleCharacterFinalized = useCallback((sheetData: CharacterSheet) => {
    setPendingCharacterSheet(sheetData);
    setIsAdventureSetupVisible(true);
  }, []);

  const handleStartGameAndCloseModal = useCallback(async (
    sheetData: CharacterSheet, 
    adventureDetails: AdventureDetails
  ) => {
    setIsAdventureSetupVisible(false);
    await handleStartGame(sheetData, adventureDetails);
  }, [handleStartGame]);

  const handleGenerateDetailsForModal = useCallback(async (difficulty: AdventureDifficulty) => {
    if (!pendingCharacterSheet) {
      throw new Error("Character sheet not available for generation.");
    }
    return await handleGenerateAdventureDetails(difficulty, pendingCharacterSheet);
  }, [pendingCharacterSheet, handleGenerateAdventureDetails]);

  const handleLoadGameAndCloseModal = useCallback(async (fileContent: string) => {
    await handleLoadGame(fileContent);
  }, [handleLoadGame]);


  const handleStatRollAndCloseModal = useCallback((name: string, modifier: number) => {
    setIsSheetVisible(false);
    // Wait for modal to close before sending action
    setTimeout(() => {
        handleStatRoll(name, modifier);
    }, 100);
  }, [handleStatRoll]);

  const handleNotesSaveAndCloseModal = useCallback((notes: PersonalNote[]) => {
      handleNotesSave(notes);
      setIsJournalVisible(false);
  }, [handleNotesSave]);

  const handleSheetSaveAndCloseModal = useCallback((sheet: CharacterSheet) => {
      handleSheetSave(sheet);
      setIsSheetVisible(false);
  }, [handleSheetSave]);

  const handleTextSelection = useCallback((text: string) => {
    setSelectedText(text);
  }, []);

  const handleTranslateClick = () => {
    if (!selectedText) return;
    const encodedText = encodeURIComponent(selectedText);
    const url = `https://translate.google.com/?sl=auto&tl=ru&text=${encodedText}&op=translate`;
    const popupWidth = 800;
    const popupHeight = 600;
    const left = window.screen.width / 2 - popupWidth / 2;
    const top = window.screen.height / 2 - popupHeight / 2;
    window.open(url, 'google-translate-popup', `width=${popupWidth},height=${popupHeight},top=${top},left=${left},resizable=yes,scrollbars=yes`);
  };

  const handleEntityClick = useCallback((entity: MapEntity, event: React.MouseEvent) => {
    event.preventDefault();
    setImagePopup({
        entityId: entity.id,
        position: { x: event.clientX + 10, y: event.clientY - 10 },
        isLoading: false
    });
  }, []);
  
  const handleGeneratePopupImage = useCallback(async () => {
    if (!imagePopup || !mapState) return;
    const entity = mapState.entities.find(e => e.id === imagePopup.entityId);
    if (!entity) return;

    setImagePopup(p => p ? { ...p, isLoading: true } : null);
    try {
        await handleGenerateEntityImage(entity);
    } catch (e) {
        console.error("Failed to generate entity image:", e);
        // You could add error handling in the popup here
    } finally {
        setImagePopup(p => p ? { ...p, isLoading: false } : null);
    }
  }, [imagePopup, mapState, handleGenerateEntityImage]);

  const handleExpandPopupImage = useCallback(() => {
    if (!imagePopup || !mapState) return;
    const entity = mapState.entities.find(e => e.id === imagePopup.entityId);
    if (entity && entity.imageBase64) {
      setViewingImageUrl(`data:image/png;base64,${entity.imageBase64}`);
      setImagePopup(null); // Close the popup when opening the modal
    }
  }, [imagePopup, mapState]);


  const displayedPopupEntity = imagePopup ? mapState?.entities.find(e => e.id === imagePopup.entityId) : null;


  return (
    <div className="h-screen bg-slate-900 text-slate-200 flex flex-col selection:bg-amber-500 selection:text-slate-900" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/dark-denim.png)' }}>
      {!gameStarted && (
        <header className="w-full max-w-4xl text-center pt-4 mx-auto">
          <h1 className="text-5xl md:text-6xl font-modesto text-amber-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">
            D&D AI Dungeon Master
          </h1>
          <p className="text-slate-400 mt-2 italic font-signika">Your adventure awaits...</p>
        </header>
      )}

      <main className="w-full flex-grow min-h-0 py-4 px-2 sm:px-4">
        {isLoading && !gameStarted ? (
          <div className="w-full h-full flex items-center justify-center"><StartingGameLoader /></div>
        ) : !gameStarted ? (
           <div className="w-full h-full max-w-5xl mx-auto bg-black/30 rounded-lg shadow-2xl border border-slate-700">
             <CharacterCreation onCharacterFinalized={handleCharacterFinalized} isProcessing={isLoading} onGameLoad={handleLoadGameAndCloseModal} />
           </div>
        ) : (
          <div ref={mainContainerRef} className="w-full h-full flex flex-row bg-black/30 rounded-lg shadow-2xl border border-slate-700 overflow-hidden">
            {/* Left Column */}
            <div className="h-full flex flex-col p-4" style={{ width: `${leftPanelWidth}%` }}>
                <div className="flex-grow bg-black border border-slate-600 rounded-md p-2 flex items-center justify-center min-h-0">
                    <MapView 
                        mapState={mapState} 
                        onEntityClick={handleEntityClick} 
                        characterName={characterSheet?.coreIdentity.characterName}
                    />
                </div>
            </div>
            {/* Divider */}
            <div
                className="w-1.5 h-full cursor-col-resize bg-slate-800 hover:bg-amber-500 transition-colors duration-200 flex-shrink-0 flex items-center justify-center group"
                onMouseDown={handleMouseDown}
            >
               <div className="w-px h-10 bg-slate-500 group-hover:bg-amber-300 transition-colors duration-200" />
            </div>

            {/* Right Column */}
            <div className="h-full flex flex-col flex-grow" style={{ width: `${100 - leftPanelWidth}%` }}>
                <div className="flex-grow overflow-y-auto">
                    <GameLog log={gameLog} isLoading={isLoading} onTextSelect={handleTextSelection} onImageClick={setViewingImageUrl} />
                </div>
                <div className="flex-shrink-0 p-4 border-t border-slate-600 bg-slate-800/50">
                   <div className="flex items-center mb-3">
                        {/* Left column */}
                        <div className="flex-1 flex justify-start">
                             <ModelSwitcher 
                                currentModel={dmModel}
                                onModelChange={handleModelChange}
                                disabled={isLoading}
                            />
                        </div>
                        {/* Center column */}
                        <div className="flex-none">
                            <RollTypeSelector 
                                currentRollType={rollType}
                                onRollTypeChange={handleRollTypeChange}
                                disabled={isLoading}
                            />
                        </div>
                        {/* Right column */}
                        <div className="flex-1 flex justify-end">
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                <button 
                                    onClick={handleTranslateClick}
                                    disabled={isLoading || !selectedText}
                                    className="flex items-center p-2 rounded-md bg-[var(--dnd5e-color-olive)] hover:bg-red-900 border border-amber-800 text-white transition-all duration-200 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed group"
                                    aria-label="Translate selected text"
                                    title="Translate selected text"
                                >
                                    <TranslateIcon className="w-5 h-5 text-amber-300 group-hover:text-white transition-colors" />
                                </button>
                                <button 
                                    onClick={() => setIsJournalVisible(true)}
                                    disabled={isLoading}
                                    className="flex items-center p-2 rounded-md bg-[var(--dnd5e-color-olive)] hover:bg-red-900 border border-amber-800 text-white transition-all duration-200 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed group"
                                    aria-label="View Journal"
                                    title="View Journal"
                                >
                                    <JournalIcon className="w-5 h-5 text-amber-300 group-hover:text-white transition-colors" />
                                </button>
                                <button 
                                    onClick={() => setIsSheetVisible(true)}
                                    disabled={isLoading}
                                    className="flex items-center p-2 rounded-md bg-[var(--dnd5e-color-olive)] hover:bg-red-900 border border-amber-800 text-white transition-all duration-200 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed group"
                                    aria-label="View Character Sheet"
                                    title="View Character Sheet"
                                >
                                    <CharacterIcon className="w-5 h-5 text-amber-300 group-hover:text-white transition-colors" />
                                </button>
                                <button 
                                    onClick={() => setIsSettingsVisible(true)}
                                    disabled={isLoading}
                                    className="flex items-center p-2 rounded-md bg-[var(--dnd5e-color-olive)] hover:bg-red-900 border border-amber-800 text-white transition-all duration-200 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed group"
                                    aria-label="Game Settings"
                                    title="Game Settings"
                                >
                                    <SettingsIcon className="w-5 h-5 text-amber-300 group-hover:text-white transition-colors" />
                                </button>
                            </div>
                        </div>
                    </div>
                  <DiceRoller onRoll={handleDiceRoll} disabled={isLoading} />
                  <PlayerInput onSend={handlePlayerAction} disabled={isLoading} />
                  {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
                </div>
            </div>
          </div>
        )}
      </main>
      
      {!gameStarted && (
        <footer className="w-full max-w-4xl text-center pb-4 mx-auto text-sm text-slate-500 font-signika">
            <p>Powered by Google Gemini. This is a fictional game. Have fun!</p>
        </footer>
      )}
      
      {isAdventureSetupVisible && pendingCharacterSheet && (
        <AdventureSetupModal
          sheet={pendingCharacterSheet}
          onClose={() => setIsAdventureSetupVisible(false)}
          onStartAdventure={handleStartGameAndCloseModal}
          onGenerateDetails={handleGenerateDetailsForModal}
        />
      )}

      {isSheetVisible && characterSheet && (
        <CharacterSheetModal 
          sheet={characterSheet} 
          onClose={() => setIsSheetVisible(false)}
          onStatRoll={handleStatRollAndCloseModal}
          onSave={handleSheetSaveAndCloseModal}
        />
      )}

      {isJournalVisible && (
        <JournalModal 
          isOpen={isJournalVisible}
          quests={quests}
          notes={personalNotes}
          onClose={() => setIsJournalVisible(false)}
          onNotesSave={handleNotesSaveAndCloseModal}
        />
      )}

      {isSettingsVisible && (
        <SettingsModal
            isOpen={isSettingsVisible}
            onClose={() => setIsSettingsVisible(false)}
            onSaveGame={handleSaveGame}
        />
      )}

      {viewingImageUrl && (
        <ImageModal 
            imageUrl={viewingImageUrl}
            altText="Enlarged view of attached image"
            onClose={() => setViewingImageUrl(null)}
        />
      )}

      {imagePopup && displayedPopupEntity && (
        <EntityImagePopup
            entity={displayedPopupEntity}
            position={imagePopup.position}
            isLoading={imagePopup.isLoading}
            onClose={() => setImagePopup(null)}
            onGenerate={handleGeneratePopupImage}
            onRegenerate={handleGeneratePopupImage}
            onExpand={handleExpandPopupImage}
            characterName={characterSheet?.coreIdentity.characterName}
        />
      )}
      
    </div>
  );
};

export default App;