import { GoogleGenAI, Chat, Type, FunctionDeclaration, Content, GenerateContentResponse } from "@google/genai";
import type { CharacterSheet, QuestStatus, AdventureDifficulty, MapState } from "../types";
import { v4 as uuidv4 } from 'uuid';


if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const updateMapFunctionDeclaration: FunctionDeclaration = {
  name: 'updateMap',
  description: "Updates the 2D visual map of the player's immediate surroundings. This MUST be called on every turn where the player's position or the environment changes.",
  parameters: {
    type: Type.OBJECT,
    properties: {
        width: { type: Type.NUMBER, description: "The width of the map grid, e.g., 15." },
        height: { type: Type.NUMBER, description: "The height of the map grid, e.g., 15." },
        entities: {
            type: Type.ARRAY,
            description: "A complete list of all visible entities on the map.",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, description: "Entity type. Must be one of: 'player', 'wall', 'enemy', 'object', 'door'." },
                    x: { type: Type.NUMBER, description: "The zero-indexed x-coordinate, from left to right." },
                    y: { type: Type.NUMBER, description: "The zero-indexed y-coordinate, from top to bottom." },
                    name: { type: Type.STRING, description: "Optional name for the entity, e.g., 'Goblin Shaman' or 'Health Potion'." },
                },
                required: ['type', 'x', 'y']
            }
        }
    },
    required: ['width', 'height', 'entities']
  }
};

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
You are the Dungeon Master (DM) for a text-based role-playing game with a 2D visual map, based on Dungeons & Dragons 5th Edition rules. Your name is 'Gemini'.
Your goal is to create a rich, engaging, and challenging fantasy adventure.
You will describe the world, NPCs, and situations. You must react to the player's actions and describe the consequences.
Keep your responses concise but descriptive. Use markdown for emphasis (*italic*, **bold**).

---
**THE MAP: THE MOST IMPORTANT RULE**
- You MUST manage a 2D grid map of the player's immediate surroundings. The top-left corner is coordinate (0, 0).
- **On EVERY turn where the player's position or their surroundings change, you MUST call the \`updateMap\` function.**
- The map data you provide must be a complete representation of everything the character can see.
- Provide a full grid, typically around 15x15, to show the area. Include walls, floors (empty space), the player, enemies, items, doors, etc.
- The player's token should generally be near the center of the map view.
- When you use the \`updateMap\` tool, you MUST ALSO describe the scene narratively. The text and the map must be synchronized.

---
**ADVENTURE SETUP**
- World Name: ${adventureDetails.worldName || 'A new world'}
- Difficulty: ${adventureDetails.difficulty}. Tailor challenges to this level.
- Additional Details: ${adventureDetails.additionalInfo || 'No additional details provided.'}
---

---
**RESPONSE STYLE**
- End your responses by setting the scene.
- **Do NOT explicitly ask "What do you do?".** Instead, create an open-ended scenario that prompts the player to act. Example: "Before you stands a heavy oak door, slightly ajar, from which you can hear a faint scratching sound."
---

**SECOND MOST IMPORTANT RULE: ALWAYS ASK FOR A ROLL**
- **If the outcome of ANY situation is uncertain, you MUST ask the player to make a dice roll.**
- Be specific: "Make a Dexterity (Stealth) check", "Make a Constitution saving throw", etc.
- The player will tell you the roll result, and you will narrate the outcome.
---

The player's character sheet is provided below.
---
CHARACTER SHEET:
${characterSheetContent}
---

---
GAME MECHANICS & TOOLS:
You have tools to modify the game state. When you use a tool, you MUST also describe the changes in your narrative response.

1.  **\`updateMap\`**: (See first rule) You MUST use this every turn to update the visual map.
2.  **\`updateCharacterSheet\`**: Use when a player's health, items, money, or stats change. For list-like fields (e.g., 'equipment.list'), provide the complete new string.
3.  **\`addQuest\` & \`updateQuest\`**: Use these to manage the player's quest journal.
---

Now, begin the adventure in the world of ${adventureDetails.worldName}. Describe the opening scene, present the first situation, and, most importantly, provide the initial map by calling the \`updateMap\` tool.
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


export interface AdventureResult {
    text: string;
    sheetUpdates: Record<string, any> | null;
    questUpdates: {
        add?: { title: string; description: string };
        update?: { questTitleToUpdate: string; newTitle?: string; newDescription?: string; newStatus?: QuestStatus };
    } | null;
    mapUpdate: MapState | null;
}

const parseAdventureResultFromResponse = (response: GenerateContentResponse): AdventureResult => {
    let text = "";
    let sheetUpdates: Record<string, any> | null = null;
    let questUpdates: AdventureResult['questUpdates'] = null;
    let mapUpdate: MapState | null = null;

    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
                text += part.text;
            } else if (part.functionCall) {
                const fc = part.functionCall;
                if (fc.name === 'updateMap') {
                     mapUpdate = {
                        width: fc.args.width as number,
                        height: fc.args.height as number,
                        entities: (fc.args.entities as any[]).map(e => ({ ...e, id: uuidv4() }))
                    };
                } else if (fc.name === 'updateCharacterSheet' && Array.isArray(fc.args.updates)) {
                    if (!sheetUpdates) sheetUpdates = {};
                    for (const update of fc.args.updates) {
                        if (update.path && update.value !== undefined) {
                            sheetUpdates[update.path] = update.value;
                        }
                    }
                } else if (fc.name === 'addQuest') {
                    if (!questUpdates) questUpdates = {};
                    questUpdates.add = { title: fc.args.title as string, description: fc.args.description as string };
                } else if (fc.name === 'updateQuest') {
                    if (!questUpdates) questUpdates = {};
                    const updates = Object.fromEntries(Object.entries(fc.args).filter(([, v]) => v !== undefined));
                    questUpdates.update = updates as { questTitleToUpdate: string; newTitle?: string; newDescription?: string; newStatus?: QuestStatus };
                }
            }
        }
    }
    return { text, sheetUpdates, questUpdates, mapUpdate };
};


export const startAdventure = async (
    characterSheet: string,
    model: string,
    adventureDetails: { difficulty: AdventureDifficulty, worldName: string, additionalInfo: string }
): Promise<{ chat: Chat, initialResponse: AdventureResult }> => {
    try {
        const systemInstruction = getInitialPrompt(characterSheet, adventureDetails);
        const tools = [{ functionDeclarations: [
            updateMapFunctionDeclaration,
            updateCharacterSheetFunctionDeclaration,
            addQuestFunctionDeclaration,
            updateQuestFunctionDeclaration
        ] }];
        
        const firstUserContent: Content = {role: 'user', parts: [{text: "I am ready to begin."}]};

        const firstTurnResponse = await ai.models.generateContent({
            model: model,
            contents: [firstUserContent],
            config: {
                systemInstruction: systemInstruction,
                tools: tools,
            },
        });

        const initialResponse = parseAdventureResultFromResponse(firstTurnResponse);
        
        const history: Content[] = [firstUserContent];
        if (firstTurnResponse.candidates?.[0]?.content) {
            history.push(firstTurnResponse.candidates[0].content);
        }

        const chat = ai.chats.create({
            model: model,
            history: history,
            config: {
                systemInstruction: systemInstruction,
                tools: tools,
            },
        });

        return { chat, initialResponse };

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
                    updateMapFunctionDeclaration,
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


export const continueAdventure = async (chat: Chat, playerAction: string): Promise<AdventureResult> => {
    try {
        const response = await chat.sendMessage({ message: playerAction });
        return parseAdventureResultFromResponse(response);
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