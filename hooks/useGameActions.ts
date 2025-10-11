import { useCallback, useRef } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { startAdventure, continueAdventure, restartAdventureWithNewModel, generateAdventureDetails, generateEntityImage } from '../services/geminiService';
import { CharacterSheet, Dice, DmModel, GameMessage, PersonalNote, Quest, AdventureDifficulty, RollType, ThematicTone, AdventureDetails, SaveData, MapEntity } from '../types';
import { AdventureResult } from '../services/geminiService';

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
    const { chat, isLoading, characterSheet, personalNotes, dmModel, quests, pendingOocMessage, rollType, adventureDetails, gameLog } = state;
    const newlyGeneratedImages = useRef<Record<string, { name: string; imageBase64: string }>>({});


    const processAndDispatchResult = useCallback((
        result: AdventureResult,
        currentSheet: CharacterSheet,
        currentQuests: Quest[]
    ): { updatedSheet: CharacterSheet, updatedQuests: Quest[] } => {

        const { text: dmResponse, sheetUpdates, questUpdates, mapUpdate } = result;
        const messages: GameMessage[] = [];
        let newSheet: CharacterSheet | undefined = undefined;
        let newQuests: Quest[] | undefined = undefined;
        let updatedQuests: Quest[] | undefined = undefined;
        let finalSheet = currentSheet;
        let finalQuests = currentQuests;

        if (dmResponse) {
            messages.push({ sender: 'dm', text: dmResponse });
        }

        if (sheetUpdates && Object.keys(sheetUpdates).length > 0) {
            newSheet = applySheetUpdates(currentSheet, sheetUpdates);
            finalSheet = newSheet;
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
                finalQuests = [...finalQuests, newQuest];
                messages.push({ sender: 'system', text: `[SYSTEM] New quest added to journal: "${newQuest.title}".` });
            }
            if (questUpdates.update) {
                const { questTitleToUpdate, ...updates } = questUpdates.update;
                let questFound = false;
                const currentQuests = finalQuests.map(q => {
                    if (q.title.toLowerCase() === questTitleToUpdate.toLowerCase()) {
                        questFound = true;
                        return { ...q, ...updates };
                    }
                    return q;
                });
                if (questFound) {
                    updatedQuests = currentQuests;
                    finalQuests = currentQuests;
                    const updateStrings = Object.entries(updates).map(([key, value]) => `${key} changed to "${value}"`);
                    messages.push({ sender: 'system', text: `[SYSTEM] Quest "${questTitleToUpdate}" updated: ${updateStrings.join(', ')}.` });
                }
            }
        }
        dispatch({ type: 'ADD_RESPONSE_MESSAGES', payload: { messages, newSheet, newQuests, updatedQuests, newMap: mapUpdate || undefined } });
        return { updatedSheet: finalSheet, updatedQuests: finalQuests };
    }, [dispatch]);


    const handleStartGame = useCallback(async (
        sheetData: CharacterSheet,
        adventureDetailsPayload: AdventureDetails
    ) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        const characterSheetString = formatSheetForPrompt(sheetData);

        try {
            const { chat: newChat, initialResponse } = await startAdventure(characterSheetString, dmModel, adventureDetailsPayload);
            dispatch({ type: 'START_GAME_INIT', payload: { chat: newChat, sheet: sheetData, adventureDetails: adventureDetailsPayload } });
            processAndDispatchResult(initialResponse, sheetData, []);
        } catch (e) {
            const errorMsg = e instanceof Error ? `Error starting game: ${e.message}` : 'An unknown error occurred.';
            dispatch({ type: 'SET_ERROR', payload: errorMsg });
            console.error(e);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [dmModel, dispatch, processAndDispatchResult]);

    const handleGenerateAdventureDetails = useCallback(async (difficulty: AdventureDifficulty, sheet: CharacterSheet) => {
        const characterSheetString = formatSheetForPrompt(sheet);
        return await generateAdventureDetails(difficulty, characterSheetString);
    }, []);

    const handlePlayerAction = useCallback(async (action: string, attachment?: { data: string; mimeType: string; name: string }) => {
        if (!chat || isLoading || !characterSheet) return;

        const userMessageParts: any[] = [];
        let logText = action;
        let imageUrl: string | undefined;
        let attachmentName: string | undefined;

        // Combine pending OOC message, new images, and player action
        let combinedActionText = action || '';
        if (pendingOocMessage) {
            combinedActionText = `${pendingOocMessage}\n\n${combinedActionText}`;
        }

        // Handle newly generated images
        const newImageIds = Object.keys(newlyGeneratedImages.current);
        if (newImageIds.length > 0) {
            let oocPreamble = `OOC: New portraits were generated. For future \`updateMap\` calls, please use the attached images by including the provided base64 data in the \`imageBase64\` field for the corresponding entity.`;
            
            // FIX: Use Object.keys to iterate, as Object.entries had poor type inference in this context.
            const imageTextDescriptions = newImageIds.map(id => `- Entity "${newlyGeneratedImages.current[id].name}" (ID: ${id})`).join('\n');
            oocPreamble = `${oocPreamble}\n${imageTextDescriptions}`;
            
            newImageIds.forEach(id => {
                userMessageParts.push({
                    inlineData: { mimeType: 'image/png', data: newlyGeneratedImages.current[id].imageBase64 }
                });
            });

            combinedActionText = `${oocPreamble}\n\n---\n\n${combinedActionText}`;
            newlyGeneratedImages.current = {}; // Clear after processing
        }

        // Handle user-provided attachment
        if (attachment) {
            userMessageParts.unshift({ // Add to the front so text comes last
                inlineData: { mimeType: attachment.mimeType, data: attachment.data }
            });
            logText = `[Attached: ${attachment.name}] ${action || ''}`.trim();
            imageUrl = `data:${attachment.mimeType};base64,${attachment.data}`;
            attachmentName = attachment.name;
        }

        if (combinedActionText.trim()) {
            userMessageParts.push({ text: combinedActionText.trim() });
        }

        if (userMessageParts.length === 0) return;

        const newPlayerMessage: GameMessage = { sender: 'player', text: logText, imageUrl, attachmentName };
        dispatch({ type: 'ADD_PLAYER_MESSAGE', payload: newPlayerMessage });
        
        if (pendingOocMessage) {
            dispatch({ type: 'CLEAR_PENDING_OOC_MESSAGE' });
        }

        dispatch({ type: 'SET_LOADING', payload: true });
        
        const messagePayload = userMessageParts.length === 1 && 'text' in userMessageParts[0]
            ? userMessageParts[0].text
            : userMessageParts;

        let currentAction: string | any[] | null = messagePayload;
        let activeSheet = characterSheet;
        let activeQuests = quests;
        let loopCount = 0;
        const MAX_LOOPS = 5;

        try {
            while (currentAction && loopCount < MAX_LOOPS) {
                loopCount++;
                const result = await continueAdventure(chat, currentAction);
                currentAction = null;

                const { updatedSheet, updatedQuests } = processAndDispatchResult(result, activeSheet, activeQuests);
                activeSheet = updatedSheet;
                activeQuests = updatedQuests;

                if (result.diceRollRequest) {
                    const { reason, dice, count, modifier } = result.diceRollRequest;
                    const sides = parseInt(dice.slice(1));
                    let total = 0;
                    const rolls = [];
                    for (let i = 0; i < count; i++) {
                        const roll = Math.floor(Math.random() * sides) + 1;
                        rolls.push(roll);
                        total += roll;
                    }
                    total += modifier;

                    const modString = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';
                    const rollBreakdown = rolls.length > 1 || modifier !== 0 ? ` (${rolls.join(' + ')})${modString}` : '';
                    const systemMessageText = `[SYSTEM] DM rolls for ${reason} (${count}${dice}${modString}): **${total}**${rollBreakdown}`;
                    
                    dispatch({ type: 'ADD_RESPONSE_MESSAGES', payload: { messages: [{ sender: 'system', text: systemMessageText }] } });

                    currentAction = `OOC: The dice roll for "${reason}" resulted in a total of ${total}. Narrate the outcome.`;
                }
            }
             if (loopCount >= MAX_LOOPS) {
                console.warn("Max DM turn loops reached. Breaking to prevent infinite loop.");
             }
        } catch (e) {
            const errorMsg = e instanceof Error ? `Error getting DM response: ${e.message}` : 'An unknown error occurred.';
            dispatch({ type: 'SET_ERROR', payload: errorMsg });
            dispatch({ type: 'PLAYER_ACTION_ERROR' });
            console.error(e);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [chat, isLoading, characterSheet, quests, dispatch, processAndDispatchResult, pendingOocMessage]);

    const handleRollTypeChange = useCallback((newRollType: RollType) => {
        dispatch({ type: 'SET_ROLL_TYPE', payload: newRollType });
    }, [dispatch]);

    const handleDiceRoll = useCallback((dice: Dice, result: number) => {
        if (dice !== 'd20' || rollType === 'normal') {
            const action = `Player rolls a ${dice} and gets: ${result}.`;
            handlePlayerAction(action);
            return;
        }

        const roll1 = result;
        const roll2 = Math.floor(Math.random() * 20) + 1;
        let finalRoll: number;
        let actionPrefix = `Player rolls a d20`;

        if (rollType === 'advantage') {
            finalRoll = Math.max(roll1, roll2);
            actionPrefix += ' with Advantage';
        } else { // 'disadvantage'
            finalRoll = Math.min(roll1, roll2);
            actionPrefix += ' with Disadvantage';
        }
        
        const action = `${actionPrefix} and gets: ${finalRoll}. (Rolls: ${roll1}, ${roll2})`;

        dispatch({ type: 'SET_ROLL_TYPE', payload: 'normal' });
        handlePlayerAction(action);
    }, [handlePlayerAction, rollType, dispatch]);

    const handleStatRoll = useCallback(async (name: string, modifier: number) => {
        if (isLoading) return;

        const roll1 = Math.floor(Math.random() * 20) + 1;
        let action: string;

        if (rollType === 'normal') {
            const total = roll1 + modifier;
            const modifierString = modifier >= 0 ? `+${modifier}` : `${modifier}`;
            let resultText = `gets: ${total}`;
            if (roll1 === 20) resultText += ' (Critical Success!)';
            else if (roll1 === 1) resultText += ' (Critical Failure!)';
            action = `Player rolls for a ${name} check and ${resultText}. (Roll: ${roll1}, Modifier: ${modifierString})`;
        } else {
            const roll2 = Math.floor(Math.random() * 20) + 1;
            let finalRoll: number;
            let actionPrefix = `Player rolls for a ${name} check`;
            
            if (rollType === 'advantage') {
                finalRoll = Math.max(roll1, roll2);
                actionPrefix += ' with Advantage';
            } else { // disadvantage
                finalRoll = Math.min(roll1, roll2);
                actionPrefix += ' with Disadvantage';
            }

            const total = finalRoll + modifier;
            const modifierString = modifier >= 0 ? `+${modifier}` : `${modifier}`;
            let resultText = `gets: ${total}`;
            if (finalRoll === 20) resultText += ' (Critical Success!)';
            else if (finalRoll === 1) resultText += ' (Critical Failure!)';
            
            const rollDetails = `(Rolls: ${roll1}, ${roll2} -> chose ${finalRoll}, Modifier: ${modifierString})`;
            action = `${actionPrefix} and ${resultText}. ${rollDetails}`;
            
            dispatch({ type: 'SET_ROLL_TYPE', payload: 'normal' });
        }

        handlePlayerAction(action);
    }, [isLoading, handlePlayerAction, rollType, dispatch]);

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
            dispatch({ type: 'SET_PENDING_OOC_MESSAGE', payload: oocMessage });
            const systemMessage: GameMessage = { sender: 'system', text: `[SYSTEM] Character sheet saved. The DM will see the changes on your next turn.` };
            dispatch({ type: 'ADD_RESPONSE_MESSAGES', payload: { messages: [systemMessage] } });
        }
    }, [characterSheet, dispatch]);

    const handleNotesSave = useCallback((updatedNotes: PersonalNote[]) => {
        const originalNotesContent = personalNotes.map(n => n.content).filter(Boolean).join('\n');
        const updatedNotesContent = updatedNotes.map(n => n.content).filter(Boolean).join('\n');
        if (originalNotesContent !== updatedNotesContent) {
            const oocMessage = `OOC: [The player's personal notes have been updated. The journal now contains the following notes:\n---\n${updatedNotesContent || '(No notes written.)'}\n---]`;
            dispatch({ type: 'UPDATE_NOTES', payload: updatedNotes });
            dispatch({ type: 'SET_PENDING_OOC_MESSAGE', payload: oocMessage });
            const systemMessage: GameMessage = { sender: 'system', text: `[SYSTEM] Journal notes saved. The DM will see them on your next turn.` };
            dispatch({ type: 'ADD_RESPONSE_MESSAGES', payload: { messages: [systemMessage] } });
        }
    }, [personalNotes, dispatch]);

    const handleModelChange = useCallback(async (newModel: DmModel) => {
        if (newModel === dmModel || isLoading || !state.gameStarted || !chat || !characterSheet || !adventureDetails) return;

        const oldModel = dmModel;
        dispatch({ type: 'SET_MODEL', payload: newModel });
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        try {
            const history = await chat.getHistory();
            const characterSheetString = formatSheetForPrompt(characterSheet);
            const { chat: newChat } = await restartAdventureWithNewModel(characterSheetString, newModel, history, adventureDetails);
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
    }, [dmModel, isLoading, state.gameStarted, chat, characterSheet, dispatch, adventureDetails]);

    const handleSaveGame = useCallback(async () => {
        if (!characterSheet || !adventureDetails || !chat) {
            throw new Error("Cannot save game, essential data is missing.");
        }

        const history = await chat.getHistory();

        const saveData: SaveData = {
            version: "1.0.0",
            savedAt: new Date().toISOString(),
            characterSheet,
            quests,
            personalNotes,
            mapState: state.mapState,
            dmModel,
            chatHistory: history,
            gameLog: state.gameLog,
            adventureDetails,
            rollType,
        };

        const jsonString = JSON.stringify(saveData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const characterName = characterSheet.coreIdentity.characterName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'character';
        a.href = url;
        a.download = `dnd-ai-save-${characterName}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    }, [characterSheet, quests, personalNotes, state.mapState, dmModel, chat, state.gameLog, adventureDetails, rollType]);

    const handleLoadGame = useCallback(async (fileContent: string) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const saveData: SaveData = JSON.parse(fileContent);

            // Basic validation
            if (!saveData.version || !saveData.characterSheet || !saveData.chatHistory || !saveData.adventureDetails) {
                throw new Error("Invalid or corrupted save file.");
            }

            const characterSheetString = formatSheetForPrompt(saveData.characterSheet);
            const { chat: newChat } = await restartAdventureWithNewModel(
                characterSheetString,
                saveData.dmModel,
                saveData.chatHistory,
                saveData.adventureDetails
            );
            
            dispatch({ type: 'LOAD_GAME', payload: { ...saveData, chat: newChat }});

        } catch (e) {
            const errorMsg = e instanceof Error ? `Error loading game: ${e.message}` : 'An unknown error occurred while loading.';
            dispatch({ type: 'SET_ERROR', payload: errorMsg });
             dispatch({ type: 'SET_LOADING', payload: false });
            console.error(e);
        }
    }, [dispatch]);
    
    const handleGenerateEntityImage = useCallback(async (entity: MapEntity) => {
        if (!entity) throw new Error("Entity is required to generate an image.");

        const prompt = `A detailed, purely visual 64x64 pixel art portrait of a D&D fantasy character: a ${entity.name || entity.type}. The composition is a close-up portrait focusing on the character's face and shoulders, set against a simple, non-distracting background.`;
        const imageBase64 = await generateEntityImage(prompt);
        
        // Store for next player action
        newlyGeneratedImages.current[entity.id] = {
            name: entity.name || entity.type,
            imageBase64: imageBase64
        };

        // Update local state immediately for instant UI feedback
        dispatch({ type: 'UPDATE_ENTITY_IMAGE', payload: { entityId: entity.id, imageBase64 } });
        
        return imageBase64;

    }, [dispatch]);

    return {
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
    };
};
