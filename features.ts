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
import { renderCharacterSheet, renderAchievements, renderUserContext } from './ui';
import { ai } from './gemini';
import type { CharacterSheetData, Achievement } from './types';

// =================================================================================
// TTS
// =================================================================================
let currentSpeech: SpeechSynthesisUtterance | null = null;
let currentlyPlayingTTSButton: HTMLButtonElement | null = null;

export function stopTTS() {
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

export function handleTTS(text: string, button: HTMLButtonElement) {
  const isPlaying = (currentlyPlayingTTSButton === button);
  stopTTS();
  if (isPlaying) return;

  const plainText = new DOMParser().parseFromString(text, 'text/html').body.textContent || '';
  if (!plainText) return;

  currentSpeech = new SpeechSynthesisUtterance(plainText);
  currentlyPlayingTTSButton = button;
  const soundWave = button.nextElementSibling as HTMLElement;
  const playIcon = button.querySelector('.play-icon') as SVGElement;
  const pauseIcon = button.querySelector('.pause-icon') as SVGElement;

  currentSpeech.onstart = () => {
    soundWave.classList.add('playing');
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  };
  currentSpeech.onend = () => stopTTS();
  currentSpeech.onerror = (event: SpeechSynthesisErrorEvent) => {
    if (event.error !== 'canceled') console.error('SpeechSynthesisUtterance.onerror', event);
    stopTTS();
  };
  speechSynthesis.speak(currentSpeech);
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

  if (type === 'sheet' || type === 'achievements') {
    const isSheet = type === 'sheet';
    const button = isSheet ? updateSheetBtn : updateAchievementsBtn;
    const display = isSheet ? characterSheetDisplay : achievementsDisplay;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Generating...';
    display.innerHTML = `<div class="sheet-placeholder"><p>The DM is reviewing your adventure to update your ${isSheet ? 'character sheet' : 'achievements'}...</p><div class="spinner"></div></div>`;

    try {
      const conversationHistory = currentSession.messages.map(m => `${m.sender === 'user' ? 'Player' : 'DM'}: ${m.text}`).join('\n');
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
      display.innerHTML = `<div class="sheet-placeholder"><p>Failed to generate ${type} data. Please try again.</p></div>`;
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
    npcs: { button: updateNpcsBtn, display: npcsDisplay, promptClause: "list of significant Non-Player Characters (NPCs) met, with a one-sentence description for each" }
  }[type];

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Generating...';
  display.textContent = 'The DM is consulting their notes...';

  try {
    const conversationHistory = currentSession.messages.map(m => `${m.sender === 'user' ? 'Player' : 'DM'}: ${m.text}`).join('\n');
    const prompt = `Based on the following D&D conversation history, provide a concise summary of the player character's current ${promptClause}. Format the output clearly with headings and bullet points where appropriate. Conversation History: ${conversationHistory}`;

    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    const dataText = response.text;

    if (type === 'inventory') currentSession.inventory = dataText;
    else if (type === 'quests') currentSession.questLog = dataText;
    else if (type === 'npcs') currentSession.npcList = dataText;

    display.textContent = dataText;
    saveChatHistoryToDB();
  } catch (error) {
    console.error(`${type} generation failed:`, error);
    display.textContent = `Failed to generate ${type}. Please try again.`;
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
    const conversationHistory = currentSession.messages.map(m => `${m.sender === 'user' ? 'Player' : 'DM'}: ${m.text}`).join('\n');
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
    if (placeholderParagraph) placeholderParagraph.textContent = 'Image generation failed. Please try again.';
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
    const conversationHistory = currentSession.messages.map(m => `${m.sender === 'user' ? 'Player' : 'DM'}: ${m.text}`).join('\n');
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
    inventoryPopupContent.innerHTML = `<div class="placeholder">Failed to get inventory.</div>`;
  } finally {
    setGeneratingData(false);
  }
}

// =================================================================================
// UI THEMEING
// =================================================================================
const themes = [
    { id: 'sci-fi-blue-hud', name: 'Sci-Fi (Blue HUD)', colors: ['#03070C', '#102542', '#0A4A6E', '#00E5FF'] },
    { id: 'hacker-terminal', name: 'Hacker (Terminal)', colors: ['#0d0d0d', '#001a00', '#003300', '#00ff00'] },
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
