

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Type } from '@google/genai';
import {
  isGeneratingData,
  setGeneratingData,
  getCurrentChat,
  saveChatHistoryToDB,
  getUserContext,
  saveUserContextToDB,
  getChatHistory,
  dbSet
} from './state';
import {
  updateSheetBtn,
  updateAchievementsBtn,
  characterSheetDisplay,
  achievementsDisplay,
  updateInventoryBtn,
  inventoryDisplay,
  updateQuestsBtn,
  questsDisplay,
  updateNpcsBtn,
  npcsDisplay,
  generateImageBtn,
  characterImagePlaceholder,
  characterImageLoading,
  characterImageDisplay,
  inventoryPopupContent,
  diceResultsLog,
  diceTotalValue,
  diceGrid,
  themeGrid,
  contextList
} from './ui';
import { renderCharacterSheet, renderAchievements, renderUserContext, updateLogbook } from './ui';
import { ai } from './gemini';
import type { CharacterSheetData, Achievement, NPCState } from './types';

// =================================================================================
// TTS (Re-architected for stability)
// =================================================================================

// --- State Management ---
let ttsState: 'IDLE' | 'PLAYING' | 'PAUSED' = 'IDLE';
let ttsQueue: SpeechSynthesisUtterance[] = [];
let ttsCurrentUtteranceIndex = 0;
let ttsCurrentButton: HTMLButtonElement | null = null;
let ttsVoices: SpeechSynthesisVoice[] = [];
// Generation counter to prevent race conditions from stale async callbacks.
let ttsGeneration = 0;

// --- Defensive Voice Loading ---
// Memoize the promise to avoid re-running this logic on every click
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    if (voicesPromise) {
        return voicesPromise;
    }
    voicesPromise = new Promise((resolve, reject) => {
        // Set a timeout in case the browser never fires the event.
        const timeout = setTimeout(() => {
            if (speechSynthesis.getVoices().length > 0) {
              resolve(speechSynthesis.getVoices());
            } else {
              reject(new Error('Speech synthesis voice loading timed out.'));
            }
        }, 2000);

        const checkVoices = () => {
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
                clearTimeout(timeout);
                ttsVoices = voices;
                resolve(voices);
                // Important: remove the listener once voices are loaded.
                speechSynthesis.onvoiceschanged = null;
            }
        };

        if (speechSynthesis.getVoices().length > 0) {
            checkVoices();
        } else {
            speechSynthesis.onvoiceschanged = checkVoices;
        }
    });
    return voicesPromise;
}
// Pre-warm the voices when the module loads.
getAvailableVoices().catch(err => console.warn(err));


// --- Core Functions ---
function updateTTS_UI() {
    if (!ttsCurrentButton) return;

    const soundWave = ttsCurrentButton.nextElementSibling as HTMLElement;
    const playIcon = ttsCurrentButton.querySelector('.play-icon') as SVGElement;
    const pauseIcon = ttsCurrentButton.querySelector('.pause-icon') as SVGElement;

    if (ttsState === 'PLAYING') {
        soundWave.classList.add('playing');
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else { // PAUSED or IDLE
        soundWave.classList.remove('playing');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

/**
 * Aggressively stops all TTS, cleans up state, and resets the UI of the
 * currently active button. This is the primary function for ensuring a clean slate.
 */
export function stopTTS() {
    // Invalidate all old callbacks by incrementing the generation counter.
    // This is the most important step to prevent race conditions.
    ttsGeneration++;

    // This is a critical workaround for a common browser bug.
    // If speech is paused and then cancelled, the engine can get stuck.
    // Resuming it for a moment before cancelling forces it into a clean state.
    if (speechSynthesis.paused) {
        speechSynthesis.resume();
    }
    
    // Cancel any speaking or pending utterances.
    // This will trigger 'onend' or 'onerror' with a 'canceled' error,
    // which our handlers will now safely ignore due to the generation check.
    if (speechSynthesis.speaking || speechSynthesis.pending) {
        speechSynthesis.cancel();
    }
    
    // Reset the UI of the previously active button, if it exists.
    if (ttsCurrentButton) {
        const soundWave = ttsCurrentButton.nextElementSibling as HTMLElement;
        const playIcon = ttsCurrentButton.querySelector('.play-icon') as SVGElement;
        const pauseIcon = ttsCurrentButton.querySelector('.pause-icon') as SVGElement;
        
        if (soundWave && playIcon && pauseIcon) {
            soundWave.classList.remove('playing');
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    // Reset all state variables to idle.
    ttsState = 'IDLE';
    ttsQueue = [];
    ttsCurrentUtteranceIndex = 0;
    ttsCurrentButton = null;
}

function playQueue(generation: number) {
    // If the generation is stale, this playback has been cancelled. Abort.
    if (generation !== ttsGeneration) return;

    if (ttsQueue.length === 0 || ttsCurrentUtteranceIndex >= ttsQueue.length) {
        stopTTS();
        return;
    }
    
    ttsState = 'PLAYING';
    updateTTS_UI();
    const utterance = ttsQueue[ttsCurrentUtteranceIndex];
    speechSynthesis.speak(utterance);
}

function handleUtteranceEnd(generation: number) {
    // If the generation is stale, this playback has been cancelled. Abort.
    if (generation !== ttsGeneration) return;

    ttsCurrentUtteranceIndex++;
    playQueue(generation);
}

/**
 * Chunks text into manageable pieces for the speech synthesis engine.
 */
function chunkText(text: string, maxLength = 180): string[] {
    if (!text) return [];
    
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?\n]+(?:[.!?\n]|$)/g) || [text];

    for (let sentence of sentences) {
        sentence = sentence.trim();
        if (sentence.length === 0) continue;
        if (sentence.length <= maxLength) {
            chunks.push(sentence);
            continue;
        }

        let currentChunk = '';
        const words = sentence.split(/\s+/);
        for (const word of words) {
            if ((currentChunk + ' ' + word).length > maxLength && currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = word;
            } else {
                currentChunk += (currentChunk ? ' ' : '') + word;
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk);
        }
    }
    return chunks.filter(c => c.length > 0);
}

/**
 * Main entry point for TTS requests. Manages the state machine.
 */
export async function handleTTS(rawHtml: string, button: HTMLButtonElement) {
    if (button === ttsCurrentButton) {
        if (ttsState === 'PLAYING') {
            speechSynthesis.pause();
            ttsState = 'PAUSED';
        } else if (ttsState === 'PAUSED') {
            speechSynthesis.resume();
            ttsState = 'PLAYING';
        }
        updateTTS_UI();
        return;
    }

    stopTTS(); // This performs a full, clean reset and increments the generation.

    const currentGeneration = ttsGeneration; // Capture the new, valid generation.
    ttsCurrentButton = button;
    
    const plainText = new DOMParser().parseFromString(rawHtml, 'text/html').body.textContent || '';
    if (!plainText.trim()) {
        stopTTS();
        return;
    }

    try {
        await getAvailableVoices();
    } catch (e) {
        console.error("Could not load speech synthesis voices.", e);
        stopTTS();
        return;
    }
    
    const chunks = chunkText(plainText);
    if (chunks.length === 0) {
        stopTTS();
        return;
    }

    ttsQueue = chunks.map(chunk => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        const defaultVoice = ttsVoices.find(v => v.default) || ttsVoices[0];
        if (defaultVoice) {
            utterance.voice = defaultVoice;
        } else {
            console.warn("No speech synthesis voices found to assign.");
        }
        
        utterance.onend = () => handleUtteranceEnd(currentGeneration); // Pass generation to handler
        
        utterance.onerror = (e) => {
            // Abort if this error is from a stale, cancelled playback.
            if (currentGeneration !== ttsGeneration) return;
            
            if (e.error !== 'canceled') {
                console.error("Speech Synthesis Error:", e.error);
            }
            // Still try to continue to the next chunk even if one fails.
            handleUtteranceEnd(currentGeneration);
        };
        return utterance;
    });
    
    ttsCurrentUtteranceIndex = 0;
    playQueue(currentGeneration);
}

// =================================================================================
// USER CONTEXT
// =================================================================================

export function addUserContext(text: string) {
  getUserContext().push(text);
  saveUserContextToDB();
  renderUserContext(getUserContext());
}

export function deleteUserContext(index: number) {
  getUserContext().splice(index, 1);
  saveUserContextToDB();
  renderUserContext(getUserContext());
}

// =================================================================================
// DICE ROLLER
// =================================================================================
const DICE_TYPES = [
  { name: 'd4', sides: 4 }, { name: 'd6', sides: 6 }, { name: 'd8', sides: 8 },
  { name: 'd10', sides: 10 }, { name: 'd12', sides: 12 }, { name: 'd20', sides: 20 },
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
const DICE_SVG_DATA = { 'd4': SQUARE_SVG_DATA, 'd6': SQUARE_SVG_DATA, 'd8': SQUARE_SVG_DATA, 'd10': SQUARE_SVG_DATA, 'd12': SQUARE_SVG_DATA, 'd20': SQUARE_SVG_DATA, 'd100': SQUARE_SVG_DATA };

export function renderDiceGrid() {
  diceGrid.innerHTML = '';
  DICE_TYPES.forEach(die => {
    const dieItem = document.createElement('div');
    dieItem.className = 'die-item';
    dieItem.dataset.sides = die.sides.toString();
    dieItem.dataset.name = die.name;
    const dieData = DICE_SVG_DATA[die.name as keyof typeof DICE_SVG_DATA];
    dieItem.innerHTML = `
        <div class="die-visual" role="button" aria-label="Roll ${die.name}">
            <svg viewBox="${dieData.viewBox}">
                ${dieData.paths.map(p => `<path d="${p.d}" fill="${p.fill}"></path>`).join('')}
                <text x="50%" y="${dieData.textY}" class="die-text">${die.name}</text>
            </svg>
        </div>
        <div class="quantity-control">
            <button class="quantity-btn minus" aria-label="Decrease quantity">-</button>
            <input type="number" class="quantity-input" value="1" min="1" max="99" aria-label="Number of dice">
            <button class="quantity-btn plus" aria-label="Increase quantity">+</button>
        </div>`;
    diceGrid.appendChild(dieItem);
  });
}

export function handleDieRoll(dieItem: HTMLElement) {
  const sides = parseInt(dieItem.dataset.sides || '0', 10);
  const name = dieItem.dataset.name || 'die';
  const quantityInput = dieItem.querySelector('.quantity-input') as HTMLInputElement;
  const count = parseInt(quantityInput.value, 10);

  if (sides === 0 || count <= 0) return;

  const visual = dieItem.querySelector('.die-visual') as HTMLElement;
  visual.classList.add('rolling');
  visual.addEventListener('animationend', () => visual.classList.remove('rolling'), { once: true });

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

export function updateDiceTotal() {
  let grandTotal = 0;
  diceResultsLog.querySelectorAll('p').forEach(p => {
    grandTotal += parseInt(p.dataset.total || '0', 10);
  });
  diceTotalValue.textContent = grandTotal.toString();
}

export function clearDiceResults() {
  diceResultsLog.innerHTML = '';
  updateDiceTotal();
}

export function rollDice(command: string): { success: boolean; resultText: string } {
  const regex = /(?:roll|r)\s+(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/i;
  const match = command.match(regex);
  if (!match) return { success: false, resultText: '' };

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


// =================================================================================
// LOG BOOK
// =================================================================================
export async function updateLogbookData(type: 'sheet' | 'inventory' | 'quests' | 'npcs' | 'achievements') {
  const currentSession = getCurrentChat();
  if (!currentSession || isGeneratingData()) return;
  setGeneratingData(true);

  // Use the last 30 messages for context to prevent overly long prompts
  const recentMessages = currentSession.messages.slice(-30);
  const conversationHistory = recentMessages.map(m => `${m.sender === 'user' ? 'Player' : 'DM'}: ${m.text}`).join('\n');

  if (type === 'sheet' || type === 'achievements') {
    const isSheet = type === 'sheet';
    const button = isSheet ? updateSheetBtn : updateAchievementsBtn;
    const display = isSheet ? characterSheetDisplay : achievementsDisplay;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Generating...';
    display.innerHTML = `<div class="sheet-placeholder"><p>The DM is reviewing your adventure to update your ${isSheet ? 'character sheet' : 'achievements'}...</p><div class="spinner"></div></div>`;

    try {
      const prompt = isSheet
        ? `Based on the D&D conversation history, extract the player character's information and return it as a JSON object. Conversation: ${conversationHistory}`
        : `Analyze the following D&D conversation history and generate a list of 3-5 creative, context-specific "achievements" based on the player's unique actions, decisions, or significant moments. Each achievement should have a cool, thematic name and a short description of how it was earned. Return this as a JSON array. History: ${conversationHistory}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: isSheet
            ? { type: Type.OBJECT, properties: { name: { type: Type.STRING }, race: { type: Type.STRING }, class: { type: Type.STRING }, level: { type: Type.INTEGER }, abilityScores: { type: Type.OBJECT, properties: { STR: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING } } }, DEX: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING } } }, CON: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING } } }, INT: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING } } }, WIS: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING } } }, CHA: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING } } }, } }, armorClass: { type: Type.INTEGER }, hitPoints: { type: Type.OBJECT, properties: { current: { type: Type.INTEGER }, max: { type: Type.INTEGER } } }, speed: { type: Type.STRING }, skills: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, proficient: { type: Type.BOOLEAN } } } }, featuresAndTraits: { type: Type.ARRAY, items: { type: Type.STRING } } } }
            : { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } } }
        }
      });

      const jsonData = JSON.parse(response.text);
      if (isSheet) {
        currentSession.characterSheet = jsonData as CharacterSheetData;
        renderCharacterSheet(jsonData as CharacterSheetData);
      } else {
        currentSession.achievements = jsonData as Achievement[];
        renderAchievements(jsonData as Achievement[]);
      }
      saveChatHistoryToDB();
    } catch (error) {
        console.error(`${type} generation failed:`, error);
        let errorMessage = `Failed to generate ${type} data. Please try again.`;
        if (error instanceof Error && (error.message.includes('API Key') || error.message.includes('API key'))) {
            errorMessage = `Failed to generate data: API Key is missing or invalid.`;
        }
        display.innerHTML = `<div class="sheet-placeholder"><p>${errorMessage}</p></div>`;
    } finally {
      button.disabled = false;
      button.textContent = originalText;
      setGeneratingData(false);
    }
    return;
  }
  
  if (type === 'npcs') {
    const button = updateNpcsBtn;
    const display = npcsDisplay;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Generating...';
    display.innerHTML = `<div class="sheet-placeholder"><p>The DM is recalling the characters you've met...</p><div class="spinner"></div></div>`;
    
    try {
        const prompt = `Based on the following D&D conversation history, provide a list of significant Non-Player Characters (NPCs) the party has met. For each NPC, describe their current relationship with the party (e.g., Ally, Hostile, Neutral, Complicated) based on the history of interactions. Return this as a JSON array. History: ${conversationHistory}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            relationship: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        
        const jsonData = JSON.parse(response.text);
        currentSession.npcList = jsonData as NPCState[];
        updateLogbook(currentSession); // This will call the updated render function in ui.ts
        saveChatHistoryToDB();
    } catch (error) {
        console.error("NPC list generation failed:", error);
        let errorMessage = 'Failed to generate NPC data. Please try again.';
        if (error instanceof Error && (error.message.includes('API Key') || error.message.includes('API key'))) {
            errorMessage = `Failed to generate data: API Key is missing or invalid.`;
        }
        display.innerHTML = `<div class="sheet-placeholder"><p>${errorMessage}</p></div>`;
    } finally {
        button.disabled = false;
        button.textContent = originalText;
        setGeneratingData(false);
    }
    return;
  }


  const { button, display, promptClause } = {
    inventory: { button: updateInventoryBtn, display: inventoryDisplay, promptClause: "inventory" },
    quests: { button: updateQuestsBtn, display: questsDisplay, promptClause: "quest journal, separating active and completed quests" },
  }[type];

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Generating...';
  display.textContent = 'The DM is consulting their notes...';

  try {
    const prompt = `Based on the following D&D conversation history, provide a concise summary of the player character's current ${promptClause}. Format the output clearly with headings and bullet points where appropriate. Conversation History: ${conversationHistory}`;

    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    const dataText = response.text;

    if (type === 'inventory') currentSession.inventory = dataText;
    else if (type === 'quests') currentSession.questLog = dataText;

    display.textContent = dataText;
    saveChatHistoryToDB();
  } catch (error) {
    console.error(`${type} generation failed:`, error);
    let errorMessage = `Failed to generate ${type}. Please try again.`;
    if (error instanceof Error && (error.message.includes('API Key') || error.message.includes('API key'))) {
        errorMessage = `Failed to generate data: API Key is missing or invalid.`;
    }
    display.textContent = errorMessage;
  } finally {
    button.disabled = false;
    button.textContent = originalText;
    setGeneratingData(false);
  }
}

export async function generateCharacterImage() {
  const currentSession = getCurrentChat();
  if (!currentSession || isGeneratingData()) return;

  setGeneratingData(true);
  generateImageBtn.disabled = true;
  characterImagePlaceholder.classList.add('hidden');
  characterImageLoading.classList.remove('hidden');

  try {
    const recentMessages = currentSession.messages.slice(-30);
    const conversationHistory = recentMessages.map(m => `${m.sender === 'user' ? 'Player' : 'DM'}: ${m.text}`).join('\n');
    const descriptionPrompt = `Based on the following D&D conversation, create a detailed visual description of the player character suitable for an AI image generator. Focus on physical appearance, race, class, clothing, equipment, and overall mood. Make it a rich, comma-separated list of keywords. Example: "elf ranger, long silver hair, green cloak, leather armor, holding a bow, standing in a dark forest, fantasy art, detailed". Conversation: ${conversationHistory}`;
    const descriptionResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: descriptionPrompt });
    const imagePrompt = descriptionResponse.text;

    if (!imagePrompt || imagePrompt.trim() === '') throw new Error("The AI failed to create a visual description for the image generator.");

    const loadingParagraph = characterImageLoading.querySelector('p');
    if (loadingParagraph) loadingParagraph.textContent = 'Image prompt created. Generating portrait...';

    const imageResponse = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: imagePrompt,
      config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '3:4' }
    });
    const base64Image = imageResponse.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/png;base64,${base64Image}`;

    currentSession.characterImageUrl = imageUrl;
    characterImageDisplay.src = imageUrl;
    characterImageDisplay.classList.remove('hidden');
    saveChatHistoryToDB();
  } catch (error) {
    console.error("Image generation failed:", error);
    characterImagePlaceholder.classList.remove('hidden');
    const placeholderParagraph = characterImagePlaceholder.querySelector('p');
    if (placeholderParagraph) {
        let errorMessage = 'Image generation failed. Please try again.';
        if (error instanceof Error && (error.message.includes('API Key') || error.message.includes('API key'))) {
            errorMessage = 'Image generation failed: API Key is missing or invalid.';
        }
        placeholderParagraph.textContent = errorMessage;
    }
  } finally {
    setGeneratingData(false);
    generateImageBtn.disabled = false;
    characterImageLoading.classList.add('hidden');
  }
}

// =================================================================================
// INVENTORY POPUP
// =================================================================================
export async function fetchAndRenderInventoryPopup() {
  const currentSession = getCurrentChat();
  if (!currentSession || isGeneratingData()) return;
  setGeneratingData(true);
  inventoryPopupContent.innerHTML = `<div class="placeholder">Checking your pouches...</div>`;

  try {
    const recentMessages = currentSession.messages.slice(-30);
    const conversationHistory = recentMessages.map(m => `${m.sender === 'user' ? 'Player' : 'DM'}: ${m.text}`).join('\n');
    // Fix: Updated prompt to request JSON and added responseSchema for robust parsing.
    const prompt = `Based on the following D&D conversation, list the player character's current inventory items as a JSON array of strings. Only include the item names. Example: ["Health Potion", "Rope (50ft)", "Dagger", "Gold (25gp)"]. Conversation History: ${conversationHistory}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });
    const itemsText = response.text;

    if (!itemsText || itemsText.trim() === '') {
      inventoryPopupContent.innerHTML = `<div class="placeholder">Your pockets are empty.</div>`;
      setGeneratingData(false);
      return;
    }

    const items = JSON.parse(itemsText);
    if (items.length > 0) {
      const ul = document.createElement('ul');
      items.forEach((item: string) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="inventory-item-name">${item}</span><button class="use-item-btn" data-item-name="${item}">Use</button>`;
        ul.appendChild(li);
      });
      inventoryPopupContent.innerHTML = '';
      inventoryPopupContent.appendChild(ul);
    } else {
      inventoryPopupContent.innerHTML = `<div class="placeholder">Your pockets are empty.</div>`;
    }
  } catch (error) {
    console.error("Inventory fetch failed:", error);
    let errorMessage = `Failed to get inventory.`;
    if (error instanceof Error && (error.message.includes('API Key') || error.message.includes('API key'))) {
        errorMessage = 'Failed to get inventory: API Key is missing or invalid.';
    }
    inventoryPopupContent.innerHTML = `<div class="placeholder">${errorMessage}</div>`;
  } finally {
    setGeneratingData(false);
  }
}

// =================================================================================
// UI THEMEING
// =================================================================================
const themes = [
    { id: 'high-fantasy-dark', name: 'High Fantasy (Dark)', colors: ['#131314', '#1e1f20', '#2a3a4a', '#c5b358'] },
    { id: 'high-fantasy-light', name: 'High Fantasy (Light)', colors: ['#fdf6e3', '#f5ead5', '#e9dbc2', '#8b4513'] },
    { id: 'dark-fantasy-crimson', name: 'Dark Fantasy (Crimson)', colors: ['#0a0a0a', '#1f1f1f', '#4a0e1a', '#b71c1c'] },
    { id: 'classic-rpg-parchment', name: 'Classic RPG (Parchment)', colors: ['#4d3c2a', '#3b2e21', '#6b543b', '#e5c100'] },
    { id: 'cyberpunk-hud-advanced', name: 'Cyberpunk (Advanced HUD)', colors: ['#0d0221', '#140c2b', '#c72cff', '#00f0ff'] },
    { id: 'cyberpunk-bladerunner', name: 'Cyberpunk (Bladerunner)', colors: ['#040a18', '#0b132b', '#1c2541', '#ff9900'] },
    { id: 'glitch-terminal', name: 'Glitch (Terminal)', colors: ['#000000', '#111111', '#222222', '#ffffff'] },
    { id: 'glitch-terminal-crt', name: 'Glitch (CRT)', colors: ['#000000', '#111111', '#555555', '#e0e0e0'] },
    { id: 'hacker-terminal', name: 'Hacker (Terminal)', colors: ['#0d0d0d', '#001a00', '#003300', '#00ff00'] },
    { id: 'hacker-terminal-glitch', name: 'Hacker (Glitch)', colors: ['#0d0d0d', '#001a00', '#003300', '#00ff00'] },
    { id: 'hacker-terminal-amber', name: 'Hacker (Amber)', colors: ['#000000', '#1a0a00', '#331f00', '#ffb400'] },
    { id: 'hacker-terminal-vault-tec', name: 'Hacker (Vault-Tec)', colors: ['#0a141f', '#0f1c2d', '#142a40', '#27bce0'] },
    { id: 'vampire-gothic-terminal', name: 'Vampire (Gothic Terminal)', colors: ['#050101', '#1a0303', '#3b0f0f', '#ff4d4d'] },
    { id: 'text-adventure-dark', name: 'Text Adventure (Dark)', colors: ['#000000', '#0a0a0a', '#111111', '#cccccc'] },
    { id: 'outer-space-starship', name: 'Outer Space (Starship)', colors: ['#eef2f5', '#ffffff', '#d7dfe5', '#007bff'] },
    { id: 'outer-space-alert', name: 'Outer Space (Alert)', colors: ['#3d0000', '#2e0000', '#5c0000', '#ff4444'] },
    { id: 'pirate-sea', name: 'Pirates (High Seas)', colors: ['#f0e5d1', '#faeedb', '#e6d9c1', '#008b8b'] },
    { id: 'steampunk', name: 'Steampunk', colors: ['#5a3e2b', '#3d2b1f', '#8c6742', '#d4ac0d'] },
    { id: 'art-deco', name: 'Art Deco', colors: ['#0d2c2c', '#041f1f', '#1a4d4d', '#d4af37'] },
    { id: 'solarpunk', name: 'Solarpunk', colors: ['#f0f5e6', '#ffffff', '#d9e6cc', '#ff9900'] },
    { id: 'aquatic', name: 'Aquatic', colors: ['#0a1f3a', '#061528', '#1a3960', '#33d4ff'] },
    { id: 'apocalyptic', name: 'Apocalyptic', colors: ['#3b3a35', '#2b2a26', '#4f4d48', '#a3955a'] },
    { id: '8-bit-arcade', name: '8-Bit Arcade', colors: ['#000000', '#0d0d0d', '#2a004a', '#00ffff'] },
    { id: 'celestial', name: 'Celestial', colors: ['#100f1a', '#191829', '#3c3a59', '#d8b8ff'] },
];

export function renderThemeCards() {
  themeGrid.innerHTML = '';
  themes.forEach(theme => {
    const card = document.createElement('div');
    card.className = 'theme-card';
    card.dataset.theme = theme.id;
    card.innerHTML = `
        <div class="theme-preview">${theme.colors.map(color => `<span style="background-color: ${color};"></span>`).join('')}</div>
        <div class="theme-name">${theme.name}</div>`;
    themeGrid.appendChild(card);
  });
}

export function applyTheme(themeId: string) {
  document.body.dataset.theme = themeId;
  dbSet('dm-os-theme', themeId);
}

// =================================================================================
// FILE HANDLING
// =================================================================================

export function exportChatToLocal(sessionId: string) {
  const session = getChatHistory().find(s => s.id === sessionId);
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

export function exportAllChats() {
  if (getChatHistory().length === 0) {
    alert("No chats to export.");
    return;
  }
  const historyJson = JSON.stringify(getChatHistory(), null, 2);
  const blob = new Blob([historyJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dm_os_all_chats_backup_${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function handleImportAll(event: Event) {
    // This function is complex and has side effects, so it will live in the main controller (index.tsx)
    // to avoid circular dependencies with `loadChat` and `startNewChat`.
    // This is a placeholder; the real implementation is in the main controller.
}

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove 'data:mime/type;base64,' part
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
}