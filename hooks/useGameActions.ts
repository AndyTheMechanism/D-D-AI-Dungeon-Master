import { useCallback } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { startAdventure, continueAdventure, restartAdventureWithNewModel, generateAdventureDetails } from '../services/geminiService';
import { CharacterSheet, Dice, DmModel, GameMessage, PersonalNote, Quest, AdventureDifficulty, MapState } from '../types';

// Helper functions (previously in App.tsx)
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
                        let subItems = Object.entries(subValue).map(([k, v]) => `${k}: ${v}`).join(', ');
                        output += `  - ${formattedSubKey}: {${subItems}}\n`;
                    } else { output += `  - ${formattedSubKey}: ${subValue}\n`; }
                }
            } else { output += `**${formattedKey}:** ${value}\n`; }
        }
        output += "\n";
    };
    const formatSimpleSection = (title: string, data: string | undefined | null) => {
        if (!data || data.trim() === '') return;
        output += `### ${title}\n`;
        output += `${data}\n\n`;
    }
    formatSection("Core Identity", sheet.coreIdentity);
    formatSection("Ability Scores", sheet.stats.abilities);
    output += `**Proficiency Bonus:** ${sheet.stats.proficiencyBonus}\n`;
    output += `**Passive Perception:** ${sheet.stats.passivePerception}\n\n`;
    const proficientSaves = Object.entries(sheet.stats.savingThrows).filter(([, val]) => val.proficient).map(([key]) => key).join(', ');
    output += `**Saving Throw Proficiencies:** ${proficientSaves || 'None'}\n`;
    const proficientSkills = Object.entries(sheet.stats.skills).filter(([, val]) => val.proficient).map(([key]) => key).join(', ');
    output += `**Skill Proficiencies:** ${proficientSkills || 'None'}\n\n`;
    formatSection("Combat Stats", { armorClass: sheet.combat.armorClass, shield: sheet.combat.shield, initiative: sheet.combat.initiative, speed: sheet.combat.speed, size: sheet.characterDetails.size, heroicInspiration: sheet.combat.heroicInspiration });
    formatSection("Hit Points", sheet.combat.hitPoints);
    formatSection("Hit Dice", sheet.combat.hitDice);
    if (sheet.attacksSpellcasting.attacks && sheet.attacksSpellcasting.attacks.length > 0 && sheet.attacksSpellcasting.attacks[0].name) {
        output += "### Weapons & Damage Cantrips\n";
        sheet.attacksSpellcasting.attacks.forEach(a => { output += `- **Name:** ${a.name}, **Atk Bonus/DC:** ${a.bonus}, **Damage & Type:** ${a.damage}, **Notes:** ${a.notes}\n`; });
        output += "\n";
    }
    formatSimpleSection("Class Features", sheet.featuresTraits.classFeatures);
    formatSimpleSection("Species Traits", sheet.featuresTraits.speciesTraits);
    formatSimpleSection("Feats", sheet.featuresTraits.feats);
    const armorProf = Object.entries(sheet.equipment.proficiencies.armorTraining).filter(([, val]) => val).map(([key]) => key).join(', ');
    formatSection("Equipment Training & Proficiencies", { 'Armor Training': armorProf || 'None', 'Weapons': sheet.equipment.proficiencies.weapons, 'Tools': sheet.equipment.proficiencies.tools });
    formatSection("Spellcasting", sheet.attacksSpellcasting.spellcasting);
    formatSimpleSection("Cantrips & Prepared Spells", sheet.attacksSpellcasting.spells);
    formatSimpleSection("Appearance", sheet.characterDetails.appearance);
    formatSimpleSection("Backstory & Personality", sheet.characterDetails.backstoryAndPersonality);
    formatSimpleSection("Languages", sheet.characterDetails.languages);
    formatSimpleSection("Equipment", sheet.equipment.list);
    formatSection("Money", sheet.equipment.money);
    return output;
}

const applySheetUpdates = (currentSheet: CharacterSheet, updates: Record<string, any>): CharacterSheet => {
    const newSheet = JSON.parse(JSON.stringify(currentSheet));
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
        if (!pathIsValid) continue;
        const finalKey = keys[keys.length - 1];
        if (current && typeof current === 'object' && current !== null) {
            current[finalKey] = updates[path];
        } else {
            console.error(`Invalid path in sheet update: ${path}. Final segment cannot be set.`);
        }
    }
    return newSheet as CharacterSheet;
};

const findChanges = (original: any, updated: any, path: string = ''): Record<string, { from: any, to: any }> => {
    if (!original || !updated) return {};
    const changes: Record<string, { from: any, to: any }> = {};
    const allKeys = new Set([...Object.keys(original), ...Object.keys(updated)]);
    for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;
        const originalValue = original[key];
        const updatedValue = updated[key];
        if (typeof originalValue === 'object' && originalValue !== null && !Array.isArray(originalValue) && typeof updatedValue === 'object' && updatedValue !== null && !Array.isArray(updatedValue)) {
            Object.assign(changes, findChanges(originalValue, updatedValue, currentPath));
        } else if (JSON.stringify(originalValue) !== JSON.stringify(updatedValue)) {
            if (updatedValue !== undefined) {
                changes[currentPath] = { from: originalValue, to: updatedValue };
            }
        }
    }
    return changes;
};

export const useGameActions = () => {
    const state = useGameState();
    const dispatch = useGameDispatch();
    const { chat, isLoading, characterSheet, personalNotes, dmModel } = state;

    const processAdventureResult = useCallback((result: { text: string; sheetUpdates: any; questUpdates: any; mapUpdate: MapState | null; }) => {
        const { text: dmResponse, sheetUpdates, questUpdates, mapUpdate } = result;
        const messages: GameMessage[] = [{ sender: 'dm', text: dmResponse }];
        let newSheet: CharacterSheet | undefined = undefined;
        let newQuests: Quest[] | undefined = undefined;
        let updatedQuests: Quest[] | undefined = undefined;

        if (sheetUpdates && Object.keys(sheetUpdates).length > 0 && characterSheet) {
            newSheet = applySheetUpdates(characterSheet, sheetUpdates);
            const updateDetails = Object.entries(sheetUpdates).map(([path, value]) => {
                const formattedPath = path.split('.').map(p => (p.charAt(0).toUpperCase() + p.slice(1)).replace(/([A-Z])/g, ' $1').trim()).join(' > ');
                const stringValue = String(value);
                const formattedValue = stringValue.length > 75 ? `"${stringValue.substring(0, 75)}..."` : `"${stringValue}"`;
                return `Updated section '${formattedPath}' to ${formattedValue}`;
            }).join('. ');
            messages.push({ sender: 'system', text: `[SYSTEM] Character sheet updated: ${updateDetails}.` });
        }

        if (questUpdates) {
            if (questUpdates.add) {
                const newQuest: Quest = { id: Date.now().toString(), ...questUpdates.add, status: 'active' };
                newQuests = [newQuest];
                messages.push({ sender: 'system', text: `[SYSTEM] New quest added to journal: "${newQuest.title}".` });
            }
            if (questUpdates.update) {
                const { questTitleToUpdate, ...updates } = questUpdates.update;
                let questFound = false;
                const currentQuests = state.quests.map(q => {
                    if (q.title.toLowerCase() === questTitleToUpdate.toLowerCase()) {
                        questFound = true;
                        return { ...q, ...updates };
                    }
                    return q;
                });
                if (questFound) {
                    updatedQuests = currentQuests;
                    const updateStrings = Object.entries(updates).map(([key, value]) => `${key} changed to "${value}"`);
                    messages.push({ sender: 'system', text: `[SYSTEM] Quest "${questTitleToUpdate}" updated: ${updateStrings.join(', ')}.` });
                }
            }
        }
        dispatch({ type: 'ADD_RESPONSE_MESSAGES', payload: { messages, newSheet, newQuests, updatedQuests, newMap: mapUpdate || undefined } });
    }, [dispatch, characterSheet, state.quests]);


    const handleStartGame = useCallback(async (
        sheetData: CharacterSheet,
        adventureDetails: { difficulty: AdventureDifficulty, worldName: string, additionalInfo: string }
    ) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        const characterSheetString = formatSheetForPrompt(sheetData);

        try {
            const { chat: newChat, initialResponse } = await startAdventure(characterSheetString, dmModel, adventureDetails);
            dispatch({ type: 'START_GAME_INIT', payload: { chat: newChat, sheet: sheetData } });
            processAdventureResult(initialResponse);
        } catch (e) {
            const errorMsg = e instanceof Error ? `Error starting game: ${e.message}` : 'An unknown error occurred.';
            dispatch({ type: 'SET_ERROR', payload: errorMsg });
            console.error(e);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [dmModel, dispatch, processAdventureResult]);

    const handleGenerateAdventureDetails = useCallback(async (difficulty: AdventureDifficulty, sheet: CharacterSheet) => {
        const characterSheetString = formatSheetForPrompt(sheet);
        return await generateAdventureDetails(difficulty, characterSheetString);
    }, []);

    const handlePlayerAction = useCallback(async (action: string) => {
        if (!chat || isLoading || !characterSheet) return;

        const newPlayerMessage: GameMessage = { sender: 'player', text: action };
        dispatch({ type: 'ADD_PLAYER_MESSAGE', payload: newPlayerMessage });
        dispatch({ type: 'SET_LOADING', payload: true });

        try {
            const result = await continueAdventure(chat, action);
            processAdventureResult(result);
        } catch (e) {
            const errorMsg = e instanceof Error ? `Error getting DM response: ${e.message}` : 'An unknown error occurred.';
            dispatch({ type: 'SET_ERROR', payload: errorMsg });
            dispatch({ type: 'PLAYER_ACTION_ERROR' });
            console.error(e);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [chat, isLoading, characterSheet, state.quests, dispatch, processAdventureResult]);

    const handleDiceRoll = useCallback((dice: Dice, result: number) => {
        const action = `Player rolls a ${dice} and gets: ${result}.`;
        handlePlayerAction(action);
    }, [handlePlayerAction]);

    const handleStatRoll = useCallback(async (name: string, modifier: number) => {
        if (isLoading) return;
        const roll = Math.floor(Math.random() * 20) + 1;
        const total = roll + modifier;
        const modifierString = modifier >= 0 ? `+${modifier}` : `${modifier}`;
        let resultText = `gets: ${total}`;
        if (roll === 20) resultText += ' (Critical Success!)';
        else if (roll === 1) resultText += ' (Critical Failure!)';
        const action = `Player rolls for a ${name} check and ${resultText}. (Roll: ${roll}, Modifier: ${modifierString})`;
        handlePlayerAction(action);
    }, [isLoading, handlePlayerAction]);

    const handleSheetSave = useCallback((updatedSheet: CharacterSheet) => {
        if (!characterSheet) return;
        const changes = findChanges(characterSheet, updatedSheet);
        if (Object.keys(changes).length > 0) {
            const formattedChanges = Object.entries(changes).map(([path, values]) => {
                const formattedPath = path.split('.').map(p => (p.charAt(0).toUpperCase() + p.slice(1)).replace(/([A-Z])/g, ' $1').trim()).join(' > ');
                const formatValue = (val: any) => {
                    if (val === null || val === undefined) return '""';
                    if (typeof val === 'object') return `"${JSON.stringify(val).substring(0, 50)}..."`;
                    const strVal = String(val);
                    return strVal.length > 50 ? `"${strVal.substring(0, 50)}..."` : `"${strVal}"`;
                };
                return `- Section '${formattedPath}' was changed to ${formatValue(values.to)}.`;
            }).join('\n');
            const oocMessage = `OOC: The player has updated their character sheet with the following changes:\n${formattedChanges}`;
            dispatch({ type: 'UPDATE_SHEET', payload: updatedSheet });
            setTimeout(() => handlePlayerAction(oocMessage), 0);
        }
    }, [characterSheet, dispatch, handlePlayerAction]);

    const handleNotesSave = useCallback((updatedNotes: PersonalNote[]) => {
        const originalNotesContent = personalNotes.map(n => n.content).join('\n');
        const updatedNotesContent = updatedNotes.map(n => n.content).join('\n');
        if (originalNotesContent !== updatedNotesContent) {
            const oocMessage = `OOC: The player has updated their personal notes in their journal.`;
            dispatch({ type: 'UPDATE_NOTES', payload: updatedNotes });
            setTimeout(() => handlePlayerAction(oocMessage), 0);
        }
    }, [personalNotes, dispatch, handlePlayerAction]);

    const handleModelChange = useCallback(async (newModel: DmModel) => {
        if (newModel === dmModel || isLoading || !state.gameStarted || !chat || !characterSheet) return;

        const oldModel = dmModel;
        dispatch({ type: 'SET_MODEL', payload: newModel });
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        try {
            const history = await chat.getHistory();
            const characterSheetString = formatSheetForPrompt(characterSheet);
            const { chat: newChat } = await restartAdventureWithNewModel(characterSheetString, newModel, history);
            dispatch({ type: 'SET_CHAT', payload: newChat });
            const systemMessage: GameMessage = { sender: 'system', text: `[SYSTEM] Dungeon Master model has been switched to ${newModel}.` };
            dispatch({ type: 'ADD_RESPONSE_MESSAGES', payload: { messages: [systemMessage] } });
        } catch (e) {
            const errorMsg = e instanceof Error ? `Error switching model: ${e.message}` : 'An unknown error occurred.';
            dispatch({ type: 'SET_ERROR', payload: errorMsg });
            dispatch({ type: 'SET_MODEL', payload: oldModel });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [dmModel, isLoading, state.gameStarted, chat, characterSheet, dispatch]);

    return {
        handleStartGame,
        handleGenerateAdventureDetails,
        handlePlayerAction,
        handleDiceRoll,
        handleStatRoll,
        handleSheetSave,
        handleNotesSave,
        handleModelChange
    };
};
