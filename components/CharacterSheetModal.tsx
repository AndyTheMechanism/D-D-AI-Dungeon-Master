import React, { useState } from 'react';
import { CharacterSheet } from '../types';

interface CharacterSheetModalProps {
    sheet: CharacterSheet;
    onClose: () => void;
    onStatRoll: (name: string, modifier: number) => void;
    onSave: (updatedSheet: CharacterSheet) => void;
}

const ABILITY_SKILLS_MAP: Record<string, string[]> = {
    strength: ['athletics'],
    dexterity: ['acrobatics', 'sleight of hand', 'stealth'],
    constitution: [],
    intelligence: ['arcana', 'history', 'investigation', 'nature', 'religion'],
    wisdom: ['animal handling', 'insight', 'medicine', 'perception', 'survival'],
    charisma: ['deception', 'intimidation', 'performance', 'persuasion']
};

const toCamelCase = (str: string) => str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '');

const LabeledInput = ({ label, id, ...props }: { label: any, id: any, [x: string]: any }) => (
    <div className="flex flex-col-reverse">
        <input id={id} {...props} className="bg-transparent border-b-2 border-stone-500 focus:border-stone-800 focus:outline-none text-center peer font-roboto-slab"/>
        <label htmlFor={id} className="text-xs uppercase font-bold text-stone-600 text-center peer-focus:text-stone-900 font-signika">{label}</label>
    </div>
);

// FIX: Update TitledBox to use React.FC for consistent and correct typing.
const TitledBox: React.FC<{ title: string; children: React.ReactNode; className?: string; }> = ({ title, children, className = '' }) => (
    <div className={`border-double border-4 rounded-lg border-dnd-olive ${className}`}>
        <h2 className="text-center text-xs uppercase font-bold py-1 font-modesto tracking-wider" style={{ color: 'var(--dnd5e-color-olive)', backgroundColor: 'rgba(0,0,0,0.05)' }}>{title}</h2>
        <div className="p-2">{children}</div>
    </div>
);

const TextAreaBox = ({ title, ...props }: { title: any; [x: string]: any }) => (
    <div className="border-double border-4 rounded-lg border-dnd-olive flex flex-col h-full">
        <h2 className="text-center text-xs uppercase font-bold py-1 font-modesto tracking-wider flex-shrink-0" style={{ color: 'var(--dnd5e-color-olive)', backgroundColor: 'rgba(0,0,0,0.05)' }}>{title}</h2>
        <div className="flex-grow min-h-0">
             <textarea {...props} className="w-full h-full bg-transparent resize-none focus:outline-none p-2 text-sm font-roboto-slab" />
        </div>
    </div>
);

// FIX: Define props for EditableAbilityScore and use React.FC to handle React-specific props like 'key'.
interface EditableAbilityScoreProps {
    name: string;
    score: string;
    onScoreChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    savingThrow: { proficient: boolean };
    onSavingThrowChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    skills: Record<string, { proficient: boolean }>;
    onSkillChange: (skillKey: string, proficient: boolean) => void;
    proficiencyBonus: string;
    onStatRoll: (name: string, modifier: number) => void;
}

const EditableAbilityScore: React.FC<EditableAbilityScoreProps> = ({ 
    name, score, onScoreChange, savingThrow, onSavingThrowChange, skills, onSkillChange, 
    proficiencyBonus, onStatRoll 
}) => {
    const modifier = score ? Math.floor((parseInt(score, 10) - 10) / 2) : 0;
    const modString = modifier >= 0 ? `+${modifier}` : `${modifier}`;
    const profBonusValue = proficiencyBonus ? parseInt(proficiencyBonus.toString().replace('+', ''), 10) || 0 : 0;
    
    const handleAbilityRoll = () => onStatRoll(name.charAt(0).toUpperCase() + name.slice(1), modifier);

    const handleSavingThrowRoll = () => {
        const savingThrowModifier = modifier + (savingThrow.proficient ? profBonusValue : 0);
        onStatRoll(`${name.charAt(0).toUpperCase() + name.slice(1)} Saving Throw`, savingThrowModifier);
    };

    return (
        <div className="border-double border-4 rounded-lg p-2 text-center border-dnd-olive">
            <button 
              type="button"
              onClick={handleAbilityRoll}
              title={`Roll a ${name} check`}
              className="font-bold uppercase font-modesto w-full text-center hover:text-[var(--dnd5e-color-olive)] transition-colors"
            >
                {name}
            </button>
            <div className="text-5xl font-bold my-2 font-roboto-slab">{modString}</div>
            <input type="text" value={score} onChange={onScoreChange} className="w-20 bg-transparent border-b-2 border-stone-500 focus:border-stone-800 focus:outline-none text-center text-xl p-1 font-roboto-slab" />
            <div className="mt-4">
                <div className="flex items-center justify-center gap-2 border border-stone-400 rounded-full p-1">
                    <input type="checkbox" checked={savingThrow.proficient} onChange={onSavingThrowChange} className="form-checkbox h-4 w-4 bg-transparent border-stone-600 rounded-sm text-stone-900 focus:ring-stone-900 focus:ring-offset-0" />
                    <button type="button" onClick={handleSavingThrowRoll} className="text-sm font-bold font-signika hover:text-stone-600">Saving Throw</button>
                </div>
                {ABILITY_SKILLS_MAP[name as keyof typeof ABILITY_SKILLS_MAP].map(skillName => {
                    const skillKey = toCamelCase(skillName);
                    const isProficient = skills[skillKey]?.proficient || false;
                    const skillValue = modifier + (isProficient ? profBonusValue : 0);
                    const skillValueString = skillValue >= 0 ? `+${skillValue}` : `${skillValue}`;

                    const handleSkillRoll = () => onStatRoll(skillName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), skillValue);

                    return (
                        <div key={skillKey} className="flex items-center justify-between gap-2 mt-2">
                             <input 
                                 type="checkbox" 
                                 id={`${skillKey}-checkbox-modal`}
                                 checked={isProficient} 
                                 onChange={(e) => onSkillChange(skillKey, e.target.checked)} 
                                 className="form-checkbox h-4 w-4 bg-transparent border-stone-600 rounded-sm text-stone-900 focus:ring-stone-900 focus:ring-offset-0"
                             />
                             <label htmlFor={`${skillKey}-checkbox-modal`} className="text-sm capitalize flex-grow text-left ml-2 flex justify-between items-center w-full cursor-pointer font-signika">
                                <button type="button" onClick={handleSkillRoll} className="text-left hover:text-stone-600">{skillName}</button>
                                <span className="font-bold mr-1 text-stone-800 border-b border-stone-400 px-1 font-roboto-slab">{skillValueString}</span>
                             </label>
                         </div>
                    );
                })}
            </div>
        </div>
    );
};


const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({ sheet, onClose, onStatRoll, onSave }) => {
    const [draftSheet, setDraftSheet] = useState<CharacterSheet>(() => JSON.parse(JSON.stringify(sheet)));

    const isDirty = JSON.stringify(sheet) !== JSON.stringify(draftSheet);

    const handleChange = (path: string, value: any) => {
        setDraftSheet(prev => {
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
    
    const handleSave = () => {
        if (isDirty) {
            onSave(draftSheet);
        }
    };

    return (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2"
          onClick={onClose}
          aria-modal="true"
          role="dialog"
        >
            <form 
              className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col"
              onClick={e => e.stopPropagation()}
              onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            >
                <header className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800 flex-shrink-0">
                    <h2 className="text-2xl font-modesto text-amber-300">
                        {draftSheet.coreIdentity.characterName || "Character Sheet"}
                    </h2>
                    <div className="flex items-center gap-4">
                         <button 
                            type="submit"
                            disabled={!isDirty}
                            className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold font-roboto-slab transition-colors disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                        >
                            Save
                        </button>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-3xl">&times;</button>
                    </div>
                </header>
                <div className="p-4 overflow-y-auto text-black" style={{ backgroundImage: 'var(--dnd5e-sheet-background)', backgroundColor: 'var(--dnd5e-sheet-color)', scrollbarWidth: 'thin' }}>
                     {/* Header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="md:col-span-1">
                            <LabeledInput id="characterName-modal" label="Character Name" value={draftSheet.coreIdentity.characterName} onChange={e => handleChange('coreIdentity.characterName', e.target.value)} required className="text-2xl" />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-2">
                            <LabeledInput id="background-modal" label="Background" value={draftSheet.coreIdentity.background} onChange={e => handleChange('coreIdentity.background', e.target.value)} />
                            <LabeledInput id="class-modal" label="Class" value={draftSheet.coreIdentity.class} onChange={e => handleChange('coreIdentity.class', e.target.value)} required />
                            <LabeledInput id="level-modal" label="Level" value={draftSheet.coreIdentity.level} onChange={e => handleChange('coreIdentity.level', e.target.value)} />
                            <LabeledInput id="xp-modal" label="XP" value={draftSheet.coreIdentity.xp} onChange={e => handleChange('coreIdentity.xp', e.target.value)} />
                            <LabeledInput id="species-modal" label="Species" value={draftSheet.coreIdentity.species} onChange={e => handleChange('coreIdentity.species', e.target.value)} />
                            <LabeledInput id="subclass-modal" label="Subclass" value={draftSheet.coreIdentity.subclass} onChange={e => handleChange('coreIdentity.subclass', e.target.value)} />
                        </div>
                    </div>
                     {/* Main Body */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <TitledBox title="Proficiency Bonus"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent focus:outline-none font-roboto-slab" value={draftSheet.stats.proficiencyBonus} onChange={e => handleChange('stats.proficiencyBonus', e.target.value)} /></TitledBox>
                                <TitledBox title="Heroic Inspiration"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent focus:outline-none font-roboto-slab" value={draftSheet.combat.heroicInspiration} onChange={e => handleChange('combat.heroicInspiration', e.target.value)} /></TitledBox>
                            </div>
                            {Object.keys(ABILITY_SKILLS_MAP).map(ability => (
                                <EditableAbilityScore 
                                    key={ability}
                                    name={ability}
                                    score={(draftSheet.stats.abilities as any)[ability]}
                                    onScoreChange={e => handleChange(`stats.abilities.${ability}`, e.target.value)}
                                    savingThrow={(draftSheet.stats.savingThrows as any)[ability]}
                                    onSavingThrowChange={e => handleChange(`stats.savingThrows.${ability}.proficient`, e.target.checked)}
                                    skills={draftSheet.stats.skills}
                                    onSkillChange={(skillKey, proficient) => handleChange(`stats.skills.${skillKey}.proficient`, proficient)}
                                    proficiencyBonus={draftSheet.stats.proficiencyBonus}
                                    onStatRoll={onStatRoll}
                                />
                            ))}
                        </div>
                        {/* Right Column */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                <TitledBox title="Armor Class"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent font-roboto-slab focus:outline-none" value={draftSheet.combat.armorClass} onChange={e => handleChange('combat.armorClass', e.target.value)} /></TitledBox>
                                <TitledBox title="Shield"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent font-roboto-slab focus:outline-none" value={draftSheet.combat.shield} onChange={e => handleChange('combat.shield', e.target.value)} /></TitledBox>
                                <TitledBox title="Initiative"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent font-roboto-slab focus:outline-none" value={draftSheet.combat.initiative} onChange={e => handleChange('combat.initiative', e.target.value)} /></TitledBox>
                                <TitledBox title="Speed"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent font-roboto-slab focus:outline-none" value={draftSheet.combat.speed} onChange={e => handleChange('combat.speed', e.target.value)} /></TitledBox>
                                <TitledBox title="Size"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent font-roboto-slab focus:outline-none" value={draftSheet.characterDetails.size} onChange={e => handleChange('characterDetails.size', e.target.value)} /></TitledBox>
                                <div className="md:col-span-3 lg:col-span-3">
                                    <TitledBox title="Hit Points"><div className="grid grid-cols-3 gap-2"><LabeledInput id="hpCurrent-modal" label="Current" value={draftSheet.combat.hitPoints.current} onChange={e => handleChange('combat.hitPoints.current', e.target.value)} /><LabeledInput id="hpMax-modal" label="Max" value={draftSheet.combat.hitPoints.max} onChange={e => handleChange('combat.hitPoints.max', e.target.value)} /><LabeledInput id="hpTemp-modal" label="Temp" value={draftSheet.combat.hitPoints.temporary} onChange={e => handleChange('combat.hitPoints.temporary', e.target.value)} /></div></TitledBox>
                                </div>
                                <div className="md:col-span-2 lg:col-span-2">
                                    <TitledBox title="Hit Dice"><div className="grid grid-cols-2 gap-2"><LabeledInput id="hdSpent-modal" label="Spent" value={draftSheet.combat.hitDice.spent} onChange={e => handleChange('combat.hitDice.spent', e.target.value)} /><LabeledInput id="hdMax-modal" label="Max" value={draftSheet.combat.hitDice.max} onChange={e => handleChange('combat.hitDice.max', e.target.value)} /></div></TitledBox>
                                </div>
                                <TitledBox title="Passive Perception"><input type="text" className="w-full text-center text-3xl font-bold bg-transparent font-roboto-slab focus:outline-none" value={draftSheet.stats.passivePerception} onChange={e => handleChange('stats.passivePerception', e.target.value)} /></TitledBox>
                            </div>
                             <TitledBox title="Weapons & Damage Cantrips">
                                <div className="grid grid-cols-12 gap-x-2 text-center text-xs font-bold uppercase mb-1 font-signika">
                                    <div className="col-span-4">Name</div><div className="col-span-2">Atk Bonus / DC</div><div className="col-span-3">Damage & Type</div><div className="col-span-3">Notes</div>
                                </div>
                                {draftSheet.attacksSpellcasting.attacks.map((atk, i) => (
                                     <div key={i} className="grid grid-cols-12 gap-x-2 mb-1">
                                        <input className="col-span-4 border-b border-stone-400 bg-transparent font-roboto-slab focus:outline-none" value={atk.name} onChange={e => handleChange(`attacksSpellcasting.attacks.${i}.name`, e.target.value)} />
                                        <input className="col-span-2 border-b border-stone-400 bg-transparent text-center font-roboto-slab focus:outline-none" value={atk.bonus} onChange={e => handleChange(`attacksSpellcasting.attacks.${i}.bonus`, e.target.value)} />
                                        <input className="col-span-3 border-b border-stone-400 bg-transparent text-center font-roboto-slab focus:outline-none" value={atk.damage} onChange={e => handleChange(`attacksSpellcasting.attacks.${i}.damage`, e.target.value)} />
                                        <input className="col-span-3 border-b border-stone-400 bg-transparent font-roboto-slab focus:outline-none" value={atk.notes} onChange={e => handleChange(`attacksSpellcasting.attacks.${i}.notes`, e.target.value)} />
                                    </div>
                                ))}
                            </TitledBox>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
                               <TextAreaBox title="Appearance" value={draftSheet.characterDetails.appearance} onChange={e => handleChange('characterDetails.appearance', e.target.value)} />
                               <TextAreaBox title="Backstory & Personality" value={draftSheet.characterDetails.backstoryAndPersonality} onChange={e => handleChange('characterDetails.backstoryAndPersonality', e.target.value)} />
                            </div>
                        </div>
                    </div>
                    {/* Page 2 Divider */}
                    <hr className="my-6 border-t-2 border-gray-300"/>

                    {/* Page 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="space-y-4">
                            <div className="h-48">
                                <TextAreaBox title="Languages" value={draftSheet.characterDetails.languages} onChange={e => handleChange('characterDetails.languages', e.target.value)} />
                            </div>
                             <div className="h-48">
                                <TextAreaBox title="Equipment" value={draftSheet.equipment.list} onChange={e => handleChange('equipment.list', e.target.value)} />
                             </div>
                             <TitledBox title="Coins">
                                <div className="grid grid-cols-5 gap-2">
                                    <LabeledInput id="moneyCP-modal" label="CP" value={draftSheet.equipment.money.cp} onChange={e => handleChange('equipment.money.cp', e.target.value)} />
                                    <LabeledInput id="moneySP-modal" label="SP" value={draftSheet.equipment.money.sp} onChange={e => handleChange('equipment.money.sp', e.target.value)} />
                                    <LabeledInput id="moneyEP-modal" label="EP" value={draftSheet.equipment.money.ep} onChange={e => handleChange('equipment.money.ep', e.target.value)} />
                                    <LabeledInput id="moneyGP-modal" label="GP" value={draftSheet.equipment.money.gp} onChange={e => handleChange('equipment.money.gp', e.target.value)} />
                                    <LabeledInput id="moneyPP-modal" label="PP" value={draftSheet.equipment.money.pp} onChange={e => handleChange('equipment.money.pp', e.target.value)} />
                                </div>
                             </TitledBox>
                        </div>
                         <div className="lg:col-span-2 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-64">
                                <TextAreaBox title="Class Features" value={draftSheet.featuresTraits.classFeatures} onChange={e => handleChange('featuresTraits.classFeatures', e.target.value)} />
                                <TextAreaBox title="Species Traits" value={draftSheet.featuresTraits.speciesTraits} onChange={e => handleChange('featuresTraits.speciesTraits', e.target.value)} />
                                <TextAreaBox title="Feats" value={draftSheet.featuresTraits.feats} onChange={e => handleChange('featuresTraits.feats', e.target.value)} />
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <LabeledInput id="spellAbility-modal" label="Spellcasting Ability" value={draftSheet.attacksSpellcasting.spellcasting.ability} onChange={e => handleChange('attacksSpellcasting.spellcasting.ability', e.target.value)} />
                                <LabeledInput id="spellModifier-modal" label="Spellcasting Modifier" value={draftSheet.attacksSpellcasting.spellcasting.modifier} onChange={e => handleChange('attacksSpellcasting.spellcasting.modifier', e.target.value)} />
                                <LabeledInput id="spellSaveDC-modal" label="Spell Save DC" value={draftSheet.attacksSpellcasting.spellcasting.saveDC} onChange={e => handleChange('attacksSpellcasting.spellcasting.saveDC', e.target.value)} />
                                <LabeledInput id="spellAttackBonus-modal" label="Spell Attack Bonus" value={draftSheet.attacksSpellcasting.spellcasting.attackBonus} onChange={e => handleChange('attacksSpellcasting.spellcasting.attackBonus', e.target.value)} />
                             </div>
                             <div className="h-80">
                                <TextAreaBox title="Cantrips & Prepared Spells" value={draftSheet.attacksSpellcasting.spells} onChange={e => handleChange('attacksSpellcasting.spells', e.target.value)} />
                             </div>
                         </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CharacterSheetModal;