export interface GameMessage {
  sender: 'player' | 'dm' | 'system';
  text: string;
}

export type Dice = 'd2' | 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export type DmModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export type AdventureDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Hardcore';

export type QuestStatus = 'active' | 'completed' | 'failed';

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
}

export interface PersonalNote {
  id: string;
  content: string;
}

export type EntityType = 'player' | 'wall' | 'enemy' | 'object' | 'door' | 'floor';

export interface MapEntity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  name?: string;
}

export interface MapState {
  entities: MapEntity[];
  width: number;
  height: number;
}

export interface CharacterSheet {
  coreIdentity: {
    characterName: string;
    background: string;
    class: string;
    level: string;
    xp: string;
    species: string;
    subclass: string;
    alignment: string;
    playerName: string;
  };
  stats: {
    abilities: {
      strength: string;
      dexterity: string;
      constitution: string;
      intelligence: string;
      wisdom: string;
      charisma: string;
    };
    proficiencyBonus: string;
    savingThrows: Record<string, { proficient: boolean }>;
    skills: Record<string, { proficient: boolean }>; // Removed expertise
    passivePerception: string;
  };
  combat: {
    armorClass: string;
    shield: string;
    initiative: string;
    speed: string;
    hitPoints: {
      max: string;
      current: string;
      temporary: string;
    };
    hitDice: {
      max: string;
      spent: string;
    };
    deathSaves: {
      successes: number;
      failures: number;
    };
    heroicInspiration: string;
  };
  attacksSpellcasting: {
    attacks: { name: string; bonus: string; damage: string; notes: string }[];
    spellcasting: {
      ability: string;
      modifier: string;
      saveDC: string;
      attackBonus: string;
    };
    spellSlots: Record<string, { total: string; expended: string }>;
    spells: string;
  };
  featuresTraits: {
    classFeatures: string;
    speciesTraits: string;
    feats: string;
  };
  equipment: {
    list: string;
    money: {
      cp: string;
      sp: string;
      ep: string;
      gp: string;
      pp: string;
    };
    proficiencies: {
        armorTraining: { light: boolean; medium: boolean; heavy: boolean; shields: boolean };
        weapons: string;
        tools: string;
    };
    magicItemAttunement: string;
  };
  characterDetails: {
    appearance: string;
    backstoryAndPersonality: string; // Merged fields
    languages: string;
    size: string;
  };
}
