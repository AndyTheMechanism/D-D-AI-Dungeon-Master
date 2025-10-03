import React, { createContext, useReducer, useContext, Dispatch } from 'react';
import { GameMessage, CharacterSheet, Quest, PersonalNote, DmModel, MapState, RollType } from '../types';
import { Chat } from '@google/genai';

// State shape
interface GameState {
    gameLog: GameMessage[];
    isLoading: boolean;
    error: string | null;
    gameStarted: boolean;
    characterSheet: CharacterSheet | null;
    quests: Quest[];
    personalNotes: PersonalNote[];
    dmModel: DmModel;
    chat: Chat | null;
    mapState: MapState | null;
    pendingOocMessage: string | null;
    rollType: RollType;
}

// Initial state
const initialState: GameState = {
    gameLog: [],
    isLoading: false,
    error: null,
    gameStarted: false,
    characterSheet: null,
    quests: [],
    personalNotes: [],
    dmModel: 'gemini-2.5-pro',
    chat: null,
    mapState: null,
    pendingOocMessage: null,
    rollType: 'normal',
};

// Action types
export type Action =
    | { type: 'START_GAME_INIT'; payload: { chat: Chat; sheet: CharacterSheet } }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'ADD_PLAYER_MESSAGE'; payload: GameMessage }
    | { type: 'ADD_RESPONSE_MESSAGES'; payload: { messages: GameMessage[]; newSheet?: CharacterSheet; newQuests?: Quest[]; updatedQuests?: Quest[], newMap?: MapState } }
    | { type: 'PLAYER_ACTION_ERROR' }
    | { type: 'UPDATE_SHEET'; payload: CharacterSheet }
    | { type: 'UPDATE_NOTES'; payload: PersonalNote[] }
    | { type: 'SET_MODEL'; payload: DmModel }
    | { type: 'SET_CHAT'; payload: Chat | null }
    | { type: 'SET_PENDING_OOC_MESSAGE'; payload: string }
    | { type: 'CLEAR_PENDING_OOC_MESSAGE' }
    | { type: 'SET_ROLL_TYPE'; payload: RollType };

// Reducer
const gameReducer = (state: GameState, action: Action): GameState => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload, error: action.payload ? null : state.error };
        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };
        case 'START_GAME_INIT':
            return {
                ...state,
                gameStarted: true,
                chat: action.payload.chat,
                characterSheet: action.payload.sheet,
                isLoading: false,
                error: null,
                gameLog: [], // Clear log for new game
                mapState: null, // Clear map for new game
            };
        case 'ADD_PLAYER_MESSAGE':
            return { ...state, gameLog: [...state.gameLog, action.payload] };
        case 'PLAYER_ACTION_ERROR':
            return { ...state, gameLog: state.gameLog.slice(0, -1) };
        case 'ADD_RESPONSE_MESSAGES': {
            const { messages, newSheet, newQuests, updatedQuests, newMap } = action.payload;
            let quests = state.quests;
            if (newQuests) {
                quests = [...quests, ...newQuests];
            }
            if (updatedQuests) {
                const updatedQuestMap = new Map(updatedQuests.map(q => [q.title, q]));
                quests = quests.map(q => updatedQuestMap.get(q.title) || q);
            }
            return {
                ...state,
                gameLog: [...state.gameLog, ...messages],
                characterSheet: newSheet || state.characterSheet,
                quests,
                mapState: newMap || state.mapState,
            };
        }
        case 'UPDATE_SHEET':
            return { ...state, characterSheet: action.payload };
        case 'UPDATE_NOTES':
            return { ...state, personalNotes: action.payload };
        case 'SET_MODEL':
            return { ...state, dmModel: action.payload };
        case 'SET_CHAT':
             return { ...state, chat: action.payload };
        case 'SET_PENDING_OOC_MESSAGE':
            return { ...state, pendingOocMessage: action.payload };
        case 'CLEAR_PENDING_OOC_MESSAGE':
            return { ...state, pendingOocMessage: null };
        case 'SET_ROLL_TYPE':
            return { ...state, rollType: action.payload };
        default:
            return state;
    }
};

// Create context
const GameStateContext = createContext<GameState | undefined>(undefined);
const GameDispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

// Provider component
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    return (
        <GameStateContext.Provider value={state}>
            <GameDispatchContext.Provider value={dispatch}>
                {children}
            </GameDispatchContext.Provider>
        </GameStateContext.Provider>
    );
};

// Custom hooks to use the context
export const useGameState = (): GameState => {
    const context = useContext(GameStateContext);
    if (context === undefined) {
        throw new Error('useGameState must be used within a GameProvider');
    }
    return context;
};

export const useGameDispatch = (): Dispatch<Action> => {
    const context = useContext(GameDispatchContext);
    if (context === undefined) {
        throw new Error('useGameDispatch must be used within a GameProvider');
    }
    return context;
};