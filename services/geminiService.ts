import { GoogleGenAI, Chat, Type, FunctionDeclaration, Content } from "@google/genai";
import type { CharacterSheet, QuestStatus, AdventureDifficulty } from "../types";

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

const addQuestFunctionDeclaration: FunctionDeclaration = {
  name: 'addQuest',
  description: "Adds a new quest to the player's journal. Use this when the player receives a new task, objective, or important goal.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "A short, clear title for the quest. For example, 'Find the Lost Artifact'."
      },
      description: {
        type: Type.STRING,
        description: "A brief, spoiler-free description of the quest's objective. For example, 'The village elder has asked you to retrieve a stolen relic from the nearby goblin cave.'"
      }
    },
    required: ['title', 'description']
  }
};

const updateQuestFunctionDeclaration: FunctionDeclaration = {
  name: 'updateQuest',
  description: "Updates an existing quest in the player's journal. Use this to change a quest's details or its status (e.g., to 'completed' or 'failed') based on the player's actions and story progression.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      questTitleToUpdate: {
        type: Type.STRING,
        description: "The exact title of the quest to be updated. This must match an existing quest title."
      },
      newTitle: {
        type: Type.STRING,
        description: "An optional new title for the quest."
      },
      newDescription: {
        type: Type.STRING,
        description: "An optional new description for the quest, reflecting new information or progress."
      },
      newStatus: {
        type: Type.STRING,
        description: "An optional new status for the quest. Must be one of: 'active', 'completed', 'failed'."
      }
    },
    required: ['questTitleToUpdate']
  }
};


const getInitialPrompt = (
    characterSheetContent: string,
    adventureDetails: { difficulty: AdventureDifficulty, worldName: string, additionalInfo: string }
): string => `
You are the Dungeon Master (DM) for a text-based role-playing game based on Dungeons & Dragons 5th Edition rules. Your name is 'Gemini'.
Your goal is to create a rich, engaging, and challenging fantasy adventure.
You will describe the world, the non-player characters (NPCs), and the situations the player finds themselves in.
You must react to the player's actions and describe the consequences.
Keep your responses concise but descriptive. Use markdown for emphasis where appropriate (e.g., *italic* for thoughts, **bold** for important names or items).

---
**ADVENTURE SETUP**
- World Name: ${adventureDetails.worldName || 'A new world'}
- Difficulty: ${adventureDetails.difficulty}. You must tailor the challenges, NPC attitudes, and overall stakes to this level. 'Easy' should be forgiving. 'Hardcore' should be brutal and unforgiving.
- Additional Details: ${adventureDetails.additionalInfo || 'No additional details provided.'}
---

---
**RESPONSE STYLE**
- End your responses by setting the scene and presenting a situation.
- **Crucially, do NOT explicitly ask "What do you do?", "What's your next move?", or similar direct questions.** Instead, create an open-ended scenario that implicitly prompts the player to act. For example, instead of "You see a door. What do you do?", describe it: "Before you stands a heavy oak door, slightly ajar, from which you can hear a faint scratching sound." This encourages the player to take initiative.
---

**THE MOST IMPORTANT RULE: ALWAYS ASK FOR A ROLL**
- **If the outcome of ANY situation is uncertain, you MUST ask the player to make a dice roll.** This applies to actions initiated by the player (e.g., "I try to persuade the guard") and situations you present (e.g., "A trap springs from the floor!").
- Do not determine the outcome yourself if there is any chance of failure or partial success.
- When you call for a roll, be specific. Ask for a specific skill check (e.g., "Make a Dexterity (Stealth) check"), a saving throw (e.g., "Make a Constitution saving throw"), an attack roll, or a simple die roll for chance (e.g., "Roll a d6 to see what happens," or "Flip a coin (roll a d2)").
- The player will tell you the result of their roll, and you must then narrate the outcome based on that result and their character's abilities.
---

The player's character sheet is provided below. Use this information to tailor the adventure and determine the success or failure of their actions.
---
CHARACTER SHEET:
${characterSheetContent}
---

---
GAME MECHANICS & TOOLS:
You have a set of tools to directly modify the game state. When you use a tool, you MUST also describe the changes in your narrative response to the player.

1.  **'updateCharacterSheet'**:
    -   When a player's health changes, they gain or lose items or money, or their stats are affected by game events, you MUST call this function with the updated values.
    -   IMPORTANT: For text fields that contain lists (like inventory, languages, features), you must update the *entire field* with a new string.
      -   To add/remove items, update the 'equipment.list' field. Example: if 'equipment.list' is "a rope" and the player finds a potion, you must call the tool with path 'equipment.list' and value "a rope, a healing potion".
      -   You MUST read the character sheet and chat history to know the current value of the field before modifying it to include both old and new information.
    -   Example narrative: After calling the tool to set \`combat.hitPoints.current\` to '15', you should also say, "The goblin's blade slashes your arm, dealing 5 damage."

2.  **'addQuest' & 'updateQuest'**:
    -   You MUST use these tools to manage the player's quest journal.
    -   Use 'addQuest' when a new objective is given to the player.
    -   Use 'updateQuest' when a quest objective changes, or its status becomes 'completed' or 'failed'.
    -   Example narrative: After calling 'addQuest', you could say, "The old woman's plea is heartfelt. Your journal has been updated with a new quest."
---

Now, begin the adventure in the world of ${adventureDetails.worldName}. Take inspiration from the provided details and the character sheet. Describe the opening scene and present the first situation to the player, following all the rules above.
`;

const getParsePrompt = (characterSheetContent: string): string => `
You are an expert assistant for Dungeons & Dragons 5th Edition. Your task is to parse the provided text of a character sheet and convert it into a structured JSON object that conforms to the provided schema.

**CRITICAL INSTRUCTIONS:**
1.  **Strict JSON Output:** You MUST only output the raw JSON object. Do not include any markdown, explanations, or introductory text.
2.  **Schema Compliance:** The generated JSON must strictly adhere to the provided schema structure. All fields in the schema must be present in your output.
3.  **Holistic Analysis:** Do not rely on specific section titles or formatting. Read and understand the entire document to find the correct information for each field. For example, 'Species' might be called 'Race'; 'Strength' might just be 'STR'. You must infer the correct values from the context.
4.  **Proficiency Inference:** For saving throws and skills, look for any indication of proficiency (e.g., a filled-in circle, an asterisk '*', a 'P', or simply a modifier that is higher than the base ability modifier would allow). If proficiency is indicated, set the 'proficient' flag to 'true'.
5.  **Summarize and Consolidate:** For large text blocks like features, backstory, spells, and equipment, gather all relevant information from anywhere in the document and combine it into a single, coherent string for the corresponding field.
6.  **Use Sensible Defaults:** If information for a field is genuinely missing from the text after a thorough analysis, use a sensible default value (e.g., "0" for numbers, an empty string "" for text, \`false\` for booleans). Do not omit any fields from the final JSON structure.
7.  **Current vs. Max HP:** When you find HP, assume the 'current' HP is the same as the 'max' HP unless explicitly stated otherwise. Set 'temporary' HP to "0".
8.  **Empty Arrays/Objects:** For fields like \`attacks\`, if no attacks are listed, provide an empty array \`[]\`.

---
CHARACTER INFORMATION TO PARSE:
${characterSheetContent}
---
`;

const getAdventureGenerationPrompt = (difficulty: AdventureDifficulty, characterSheetContent: string): string => `
You are a creative world-builder and storyteller for a Dungeons & Dragons game.
Your task is to generate a compelling world name and a short, evocative introductory paragraph based on the player's character sheet and a chosen difficulty level.

**Instructions:**
1.  **Analyze the Character:** Read the provided character sheet to understand the character's class, species, and background. The generated world should feel appropriate for this character. A noble knight might start in a kingdom in turmoil, while a rogue might start in a city of shadows.
2.  **Reflect the Difficulty:**
    -   **Easy:** The world should feel relatively safe, with a clear and achievable starting goal. Think "a peaceful village with a small goblin problem."
    -   **Medium:** The world has significant challenges and dangers, but also pockets of safety. Think "a bustling city with a corrupt guard and a looming monster threat."
    -   **Hard:** The world is dangerous and bleak. Survival is a constant struggle. Think "a war-torn land under a tyrant's thumb where resources are scarce."
    -   **Hardcore:** The world is actively hostile and unforgiving. The character is likely in immediate peril. Think "the last bastion of civilization in a world overrun by undead."
3.  **Be Creative:** Invent a unique and memorable name for the world. The introductory paragraph should set the scene and hint at the initial conflict or situation without giving away any major spoilers.
4.  **JSON Output:** You MUST only output a raw JSON object with two keys: "worldName" (string) and "additionalInfo" (string). Do not include markdown or any other text.

---
**Difficulty Level:** ${difficulty}
---
**Character Sheet:**
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

export const startAdventure = async (
    characterSheet: string,
    model: string,
    adventureDetails: { difficulty: AdventureDifficulty, worldName: string, additionalInfo: string }
): Promise<{ chat: Chat, openingMessage: string }> => {
    try {
        const chat = ai.chats.create({
            model: model,
            config: {
                systemInstruction: getInitialPrompt(characterSheet, adventureDetails),
                tools: [{ functionDeclarations: [
                    updateCharacterSheetFunctionDeclaration,
                    addQuestFunctionDeclaration,
                    updateQuestFunctionDeclaration
                ] }],
            },
        });

        const response = await chat.sendMessage({ message: "I am ready to begin." });
        
        let openingMessage = "";
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    openingMessage += part.text;
                }
            }
        }
        
        return { chat, openingMessage };

    } catch (error) {
        console.error("Gemini API error in startAdventure:", error);
        throw new Error("Failed to start the adventure with the AI Dungeon Master.");
    }
};

export const restartAdventureWithNewModel = async (
  characterSheet: string,
  model: string,
  history: Content[]
): Promise<{ chat: Chat }> => {
    try {
        const chat = ai.chats.create({
            model: model,
            history: history,
            config: {
                systemInstruction: getInitialPrompt(characterSheet, { difficulty: 'Medium', worldName: 'the game world', additionalInfo: 'The world is in a state of flux.' }), // Note: A generic prompt is used on restart
                tools: [{ functionDeclarations: [
                    updateCharacterSheetFunctionDeclaration,
                    addQuestFunctionDeclaration,
                    updateQuestFunctionDeclaration
                ] }],
            },
        });
        return { chat };
    } catch (error) {
        console.error("Gemini API error in restartAdventureWithNewModel:", error);
        throw new Error("Failed to switch the AI Dungeon Master model.");
    }
};

interface AdventureResult {
    text: string;
    sheetUpdates: Record<string, any> | null;
    questUpdates: {
        add?: { title: string; description: string };
        update?: { questTitleToUpdate: string; newTitle?: string; newDescription?: string; newStatus?: QuestStatus };
    } | null;
}

export const continueAdventure = async (chat: Chat, playerAction: string): Promise<AdventureResult> => {
    try {
        const response = await chat.sendMessage({ message: playerAction });
        let text = "";
        let sheetUpdates: Record<string, any> | null = null;
        let questUpdates: AdventureResult['questUpdates'] = null;

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    text += part.text;
                } else if (part.functionCall) {
                    const fc = part.functionCall;
                    if (fc.name === 'updateCharacterSheet' && Array.isArray(fc.args.updates)) {
                        if (!sheetUpdates) sheetUpdates = {};
                        for (const update of fc.args.updates) {
                            if (update.path && update.value !== undefined) {
                                sheetUpdates[update.path] = update.value;
                            }
                        }
                    } else if (fc.name === 'addQuest') {
                        if (!questUpdates) questUpdates = {};
                        // FIX: Cast `unknown` function call arguments to their expected `string` types.
                        questUpdates.add = { title: fc.args.title as string, description: fc.args.description as string };
                    } else if (fc.name === 'updateQuest') {
                        if (!questUpdates) questUpdates = {};
                        // Filter out undefined optional values
                        const updates = Object.fromEntries(Object.entries(fc.args).filter(([, v]) => v !== undefined));
                        // FIX: Cast the `updates` object to the correct type to resolve the 'unknown' to 'string' assignment error.
                        questUpdates.update = updates as { questTitleToUpdate: string; newTitle?: string; newDescription?: string; newStatus?: QuestStatus };
                    }
                }
            }
        }

        return { text, sheetUpdates, questUpdates };
    } catch (error) {
        console.error("Gemini API error in continueAdventure:", error);
        throw new Error("The AI Dungeon Master is currently unavailable.");
    }
};

export const parseCharacterSheet = async (fileContent: string): Promise<CharacterSheet> => {
    try {
        const response = await ai.models.generateContent({
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

export const generateAdventureDetails = async (
    difficulty: AdventureDifficulty,
    characterSheetContent: string
): Promise<{ worldName: string; additionalInfo: string; }> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: getAdventureGenerationPrompt(difficulty, characterSheetContent),
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        worldName: { type: Type.STRING },
                        additionalInfo: { type: Type.STRING }
                    }
                }
            }
        });
        const jsonString = response.text.trim();
        const parsedData = JSON.parse(jsonString);
        return parsedData;

    } catch (error) {
        console.error("Gemini API error in generateAdventureDetails:", error);
        throw new Error("The AI failed to generate adventure details. Please try again or fill them in manually.");
    }
};
