/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  sender: 'user' | 'model' | 'error' | 'system';
  text: string;
  hidden?: boolean;
}

export interface GameSettings {
  tone: 'heroic' | 'gritty' | 'comedic';
  narration: 'concise' | 'descriptive' | 'cinematic';
}

export interface UISettings {
  enterToSend: boolean;
  fontSize: 'small' | 'medium' | 'large';
  experimentalUploadLimit: boolean;
}

export interface AbilityScore {
  score: number;
  modifier: string;
}

export interface Skill {
  name: string;
  proficient: boolean;
}

export interface Achievement {
  name: string;
  description: string;
}

export interface CharacterSheetData {
  name: string;
  race: string;
  class: string;
  level: number;
  abilityScores: {
    STR: AbilityScore;
    DEX: AbilityScore;
    CON: AbilityScore;
    INT: AbilityScore;
    WIS: AbilityScore;
    CHA: AbilityScore;
  };
  armorClass: number;
  hitPoints: {
    current: number;
    max: number;
  };
  speed: string;
  skills: Skill[];
  featuresAndTraits: string[];
  backstory?: string;
}

export interface NPCState {
    name: string;
    description: string;
    relationship: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  isPinned: boolean;
  createdAt: number;
  adminPassword?: string;
  personaId?: string;
  creationPhase?: 'guided' | 'character_creation' | 'narrator_selection' | 'world_creation' | 'quick_start_selection' | 'quick_start_password' | false;
  characterSheet?: CharacterSheetData | string;
  inventory?: string;
  characterImageUrl?: string;
  questLog?: string;
  npcList?: NPCState[];
  achievements?: Achievement[];
  settings?: GameSettings;
  quickStartChars?: CharacterSheetData[];
}

export interface DMPersona {
  id: string;
  name: string;
  description: string;
  getInstruction: (password: string) => string;
}