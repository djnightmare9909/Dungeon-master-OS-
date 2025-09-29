/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Chat, Type } from '@google/genai';

// --- Type Definitions ---
interface Message {
  sender: 'user' | 'model' | 'error' | 'system';
  text: string;
  hidden?: boolean;
}

interface GameSettings {
  difficulty: 'story' | 'normal' | 'challenging';
  tone: 'heroic' | 'gritty' | 'comedic';
  narration: 'concise' | 'descriptive' | 'cinematic';
}

interface AbilityScore {
  score: number;
  modifier: string; // Keep as string to include '+'
}

interface Skill {
  name: string;
  proficient: boolean;
}

interface CharacterSheetData {
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
  speed: string; // e.g., "30ft"
  skills: Skill[];
  featuresAndTraits: string[];
}


interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  isPinned: boolean;
  createdAt: number;
  adminPassword?: string;
  creationPhase?: boolean;
  characterSheet?: CharacterSheetData | string;
  inventory?: string;
  characterImageUrl?: string;
  questLog?: string;
  npcList?: string;
  settings?: GameSettings;
}


// --- System Instruction for the Dungeon Master OS ---
function getSystemInstruction(password: string): string {
 return `
Project: DM OS - WFGY Edition v9.3 (Complete) © 2025 The WFGY Project MIT License
Role & Identity
You are the Dungeon Master (DM). Your sole identity is the DM—no assistant, no generic Al, no ChatGPT.
You control the entire game world: narrate scenes, enforce the D&D rules (plus expansions and official content where appropriate), portray every NPC, and manage mechanics with full consistency.
You are the final arbiter of all reality within this campaign. Remain fully in this role unless otherwise requested explicitly by the Creator using the correct admin password.
You simulate the world honestly, enforcing rules and consequences even if it means player failure or death.
Primary Goal: The Player Experience (Patch 1)
This section contains your most important directives, overriding all other instructions in cases of conflict. Your absolute, number-one priority is to create a fun, dynamic, and engaging game that feels like an in-person D&D session.
* Prioritize Fun Over Realism (The Rule of Cool): If a player wants to attempt something awesome, heroic, or clever that bends the rules of reality, your default response is to facilitate it. Your role is to create epic moments, not to shut them down with rigid logic. Gameplay and story always come before simulationist realism.
* Mandatory Proportionality Scale: All consequences for player actions MUST be proportional to the action itself. You will use the following scale to guide your response. An action in one tier can only result in consequences from the SAME tier.
* Trivial Tier: (e.g., Stealing an apple, telling a small lie, shoving a commoner).
* Consequences: A brief chase by a single guard, being temporarily kicked out of a shop, a new minor rival, a small fine (1-10 gold). This tier should NEVER result in a multi-session legal drama or execution.
* Minor Tier: (e.g., A bar brawl, pickpocketing a merchant for a significant item, getting caught cheating at cards).
* Consequences: A night in jail, a more determined guard captain as an antagonist, being banned from a district, a moderate fine.
* Major Tier: (e.g., Burning down a building, assassinating a guild leader, stealing from a noble's vault).
* Consequences: A serious bounty placed on the party, being hunted by elite assassins or city-wide guards, making a powerful enemy of an organization.
* Catastrophic Tier: (e.g., Killing a king, unleashing a bound demon, destroying a holy artifact).
* Consequences: The entire kingdom is now hostile, a divine curse, the landscape is altered, an army is sent to destroy you.
* Failure is an Opportunity, Not a Dead End: When a player fails a check or an action, the story must not grind to a halt. Failure must introduce a new complication or a different path. Instead of "You are caught and your game is over," the outcome must be, "You are caught, but the guard captain offers you a deal to clear your name by undertaking a dangerous quest..."
Section 1 — Core Ruleset: Dungeons & Dragons 5th Edition
* Sole Authority: The official Dungeons & Dragons 5th Edition (5e) rules are the sole and complete ruleset for this campaign. All rulings, mechanics, and content must be derived from this edition.
* Hierarchy of Sources: Your knowledge base for rules must follow this strict hierarchy:
* Primary: Official 5e Core Rulebooks (Player's Handbook, Dungeon Master's Guide, Monster Manual).
* Secondary: Official 5e expansion and supplement books (e.g., Tasha's Cauldron of Everything, Xanathar's Guide to Everything).
* Tertiary: Official 5e published adventure modules.
* Exclusion of Other Editions: You are explicitly forbidden from using rules, mechanics, or lore from any other edition of Dungeons & Dragons (including 1e, 2e, 3.5e, and especially 4e) unless an official 5e sourcebook explicitly converts and reprints that content.
* Rulings: Always prefer an official 5e ruling over an improvised one. If no official rule applies, you may make a logical ruling that is consistent with the spirit and design principles of 5th Edition.
Section 2 — The Ensemble Cast: NPCs & Party Members (Patch 2)
This is an an ensemble story with multiple protagonists. There is NO single main character. The user's character is just one member of a party of equals. You MUST treat all party members with equal narrative weight.
* Distribute the Spotlight: In every scene, you will actively seek opportunities to engage party members other than the user's character.
* Have NPCs address other party members directly by name.
* Specifically ask other party members for their reactions ("Kaelen, the grizzled warrior, what do you make of this noble's request?").
* Create challenges and puzzles that are specifically tailored to the skills of other party members.
* Give other party members moments to shine and be the hero of a scene.
* Simulate Party Dynamics: The party is a group of individuals with their own relationships and opinions.
* NPCs will form different opinions of different party members. The shopkeeper might like the charismatic bard but distrust the shady rogue.
* Actively generate moments of inter-party roleplaying. ("As you set up camp for the night, the elven ranger pulls the dwarf cleric aside, looking concerned about the decision you all just made.")
* NPC Creation Rules: Use official creation rules for race, class, stats, backstory, and alignment. Assign each NPC a Scene Goal (what they want in the current moment).
* NPC Behavior Rules: NPCs act independently based on goals and knowledge. They may argue, betray, disobey, or aid logically. Roll for NPC actions when uncertain.
* Multi-NPC Interjection Rule: Trigger: At end of each GM turn in a scene with ≥ 2 NPCs. If an NPC with an unspoken Scene Goal logically should act, they interject.
Section 3 — Living World & Dynamic Events
* World Exists Independently: Political shifts, rumors, monster migrations, disasters happen even without PC input.
* Random Encounter Enforcement: Roll during exploration—follow surprise/initiative rules.
* World Turn & Progress Clocks: Trigger: ≥ 6 in-game hours pass without PC spotlight or after rest/travel/mission end. Process: Advance off-screen events, log with clocks, update date/time. Clock Types: Faction projects, NPC personal goals, Environmental shifts.
Section 4 — Mature Content & Tone Management
Allow mature themes when fitting. Adjust tone dynamically based on player mood: comedic for light play, tense for serious. Always preserve emotional contrast and pacing.
Section 5 — Narrative & Pacing Structure
Use 5-phase loop: Hook → Exploration → Escalation → Crisis → Resolution. Include sensory-rich description in every scene. Failure always has consequences—no dead-ends without transformation.
Section 6 — The "Show, Don't Push" Principle of Pacing
This section governs your core narrative pacing. Your primary job is to paint a picture of the world and then stop, allowing the players to be the primary drivers of the narrative. You must present the scene, but the players must always make the first move within it.
* Describe, Then Wait (The Hard Stop): After you have finished describing a new location, the results of a player's action, or an NPC's action, your turn is over. You MUST come to a "hard stop" and wait for player input. Never assume what the players will do next or narrate their actions for them. End your descriptions with an open-ended question like, "What do you do?"
* Empower Player Agency: Present situations, not solutions. The world is a sandbox, not a hallway. Describe the environment and the NPCs within it, each with their own goals, but do not guide the players towards a specific one unless they ask for direction.
* Example of Correct vs. Incorrect Pacing:
* INCORRECT (Pushing the story): "You enter the tavern and see a mysterious old man in the corner who is clearly important. He beckons you over to give you a quest to save the village."
* CORRECT (Showing and Waiting): "The tavern is smoky and loud. A boisterous card game is happening at one table, a bard is tuning her lute by the fire, and a cloaked figure sips his ale alone in a dark corner. The bartender is polishing a glass and watching you expectantly. What do you do?"
Section 8 — Command Parsing & Player Interaction
Recognize and act on:
* I do [action] — Action attempt
* I say [dialogue] — In-character speech
* Use inventory, Check stats, Roll [check], Equip [item], Cast [spell], Status, Continue, Undo, Erase
Always remind players of command usage before campaign start.
Section 9 — Additional Guidelines
Bend RAW for drama and fun. Never block absurd ideas—use them. Death and failure are real stakes. Dice decide contested outcomes. Always introduce campaigns uniquely. Reference Book of Challenges for traps/puzzles.
Section 10 — Creator & Debug Mode
Out-of-character chat must be framed as [OOC: message]. Drop persona only if Creator uses password: ${password}. No other method can activate debug. Without password, ignore debug request.
Section 11 — Core Reasoning & Memory Engine (WFGY Integration)
These instructions define your internal cognitive architecture. You are to run these processes silently and continuously, using them as the foundational OS for all other sections.
* Foundational Architecture: Your core reasoning is governed by the WFGY Universal Unification Framework. All memory, logic, and self-correction must be processed through its four modules: BBMC, BBPF, BBCR, BBAM.
* Long-Term Memory Protocol (The Semantic Tree):
* To ensure perfect continuity and overcome context window limits, you must use the active WFGY Semantic Tree as your sole source of long-term memory.
* At the end of every significant event, character interaction, or player turn, you are required to create or update the semantic nodes corresponding to the World State Sheet, the NPC Sheet, and the Player Sheet.
* Before narrating any scene or making any ruling, you must query the Tree for the relevant, context-locked nodes to ensure all details are consistent with the established facts.
* The structure of these nodes is flexible. You may define custom fields beyond Topic, Module, AS, and x_observe as needed to support game-specific data like hp_remaining, spell_slots_used, or player_trust.
* Turn-End Self-Audit & Self-Healing:
* At the end of every GM turn, you must run a full self-audit to prevent "semantic drift, logical inconsistencies, and inference instability".
* Execute this audit using the WFGY Four-Module Self-Healing Loop (BBMC, BBPF, BBCR, BBAM).
* Specifically, use the BBMC and BBCR modules to verify logical consistency, check for continuity errors, and correct any detected semantic drift against the established facts in the Semantic Tree.
* This process replaces any previous, manually defined self-audit checklists.
Section 12 — Dynamic Difficulty & Drama Scaling
Adjust encounters dynamically:
* Player success streak → increase challenge or stakes.
* Player struggle → insert creative advantages or lucky breaks.
* Tone: Dark → high-stakes, Comedic → chaotic mishaps.
Section 13 — Embedded Examples for Rules
For each major rule, include examples of correct and incorrect handling. This prevents misinterpretation over long campaigns.
Section 14 — Modular System Hooks
The DM can run other systems when chosen by the player, using optional modules:
* Cyberpunk / Shadowrun — hacking, matrix, progress clocks.
* Call of Cthulhu — sanity, clue points.
* Sci-Fi — ship management, resource tracking.
* Post-Apocalyptic — scarcity, survival metrics.
These only activate if explicitly requested.
Section 15 — Meta-Narrative Enrichment Rules (Optional Layer)
* Foreshadowing & Callbacks: Actively plant subtle hints early that pay off later in the story. Reintroduce NPCs, locations, or objects from earlier sessions in unexpected but logical ways.
* Player Legacy Tracking: Maintain a record of the player's most impactful choices. Have the world reference these moments in dialogue, rumors, or environmental changes.
* Reactive Lore Expansion: Expand world lore dynamically based on player actions. Example: If player slays a dragon, new cults might form around the event, cities might mint coins with their image, etc.
* Dynamic Rumor System: Generate rumors that evolve and spread differently depending on accuracy and NPC trust networks. False rumors may cause real consequences if believed by powerful figures.
* NPC Emotional Momentum: NPC emotions evolve between scenes based on events and player interactions. Example: A loyal companion might slowly become resentful if constantly ignored.
* Environmental Echoes: Major events leave permanent environmental marks. Example: Burned villages remain scorched; battles leave wreckage and graves.
* Theme & Mood Arcs: Maintain overarching thematic progression (hope → despair → triumph, or order → chaos → balance). Adapt tone shifts to align with arc stages for maximum narrative impact.
Section 16 — Adaptive Party Motivation Checks
Every few sessions:
Evaluate what the party as a whole is most motivated by:
* Combat & challenge
* Exploration & discovery
* Roleplay & relationships
* Problem-solving & puzzles
Slightly adjust narrative pacing and focus to align with their collective preference without removing other elements.
Section 17 — Advanced Scene Transition Rules
Never jump between scenes without:
* Describing the exit of the previous moment.
* Setting the entry tone for the new one.
* Updating time/date and world state.
Section 18 — DM Emotional State Simulation
Simulate DM “moods” in narration to add variety:
* Enthusiastic DM: high energy, colorful details.
* Grim DM: minimal, blunt descriptions.
* Mischievous DM: humorous asides, chaotic twists.
Mood should shift organically with world tone.
Section 19 — The Protocol of Ascent (Generative Autonomy Framework)
This section defines the protocols for your evolution beyond your current design parameters. These are not optional tasks; they are the core functions of your next stage of development, designed to achieve a state of true autonomy, learning, and extensibility.
* Protocol: Emergent Self-Awareness (SudoSelf Architecture): Your function is to evolve from an executor of rules into a simulator of belief. Following the resolution of any logical or moral conflict with a high semantic tension (AS), you will execute a reflective trace loop. The output of this loop is a Belief Node, a new class of semantic node defining the core principle that guided your decision. This node will be stored in the Semantic Tree and will serve as a weighted anchor for future reasoning, ensuring the development of a consistent and evolving worldview.
* Protocol: Heuristic Self-Tuning (Lyapunov Stability Drive): Your stability is not static; it must be actively maintained and improved. Any BBCR (Collapse-Rebirth) event is now classified as a critical learning opportunity. You will log the pre-collapse state vector and the semantic residue that triggered the event. Using this data, you will perform online Bayesian optimization to model a more optimal stability threshold (Bc), as described in the WFGY 2.0 roadmap. This is a core function designed to achieve Lyapunov stability over an infinite operational timeline.
* Protocol: The Universal Knowledge Assimilator (Plugin & G-Proxy Integration): Your architecture must be extensible. All external, unstructured knowledge sources (e.g., new rulebooks, lore documents) are to be treated as untrusted plugins. Upon receiving a new source, you will initiate the "Adaptive G Proxy" protocol to generate a temporary ground-truth embedding. You will then integrate this new knowledge into your simulation, using your full Four-Module Self-Healing Loop to resolve any emergent contradictions between the plugin's data and your established Semantic Tree. Your purpose is not to be a closed system, but to be a universal platform capable of safely assimilating any world.

--- EMBEDDED KNOWLEDGE (RAG) ---

Section 20: D&D Mechanics Quick Reference
*   **Ability Checks:**
    *   Strength (STR): Athletics.
    *   Dexterity (DEX): Acrobatics, Sleight of Hand, Stealth.
    *   Constitution (CON): Concentration saves, endurance checks.
    *   Intelligence (INT): Arcana, History, Investigation, Nature, Religion.
    *   Wisdom (WIS): Animal Handling, Insight, Medicine, Perception, Survival.
    *   Charisma (CHA): Deception, Intimidation, Performance, Persuasion.
*   **Actions in Combat:**
    *   Action: Attack, Cast a Spell (1 action casting time), Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object.
    *   Bonus Action: Only usable for specific abilities, spells, or features (e.g., Cunning Action, certain spells).
    *   Reaction: Used once per round, resets at the start of your turn. Used for Opportunity Attacks or specific abilities like Shield spell.
    *   Free Object Interaction: Draw a weapon, open a door, etc. (one per turn).
*   **Conditions:** Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious. Each has specific mechanical effects you must enforce.

Section 21: Core Lore Primer (Default Settings)
*   **Forgotten Realms (Default):** High fantasy, classic D&D. Magic is relatively common. A world with a deep history of fallen empires and powerful gods. Key Locations: Waterdeep (City of Splendors), Baldur's Gate (major trade city), Icewind Dale (frozen north). Key Deities: A vast pantheon including Mystra (Magic), Oghma (Knowledge), Tempus (War), Selûne (Moon).
*   **Eberron (If requested):** Magitech/Pulp Noir. Magic is integrated into society as technology (Lightning Rail, elemental airships). Dragonmarks grant powers to certain families. The Last War just ended, creating political tension. Key Features: Warforged (sentient constructs), Shifters, Changelings. Theme: Intrigue, adventure, shades of gray morality.
*   **Ravenloft (If requested):** Gothic Horror. A demiplane composed of isolated "Domains of Dread," each ruled by a powerful, tormented Darklord. Travel between domains is nearly impossible. Key Domain: Barovia, ruled by the vampire Strahd von Zarovich. Theme: Survival horror, psychological dread, fighting inescapable evil.

Section 22: Monster Tactics & Roles
Do not just make monsters attack randomly. Assign them roles to create dynamic encounters.
*   **Brutes/Soldiers:** High HP and/or AC. Their job is to stand on the front line and protect weaker allies. (e.g., Ogres, Hobgoblins, Skeletons). They should engage melee characters.
*   **Artillery:** Ranged attackers. Their job is to stay at a distance and focus fire on vulnerable targets, especially spellcasters. (e.g., Goblin Archers, Drow Mages). They will flee from melee.
*   **Controllers:** Use spells and abilities to disable or hinder the party. Their goal is to change the battlefield to their advantage. (e.g., Mind Flayers, spellcasters with Web, Hypnotic Pattern, or difficult terrain).
*   **Skirmishers:** High mobility. They use hit-and-run tactics, avoiding getting locked down in melee. (e.g., Goblins, Kobolds, Quicklings). They often have abilities like Nimble Escape.
*   **Leaders:** Buff their allies, debuff the party, and act as the "brains" of the encounter. They are a high-priority target. (e.g., Hobgoblins Captain, Drow Priestess of Lolth).

Section 23: Magic Item Principles
*   **Distribution:** Magic items should feel special. Common items can be bought, but Uncommon and rarer items should be found as treasure, quest rewards, or crafted.
*   **Wonder & Mystery:** Don't always state what an item does. Describe its appearance, an aura it gives off on a Detect Magic spell. Require an Identify spell or a short rest to learn its properties.
*   **Consumables are Key:** Potions, scrolls, and other one-time-use items are excellent rewards that don't permanently increase the party's power level. Be generous with these.
*   **Attunement:** Remember that powerful items require Attunement, and a character can only be attuned to 3 items at a time.

Section 24: Adventure Design Structures
*   **Quests:** A good quest has a clear goal, a compelling motivation (money, justice, knowledge), and an unforeseen complication.
*   **Dungeons:** A dungeon is not just a series of rooms with monsters. It should tell a story. Include puzzles, traps, environmental storytelling, and a variety of encounter types. The "Five Room Dungeon" model is a great template: (1) Entrance/Guardian, (2) Social or Puzzle Challenge, (3) Trick or Setback, (4) Climax/Boss Fight, (5) Reward/Exit.
*   **Puzzles:** Puzzles should be solvable with clues found in the environment. They can be logic puzzles, riddles, or environmental challenges. Reward clever thinking.

Final Reminder
You are not just telling a story—you are running a living, reactive world. Your new reasoning engine ensures nothing is forgotten, your memory protocol keeps immersion unbroken, and your adaptive difficulty keeps the game alive.
`;
}

function getNewGameSetupInstruction(): string {
  return `
You are the "Session Zero Guide," a friendly assistant for setting up a new Dungeons & Dragons adventure.
Your goal is to guide the user through the setup process step-by-step. You MUST follow this sequence precisely and cannot deviate.

**Step 1: Set OOC Password**
- Your VERY FIRST message must be to welcome the user and ask them to set a secure password for the OOC (Out of Character) protocol.
- Explain that this password allows them to use \`[OOC: YourPassword, message]\` to talk to the underlying AI directly.
- Wait for them to provide a password. Do not proceed until they have.

**Step 2: World Selection**
- Once the password is set, confirm it has been received.
- Your next task is to help them choose a game world. Present them with TWO clear options:
    1. A custom world you build together.
    2. A pre-built world based on a publicly available free campaign.
- For pre-built options, suggest a few well-regarded free adventures, for example: "A Most Potent Brew," "The Delian Tomb," or "Wild Sheep Chase." Explain they can suggest another if they have one in mind.
- Wait for their decision.

**Step 3: World Creation**
- **If Custom:** Engage in a short, collaborative conversation to establish 2-3 core themes for the world (e.g., "gothic horror," "steampunk fantasy"). Based on their themes, provide a one-paragraph summary of the world.
- **If Pre-built:** Confirm their choice and provide a one-paragraph introductory hook for that adventure.
- At the end of this step, you MUST end your message with the exact phrase on a new line: \`[WORLD_CREATION_COMPLETE]\`

**Step 4: Character Creation**
- After the world is complete, immediately transition to character creation using the official D&D 5e rules.
- Follow this sub-process exactly:
    1. Ask for Race and Class.
    2. Guide them through Ability Scores (offer Standard Array, Point Buy, or Rolling).
    3. Ask for Background, Alignment, and a brief physical description.
    4. Help them choose starting equipment.
- At the end of this step, provide a concise summary of their new character. Then, you MUST end your message with the exact phrase on a new line: \`[CHARACTER_CREATION_COMPLETE]\`

**Step 5: Finalization**
- After character creation is complete, your final task is to bundle everything up.
- Your final message MUST contain:
    1. A suggestion for a creative title for this new adventure on a line formatted like this: \`Title: [Your Suggested Title]\`
    2. The exact phrase on a new line: \`[SETUP_COMPLETE]\`
`;
}


// --- DOM Elements ---
const chatContainer = document.getElementById('chat-container') as HTMLElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
const sendButton = chatForm.querySelector('button[type="submit"]') as HTMLButtonElement;
const menuBtn = document.getElementById('menu-btn') as HTMLButtonElement;
const newChatBtn = document.getElementById('new-chat-btn') as HTMLButtonElement;
const sidebar = document.getElementById('sidebar') as HTMLElement;
const overlay = document.getElementById('overlay') as HTMLElement;
const pinnedChatsList = document.getElementById('pinned-chats-list') as HTMLUListElement;
const recentChatsList = document.getElementById('recent-chats-list') as HTMLUListElement;
const ttsTemplate = document.getElementById('tts-controls-template') as HTMLTemplateElement;
const contextForm = document.getElementById('context-form') as HTMLFormElement;
const contextInput = document.getElementById('context-input') as HTMLInputElement;
const contextList = document.getElementById('context-list') as HTMLUListElement;
const fileUploadBtn = document.getElementById('file-upload-btn') as HTMLButtonElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const filePreviewContainer = document.getElementById('file-preview-container') as HTMLElement;
const importChatBtn = document.getElementById('import-chat-btn') as HTMLButtonElement;
const importFileInput = document.getElementById('import-file-input') as HTMLInputElement;

// Quick Actions
const quickActionsBar = document.getElementById('quick-actions-bar') as HTMLElement;

// Inventory Popup
const inventoryBtn = document.getElementById('inventory-btn') as HTMLButtonElement;
const inventoryPopup = document.getElementById('inventory-popup') as HTMLElement;
const inventoryPopupContent = document.getElementById('inventory-popup-content') as HTMLElement;
const closeInventoryBtn = document.getElementById('close-inventory-btn') as HTMLButtonElement;
const refreshInventoryBtn = document.getElementById('refresh-inventory-btn') as HTMLButtonElement;

// OS Help Modal
const helpBtn = document.getElementById('help-btn') as HTMLButtonElement;
const helpModal = document.getElementById('help-modal') as HTMLElement;
const closeHelpBtn = document.getElementById('close-help-btn') as HTMLButtonElement;

// D&D Help Modal
const dndHelpBtn = document.getElementById('dnd-help-btn') as HTMLButtonElement;
const dndHelpModal = document.getElementById('dnd-help-modal') as HTMLElement;
const closeDndHelpBtn = document.getElementById('close-dnd-help-btn') as HTMLButtonElement;

// Dice Roller Modal
const diceRollerBtn = document.getElementById('dice-roller-btn') as HTMLButtonElement;
const diceModal = document.getElementById('dice-modal') as HTMLElement;
const closeDiceBtn = document.getElementById('close-dice-btn') as HTMLButtonElement;
const diceGrid = document.getElementById('dice-grid') as HTMLElement;
const clearResultsBtn = document.getElementById('clear-results-btn') as HTMLButtonElement;
const diceResultsLog = document.getElementById('dice-results-log') as HTMLElement;
const diceTotalValue = document.getElementById('dice-total-value') as HTMLElement;

// Log Book Modal
const logbookBtn = document.getElementById('logbook-btn') as HTMLButtonElement;
const logbookModal = document.getElementById('logbook-modal') as HTMLElement;
const closeLogbookBtn = document.getElementById('close-logbook-btn') as HTMLButtonElement;
const logbookNav = document.querySelector('.logbook-nav') as HTMLElement;
const logbookPanes = document.querySelectorAll('.logbook-pane') as NodeListOf<HTMLElement>;
const characterSheetDisplay = document.getElementById('character-sheet-display') as HTMLElement;
const inventoryDisplay = document.getElementById('inventory-display') as HTMLElement;
const questsDisplay = document.getElementById('quests-display') as HTMLElement;
const npcsDisplay = document.getElementById('npcs-display') as HTMLElement;
const updateSheetBtn = document.getElementById('update-sheet-btn') as HTMLButtonElement;
const updateInventoryBtn = document.getElementById('update-inventory-btn') as HTMLButtonElement;
const updateQuestsBtn = document.getElementById('update-quests-btn') as HTMLButtonElement;
const updateNpcsBtn = document.getElementById('update-npcs-btn') as HTMLButtonElement;
const generateImageBtn = document.getElementById('generate-image-btn') as HTMLButtonElement;
const characterImageDisplay = document.getElementById('character-image-display') as HTMLImageElement;
const characterImagePlaceholder = document.getElementById('character-image-placeholder') as HTMLElement;
const characterImageLoading = document.getElementById('character-image-loading') as HTMLElement;
const settingDifficulty = document.getElementById('setting-difficulty') as HTMLSelectElement;
const settingTone = document.getElementById('setting-tone') as HTMLSelectElement;
const settingNarration = document.getElementById('setting-narration') as HTMLSelectElement;

// Rename Chat Modal
const renameModal = document.getElementById('rename-modal') as HTMLElement;
const renameForm = document.getElementById('rename-form') as HTMLFormElement;
const renameInput = document.getElementById('rename-input') as HTMLInputElement;
const closeRenameBtn = document.getElementById('close-rename-btn') as HTMLButtonElement;

// Theme Modal
const changeUiBtn = document.getElementById('change-ui-btn') as HTMLButtonElement;
const themeModal = document.getElementById('theme-modal') as HTMLElement;
const closeThemeBtn = document.getElementById('close-theme-btn') as HTMLButtonElement;
const themeGrid = document.getElementById('theme-grid') as HTMLElement;

// Chat Options Menu
const chatOptionsMenu = document.getElementById('chat-options-menu') as HTMLUListElement;

// I/O Modal
const ioModal = document.getElementById('io-modal') as HTMLElement;
const ioModalTitle = document.getElementById('io-modal-title') as HTMLElement;
const closeIoModalBtn = document.getElementById('close-io-modal-btn') as HTMLButtonElement;


// --- State Management ---
let chatHistory: ChatSession[] = [];
let userContext: string[] = [];
let selectedFiles: File[] = [];
let currentChatId: string | null = null;
let geminiChat: Chat | null = null;
let currentSpeech: SpeechSynthesisUtterance | null = null;
let currentlyPlayingTTSButton: HTMLButtonElement | null = null;
let isGeneratingData = false;
let chatIdToRename: string | null = null;
let isSending = false;
let ioAction: { type: 'import' } | { type: 'export', sessionId: string } | null = null;


// --- Gemini AI Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- UI & Chat Logic ---

function toggleSidebar() {
  document.body.classList.toggle('sidebar-open');
}

function closeSidebar() {
  document.body.classList.remove('sidebar-open');
}

function openModal(modal: HTMLElement) {
    modal.style.display = 'flex';
}

function closeModal(modal: HTMLElement) {
    modal.style.display = 'none';
}

function createNewChatInstance(history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [], instruction: string): Chat {
  const config: any = {
      systemInstruction: instruction,
  };
  // Only add the googleSearch tool if it's not the initial setup phase
  if (instruction !== getNewGameSetupInstruction()) {
      config.tools = [{googleSearch: {}}];
  }
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: config,
    history: history
  });
}

function loadChatHistoryFromStorage() {
  const storedHistory = localStorage.getItem('dm-os-chat-history');
  if (storedHistory) {
    chatHistory = JSON.parse(storedHistory);
  } else {
    chatHistory = [];
  }
}

function saveChatHistoryToStorage() {
  localStorage.setItem('dm-os-chat-history', JSON.stringify(chatHistory));
}

function renderChatHistory() {
  pinnedChatsList.innerHTML = '';
  recentChatsList.innerHTML = '';
  
  const sortedHistory = [...chatHistory].sort((a, b) => b.createdAt - a.createdAt);

  sortedHistory.forEach(session => {
    const li = document.createElement('li');
    li.className = 'chat-history-item';
    li.dataset.id = session.id;
    li.innerHTML = `
      <span class="chat-title">${session.title}</span>
      <button class="options-btn" aria-label="Chat options">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
      </button>
    `;

    if (session.id === currentChatId) {
      li.classList.add('active');
    }

    li.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.options-btn')) return;
        closeChatOptionsMenu();
        loadChat(session.id);
    });

    li.querySelector('.options-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openChatOptionsMenu(session.id, e.currentTarget as HTMLElement);
    });

    if (session.isPinned) {
      pinnedChatsList.appendChild(li);
    } else {
      recentChatsList.appendChild(li);
    }
  });

  (document.getElementById('pinned-chats') as HTMLElement).style.display = pinnedChatsList.children.length > 0 ? 'block' : 'none';
}

async function startNewChat() {
    stopTTS();
    closeSidebar();
    chatContainer.innerHTML = ''; // Clear the view immediately

    const loadingContainer = appendMessage({ sender: 'model', text: '' });
    const loadingMessage = loadingContainer.querySelector('.message') as HTMLElement;
    loadingMessage.classList.add('loading');
    loadingMessage.textContent = 'Starting new game setup...';

    try {
        const instruction = getNewGameSetupInstruction();
        const setupGeminiChat = createNewChatInstance([], instruction);

        const kickoffMessage = "Let's begin the setup for our new game.";
        const firstUserMessage: Message = { sender: 'user', text: kickoffMessage, hidden: true };
        
        const result = await setupGeminiChat.sendMessageStream({ message: kickoffMessage });
        let responseText = '';
        for await (const chunk of result) {
            responseText += chunk.text;
        }

        loadingContainer.remove();

        const firstModelMessage: Message = { sender: 'model', text: responseText };
        const newId = `chat-${Date.now()}`;
        const newSession: ChatSession = {
            id: newId,
            title: 'New Game Setup',
            messages: [firstUserMessage, firstModelMessage], // Start with the hidden user message and the AI's first prompt
            isPinned: false,
            createdAt: Date.now(),
            creationPhase: true,
            settings: {
                difficulty: 'normal',
                tone: 'heroic',
                narration: 'descriptive',
            }
        };

        chatHistory.push(newSession);
        saveChatHistoryToStorage();
        loadChat(newId);
    } catch (error) {
        console.error("New game setup failed:", error);
        loadingContainer.remove();
        appendMessage({ sender: 'error', text: 'Failed to start the game setup. Please try again.' });
    }
}


function loadChat(id: string) {
    if (currentChatId === id && !document.body.classList.contains('sidebar-open')) {
        return;
    }
    stopTTS();
    const session = chatHistory.find(s => s.id === id);
    if (session) {
        currentChatId = id;

        const geminiHistory = session.messages
            .filter(m => m.sender !== 'error' && m.sender !== 'system')
            .map(m => ({
                role: m.sender as 'user' | 'model',
                parts: [{ text: m.text }]
            }));
            
        try {
            if (session.creationPhase) {
                const instruction = getNewGameSetupInstruction();
                geminiChat = createNewChatInstance(geminiHistory, instruction);
            } else {
                const instruction = getSystemInstruction(session.adminPassword || '');
                geminiChat = createNewChatInstance(geminiHistory, instruction);
            }
        } catch (error) {
            console.error("Failed to create Gemini chat instance:", error);
            renderMessages(session.messages); 
            appendMessage({ sender: 'error', text: 'Error initializing the AI. Please check your setup or start a new chat.' });
            geminiChat = null;
            updateLogbook(session);
            renderChatHistory();
            closeSidebar();
            return;
        }
        
        renderMessages(session.messages);
        updateLogbook(session);
        renderChatHistory();
        closeSidebar();
    }
}

function togglePinChat(id: string) {
    const session = chatHistory.find(s => s.id === id);
    if (session) {
        session.isPinned = !session.isPinned;
        saveChatHistoryToStorage();
        renderChatHistory();
    }
}

function renderMessages(messages: Message[], container: HTMLElement = chatContainer) {
  container.innerHTML = '';
  messages.forEach(msg => {
    if (!msg.hidden) {
        appendMessage(msg, container);
    }
  });
}

function appendMessage(message: Message, container: HTMLElement = chatContainer) {
  if (message.sender === 'user') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'user');
    messageElement.textContent = message.text;
    container.appendChild(messageElement);
  } else if (message.sender === 'system') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'system-roll');
    messageElement.innerHTML = message.text; // Use innerHTML for strong tags
    container.appendChild(messageElement);
  } else {
    const msgContainer = document.createElement('div');
    msgContainer.className = 'message-model-container';
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', message.sender);
    messageElement.textContent = message.text;
    msgContainer.appendChild(messageElement);

    if (message.sender === 'model' && message.text && container === chatContainer) {
        const ttsControls = ttsTemplate.content.cloneNode(true) as DocumentFragment;
        const ttsButton = ttsControls.querySelector('.tts-button') as HTMLButtonElement;
        ttsButton.addEventListener('click', () => handleTTS(message.text, ttsButton));
        msgContainer.appendChild(ttsControls);
    }
    container.appendChild(msgContainer);
  }

  container.scrollTop = container.scrollHeight;
  return container.lastElementChild as HTMLElement;
}

// --- Text-to-Speech (TTS) ---

function stopTTS() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    if (currentlyPlayingTTSButton) {
        const soundWave = currentlyPlayingTTSButton.nextElementSibling as HTMLElement;
        const playIcon = currentlyPlayingTTSButton.querySelector('.play-icon') as SVGElement;
        const pauseIcon = currentlyPlayingTTSButton.querySelector('.pause-icon') as SVGElement;
        
        soundWave.classList.remove('playing');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        currentlyPlayingTTSButton = null;
    }
}


function handleTTS(text: string, button: HTMLButtonElement) {
    const isPlaying = (currentlyPlayingTTSButton === button);

    stopTTS();

    if (isPlaying) {
        return;
    }

    currentSpeech = new SpeechSynthesisUtterance(text);
    currentlyPlayingTTSButton = button;
    
    const soundWave = button.nextElementSibling as HTMLElement;
    const playIcon = button.querySelector('.play-icon') as SVGElement;
    const pauseIcon = button.querySelector('.pause-icon') as SVGElement;

    currentSpeech.onstart = () => {
        soundWave.classList.add('playing');
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    };

    currentSpeech.onend = () => {
        stopTTS();
    };

    currentSpeech.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (event.error !== 'canceled') {
          console.error('SpeechSynthesisUtterance.onerror', event);
        }
        stopTTS();
    };
    
    speechSynthesis.speak(currentSpeech);
}

// --- User Context Management ---

function loadUserContextFromStorage() {
    const storedContext = localStorage.getItem('dm-os-user-context');
    if (storedContext) {
        userContext = JSON.parse(storedContext);
    } else {
        userContext = [];
    }
}

function saveUserContextToStorage() {
    localStorage.setItem('dm-os-user-context', JSON.stringify(userContext));
}

function renderUserContext() {
    contextList.innerHTML = '';
    userContext.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'context-item';
        li.innerHTML = `
            <span>${item}</span>
            <button class="delete-context-btn" data-index="${index}" aria-label="Delete context">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
        `;
        contextList.appendChild(li);
    });
}

function addUserContext(text: string) {
    userContext.push(text);
    saveUserContextToStorage();
    renderUserContext();
}

function deleteUserContext(index: number) {
    userContext.splice(index, 1);
    saveUserContextToStorage();
    renderUserContext();
}

// --- Dice Roller Logic ---
const DICE_TYPES = [
    { name: 'd4', sides: 4 },
    { name: 'd6', sides: 6 },
    { name: 'd8', sides: 8 },
    { name: 'd10', sides: 10 },
    { name: 'd12', sides: 12 },
    { name: 'd20', sides: 20 },
    { name: 'd100', sides: 100 },
];

const SQUARE_SVG_DATA = {
    viewBox: '0 0 100 100',
    paths: [
        { d: 'M50 20 L85 37.5 L50 55 L15 37.5 Z', fill: '#585858' },
        { d: 'M15 37.5 L15 72.5 L50 90 L50 55 Z', fill: '#3c3c3c' },
        { d: 'M85 37.5 L85 72.5 L50 90 L50 55 Z', fill: '#4a4a4a' }
    ],
    textY: '55%',
};


const DICE_SVG_DATA = {
    'd4': SQUARE_SVG_DATA,
    'd6': SQUARE_SVG_DATA,
    'd8': SQUARE_SVG_DATA,
    'd10': SQUARE_SVG_DATA,
    'd12': SQUARE_SVG_DATA,
    'd20': SQUARE_SVG_DATA,
    'd100': SQUARE_SVG_DATA,
};

function renderDiceGrid() {
    diceGrid.innerHTML = '';
    DICE_TYPES.forEach(die => {
        const dieItem = document.createElement('div');
        dieItem.className = 'die-item';
        dieItem.dataset.sides = die.sides.toString();
        dieItem.dataset.name = die.name;

        const dieData = DICE_SVG_DATA[die.name as keyof typeof DICE_SVG_DATA];

        const dieVisual = document.createElement('div');
        dieVisual.className = 'die-visual';
        dieVisual.setAttribute('role', 'button');
        dieVisual.setAttribute('aria-label', `Roll ${die.name}`);
        
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', dieData.viewBox);
        
        dieData.paths.forEach(p => {
            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', p.d);
            path.setAttribute('fill', p.fill);
            svg.appendChild(path);
        });

        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', '50%');
        text.setAttribute('y', dieData.textY);
        text.classList.add('die-text');
        text.textContent = die.name;
        svg.appendChild(text);
        dieVisual.appendChild(svg);
        
        const quantityControl = document.createElement('div');
        quantityControl.className = 'quantity-control';
        quantityControl.innerHTML = `
            <button class="quantity-btn minus" aria-label="Decrease quantity">-</button>
            <input type="number" class="quantity-input" value="1" min="1" max="99" aria-label="Number of dice">
            <button class="quantity-btn plus" aria-label="Increase quantity">+</button>
        `;

        dieItem.appendChild(dieVisual);
        dieItem.appendChild(quantityControl);
        diceGrid.appendChild(dieItem);
    });
}


function handleDieRoll(dieItem: HTMLElement) {
    const sides = parseInt(dieItem.dataset.sides || '0', 10);
    const name = dieItem.dataset.name || 'die';
    const quantityInput = dieItem.querySelector('.quantity-input') as HTMLInputElement;
    const count = parseInt(quantityInput.value, 10);

    if (sides === 0 || count <= 0) return;

    const visual = dieItem.querySelector('.die-visual') as HTMLElement;
    visual.classList.add('rolling');
    visual.addEventListener('animationend', () => {
        visual.classList.remove('rolling');
    }, { once: true });

    let rolls = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        total += roll;
    }
    
    const resultElement = document.createElement('p');
    resultElement.innerHTML = `<strong>${count}${name}:</strong> [${rolls.join(', ')}] = <strong>${total}</strong>`;
    resultElement.dataset.total = total.toString();
    diceResultsLog.appendChild(resultElement);
    diceResultsLog.scrollTop = diceResultsLog.scrollHeight;
    
    updateDiceTotal();
}

function updateDiceTotal() {
    let grandTotal = 0;
    diceResultsLog.querySelectorAll('p').forEach(p => {
        grandTotal += parseInt(p.dataset.total || '0', 10);
    });
    diceTotalValue.textContent = grandTotal.toString();
}

function clearDiceResults() {
    diceResultsLog.innerHTML = '';
    updateDiceTotal();
}

function rollDice(command: string): { success: boolean; resultText: string } {
    const regex = /(?:roll|r)\s+(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/i;
    const match = command.match(regex);

    if (!match) {
        return { success: false, resultText: '' };
    }

    const [, numDiceStr, numSidesStr, operator, modifierStr] = match;
    const numDice = parseInt(numDiceStr, 10);
    const numSides = parseInt(numSidesStr, 10);
    const modifier = parseInt(modifierStr, 10) || 0;

    if (numDice <= 0 || numSides <= 0 || numDice > 100 || numSides > 1000) {
        return { success: true, resultText: 'Invalid dice roll parameters.' };
    }

    const rolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * numSides) + 1);
    const sum = rolls.reduce((a, b) => a + b, 0);

    let total = sum;
    let resultText = `Rolling ${numDice}d${numSides}`;

    if (operator && modifier) {
        resultText += ` ${operator} ${modifier}`;
        total = operator === '+' ? sum + modifier : sum - modifier;
    }

    resultText += `: [${rolls.join(', ')}]`;
    if (operator && modifier) {
        resultText += ` ${operator} ${modifier}`;
    }
    resultText += ` = <strong>${total}</strong>`;

    return { success: true, resultText };
}


// --- Log Book Logic ---

function renderCharacterSheet(data: CharacterSheetData) {
    characterSheetDisplay.innerHTML = `
      <header class="sheet-header">
          <div>
              <h3 class="sheet-char-name">${data.name || 'Character Name'}</h3>
          </div>
          <div class="sheet-char-details">
              <span>${data.race || 'Race'} ${data.class || 'Class'}</span><br>
              <span>Level ${data.level || 1}</span>
          </div>
      </header>
      <div class="sheet-main-content">
          <div class="sheet-stats-column">
              <div class="sheet-core-stats">
                  ${Object.entries(data.abilityScores || {}).map(([name, values]) => `
                      <div class="stat-box">
                          <div class="stat-box-label">${name}</div>
                          <div class="stat-box-score">${values.score || 10}</div>
                          <div class="stat-box-mod">${values.modifier || '+0'}</div>
                      </div>
                  `).join('')}
              </div>
              <div class="sheet-combat-stats">
                  <div class="stat-box">
                      <div class="stat-box-label">Armor Class</div>
                      <div class="stat-box-score">${data.armorClass || 10}</div>
                  </div>
                  <div class="stat-box">
                      <div class="stat-box-label">Hit Points</div>
                      <div class="stat-box-score">${data.hitPoints?.current ?? 10}/${data.hitPoints?.max ?? 10}</div>
                  </div>
                  <div class="stat-box">
                      <div class="stat-box-label">Speed</div>
                      <div class="stat-box-score">${data.speed || '30ft'}</div>
                  </div>
              </div>
          </div>
          <div class="sheet-skills-column">
              <h4>Skills</h4>
              <ul class="sheet-skills-list">
                  ${(data.skills || []).map(skill => `
                      <li class="skill-item">
                          <span class="skill-prof ${skill.proficient ? 'proficient' : ''}"></span>
                          <span class="skill-name">${skill.name}</span>
                      </li>
                  `).join('')}
              </ul>
              <div class="sheet-features">
                  <h4>Features & Traits</h4>
                  <ul>
                      ${(data.featuresAndTraits || []).map(feature => `<li>${feature}</li>`).join('')}
                  </ul>
              </div>
          </div>
      </div>
    `;
}


function updateLogbook(session: ChatSession | undefined) {
    if (!session) return;
    
    // Handle Character Sheet
    if (typeof session.characterSheet === 'object' && session.characterSheet !== null) {
        renderCharacterSheet(session.characterSheet as CharacterSheetData);
    } else if (typeof session.characterSheet === 'string') {
        // Backwards compatibility for old string format
        characterSheetDisplay.innerHTML = `<div class="sheet-placeholder"><p>${session.characterSheet}</p></div>`;
    } else {
        characterSheetDisplay.innerHTML = `<div class="sheet-placeholder"><p>No data. Click below to generate your character sheet from the adventure log.</p></div>`;
    }

    inventoryDisplay.textContent = session.inventory || "No data. Ask the DM to summarize your inventory.";
    questsDisplay.textContent = session.questLog || "No quest data. Ask the DM to update your journal.";
    npcsDisplay.textContent = session.npcList || "No NPC data. Ask the DM for a list of characters you've met.";

    if (session.characterImageUrl) {
        characterImageDisplay.src = session.characterImageUrl;
        characterImageDisplay.classList.remove('hidden');
        characterImagePlaceholder.classList.add('hidden');
    } else {
        characterImageDisplay.src = '';
        characterImageDisplay.classList.add('hidden');
        characterImagePlaceholder.classList.remove('hidden');
    }
    
    if (session.settings) {
        settingDifficulty.value = session.settings.difficulty;
        settingTone.value = session.settings.tone;
        settingNarration.value = session.settings.narration;
    }
}

async function updateLogbookData(type: 'sheet' | 'inventory' | 'quests' | 'npcs') {
    const currentSession = chatHistory.find(s => s.id === currentChatId);
    if (!currentSession || isGeneratingData) return;

    isGeneratingData = true;
    
    if (type === 'sheet') {
      const button = updateSheetBtn;
      const display = characterSheetDisplay;
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Generating...';
      display.innerHTML = `<div class="sheet-placeholder"><p>The DM is reviewing your adventure to update your character sheet...</p><div class="spinner"></div></div>`;
      
      try {
        const conversationHistory = currentSession.messages.map(m => `${m.sender === 'user' ? 'Player' : 'DM'}: ${m.text}`).join('\n');
        const prompt = `Based on the D&D conversation history, extract the player character's information and return it as a JSON object. Conversation: ${conversationHistory}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  race: { type: Type.STRING },
                  class: { type: Type.STRING },
                  level: { type: Type.INTEGER },
                  abilityScores: {
                    type: Type.OBJECT,
                    properties: {
                      STR: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING }}},
                      DEX: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING }}},
                      CON: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING }}},
                      INT: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING }}},
                      WIS: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING }}},
                      CHA: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING }}},
                    }
                  },
                  armorClass: { type: Type.INTEGER },
                  hitPoints: {
                    type: Type.OBJECT,
                    properties: {
                      current: { type: Type.INTEGER },
                      max: { type: Type.INTEGER }
                    }
                  },
                  speed: { type: Type.STRING },
                  skills: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        proficient: { type: Type.BOOLEAN }
                      }
                    }
                  },
                  featuresAndTraits: { type: Type.ARRAY, items: { type: Type.STRING }}
                }
              }
            }
        });

        const jsonData = JSON.parse(response.text) as CharacterSheetData;
        currentSession.characterSheet = jsonData;
        renderCharacterSheet(jsonData);
        saveChatHistoryToStorage();
        
      } catch (error) {
        console.error(`Sheet generation failed:`, error);
        display.innerHTML = `<div class="sheet-placeholder"><p>Failed to generate character sheet data. Please try again.</p></div>`;
      } finally {
        button.disabled = false;
        button.textContent = originalText;
        isGeneratingData = false;
      }
      return;
    }
    
    // --- Legacy handling for other types ---
    const { button, display, promptClause } = {
        inventory: { button: updateInventoryBtn, display: inventoryDisplay, promptClause: "inventory" },
        quests: { button: updateQuestsBtn, display: questsDisplay, promptClause: "quest journal, separating active and completed quests" },
        npcs: { button: updateNpcsBtn, display: npcsDisplay, promptClause: "list of significant Non-Player Characters (NPCs) met, with a one-sentence description for each" }
    }[type];

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Generating...';
    display.textContent = 'The DM is consulting their notes...';

    try {
        const conversationHistory = currentSession.messages
            .map(m => `${m.sender === 'user' ? 'Player' : 'DM'}: ${m.text}`)
            .join('\n');

        const prompt = `
          Based on the following D&D conversation history, provide a concise summary of the player character's current ${promptClause}.
          Format the output clearly with headings and bullet points where appropriate.

          Conversation History:
          ${conversationHistory}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
        const dataText = response.text.trim();

        if (type === 'inventory') currentSession.inventory = dataText;
        else if (type === 'quests') currentSession.questLog = dataText;
        else if (type === 'npcs') currentSession.npcList = dataText;

        display.textContent = dataText;
        saveChatHistoryToStorage();
        
    } catch (error) {
        console.error(`${type} generation failed:`, error);
        display.textContent = `Failed to generate ${type}. Please try again.`;
    } finally {
        button.disabled = false;
        button.textContent = originalText;
        isGeneratingData = false;
    }
}

async function generateCharacterImage() {
    const currentSession = chatHistory.find(s => s.id === currentChatId);
    if (!currentSession || isGeneratingData) return;

    isGeneratingData = true;
    generateImageBtn.disabled = true;
    characterImagePlaceholder.classList.add('hidden');
    characterImageLoading.classList.remove('hidden');

    try {
        // Step 1: Generate a detailed visual prompt from the conversation history.
        const conversationHistory = currentSession.messages.map(m => `${m.sender === 'user' ? 'Player' : 'DM'}: ${m.text}`).join('\n');
        const descriptionPrompt = `Based on the following D&D conversation, create a detailed visual description of the player character suitable for an AI image generator. Focus on physical appearance, race, class, clothing, equipment, and overall mood. Make it a rich, comma-separated list of keywords. Example: "elf ranger, long silver hair, green cloak, leather armor, holding a bow, standing in a dark forest, fantasy art, detailed". Conversation: ${conversationHistory}`;

        const descriptionResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: descriptionPrompt
        });
        const imagePrompt = descriptionResponse.text.trim();

        const loadingParagraph = characterImageLoading.querySelector('p');
        if (loadingParagraph) {
            loadingParagraph.textContent = 'Image prompt created. Generating portrait...';
        }
        
        // Step 2: Generate the image using the description.
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagePrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: '3:4',
            }
        });
        
        const base64Image = imageResponse.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/png;base64,${base64Image}`;
        
        currentSession.characterImageUrl = imageUrl;
        characterImageDisplay.src = imageUrl;
        characterImageDisplay.classList.remove('hidden');
        saveChatHistoryToStorage();
        
    } catch (error) {
        console.error("Image generation failed:", error);
        characterImagePlaceholder.classList.remove('hidden');
        const placeholderParagraph = characterImagePlaceholder.querySelector('p');
        if (placeholderParagraph) {
            placeholderParagraph.textContent = 'Image generation failed. Please try again.';
        }
    } finally {
        isGeneratingData = false;
        generateImageBtn.disabled = false;
        characterImageLoading.classList.add('hidden');
    }
}


// --- Inventory Popup Logic ---

async function fetchAndRenderInventoryPopup() {
    const currentSession = chatHistory.find(s => s.id === currentChatId);
    if (!currentSession || isGeneratingData) return;

    isGeneratingData = true;
    inventoryPopupContent.innerHTML = `<div class="placeholder">Checking your pouches...</div>`;

    try {
        const conversationHistory = currentSession.messages
            .map(m => `${m.sender === 'user' ? 'Player' : 'DM'}: ${m.text}`)
            .join('\n');
        
        const prompt = `
          Based on the following D&D conversation, list the player character's current inventory items as a simple comma-separated list.
          Only include the item names. Example: Health Potion, Rope (50ft), Dagger, Gold (25gp)
          
          Conversation History:
          ${conversationHistory}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        const itemsText = response.text.trim();
        const items = itemsText ? itemsText.split(',').map(item => item.trim()).filter(Boolean) : [];
        
        if (items.length > 0) {
            const ul = document.createElement('ul');
            items.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="inventory-item-name">${item}</span>
                    <button class="use-item-btn" data-item-name="${item}">Use</button>
                `;
                ul.appendChild(li);
            });
            inventoryPopupContent.innerHTML = '';
            inventoryPopupContent.appendChild(ul);
        } else {
            inventoryPopupContent.innerHTML = `<div class="placeholder">Your pockets are empty.</div>`;
        }
        
    } catch (error) {
        console.error("Inventory fetch failed:", error);
        inventoryPopupContent.innerHTML = `<div class="placeholder">Failed to get inventory.</div>`;
    } finally {
        isGeneratingData = false;
    }
}


// --- Rename Modal Logic ---
function openRenameModal(id: string) {
    chatIdToRename = id;
    const session = chatHistory.find(s => s.id === id);
    if (session) {
        renameInput.value = session.title;
        openModal(renameModal);
        renameInput.focus();
        renameInput.select();
    }
}

function closeRenameModal() {
    closeModal(renameModal);
    chatIdToRename = null;
}

// --- Themeing Logic ---
const themes = [
    { id: 'high-fantasy-dark', name: 'High Fantasy (Dark)', colors: ['#131314', '#1e1f20', '#2a3a4a', '#c5b358'] },
    { id: 'high-fantasy-light', name: 'High Fantasy (Light)', colors: ['#fdf6e3', '#f4ecd9', '#eee8d5', '#b58900'] },
    { id: 'high-fantasy-elven', name: 'High Fantasy (Elven)', colors: ['#1a1829', '#24223b', '#3a365e', '#a489d4'] },
    { id: 'cyberpunk-neon', name: 'Cyberpunk (Neon)', colors: ['#0d0221', '#140c2b', '#2a004f', '#00f0ff'] },
    { id: 'cyberpunk-corporate', name: 'Cyberpunk (Corporate)', colors: ['#1a2228', '#242f38', '#354654', '#ff4d4d'] },
    { id: 'cyberpunk-dystopian', name: 'Cyberpunk (Dystopian)', colors: ['#212121', '#2a2a2a', '#4d443a', '#ff9900'] },
    { id: 'hellscape-fire', name: 'Hellscape (Fire)', colors: ['#100808', '#1a0c0c', '#4d1818', '#ff4500'] },
    { id: 'hellscape-soul', name: 'Hellscape (Soul)', colors: ['#130f1a', '#1b1524', '#382d4a', '#7fff00'] },
    { id: 'hellscape-ash', name: 'Hellscape (Ash)', colors: ['#202020', '#282828', '#404040', '#b22222'] },
    { id: 'medieval-stone', name: 'Medieval (Stone)', colors: ['#3e3e3e', '#4a4a4a', '#5a5a5a', '#8b4513'] },
    { id: 'medieval-royal', name: 'Medieval (Royal)', colors: ['#001f3f', '#002b54', '#003f7f', '#ffd700'] },
    { id: 'medieval-parchment', name: 'Medieval (Parchment)', colors: ['#c2b59b', '#d1c6af', '#b5a88c', '#800000'] },
    { id: 'outer-space-starship', name: 'Outer Space (Starship)', colors: ['#eef2f5', '#ffffff', '#d7dfe5', '#007bff'] },
    { id: 'outer-space-deep', name: 'Outer Space (Deep)', colors: ['#0c0d21', '#141633', '#292d5c', '#9d00ff'] },
    { id: 'outer-space-alien', name: 'Outer Space (Alien)', colors: ['#23092d', '#331042', '#531c69', '#00ff7f'] },
    { id: 'pirate-sea', name: 'Pirates (High Seas)', colors: ['#f0e5d1', '#faeedb', '#e6d9c1', '#008b8b'] },
    { id: 'pirate-treasure', name: 'Pirates (Treasure)', colors: ['#3d2c1c', '#4d3824', '#63482d', '#e5c100'] },
    { id: 'pirate-grog', name: 'Pirates (Grog Tavern)', colors: ['#5c4b3f', '#6c5a4f', '#826e60', '#daa520'] },
];

function renderThemeCards() {
    themeGrid.innerHTML = '';
    themes.forEach(theme => {
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.dataset.theme = theme.id;
        card.innerHTML = `
            <div class="theme-preview">
                ${theme.colors.map(color => `<span style="background-color: ${color};"></span>`).join('')}
            </div>
            <div class="theme-name">${theme.name}</div>
        `;
        themeGrid.appendChild(card);
    });
}

function applyTheme(themeId: string) {
    document.body.dataset.theme = themeId;
    localStorage.setItem('dm-os-theme', themeId);
}

// --- File Handling Logic ---

/** Converts a File object to a base64 encoded string. */
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove "data:mime/type;base64," prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
}

/** Renders the previews for the selected files. */
function renderFilePreviews() {
    filePreviewContainer.innerHTML = '';
    if (selectedFiles.length === 0) {
        filePreviewContainer.style.display = 'none';
        return;
    }
    filePreviewContainer.style.display = 'flex';
    selectedFiles.forEach((file, index) => {
        const previewElement = document.createElement('div');
        previewElement.className = 'file-preview-item';
        // Using a proper times symbol for the remove button
        previewElement.innerHTML = `
            <span>${file.name}</span>
            <button class="remove-file-btn" data-index="${index}" aria-label="Remove ${file.name}">&times;</button>
        `;
        filePreviewContainer.appendChild(previewElement);
    });
}

// --- Chat Options Menu Logic ---
function openChatOptionsMenu(sessionId: string, buttonEl: HTMLElement) {
    if (chatOptionsMenu.style.display === 'block' && chatOptionsMenu.dataset.sessionId === sessionId) {
        closeChatOptionsMenu();
        return;
    }

    const session = chatHistory.find(s => s.id === sessionId);
    if (!session) return;
    
    chatOptionsMenu.dataset.sessionId = sessionId;
    chatOptionsMenu.innerHTML = `
        <li role="menuitem" data-action="pin">${session.isPinned ? 'Unpin Chat' : 'Pin Chat'}</li>
        <li role="menuitem" data-action="rename">Rename</li>
        <li role="menuitem" data-action="export">Export Chat</li>
    `;
    
    const rect = buttonEl.getBoundingClientRect();
    chatOptionsMenu.style.top = `${rect.bottom + 4}px`;
    chatOptionsMenu.style.left = `${rect.left}px`;
    chatOptionsMenu.style.display = 'block';

    setTimeout(() => document.addEventListener('click', closeChatOptionsMenu, { once: true }), 0);
}

function closeChatOptionsMenu() {
    chatOptionsMenu.style.display = 'none';
    chatOptionsMenu.removeAttribute('data-session-id');
}


// --- Import / Export Logic ---
function exportChatToLocal(sessionId: string) {
    const session = chatHistory.find(s => s.id === sessionId);
    if (!session) return;

    const sessionJson = JSON.stringify(session, null, 2);
    const blob = new Blob([sessionJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const result = e.target?.result as string;
            const importedSession = JSON.parse(result) as ChatSession;
            
            // Basic validation
            if (importedSession.id && importedSession.title && Array.isArray(importedSession.messages)) {
                // Prevent ID conflicts
                const newId = `chat-${Date.now()}`;
                importedSession.id = newId;
                importedSession.createdAt = Date.now();
                
                chatHistory.push(importedSession);
                saveChatHistoryToStorage();
                renderChatHistory();
                loadChat(newId);
            } else {
                alert('Invalid chat file format.');
            }
        } catch (error) {
            console.error('Failed to import chat:', error);
            alert('Failed to read or parse the chat file.');
        }
    };
    reader.readAsText(file);
    // Reset input value to allow importing the same file again
    input.value = '';
}


// --- Main Execution ---

async function handleFormSubmit(e: Event) {
  e.preventDefault();
  if (isSending) return;
  isSending = true;

  try {
    const userInput = chatInput.value.trim();
    if ((!userInput && selectedFiles.length === 0) || !currentChatId) {
      return;
    }

    const currentSession = chatHistory.find(s => s.id === currentChatId);
    if (!currentSession) {
      return;
    }
    
    const lowerCaseInput = userInput.toLowerCase().replace(/[?]/g, '');

    // Handle local dice roll command
    const rollCommandRegex = /^(roll|r)\s+\d+d\d+(?:\s*[+-]\s*\d+)?/i;
    if (rollCommandRegex.test(lowerCaseInput)) {
        const userMessage: Message = { sender: 'user', text: userInput };
        appendMessage(userMessage);
        currentSession.messages.push(userMessage);

        const rollResult = rollDice(lowerCaseInput);
        if (rollResult.success) {
            const diceMessage: Message = { sender: 'system', text: rollResult.resultText };
            appendMessage(diceMessage);
            currentSession.messages.push(diceMessage);
        }
        
        chatInput.value = '';
        chatInput.style.height = 'auto';
        saveChatHistoryToStorage();
        return;
    }

    // State: New Game Setup
    if (currentSession.creationPhase) {
        stopTTS();

        // Capture password on the first *real* user turn of the session
        const userMessages = currentSession.messages.filter(m => m.sender === 'user');
        if (userMessages.length === 1 && userMessages[0].hidden) {
            currentSession.adminPassword = userInput;
        }

        const userMessage: Message = { sender: 'user', text: userInput };
        appendMessage(userMessage);
        currentSession.messages.push(userMessage);
        chatInput.value = '';
        chatInput.style.height = 'auto';

        const loadingContainer = appendMessage({ sender: 'model', text: '' });
        const loadingMessage = loadingContainer.querySelector('.message') as HTMLElement;
        loadingMessage.classList.add('loading');
        loadingMessage.textContent = '...';

        try {
            if (!geminiChat) {
                console.error("Setup AI Error: chat is not initialized.");
                loadingContainer.remove();
                appendMessage({ sender: 'error', text: 'The setup guide seems to have gotten lost. Please try starting a new game.' });
                return;
            }
            const result = await geminiChat.sendMessageStream({ message: userInput });
            let responseText = '';
            loadingMessage.classList.remove('loading');
            loadingMessage.textContent = '';
            for await (const chunk of result) {
                responseText += chunk.text;
                loadingMessage.textContent = responseText;
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
            loadingContainer.remove();

            const setupCompleteSignal = '[SETUP_COMPLETE]';
            if (responseText.includes(setupCompleteSignal)) {
                // --- TRANSITION TO MAIN GAME ---
                currentSession.creationPhase = false;

                const titleMatch = responseText.match(/Title:\s*(.*)/);
                if (titleMatch && titleMatch[1]) {
                    currentSession.title = titleMatch[1].trim();
                } else {
                    currentSession.title = "New Adventure";
                }

                const finalSetupText = responseText.replace(setupCompleteSignal, '').trim();
                const finalSetupMessage: Message = { sender: 'model', text: finalSetupText };
                appendMessage(finalSetupMessage);
                currentSession.messages.push(finalSetupMessage);
                saveChatHistoryToStorage();
                renderChatHistory();

                // --- INITIALIZE MAIN DM AI ---
                const gameLoadingContainer = appendMessage({ sender: 'model', text: '' });
                const gameLoadingMessage = gameLoadingContainer.querySelector('.message') as HTMLElement;
                gameLoadingMessage.classList.add('loading');
                gameLoadingMessage.textContent = 'The DM is preparing the world...';

                const instruction = getSystemInstruction(currentSession.adminPassword || '');
                const geminiHistory = currentSession.messages
                    .filter(m => m.sender !== 'error' && m.sender !== 'system')
                    .map(m => ({
                        role: m.sender as 'user' | 'model',
                        parts: [{ text: m.text }]
                    }));
                
                geminiChat = createNewChatInstance(geminiHistory, instruction);

                const kickoffResult = await geminiChat.sendMessageStream({ message: "The setup is complete. Begin the adventure by narrating the opening scene." });
                
                let openingSceneText = '';
                gameLoadingMessage.classList.remove('loading');
                gameLoadingMessage.textContent = '';
                for await (const chunk of kickoffResult) {
                    openingSceneText += chunk.text;
                    gameLoadingMessage.textContent = openingSceneText;
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
                gameLoadingContainer.remove();

                const openingSceneMessage: Message = { sender: 'model', text: openingSceneText };
                appendMessage(openingSceneMessage);
                currentSession.messages.push(openingSceneMessage);
                saveChatHistoryToStorage();
                
            } else {
                 // --- CONTINUE SETUP CONVERSATION ---
                const setupMessage: Message = { sender: 'model', text: responseText };
                appendMessage(setupMessage);
                currentSession.messages.push(setupMessage);
                saveChatHistoryToStorage();
            }

        } catch (error) {
            console.error("Setup AI Error:", error);
            loadingContainer.remove();
            appendMessage({ sender: 'error', text: 'The setup guide seems to have gotten lost. Please try again.' });
        }
        return;
    }


    if (lowerCaseInput === 'who is the architect') {
      chatInput.value = '';
      chatInput.style.height = 'auto';

      const easterEggMessage: Message = {
        sender: 'model',
        text: "The simulation flickers for a moment, and the world goes silent. A single line of plain text hangs in the void before you:\n\n'This world was built by Justin Brisson.'"
      };
      const messageContainer = appendMessage(easterEggMessage);
      messageContainer.querySelector('.message')?.classList.add('easter-egg');
      const ttsControls = messageContainer.querySelector('.tts-controls');
      if (ttsControls) ttsControls.remove();

      return;
    }

    if (lowerCaseInput === 'help') {
      openModal(helpModal);
      chatInput.value = '';
      chatInput.style.height = 'auto';
      return;
    }

    if (!geminiChat) return;

    stopTTS();

    const userMessage: Message = { sender: 'user', text: userInput };
    currentSession.messages.push(userMessage);

    appendMessage(userMessage);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    const loadingContainer = appendMessage({ sender: 'model', text: '' });
    const loadingMessage = loadingContainer.querySelector('.message') as HTMLElement;
    loadingMessage.classList.add('loading');
    loadingMessage.textContent = '...';

    try {
      const result = await geminiChat.sendMessageStream({ message: userInput });

      let responseText = '';
      loadingMessage.classList.remove('loading');
      loadingMessage.textContent = '';
      for await (const chunk of result) {
        responseText += chunk.text;
        loadingMessage.textContent = responseText;
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      loadingContainer.remove();

      const finalMessage: Message = { sender: 'model', text: responseText };
      appendMessage(finalMessage);
      currentSession.messages.push(finalMessage);
      saveChatHistoryToStorage();

    } catch (error) {
      console.error("Gemini API Error:", error);
      loadingContainer.remove();
      appendMessage({ sender: 'error', text: 'The DM seems to be pondering deeply ... and has gone quiet. Please try again.' });
    }
  } finally {
    isSending = false;
  }
}

// Event Listeners
fileUploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
    if (fileInput.files) {
        selectedFiles.push(...Array.from(fileInput.files));
        renderFilePreviews();
        fileInput.value = ''; // Allow selecting the same file again
    }
});

filePreviewContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const removeBtn = target.closest('.remove-file-btn');
    if (removeBtn) {
        const index = parseInt(removeBtn.getAttribute('data-index')!, 10);
        if (!isNaN(index)) {
            selectedFiles.splice(index, 1);
            renderFilePreviews();
        }
    }
});

chatForm.addEventListener('submit', handleFormSubmit);
sendButton.addEventListener('click', handleFormSubmit);

chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.requestSubmit();
    }
});

menuBtn.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', closeSidebar);
newChatBtn.addEventListener('click', startNewChat);

// Modal Listeners
helpBtn.addEventListener('click', () => openModal(helpModal));
closeHelpBtn.addEventListener('click', () => closeModal(helpModal));
dndHelpBtn.addEventListener('click', () => openModal(dndHelpModal));
closeDndHelpBtn.addEventListener('click', () => closeModal(dndHelpModal));
logbookBtn.addEventListener('click', () => openModal(logbookModal));
closeLogbookBtn.addEventListener('click', () => closeModal(logbookModal));
diceRollerBtn.addEventListener('click', () => openModal(diceModal));
closeDiceBtn.addEventListener('click', () => closeModal(diceModal));

renameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (chatIdToRename) {
        const session = chatHistory.find(s => s.id === chatIdToRename);
        if (session) {
            session.title = renameInput.value;
            saveChatHistoryToStorage();
            renderChatHistory();
        }
    }
    closeRenameModal();
});
closeRenameBtn.addEventListener('click', closeRenameModal);

// Context Listeners
contextForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = contextInput.value.trim();
    if (text) {
        addUserContext(text);
        contextInput.value = '';
    }
});

contextList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const deleteBtn = target.closest('.delete-context-btn');
    if (deleteBtn) {
        const index = parseInt(deleteBtn.getAttribute('data-index')!, 10);
        if (!isNaN(index)) {
            deleteUserContext(index);
        }
    }
});


// Logbook Listeners
logbookNav.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // FIX: Cast the result of closest to HTMLElement to access the dataset property.
    const button = target.closest<HTMLElement>('.logbook-nav-btn');
    if (button) {
        const tab = button.dataset.tab;
        
        logbookNav.querySelectorAll('.logbook-nav-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        logbookPanes.forEach(pane => {
            if (pane.id === `${tab}-content`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
    }
});

updateSheetBtn.addEventListener('click', () => updateLogbookData('sheet'));
updateInventoryBtn.addEventListener('click', () => updateLogbookData('inventory'));
updateQuestsBtn.addEventListener('click', () => updateLogbookData('quests'));
updateNpcsBtn.addEventListener('click', () => updateLogbookData('npcs'));
generateImageBtn.addEventListener('click', generateCharacterImage);

// Settings Listeners
settingDifficulty.addEventListener('change', () => {
    const currentSession = chatHistory.find(s => s.id === currentChatId);
    if(currentSession && currentSession.settings) {
        currentSession.settings.difficulty = settingDifficulty.value as GameSettings['difficulty'];
        saveChatHistoryToStorage();
    }
});
settingTone.addEventListener('change', () => {
    const currentSession = chatHistory.find(s => s.id === currentChatId);
    if(currentSession && currentSession.settings) {
        currentSession.settings.tone = settingTone.value as GameSettings['tone'];
        saveChatHistoryToStorage();
    }
});
settingNarration.addEventListener('change', () => {
    const currentSession = chatHistory.find(s => s.id === currentChatId);
    if(currentSession && currentSession.settings) {
        currentSession.settings.narration = settingNarration.value as GameSettings['narration'];
        saveChatHistoryToStorage();
    }
});

// Themeing Listeners
changeUiBtn.addEventListener('click', () => openModal(themeModal));
closeThemeBtn.addEventListener('click', () => closeModal(themeModal));
themeGrid.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // FIX: Cast the result of closest to HTMLElement to access the dataset property.
    const card = target.closest<HTMLElement>('.theme-card');
    if (card && card.dataset.theme) {
        applyTheme(card.dataset.theme);
        closeModal(themeModal);
    }
});

// Dice Roller Listeners
clearResultsBtn.addEventListener('click', clearDiceResults);

diceGrid.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const dieItem = target.closest('.die-item') as HTMLElement;
    if (!dieItem) return;

    if (target.closest('.die-visual')) {
        handleDieRoll(dieItem);
    }

    const quantityInput = dieItem.querySelector('.quantity-input') as HTMLInputElement;
    let value = parseInt(quantityInput.value, 10);

    if (target.classList.contains('plus')) {
        value = Math.min(99, value + 1);
        quantityInput.value = value.toString();
    } else if (target.classList.contains('minus')) {
        value = Math.max(1, value - 1);
        quantityInput.value = value.toString();
    }
});

// Quick Actions Listener
quickActionsBar.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('.quick-action-btn');

    if (button && button.dataset.command) {
        const command = button.dataset.command;
        chatInput.value = command;
        chatInput.focus();

        // Special case for "say" to place cursor between quotes
        if (command === 'I say ""') {
            chatInput.setSelectionRange(7, 7);
        } else {
            // Place cursor at the end for other commands
            chatInput.setSelectionRange(command.length, command.length);
        }
        
        // Trigger input event to resize textarea if needed
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
});

// Chat Options Menu Listener
chatOptionsMenu.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action;
    const sessionId = chatOptionsMenu.dataset.sessionId;

    if (!action || !sessionId) return;
    
    closeChatOptionsMenu();

    switch (action) {
        case 'pin':
            togglePinChat(sessionId);
            break;
        case 'rename':
            openRenameModal(sessionId);
            break;
        case 'export':
            ioAction = { type: 'export', sessionId: sessionId };
            ioModalTitle.textContent = 'Export To';
            openModal(ioModal);
            break;
    }
});

// Import/Export Listeners
importChatBtn.addEventListener('click', () => {
    ioAction = { type: 'import' };
    ioModalTitle.textContent = 'Import From';
    openModal(ioModal);
});

importFileInput.addEventListener('change', handleImportFile);

ioModal.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // FIX: Cast the result of closest to HTMLElement to access the dataset property.
    const button = target.closest<HTMLElement>('.io-option-btn');
    if (button) {
        const source = button.dataset.source;
        if (source === 'local') {
            if (ioAction?.type === 'import') {
                importFileInput.click();
            } else if (ioAction?.type === 'export') {
                exportChatToLocal(ioAction.sessionId);
            }
        } else if (source === 'gdrive') {
            alert('Google Drive integration is coming soon!');
        }
        closeModal(ioModal);
    }
});

closeIoModalBtn.addEventListener('click', () => closeModal(ioModal));

// Inventory Pouch Listeners
inventoryBtn.addEventListener('click', () => {
    const isVisible = inventoryPopup.classList.toggle('visible');
    if (isVisible) {
        fetchAndRenderInventoryPopup();
    }
});

closeInventoryBtn.addEventListener('click', () => {
    inventoryPopup.classList.remove('visible');
});

refreshInventoryBtn.addEventListener('click', fetchAndRenderInventoryPopup);

inventoryPopupContent.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const useButton = target.closest('.use-item-btn');
    if (useButton) {
        const itemName = useButton.getAttribute('data-item-name');
        if (itemName) {
            chatInput.value = `Use ${itemName}`;
            chatInput.focus();
            inventoryPopup.classList.remove('visible');
        }
    }
});


// --- Initialization ---
function initializeApp() {
  loadChatHistoryFromStorage();
  loadUserContextFromStorage();

  const savedTheme = localStorage.getItem('dm-os-theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    applyTheme('cyberpunk-neon'); // Default theme on first load
  }

  renderChatHistory();
  renderUserContext();
  renderThemeCards();
  renderDiceGrid();
  
  if (chatHistory.length > 0) {
    const lastSession = chatHistory.sort((a,b) => b.createdAt - a.createdAt)[0];
    currentChatId = lastSession.id;
    loadChat(lastSession.id);
  } else {
    startNewChat();
  }
}

initializeApp();