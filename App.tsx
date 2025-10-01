import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameMessage, Dice, CharacterSheet } from './types';
import { startAdventure, continueAdventure, translateText } from './services/geminiService';
import GameLog from './components/GameLog';
import PlayerInput from './components/PlayerInput';
import DiceRoller from './components/DiceRoller';
import CharacterCreation from './components/CharacterCreation';
import { Chat } from '@google/genai';
import CharacterSheetModal from './components/CharacterSheetModal';
import CharacterIcon from './components/icons/CharacterIcon';
import TranslateIcon from './components/icons/TranslateIcon';
import TranslationModal from './components/TranslationModal';

function formatSheetForPrompt(sheet: CharacterSheet): string {
  let output = "Here is my character sheet:\n\n";

  const formatSection = (title: string, data: object | undefined | null) => {
    if (!data) return;
    output += `### ${title}\n`;
    for (const [key, value] of Object.entries(data)) {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase());
      if (value === null || value === undefined) continue;

      if (typeof value === 'object') {
        output += `**${formattedKey}:**\n`;
        for (const [subKey, subValue] of Object.entries(value)) {
          if (subValue === null || subValue === undefined) continue;
          const formattedSubKey = subKey.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase());
          if (typeof subValue === 'object') {
            let subItems = Object.entries(subValue)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ');
            output += `  - ${formattedSubKey}: {${subItems}}\n`;
          } else {
            output += `  - ${formattedSubKey}: ${subValue}\n`;
          }
        }
      } else {
        output += `**${formattedKey}:** ${value}\n`;
      }
    }
    output += "\n";
  };

  const formatSimpleSection = (title: string, data: string | undefined | null) => {
     if (!data || data.trim() === '') return;
     output += `### ${title}\n`;
     output += `${data}\n\n`;
  }
  
  // Page 1
  formatSection("Core Identity", sheet.coreIdentity);
  formatSection("Ability Scores", sheet.stats.abilities);
  output += `**Proficiency Bonus:** ${sheet.stats.proficiencyBonus}\n`;
  output += `**Passive Perception:** ${sheet.stats.passivePerception}\n\n`;

  const proficientSaves = Object.entries(sheet.stats.savingThrows).filter(([, val]) => val.proficient).map(([key]) => key).join(', ');
  output += `**Saving Throw Proficiencies:** ${proficientSaves || 'None'}\n`;
  const proficientSkills = Object.entries(sheet.stats.skills).filter(([, val]) => val.proficient).map(([key]) => key).join(', ');
  output += `**Skill Proficiencies:** ${proficientSkills || 'None'}\n\n`;

  formatSection("Combat Stats", {
    armorClass: sheet.combat.armorClass,
    shield: sheet.combat.shield,
    initiative: sheet.combat.initiative,
    speed: sheet.combat.speed,
    size: sheet.characterDetails.size,
    heroicInspiration: sheet.combat.heroicInspiration,
  });
  formatSection("Hit Points", sheet.combat.hitPoints);
  formatSection("Hit Dice", sheet.combat.hitDice);
  
  if (sheet.attacksSpellcasting.attacks && sheet.attacksSpellcasting.attacks.length > 0 && sheet.attacksSpellcasting.attacks[0].name) {
    output += "### Weapons & Damage Cantrips\n";
    sheet.attacksSpellcasting.attacks.forEach(a => {
      output += `- **Name:** ${a.name}, **Atk Bonus/DC:** ${a.bonus}, **Damage & Type:** ${a.damage}, **Notes:** ${a.notes}\n`;
    });
    output += "\n";
  }

  formatSimpleSection("Class Features", sheet.featuresTraits.classFeatures);
  formatSimpleSection("Species Traits", sheet.featuresTraits.speciesTraits);
  formatSimpleSection("Feats", sheet.featuresTraits.feats);
  
  const armorProf = Object.entries(sheet.equipment.proficiencies.armorTraining).filter(([, val]) => val).map(([key]) => key).join(', ');
  formatSection("Equipment Training & Proficiencies", {
    'Armor Training': armorProf || 'None',
    'Weapons': sheet.equipment.proficiencies.weapons,
    'Tools': sheet.equipment.proficiencies.tools,
  });

  // Page 2
  formatSection("Spellcasting", sheet.attacksSpellcasting.spellcasting);
  formatSimpleSection("Cantrips & Prepared Spells", sheet.attacksSpellcasting.spells);
  formatSimpleSection("Appearance", sheet.characterDetails.appearance);
  formatSimpleSection("Backstory & Personality", sheet.characterDetails.backstoryAndPersonality);
  formatSimpleSection("Languages", sheet.characterDetails.languages);
  formatSimpleSection("Equipment", sheet.equipment.list);
  formatSection("Money", sheet.equipment.money);

  return output;
}

const applySheetUpdates = (
  currentSheet: CharacterSheet,
  updates: Record<string, any>
): CharacterSheet => {
  const newSheet = JSON.parse(JSON.stringify(currentSheet)); // Deep clone

  for (const path in updates) {
    const keys = path.split('.');
    let current: any = newSheet;
    
    let pathIsValid = true;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] === undefined || typeof current[key] !== 'object' || current[key] === null) {
        console.error(`Invalid path in sheet update: ${path}. Key "${key}" not found or not an object.`);
        pathIsValid = false;
        break;
      }
      current = current[key];
    }
    
    if (!pathIsValid) continue; // Skip to next update

    const finalKey = keys[keys.length - 1];
    if (current && typeof current === 'object' && current !== null) {
        current[finalKey] = updates[path];
    } else {
       console.error(`Invalid path in sheet update: ${path}. Final segment cannot be set.`);
    }
  }

  return newSheet as CharacterSheet;
};

// Helper to find differences between two character sheets
const findChanges = (original: any, updated: any, path: string = ''): Record<string, { from: any, to: any }> => {
  if (!original || !updated) return {};
  const changes: Record<string, { from: any, to: any }> = {};

  const allKeys = new Set([...Object.keys(original), ...Object.keys(updated)]);

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const originalValue = original[key];
    const updatedValue = updated[key];

    if (
      typeof originalValue === 'object' && originalValue !== null && !Array.isArray(originalValue) &&
      typeof updatedValue === 'object' && updatedValue !== null && !Array.isArray(updatedValue)
    ) {
      Object.assign(changes, findChanges(originalValue, updatedValue, currentPath));
    } else if (JSON.stringify(originalValue) !== JSON.stringify(updatedValue)) {
      if (updatedValue !== undefined) { // Only report additions/changes, not deletions
        changes[currentPath] = { from: originalValue, to: updatedValue };
      }
    }
  }
  return changes;
};


const App: React.FC = () => {
  const [gameLog, setGameLog] = useState<GameMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [characterSheet, setCharacterSheet] = useState<CharacterSheet | null>(null);
  const [isSheetVisible, setIsSheetVisible] = useState<boolean>(false);
  
  const [translationData, setTranslationData] = useState<{ original: string; translated: string | null; error: string | null } | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>('');

  const chatRef = useRef<Chat | null>(null);

  const handleStartGame = useCallback(async (sheetData: CharacterSheet) => {
    setCharacterSheet(sheetData);
    const characterSheetString = formatSheetForPrompt(sheetData);
    
    setIsLoading(true);
    setError(null);
    try {
      const { chat, openingMessage } = await startAdventure(characterSheetString);
      chatRef.current = chat;
      setGameLog([{ sender: 'dm', text: openingMessage }]);
      setGameStarted(true);
    } catch (e) {
      setError(e instanceof Error ? `Error starting game: ${e.message}` : 'An unknown error occurred.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePlayerAction = useCallback(async (action: string) => {
    if (!chatRef.current || isLoading || !characterSheet) return;

    const newPlayerMessage: GameMessage = { sender: 'player', text: action };
    setGameLog(prevLog => [...prevLog, newPlayerMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const { text: dmResponse, sheetUpdates } = await continueAdventure(chatRef.current, action);
      
      const newDmMessage: GameMessage = { sender: 'dm', text: dmResponse };
      const messagesToAdd: GameMessage[] = [newDmMessage];

      if (sheetUpdates && Object.keys(sheetUpdates).length > 0) {
        const newSheet = applySheetUpdates(characterSheet, sheetUpdates);
        setCharacterSheet(newSheet);
        
        const updateDetails = Object.entries(sheetUpdates).map(([path, value]) => {
          // 'combat.hitPoints.current' -> 'Combat > Hit Points > Current'
          const formattedPath = path.split('.')
            .map(p => (p.charAt(0).toUpperCase() + p.slice(1)).replace(/([A-Z])/g, ' $1').trim())
            .join(' > ');
      
          const stringValue = String(value); // Ensure it's a string
          const formattedValue = stringValue.length > 75 
            ? `"${stringValue.substring(0, 75)}..."` 
            : `"${stringValue}"`;
          
          return `Updated section '${formattedPath}' to ${formattedValue}`;
        }).join('. ');
      
        const systemMessage: GameMessage = { 
          sender: 'system', 
          text: `[SYSTEM] ${updateDetails}.` 
        };
        messagesToAdd.push(systemMessage);
      }
      
      setGameLog(prevLog => [...prevLog, ...messagesToAdd]);

    } catch (e) {
      setError(e instanceof Error ? `Error getting DM response: ${e.message}` : 'An unknown error occurred.');
      console.error(e);
      setGameLog(prevLog => prevLog.slice(0, -1)); // Remove player message on error
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, characterSheet]);

  const handleDiceRoll = (dice: Dice, result: number) => {
    const action = `Player rolls a ${dice} and gets: ${result}.`;
    handlePlayerAction(action);
  };
  
  const handleStatRoll = useCallback(async (name: string, modifier: number) => {
    if (isLoading) return;

    setIsSheetVisible(false); // Close sheet immediately for better UX

    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + modifier;
    const modifierString = modifier >= 0 ? `+${modifier}` : `${modifier}`;
    
    let resultText = `gets: ${total}`;
    if (roll === 20) {
        resultText += ' (Critical Success!)';
    } else if (roll === 1) {
        resultText += ' (Critical Failure!)';
    }

    const action = `Player rolls for a ${name} check and ${resultText}. (Roll: ${roll}, Modifier: ${modifierString})`;

    // Wait for modal to close before sending action
    setTimeout(() => {
        handlePlayerAction(action);
    }, 100);

  }, [isLoading, handlePlayerAction]);

  const handleTextSelection = useCallback((text: string) => {
    setSelectedText(text);
  }, []);

  const handleTranslateClick = async () => {
    if (!selectedText) return;

    const textToTranslate = selectedText;
    
    setIsTranslating(true);
    setTranslationData({ original: textToTranslate, translated: null, error: null });

    try {
        const result = await translateText(textToTranslate);
        setTranslationData({ original: textToTranslate, translated: result, error: null });
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during translation.';
        setTranslationData({ original: textToTranslate, translated: null, error: errorMessage });
    } finally {
        setIsTranslating(false);
    }
  };
  
  const handleCloseTranslation = () => {
    setTranslationData(null);
  };

  const handleSheetSave = useCallback((updatedSheet: CharacterSheet) => {
    if (!characterSheet) return;

    const changes = findChanges(characterSheet, updatedSheet);
    
    if (Object.keys(changes).length > 0) {
      const formattedChanges = Object.entries(changes)
        .map(([path, values]) => {
          const formattedPath = path.split('.')
            .map(p => (p.charAt(0).toUpperCase() + p.slice(1)).replace(/([A-Z])/g, ' $1').trim())
            .join(' > ');
          
          const formatValue = (val: any) => {
            if (val === null || val === undefined) return '""';
            if (typeof val === 'object') return `"${JSON.stringify(val).substring(0,50)}..."`;
            const strVal = String(val);
            return strVal.length > 50 ? `"${strVal.substring(0, 50)}..."` : `"${strVal}"`;
          };

          return `- Section '${formattedPath}' was changed to ${formatValue(values.to)}.`;
        })
        .join('\n');

      const oocMessage = `OOC: The player has updated their character sheet with the following changes:\n${formattedChanges}`;
      
      // Update sheet first so the UI is in sync, then send the message.
      setCharacterSheet(updatedSheet);
      // Use a timeout to ensure the state update has rendered before sending action
      setTimeout(() => handlePlayerAction(oocMessage), 0);
    }
    
    setIsSheetVisible(false);
  }, [characterSheet, handlePlayerAction]);


  return (
    <div className="h-screen bg-slate-900 text-slate-200 flex flex-col items-center p-4 selection:bg-amber-500 selection:text-slate-900" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/dark-denim.png)' }}>
      <header className="w-full max-w-4xl text-center mb-6">
        <h1 className="text-5xl md:text-6xl font-modesto text-amber-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">
          D&D AI Dungeon Master
        </h1>
        <p className="text-slate-400 mt-2 italic font-signika">Your adventure awaits...</p>
      </header>
      
      <main className="w-full max-w-5xl flex-grow bg-black/30 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        {!gameStarted ? (
           <CharacterCreation onStartGame={handleStartGame} isStarting={isLoading} />
        ) : (
          <>
            <div className="flex-grow overflow-y-auto">
                <GameLog log={gameLog} isLoading={isLoading} onTextSelect={handleTextSelection} />
            </div>
            <div className="flex-shrink-0 p-4 border-t border-slate-600 bg-slate-800">
               <div className="flex justify-between items-center mb-2">
                 <p className="text-sm text-slate-400 font-modesto tracking-wider">Player Actions</p>
                 <div className="flex items-center gap-2">
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
              <DiceRoller onRoll={handleDiceRoll} disabled={isLoading} />
              <PlayerInput onSend={handlePlayerAction} disabled={isLoading} />
              {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
            </div>
          </>
        )}
      </main>

      <footer className="w-full max-w-4xl text-center mt-6 text-sm text-slate-500 font-signika">
        <p>Powered by Google Gemini. This is a fictional game. Have fun!</p>
      </footer>

      {isSheetVisible && characterSheet && (
        <CharacterSheetModal 
          sheet={characterSheet} 
          onClose={() => setIsSheetVisible(false)}
          onStatRoll={handleStatRoll}
          onSave={handleSheetSave}
        />
      )}
      
      {translationData && (
        <TranslationModal
          originalText={translationData.original}
          translatedText={translationData.translated}
          isLoading={isTranslating}
          error={translationData.error}
          onClose={handleCloseTranslation}
        />
      )}
    </div>
  );
};

export default App;