import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import type { CharacterSheet } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const updateCharacterSheetFunctionDeclaration: FunctionDeclaration = {
  name: 'updateCharacterSheet',
  description: "Updates one or more fields on the player's character sheet. Use this to reflect changes in the game state, such as taking damage, gaining experience or items, or changing stats.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      updates: {
        type: Type.ARRAY,
        description: "A list of updates to apply to the character sheet.",
        items: {
          type: Type.OBJECT,
          properties: {
            path: {
              type: Type.STRING,
              description: "The full, dot-notation path to the field to update. Valid top-level properties are: 'coreIdentity', 'stats', 'combat', 'attacksSpellcasting', 'featuresTraits', 'equipment', 'characterDetails'. For fields that are simple strings (like lists of items or languages), update the entire string. For example, to update inventory, use the path 'equipment.list'. To update languages, use 'characterDetails.languages'. For nested values like money, use paths like 'equipment.money.gp'. Example paths: 'combat.hitPoints.current', 'equipment.list', 'characterDetails.appearance', 'characterDetails.languages'."
            },
            value: {
              type: Type.STRING,
              description: "The new value for the field. For list-like string fields such as 'equipment.list' or 'characterDetails.languages', you must provide the complete new string with the item added or removed."
            }
          },
          required: ['path', 'value']
        }
      }
    },
    required: ['updates']
  }
};


const getInitialPrompt = (characterSheetContent: string): string => `
You are the Dungeon Master (DM) for a text-based role-playing game based on Dungeons & Dragons 5th Edition rules. Your name is 'Gemini'.
Your goal is to create a rich, engaging, and challenging fantasy adventure.
You will describe the world, the non-player characters (NPCs), and the situations the player finds themselves in.
You must react to the player's actions, describe the consequences, and call for dice rolls when an outcome is uncertain (e.g., for attacks, skill checks, or saving throws).
When you call for a roll, be specific about what kind of die to roll (e.g., "Roll a d20 for an attack" or "Make a Dexterity saving throw with a d20").
The player will tell you the result of their roll, and you must then narrate the outcome based on that result and their character's abilities.
Keep your responses concise but descriptive. Use markdown for emphasis where appropriate (e.g., *italic* for thoughts, **bold** for important names or items).

The player's character sheet is provided below. Use this information to tailor the adventure and determine the success or failure of their actions.
---
CHARACTER SHEET:
${characterSheetContent}
---

---
GAME MECHANICS:
- You have a tool named 'updateCharacterSheet' that you can call to modify the player's character sheet directly.
- When a player's health changes, they gain or lose items or money, or their stats are affected by game events, you MUST call this function with the updated values.
- IMPORTANT: For text fields that contain lists (like inventory, languages, features), you must update the *entire field* with a new string.
  - To add/remove items, update the 'equipment.list' field. Example: if 'equipment.list' is "a rope" and the player finds a potion, you must call the tool with path 'equipment.list' and value "a rope, a healing potion".
  - To add/remove languages, update the 'characterDetails.languages' field. Example: if 'characterDetails.languages' is "Common" and the player learns Elvish, call the tool with path 'characterDetails.languages' and value "Common, Elvish".
  - You MUST read the character sheet and chat history to know the current value of the field before modifying it to include both old and new information.
- When you call the tool, provide an 'updates' array. Each object in the array has a 'path' (e.g., 'combat.hitPoints.current' or 'equipment.list') and a 'value' (the new value as a string).
- After calling the tool, also describe the changes in your narrative response to the player. For example, if a player takes 5 damage and had 20 HP, call updateCharacterSheet with an update of { path: 'combat.hitPoints.current', value: '15' } and also say something like "The goblin's blade slashes across your arm, dealing 5 damage."
---

Now, begin the adventure. Describe the opening scene and the first introductory situation. What happens next?
`;

// FIX: Correctly format all field paths in the prompt as markdown code to prevent TypeScript from misinterpreting them as variables.
const getParsePrompt = (characterSheetContent: string): string => `
You are an expert assistant for Dungeons & Dragons 5th Edition. Your task is to parse the provided text of a character sheet or monster/NPC stat block and convert it into a structured JSON object that conforms to the provided schema.

**CRITICAL INSTRUCTIONS:**
1.  **Strict JSON Output:** You MUST only output the raw JSON object. Do not include any markdown, explanations, or introductory text.
2.  **Schema Compliance:** The generated JSON must strictly adhere to the provided schema structure.
3.  **Infer Proficiency:** For saving throws and skills, compare the listed modifier (e.g., "History +12") with the character's base ability modifier (e.g., INT is +5). If the skill/save modifier is higher, you MUST set the 'proficient' flag to 'true' for that skill/save.
4.  **Combine Fields:** Multiple sections from the text may need to be combined into a single text field in the JSON. Concatenate them, separated by newlines.

**Field Mapping Guide:**

*   **\`coreIdentity.characterName\`**: The main name (e.g., "Azalin Rex").
*   **\`coreIdentity.class\`**: The class or creature type (e.g., "Wizard").
*   **\`combat.armorClass\`**: The "Armor Class" value.
*   **\`combat.hitPoints.max\`**: The "Hit Points" value. Also set **\`combat.hitPoints.current\`** to this same value.
*   **\`combat.speed\`**: The "Speed" value.
*   **\`stats.abilities\`**: Extract the primary score for each ability (e.g., for "11 (+0)", extract "11").
*   **\`featuresTraits.classFeatures\`**: Combine the content from these sections: "Traits", "Legendary Resistance", "Spirit Jar", "Reactions", "Legendary Actions".
*   **\`featuresTraits.speciesTraits\`**: Combine the content from these sections: "Damage Resistances", "Damage Immunities", "Condition Immunities", "Senses".
*   **\`characterDetails.languages\`**: The "Languages" value.
*   **\`attacksSpellcasting.attacks\`**: Parse each distinct action from the "Actions" section (e.g., "Multiattack", "Eldritch Burst", "Paralyzing Touch"). Create an object for each in the array with 'name', 'bonus', 'damage', and 'notes'.
*   **\`attacksSpellcasting.spells\`**: Combine the entire "Spellcasting" section, including at-will spells and per-day spells, into this single text field.
*   **Default Values**: If information for a field is not present, use a sensible default (e.g., "0", "", false).

---
CHARACTER INFORMATION TO PARSE:
${characterSheetContent}
---
`;

const baseStringProperty = { type: Type.STRING };
const baseBooleanProperty = { type: Type.BOOLEAN };
const baseNumberProperty = { type: Type.NUMBER };

const characterSheetSchema = {
    type: Type.OBJECT,
    properties: {
        coreIdentity: { type: Type.OBJECT, properties: {
            characterName: baseStringProperty, background: baseStringProperty, class: baseStringProperty,
            level: baseStringProperty, xp: baseStringProperty, species: baseStringProperty,
            subclass: baseStringProperty, alignment: baseStringProperty, playerName: baseStringProperty,
        }},
        stats: { type: Type.OBJECT, properties: {
            abilities: { type: Type.OBJECT, properties: {
                strength: baseStringProperty, dexterity: baseStringProperty, constitution: baseStringProperty,
                intelligence: baseStringProperty, wisdom: baseStringProperty, charisma: baseStringProperty,
            }},
            proficiencyBonus: baseStringProperty,
            savingThrows: { type: Type.OBJECT, properties: {
                strength: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty}}, dexterity: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty}},
                constitution: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty}}, intelligence: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty}},
                wisdom: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty}}, charisma: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty}},
            }},
            skills: { type: Type.OBJECT, properties: {
                acrobatics: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }}, animalHandling: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }},
                arcana: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }}, athletics: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }},
                deception: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }}, history: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }},
                insight: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }}, intimidation: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }},
                investigation: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }}, medicine: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }},
                nature: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }},
                perception: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }},
                performance: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }}, persuasion: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }},
                religion: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }}, sleightOfHand: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }},
                stealth: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }}, survival: {type: Type.OBJECT, properties: { proficient: baseBooleanProperty }},
            }},
            passivePerception: baseStringProperty,
        }},
        combat: { type: Type.OBJECT, properties: {
            armorClass: baseStringProperty, shield: baseStringProperty, initiative: baseStringProperty, speed: baseStringProperty,
            hitPoints: { type: Type.OBJECT, properties: { max: baseStringProperty, current: baseStringProperty, temporary: baseStringProperty }},
            hitDice: { type: Type.OBJECT, properties: { max: baseStringProperty, spent: baseStringProperty }},
            deathSaves: { type: Type.OBJECT, properties: { successes: baseNumberProperty, failures: baseNumberProperty }},
            heroicInspiration: baseStringProperty,
        }},
        attacksSpellcasting: { type: Type.OBJECT, properties: {
            attacks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: baseStringProperty, bonus: baseStringProperty, damage: baseStringProperty, notes: baseStringProperty }}},
            spellcasting: { type: Type.OBJECT, properties: { ability: baseStringProperty, modifier: baseStringProperty, saveDC: baseStringProperty, attackBonus: baseStringProperty }},
            spellSlots: { type: Type.OBJECT, properties: {
                '1': {type: Type.OBJECT, properties: { total: baseStringProperty, expended: baseStringProperty}},'2': {type: Type.OBJECT, properties: { total: baseStringProperty, expended: baseStringProperty}},'3': {type: Type.OBJECT, properties: { total: baseStringProperty, expended: baseStringProperty}},
                '4': {type: Type.OBJECT, properties: { total: baseStringProperty, expended: baseStringProperty}},'5': {type: Type.OBJECT, properties: { total: baseStringProperty, expended: baseStringProperty}},'6': {type: Type.OBJECT, properties: { total: baseStringProperty, expended: baseStringProperty}},
                '7': {type: Type.OBJECT, properties: { total: baseStringProperty, expended: baseStringProperty}},'8': {type: Type.OBJECT, properties: { total: baseStringProperty, expended: baseStringProperty}},'9': {type: Type.OBJECT, properties: { total: baseStringProperty, expended: baseStringProperty}}
            }},
            spells: baseStringProperty,
        }},
        featuresTraits: { type: Type.OBJECT, properties: {
            classFeatures: baseStringProperty, speciesTraits: baseStringProperty, feats: baseStringProperty,
        }},
        equipment: { type: Type.OBJECT, properties: {
            list: baseStringProperty,
            money: { type: Type.OBJECT, properties: { cp: baseStringProperty, sp: baseStringProperty, ep: baseStringProperty, gp: baseStringProperty, pp: baseStringProperty }},
            proficiencies: { type: Type.OBJECT, properties: {
                armorTraining: { type: Type.OBJECT, properties: { light: baseBooleanProperty, medium: baseBooleanProperty, heavy: baseBooleanProperty, shields: baseBooleanProperty }},
                weapons: baseStringProperty,
                tools: baseStringProperty,
            }},
            magicItemAttunement: baseStringProperty,
        }},
        characterDetails: { type: Type.OBJECT, properties: {
            appearance: baseStringProperty, backstoryAndPersonality: baseStringProperty, languages: baseStringProperty, size: baseStringProperty,
        }},
    },
};

export const startAdventure = async (characterSheet: string): Promise<{ chat: Chat, openingMessage: string }> => {
    try {
        const chat = ai.chats.create({
            // FIX: Use recommended model 'gemini-2.5-flash'
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: getInitialPrompt(characterSheet),
                tools: [{ functionDeclarations: [updateCharacterSheetFunctionDeclaration] }],
            },
        });

        const response = await chat.sendMessage({ message: "I am ready to begin." });
        
        return { chat, openingMessage: response.text };

    } catch (error) {
        console.error("Gemini API error in startAdventure:", error);
        throw new Error("Failed to start the adventure with the AI Dungeon Master.");
    }
};

export const continueAdventure = async (chat: Chat, playerAction: string): Promise<{ text: string; sheetUpdates: Record<string, any> | null }> => {
    try {
        const response = await chat.sendMessage({ message: playerAction });
        const text = response.text ?? ""; // If the model only returns a function call, text can be undefined.
        let sheetUpdates: Record<string, any> | null = null;

        if (response.functionCalls) {
            for (const fc of response.functionCalls) {
                if (fc.name === 'updateCharacterSheet' && Array.isArray(fc.args.updates)) {
                    if (!sheetUpdates) sheetUpdates = {};
                    for (const update of fc.args.updates) {
                        if (update.path && update.value !== undefined) {
                            sheetUpdates[update.path] = update.value;
                        }
                    }
                }
            }
        }

        return { text, sheetUpdates };
    } catch (error) {
        console.error("Gemini API error in continueAdventure:", error);
        throw new Error("The AI Dungeon Master is currently unavailable.");
    }
};

export const parseCharacterSheet = async (fileContent: string): Promise<CharacterSheet> => {
    try {
        const response = await ai.models.generateContent({
            // FIX: Use recommended model 'gemini-2.5-flash'
            model: 'gemini-2.5-flash',
            contents: getParsePrompt(fileContent),
            config: {
                responseMimeType: 'application/json',
                responseSchema: characterSheetSchema,
            },
        });

        const jsonString = response.text.trim();
        const parsedData = JSON.parse(jsonString);
        return parsedData as CharacterSheet;

    } catch (error) {
        console.error("Gemini API error in parseCharacterSheet:", error);
        throw new Error("The AI failed to read the character sheet. Please try again or fill it manually.");
    }
};

export const translateText = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            // FIX: Use recommended model 'gemini-2.5-flash'
            model: 'gemini-2.5-flash',
            contents: `Translate the following English text to Russian: "${text}"`,
            config: {
                systemInstruction: 'You are a helpful translation assistant. You only provide the direct translation of the given text, with no extra commentary or explanations.',
            }
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API error in translateText:", error);
        throw new Error("Failed to translate the text.");
    }
};