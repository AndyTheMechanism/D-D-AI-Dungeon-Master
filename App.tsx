import React, { useState, useCallback, useRef } from 'react';
import { CharacterSheet, PersonalNote, AdventureDifficulty } from './types';
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
  } = useGameActions();

  // Local UI state (modals, selections, etc.)
  const [isSheetVisible, setIsSheetVisible] = useState<boolean>(false);
  const [isJournalVisible, setIsJournalVisible] = useState<boolean>(false);
  const [isAdventureSetupVisible, setIsAdventureSetupVisible] = useState<boolean>(false);
  const [pendingCharacterSheet, setPendingCharacterSheet] = useState<CharacterSheet | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  
  const handleCharacterFinalized = useCallback((sheetData: CharacterSheet) => {
    setPendingCharacterSheet(sheetData);
    setIsAdventureSetupVisible(true);
  }, []);

  const handleStartGameAndCloseModal = useCallback(async (
    sheetData: CharacterSheet, 
    adventureDetails: { difficulty: AdventureDifficulty, worldName: string, additionalInfo: string }
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

  return (
    <div className="h-screen bg-slate-900 text-slate-200 flex flex-col items-center justify-center p-2 sm:p-4 selection:bg-amber-500 selection:text-slate-900" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/dark-denim.png)' }}>
      {!gameStarted && (
        <header className="w-full max-w-4xl text-center mb-6">
          <h1 className="text-5xl md:text-6xl font-modesto text-amber-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">
            D&D AI Dungeon Master
          </h1>
          <p className="text-slate-400 mt-2 italic font-signika">Your adventure awaits...</p>
        </header>
      )}

      <main className={`w-full h-full rounded-lg shadow-2xl border border-slate-700 overflow-hidden ${
        gameStarted 
        ? 'max-w-screen-2xl flex flex-row bg-black/30' 
        : 'max-w-5xl flex flex-col bg-black/30'
      }`}>
        {isLoading && !gameStarted ? (
          <StartingGameLoader />
        ) : !gameStarted ? (
           <CharacterCreation onCharacterFinalized={handleCharacterFinalized} isProcessing={isLoading} />
        ) : (
          <>
            {/* Left Column */}
            <div className="w-7/12 flex flex-col p-4 gap-4">
                <header className="w-full text-left flex-shrink-0">
                    <h1 className="text-4xl md:text-5xl font-modesto text-amber-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">
                    D&D AI Dungeon Master
                    </h1>
                    <p className="text-slate-400 mt-1 italic font-signika">Your adventure awaits...</p>
                </header>
                <div className="flex-grow bg-black border border-slate-600 rounded-md p-2 flex items-center justify-center min-h-0">
                    <MapView mapState={mapState} />
                </div>
                 <footer className="w-full text-left text-sm text-slate-500 font-signika flex-shrink-0">
                    <p>Powered by Google Gemini. This is a fictional game. Have fun!</p>
                </footer>
            </div>
            {/* Right Column */}
            <div className="w-5/12 flex flex-col border-l border-slate-700">
                <div className="flex-grow overflow-y-auto">
                    <GameLog log={gameLog} isLoading={isLoading} onTextSelect={handleTextSelection} />
                </div>
                <div className="flex-shrink-0 p-4 border-t border-slate-600 bg-slate-800/50">
                   <div className="flex justify-between items-center mb-2">
                     <p className="text-sm text-slate-400 font-modesto tracking-wider">Player Actions</p>
                     <div className="flex items-center gap-2">
                       <ModelSwitcher 
                         currentModel={dmModel}
                         onModelChange={handleModelChange}
                         disabled={isLoading}
                       />
                       <button 
                         onClick={handleTranslateClick}
                         disabled={isLoading || !selectedText}
                         className="flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--dnd5e-color-olive)] hover:bg-red-900 border border-amber-800 text-white transition-all duration-200 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed group"
                         aria-label="Translate selected text"
                       >
                          <TranslateIcon className="w-5 h-5 text-amber-300 group-hover:text-white transition-colors" />
                          <span className="text-sm font-roboto-slab font-bold">Translate</span>
                       </button>
                       <button 
                         onClick={() => setIsJournalVisible(true)}
                         disabled={isLoading}
                         className="flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--dnd5e-color-olive)] hover:bg-red-900 border border-amber-800 text-white transition-all duration-200 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed group"
                         aria-label="View Journal"
                       >
                          <JournalIcon className="w-5 h-5 text-amber-300 group-hover:text-white transition-colors" />
                          <span className="text-sm font-roboto-slab font-bold">Journal</span>
                       </button>
                       <button 
                         onClick={() => setIsSheetVisible(true)}
                         disabled={isLoading}
                         className="flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--dnd5e-color-olive)] hover:bg-red-900 border border-amber-800 text-white transition-all duration-200 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed group"
                         aria-label="View Character Sheet"
                       >
                          <CharacterIcon className="w-5 h-5 text-amber-300 group-hover:text-white transition-colors" />
                          <span className="text-sm font-roboto-slab font-bold">Sheet</span>
                       </button>
                     </div>
                  </div>
                  <div className="flex justify-center mb-3">
                    <RollTypeSelector 
                        currentRollType={rollType}
                        onRollTypeChange={handleRollTypeChange}
                        disabled={isLoading}
                    />
                  </div>
                  <DiceRoller onRoll={handleDiceRoll} disabled={isLoading} />
                  <PlayerInput onSend={handlePlayerAction} disabled={isLoading} />
                  {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
                </div>
            </div>
          </>
        )}
      </main>
      
      {!gameStarted && (
        <footer className="w-full max-w-4xl text-center mt-6 text-sm text-slate-500 font-signika">
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
      
    </div>
  );
};

export default App;