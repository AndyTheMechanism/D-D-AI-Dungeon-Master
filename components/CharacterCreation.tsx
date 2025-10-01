import React, { useState, useRef } from 'react';
import type { CharacterSheet } from '../types';
import { parseCharacterSheet } from '../services/geminiService';

interface CharacterCreationProps {
  onStartGame: (sheet: CharacterSheet) => void;
  isStarting: boolean;
}

const ABILITY_SKILLS_MAP: Record<string, string[]> = {
    strength: ['athletics'],
    dexterity: ['acrobatics', 'sleight of hand', 'stealth'],
    intelligence: ['arcana', 'history', 'investigation', 'nature', 'religion'],
    wisdom: ['animal handling', 'insight', 'medicine', 'perception', 'survival'],
    charisma: ['deception', 'intimidation', 'performance', 'persuasion']
};

const toCamelCase = (str: string) => str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '');

const initialSheetState: CharacterSheet = {
    coreIdentity: { characterName: '', background: '', class: '', level: '1', xp: '0', species: '', subclass: '', alignment: '', playerName: '' },
    stats: {
        abilities: { strength: '10', dexterity: '10', constitution: '10', intelligence: '10', wisdom: '10', charisma: '10' },
        proficiencyBonus: '+2',
        savingThrows: Object.keys(ABILITY_SKILLS_MAP).reduce((acc, ab) => ({ ...acc, [ab]: { proficient: false } }), {}),
        skills: Object.values(ABILITY_SKILLS_MAP).flat().reduce((acc, skill) => ({ ...acc, [toCamelCase(skill)]: { proficient: false } }), {}),
        passivePerception: '10',
    },
    combat: {
        armorClass: '10', shield: '', initiative: '0', speed: '30ft',
        hitPoints: { max: '10', current: '10', temporary: '0' },
        hitDice: { max: '1d8', spent: '0' },
        deathSaves: { successes: 0, failures: 0 },
        heroicInspiration: '0',
    },
    attacksSpellcasting: {
        attacks: Array(4).fill({ name: '', bonus: '', damage: '', notes: '' }),
        spellcasting: { ability: '', modifier: '', saveDC: '', attackBonus: '' },
        spellSlots: Array.from({ length: 9 }, (_, i) => i + 1).reduce((acc, level) => ({ ...acc, [level]: { total: '', expended: '' } }), {}),
        spells: '',
    },
    featuresTraits: { classFeatures: '', speciesTraits: '', feats: '' },
    equipment: {
        list: '',
        money: { cp: '0', sp: '0', ep: '0', gp: '0', pp: '0' },
        proficiencies: {
            armorTraining: { light: false, medium: false, heavy: false, shields: false },
            weapons: '', tools: ''
        },
        magicItemAttunement: '',
    },
    characterDetails: {
        appearance: '', backstoryAndPersonality: '', languages: '', size: 'Medium',
    }
};

const LabeledInput = ({ label, id, ...props }: { label: any, id: any, [x: string]: any }) => (
    <div className="flex flex-col-reverse">
        <input id={id} {...props} className="bg-transparent border-b-2 border-stone-500 focus:border-stone-800 focus:outline-none text-center peer font-roboto-slab"/>
        <label htmlFor={id} className="text-xs uppercase font-bold text-stone-600 text-center peer-focus:text-stone-900 font-signika">{label}</label>
    </div>
);

const TitledBox = ({ title, children, className = '' }) => (
    <div className={`border-double border-4 rounded-lg border-dnd-olive ${className}`}>
        <h2 className="text-center text-xs uppercase font-bold py-1 font-modesto tracking-wider" style={{ color: 'var(--dnd5e-color-olive)', backgroundColor: 'rgba(0,0,0,0.05)' }}>{title}</h2>
        <div className="p-2">{children}</div>
    </div>
);

const TextAreaBox = ({ title, ...props }) => (
    <div className="border-double border-4 rounded-lg border-dnd-olive flex flex-col h-full">
        <h2 className="text-center text-xs uppercase font-bold py-1 font-modesto tracking-wider flex-shrink-0" style={{ color: 'var(--dnd5e-color-olive)', backgroundColor: 'rgba(0,0,0,0.05)' }}>{title}</h2>
        <div className="flex-grow min-h-0">
             <textarea {...props} className="w-full h-full bg-transparent resize-none focus:outline-none p-2 text-sm font-roboto-slab" />
        </div>
    </div>
);

const AbilityScoreInput = ({ name, score, onScoreChange, savingThrow, onSavingThrowChange, skills, onSkillChange, proficiencyBonus }) => {
    const modifier = score ? Math.floor((parseInt(score, 10) - 10) / 2) : 0;
    const modString = modifier >= 0 ? `+${modifier}` : `${modifier}`;
    const profBonusValue = proficiencyBonus ? parseInt(proficiencyBonus.toString().replace('+', ''), 10) || 0 : 0;

    return (
        <div className="border-double border-4 rounded-lg p-2 text-center border-dnd-olive">
            <h3 className="font-bold uppercase font-modesto">{name}</h3>
            <div className="text-5xl font-bold my-2 font-roboto-slab">{modString}</div>
            <input type="text" value={score} onChange={onScoreChange} className="w-20 bg-transparent border-b-2 border-stone-500 focus:border-stone-800 focus:outline-none text-center text-xl p-1 font-roboto-slab" />
            <div className="mt-4">
                <div className="flex items-center justify-center gap-2 border border-stone-400 rounded-full p-1">
                    <input type="checkbox" checked={savingThrow.proficient} onChange={onSavingThrowChange} className="form-checkbox h-4 w-4 bg-transparent border-stone-600 rounded-sm text-stone-900 focus:ring-stone-900 focus:ring-offset-0" />
                    <span className="text-sm font-bold font-signika">Saving Throw</span>
                </div>
                {ABILITY_SKILLS_MAP[name].map(skillName => {
                     const skillKey = toCamelCase(skillName);
                     const isProficient = skills[skillKey]?.proficient || false;
                     const skillValue = modifier + (isProficient ? profBonusValue : 0);
                     const skillValueString = skillValue >= 0 ? `+${skillValue}` : `${skillValue}`;
                     const checkboxId = `${skillKey}-checkbox`;
                     return (
                        <div key={skillKey} className="flex items-center justify-between gap-2 mt-2">
                             <input 
                                 type="checkbox" 
                                 id={checkboxId}
                                 checked={isProficient} 
                                 onChange={(e) => onSkillChange(skillKey, e.target.checked)} 
                                 className="form-checkbox h-4 w-4 bg-transparent border-stone-600 rounded-sm text-stone-900 focus:ring-stone-900 focus:ring-offset-0"
                             />
                             <label htmlFor={checkboxId} className="text-sm capitalize flex-grow text-left ml-2 flex justify-between items-center w-full cursor-pointer font-signika">
                                <span>{skillName}</span>
                                <span className="font-bold mr-1 text-stone-800 border-b border-stone-400 px-1 font-roboto-slab">{skillValueString}</span>
                             </label>
                         </div>
                     )
                })}
            </div>
        </div>
    );
};


const CharacterCreation: React.FC<CharacterCreationProps> = ({ onStartGame, isStarting }) => {
  const [sheet, setSheet] = useState<CharacterSheet>(initialSheetState);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setError(null);
    try {
      const content = await file.text();
      const parsedSheet = await parseCharacterSheet(content);
      setSheet(currentSheet => {
        const deepMerge = (target: any, source: any): any => {
          const output = { ...target };
          if (target && typeof target === 'object' && source && typeof source === 'object') {
            Object.keys(source).forEach(key => {
              const targetValue = target[key];
              const sourceValue = source[key];
              if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
                output[key] = deepMerge(targetValue || {}, sourceValue);
              } else if (sourceValue !== undefined) {
                output[key] = sourceValue;
              }
            });
          }
          return output;
        };
        return deepMerge(initialSheetState, parsedSheet);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred during parsing.');
      console.error(e);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheet.coreIdentity.characterName || !sheet.coreIdentity.class) {
        setError("Character Name and Class are required to start.");
        return;
    }
    setError(null);
    onStartGame(sheet);
  }

  const handleChange = (path: string, value: any) => {
    setSheet(prev => {
        const keys = path.split('.');
        const newState = JSON.parse(JSON.stringify(prev)); // Deep copy
        let current = newState;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newState;
    });
  };

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="text-center mb-6">
            <h2 className="text-3xl font-modesto text-amber-200">Create Your Character</h2>
            <p className="text-slate-400 mt-2 font-signika">Fill the sheet manually or upload a file to have the AI do it for you.</p>
        </div>

        <div className="flex justify-center gap-4 mb-6">
             <button
                onClick={handleUploadClick}
                disabled={isParsing || isStarting}
                className="px-6 py-3 border-2 border-dashed border-slate-500 rounded-lg text-slate-300 hover:bg-slate-600 hover:border-[var(--dnd5e-color-gold)] hover:text-[var(--dnd5e-color-gold)] transition-colors disabled:opacity-50 disabled:cursor-wait font-roboto-slab"
            >
                {isParsing ? 'Reading the Scrolls...' : 'Upload & Auto-fill with AI'}
            </button>
        </div>
        
        {error && <p className="text-red-400 my-4 text-center">{error}</p>}
        
        <form onSubmit={handleSubmit} className="p-4 mx-auto max-w-5xl text-black rounded-lg shadow-lg" style={{ backgroundImage: 'var(--dnd5e-sheet-background)', backgroundColor: 'var(--dnd5e-sheet-color)' }}>
            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-1">
                    <LabeledInput id="characterName" label="Character Name" value={sheet.coreIdentity.characterName} onChange={e => handleChange('coreIdentity.characterName', e.target.value)} required className="text-2xl" />
                </div>
                <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <LabeledInput id="background" label="Background" value={sheet.coreIdentity.background} onChange={e => handleChange('coreIdentity.background', e.target.value)} />
                    <LabeledInput id="class" label="Class" value={sheet.coreIdentity.class} onChange={e => handleChange('coreIdentity.class', e.target.value)} required />
                    <LabeledInput id="level" label="Level" value={sheet.coreIdentity.level} onChange={e => handleChange('coreIdentity.level', e.target.value)} />
                    <LabeledInput id="xp" label="XP" value={sheet.coreIdentity.xp} onChange={e => handleChange('coreIdentity.xp', e.target.value)} />
                    <LabeledInput id="species" label="Species" value={sheet.coreIdentity.species} onChange={e => handleChange('coreIdentity.species', e.target.value)} />
                    <LabeledInput id="subclass" label="Subclass" value={sheet.coreIdentity.subclass} onChange={e => handleChange('coreIdentity.subclass', e.target.value)} />
                </div>
            </div>

            {/* Main Body */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <TitledBox title="Proficiency Bonus"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent focus:outline-none font-roboto-slab" value={sheet.stats.proficiencyBonus} onChange={e => handleChange('stats.proficiencyBonus', e.target.value)} /></TitledBox>
                        <TitledBox title="Heroic Inspiration"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent focus:outline-none font-roboto-slab" value={sheet.combat.heroicInspiration} onChange={e => handleChange('combat.heroicInspiration', e.target.value)} /></TitledBox>
                    </div>
                    {Object.keys(ABILITY_SKILLS_MAP).map(ability => (
                        <AbilityScoreInput 
                            key={ability}
                            name={ability}
                            score={(sheet.stats.abilities as any)[ability]}
                            onScoreChange={e => handleChange(`stats.abilities.${ability}`, e.target.value)}
                            savingThrow={(sheet.stats.savingThrows as any)[ability]}
                            onSavingThrowChange={e => handleChange(`stats.savingThrows.${ability}.proficient`, e.target.checked)}
                            skills={sheet.stats.skills}
                            onSkillChange={(skillKey, proficient) => handleChange(`stats.skills.${skillKey}.proficient`, proficient)}
                            proficiencyBonus={sheet.stats.proficiencyBonus}
                        />
                    ))}
                     <TitledBox title="Equipment Training & Proficiencies">
                        <div className="text-sm space-y-2 font-signika">
                           <div className="uppercase font-bold text-stone-600">Armor Training</div>
                           <div className="flex justify-around">
                            {Object.keys(sheet.equipment.proficiencies.armorTraining).map(key => (
                               <label key={key} className="flex items-center gap-1 capitalize"><input type="checkbox" checked={sheet.equipment.proficiencies.armorTraining[key]} onChange={e => handleChange(`equipment.proficiencies.armorTraining.${key}`, e.target.checked)} className="form-checkbox bg-transparent border-stone-600 text-stone-900 focus:ring-stone-900" />{key}</label>
                            ))}
                           </div>
                           <div className="uppercase font-bold text-stone-600 mt-2">Weapons</div>
                           <textarea className="w-full bg-black/5 border border-stone-400 rounded-md p-1 font-roboto-slab" rows={2} value={sheet.equipment.proficiencies.weapons} onChange={e => handleChange('equipment.proficiencies.weapons', e.target.value)} />
                           <div className="uppercase font-bold text-stone-600 mt-2">Tools</div>
                           <textarea className="w-full bg-black/5 border border-stone-400 rounded-md p-1 font-roboto-slab" rows={2} value={sheet.equipment.proficiencies.tools} onChange={e => handleChange('equipment.proficiencies.tools', e.target.value)} />
                        </div>
                    </TitledBox>
                </div>
                {/* Right Column */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        <TitledBox title="Armor Class"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent font-roboto-slab focus:outline-none" value={sheet.combat.armorClass} onChange={e => handleChange('combat.armorClass', e.target.value)} /></TitledBox>
                        <TitledBox title="Shield"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent font-roboto-slab focus:outline-none" value={sheet.combat.shield} onChange={e => handleChange('combat.shield', e.target.value)} /></TitledBox>
                        <TitledBox title="Initiative"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent font-roboto-slab focus:outline-none" value={sheet.combat.initiative} onChange={e => handleChange('combat.initiative', e.target.value)} /></TitledBox>
                        <TitledBox title="Speed"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent font-roboto-slab focus:outline-none" value={sheet.combat.speed} onChange={e => handleChange('combat.speed', e.target.value)} /></TitledBox>
                        <TitledBox title="Size"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent font-roboto-slab focus:outline-none" value={sheet.characterDetails.size} onChange={e => handleChange('characterDetails.size', e.target.value)} /></TitledBox>
                        <div className="md:col-span-3 lg:col-span-3">
                            <TitledBox title="Hit Points"><div className="grid grid-cols-3 gap-2"><LabeledInput id="hpCurrent" label="Current" value={sheet.combat.hitPoints.current} onChange={e => handleChange('combat.hitPoints.current', e.target.value)} /><LabeledInput id="hpMax" label="Max" value={sheet.combat.hitPoints.max} onChange={e => handleChange('combat.hitPoints.max', e.target.value)} /><LabeledInput id="hpTemp" label="Temp" value={sheet.combat.hitPoints.temporary} onChange={e => handleChange('combat.hitPoints.temporary', e.target.value)} /></div></TitledBox>
                        </div>
                        <div className="md:col-span-2 lg:col-span-2">
                            <TitledBox title="Hit Dice"><div className="grid grid-cols-2 gap-2"><LabeledInput id="hdSpent" label="Spent" value={sheet.combat.hitDice.spent} onChange={e => handleChange('combat.hitDice.spent', e.target.value)} /><LabeledInput id="hdMax" label="Max" value={sheet.combat.hitDice.max} onChange={e => handleChange('combat.hitDice.max', e.target.value)} /></div></TitledBox>
                        </div>
                        <TitledBox title="Passive Perception"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent font-roboto-slab focus:outline-none" value={sheet.stats.passivePerception} onChange={e => handleChange('stats.passivePerception', e.target.value)} /></TitledBox>
                        <div className="lg:col-span-2">
                           <TitledBox title="Death Saves"><div className="flex justify-around items-center font-signika"><label>Successes <input type="number" min="0" max="3" className="w-12 text-center bg-transparent border-b border-stone-500" value={sheet.combat.deathSaves.successes} onChange={e => handleChange('combat.deathSaves.successes', parseInt(e.target.value))} /></label><label>Failures <input type="number" min="0" max="3" className="w-12 text-center bg-transparent border-b border-stone-500" value={sheet.combat.deathSaves.failures} onChange={e => handleChange('combat.deathSaves.failures', parseInt(e.target.value))} /></label></div></TitledBox>
                        </div>
                    </div>
                    <TitledBox title="Weapons & Damage Cantrips">
                        <div className="grid grid-cols-12 gap-x-2 text-center text-xs font-bold uppercase mb-1 font-signika">
                            <div className="col-span-4">Name</div><div className="col-span-2">Atk Bonus / DC</div><div className="col-span-3">Damage & Type</div><div className="col-span-3">Notes</div>
                        </div>
                        {sheet.attacksSpellcasting.attacks.map((atk, i) => (
                             <div key={i} className="grid grid-cols-12 gap-x-2 mb-1">
                                <input className="col-span-4 border-b border-stone-400 bg-transparent font-roboto-slab focus:outline-none" value={atk.name} onChange={e => handleChange(`attacksSpellcasting.attacks.${i}.name`, e.target.value)} />
                                <input className="col-span-2 border-b border-stone-400 bg-transparent text-center font-roboto-slab focus:outline-none" value={atk.bonus} onChange={e => handleChange(`attacksSpellcasting.attacks.${i}.bonus`, e.target.value)} />
                                <input className="col-span-3 border-b border-stone-400 bg-transparent text-center font-roboto-slab focus:outline-none" value={atk.damage} onChange={e => handleChange(`attacksSpellcasting.attacks.${i}.damage`, e.target.value)} />
                                <input className="col-span-3 border-b border-stone-400 bg-transparent font-roboto-slab focus:outline-none" value={atk.notes} onChange={e => handleChange(`attacksSpellcasting.attacks.${i}.notes`, e.target.value)} />
                            </div>
                        ))}
                    </TitledBox>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-64">
                        <TextAreaBox title="Class Features" value={sheet.featuresTraits.classFeatures} onChange={e => handleChange('featuresTraits.classFeatures', e.target.value)} />
                        <TextAreaBox title="Species Traits" value={sheet.featuresTraits.speciesTraits} onChange={e => handleChange('featuresTraits.speciesTraits', e.target.value)} />
                        <TextAreaBox title="Feats" value={sheet.featuresTraits.feats} onChange={e => handleChange('featuresTraits.feats', e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Page 2 Divider */}
            <hr className="my-6 border-t-2 border-gray-300"/>

             {/* Page 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <LabeledInput id="spellAbility" label="Spellcasting Ability" value={sheet.attacksSpellcasting.spellcasting.ability} onChange={e => handleChange('attacksSpellcasting.spellcasting.ability', e.target.value)} />
                        <LabeledInput id="spellModifier" label="Spellcasting Modifier" value={sheet.attacksSpellcasting.spellcasting.modifier} onChange={e => handleChange('attacksSpellcasting.spellcasting.modifier', e.target.value)} />
                        <LabeledInput id="spellSaveDC" label="Spell Save DC" value={sheet.attacksSpellcasting.spellcasting.saveDC} onChange={e => handleChange('attacksSpellcasting.spellcasting.saveDC', e.target.value)} />
                        <LabeledInput id="spellAttackBonus" label="Spell Attack Bonus" value={sheet.attacksSpellcasting.spellcasting.attackBonus} onChange={e => handleChange('attacksSpellcasting.spellcasting.attackBonus', e.target.value)} />
                     </div>
                     <TitledBox title="Spell Slots">
                        <div className="grid grid-cols-3 gap-x-4 gap-y-2 font-signika">
                            {Array.from({length: 9}, (_, i) => i + 1).map(level => (
                                <div key={level}>
                                    <label className="font-bold">Level {level}</label>
                                    <div className="flex gap-2">
                                        <input placeholder="Total" className="w-full border-b border-stone-400 text-center bg-transparent font-roboto-slab focus:outline-none" value={sheet.attacksSpellcasting.spellSlots[level]?.total} onChange={e => handleChange(`attacksSpellcasting.spellSlots.${level}.total`, e.target.value)} />
                                        <input placeholder="Expe" className="w-full border-b border-stone-400 text-center bg-transparent font-roboto-slab focus:outline-none" value={sheet.attacksSpellcasting.spellSlots[level]?.expended} onChange={e => handleChange(`attacksSpellcasting.spellSlots.${level}.expended`, e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                     </TitledBox>
                     <div className="h-80">
                        <TextAreaBox title="Cantrips & Prepared Spells" value={sheet.attacksSpellcasting.spells} onChange={e => handleChange('attacksSpellcasting.spells', e.target.value)} />
                     </div>
                </div>
                 <div className="lg:col-span-2 space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
                        <TextAreaBox title="Appearance" value={sheet.characterDetails.appearance} onChange={e => handleChange('characterDetails.appearance', e.target.value)} />
                        <TextAreaBox title="Backstory & Personality" value={sheet.characterDetails.backstoryAndPersonality} onChange={e => handleChange('characterDetails.backstoryAndPersonality', e.target.value)} />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-48">
                        <TextAreaBox title="Languages" value={sheet.characterDetails.languages} onChange={e => handleChange('characterDetails.languages', e.target.value)} />
                        <TextAreaBox title="Equipment" value={sheet.equipment.list} onChange={e => handleChange('equipment.list', e.target.value)} />
                     </div>
                     <TitledBox title="Coins">
                        <div className="grid grid-cols-5 gap-2">
                            <LabeledInput id="moneyCP" label="CP" value={sheet.equipment.money.cp} onChange={e => handleChange('equipment.money.cp', e.target.value)} />
                            <LabeledInput id="moneySP" label="SP" value={sheet.equipment.money.sp} onChange={e => handleChange('equipment.money.sp', e.target.value)} />
                            <LabeledInput id="moneyEP" label="EP" value={sheet.equipment.money.ep} onChange={e => handleChange('equipment.money.ep', e.target.value)} />
                            <LabeledInput id="moneyGP" label="GP" value={sheet.equipment.money.gp} onChange={e => handleChange('equipment.money.gp', e.target.value)} />
                            <LabeledInput id="moneyPP" label="PP" value={sheet.equipment.money.pp} onChange={e => handleChange('equipment.money.pp', e.target.value)} />
                        </div>
                     </TitledBox>
                 </div>
            </div>


            <div className="text-center pt-6">
                <button
                    type="submit"
                    disabled={isParsing || isStarting}
                    className="px-10 py-4 bg-[var(--dnd5e-color-olive)] hover:bg-red-900 text-white font-bold rounded-md shadow-lg transition-transform transform hover:scale-105 disabled:bg-slate-500 disabled:cursor-not-allowed font-modesto text-2xl"
                >
                    {isStarting ? 'Summoning the DM...' : 'Start Adventure'}
                </button>
            </div>
        </form>
        
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".txt, .md"
            disabled={isParsing || isStarting}
        />
    </div>
  );
};

export default CharacterCreation;