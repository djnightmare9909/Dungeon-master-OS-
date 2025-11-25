/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Type, GenerateContentResponse } from '@google/genai';
import {
  isGeneratingData,
  setGeneratingData,
  getCurrentChat,
  saveChatHistoryToDB,
  getUserContext,
  saveUserContextToDB,
  getChatHistory,
  dbSet,
  getUISettings
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
  contextList,
  renderCharacterSheet, 
  renderAchievements, 
  renderUserContext, 
  updateLogbook,
  appendMessage
} from './ui';
import { ai, generateEmbedding } from './gemini';
import { calculateCosineSimilarity, retryOperation } from './utils';
import type { CharacterSheetData, Achievement, NPCState, SemanticNode } from './types';

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
              // Fallback: resolve with empty array rather than rejecting, 
              // so the app doesn't crash if TTS isn't supported/ready.
              resolve([]);
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
                currentChunk = (currentChunk + ' ' + word).trim();
            }
        }
        if (currentChunk.length > 0) chunks.push(currentChunk);
    }
    return chunks;
}

/**
 * Main entry point for the TTS button click.
 */
export async function handleTTS(htmlContent: string, button: HTMLButtonElement) {
    const currentGeneration = ttsGeneration;

    // If clicking the same button that is currently active
    if (ttsCurrentButton === button) {
        if (ttsState === 'PLAYING') {
            speechSynthesis.pause();
            ttsState = 'PAUSED';
            updateTTS_UI();
        } else if (ttsState === 'PAUSED') {
            speechSynthesis.resume();
            ttsState = 'PLAYING';
            updateTTS_UI();
        }
        return;
    }

    // If clicking a new button, stop everything first.
    stopTTS();
    
    // Update the generation after stopTTS increments it, to ensure we own this sequence.
    // Wait, stopTTS increments generation. So the generation we captured at the start is now old.
    // We need to capture the NEW generation ID.
    const myGeneration = ttsGeneration; 

    ttsCurrentButton = button;
    // Strip HTML tags for speech
    const text = htmlContent.replace(/<[^>]*>/g, '');
    const chunks = chunkText(text);

    try {
        const voices = await getAvailableVoices();
        // Prefer a female voice, or Google US English, or default
        const voice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Female')) || voices[0];

        ttsQueue = chunks.map(chunk => {
            const u = new SpeechSynthesisUtterance(chunk);
            if (voice) u.voice = voice;
            u.rate = 1.0;
            u.pitch = 1.0;
            u.onend = () => handleUtteranceEnd(myGeneration);
            u.onerror = (e) => {
                console.error("TTS Error", e);
                // Only stop if it wasn't a cancel event
                if (e.error !== 'canceled' && e.error !== 'interrupted') {
                    stopTTS();
                }
            };
            return u;
        });

        playQueue(myGeneration);

    } catch (e) {
        console.error("Failed to initialize TTS", e);
        stopTTS();
    }
}

// =================================================================================
// DICE ROLLER
// =================================================================================

export function renderDiceGrid() {
  const diceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
  diceGrid.innerHTML = diceTypes.map(die => `
    <div class="die-item" data-die="${die}">
      <div class="die-visual ${die}">${die.substring(1)}</div>
      <div class="die-controls">
        <button class="minus">-</button>
        <input type="number" class="quantity-input" value="1" min="1" max="99">
        <button class="plus">+</button>
      </div>
    </div>
  `).join('');
}

export function rollDice(expression: string): { success: boolean; resultText: string; total: number } {
  try {
    // Basic parsing for "d20", "2d6", "1d8+2"
    const match = expression.match(/(\d*)d(\d+)(?:\s*([+-])\s*(\d+))?/i);
    if (!match) return { success: false, resultText: '', total: 0 };

    const count = parseInt(match[1] || '1', 10);
    const sides = parseInt(match[2], 10);
    const op = match[3];
    const modifier = parseInt(match[4] || '0', 10);

    if (count > 100) return { success: false, resultText: 'Too many dice!', total: 0 };

    let rolls = [];
    let subTotal = 0;
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      subTotal += roll;
    }

    let total = subTotal;
    if (op === '+') total += modifier;
    if (op === '-') total -= modifier;

    const rollStr = `[${rolls.join(', ')}]`;
    const modStr = modifier > 0 ? ` ${op} ${modifier}` : '';
    const resultText = `Rolled ${count}d${sides}${modStr}: **${total}** ${rollStr}`;

    return { success: true, resultText, total };
  } catch (e) {
    return { success: false, resultText: '', total: 0 };
  }
}

export function handleDieRoll(dieItem: HTMLElement) {
  const dieType = dieItem.dataset.die; // e.g., "d20"
  const quantityInput = dieItem.querySelector('.quantity-input') as HTMLInputElement;
  const quantity = parseInt(quantityInput.value, 10) || 1;

  const visual = dieItem.querySelector('.die-visual');
  visual?.classList.add('rolling');
  setTimeout(() => visual?.classList.remove('rolling'), 500);

  const command = `${quantity}${dieType}`; // e.g. "2d20"
  const { success, resultText, total } = rollDice(command);

  if (success) {
    const p = document.createElement('p');
    p.innerHTML = resultText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    diceResultsLog.prepend(p);
    
    // Update running total
    const currentTotal = parseInt(diceTotalValue.textContent || '0', 10);
    diceTotalValue.textContent = String(currentTotal + total);
  }
}

export function clearDiceResults() {
    diceResultsLog.innerHTML = '';
    diceTotalValue.textContent = '0';
}

// =================================================================================
// LOGBOOK & DATA GENERATION
// =================================================================================

async function generateLogbookSection(section: 'sheet' | 'inventory' | 'quests' | 'npcs' | 'achievements') {
  const session = getCurrentChat();
  if (!session) return;

  // Construct a history string for context
  const historyText = session.messages
    .filter(m => !m.hidden && m.sender !== 'error' && m.sender !== 'system')
    .slice(-20) // Look at last 20 messages for context
    .map(m => `${m.sender.toUpperCase()}: ${m.text}`)
    .join('\n');

  let prompt = '';
  let schema: any = null;

  switch (section) {
    case 'sheet':
      prompt = `Based on the following chat history, generate a JSON object representing the user's character sheet (D&D 5e). Fill in as much detail as possible from context. If unknown, use defaults.
      History:
      ${historyText}`;
      schema = {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          race: { type: Type.STRING },
          class: { type: Type.STRING },
          level: { type: Type.INTEGER },
          abilityScores: {
            type: Type.OBJECT,
            properties: {
              STR: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING } } },
              DEX: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING } } },
              CON: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING } } },
              INT: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING } } },
              WIS: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING } } },
              CHA: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, modifier: { type: Type.STRING } } }
            }
          },
          armorClass: { type: Type.INTEGER },
          hitPoints: { type: Type.OBJECT, properties: { current: { type: Type.INTEGER }, max: { type: Type.INTEGER } } },
          speed: { type: Type.STRING },
          skills: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, proficient: { type: Type.BOOLEAN } } } },
          featuresAndTraits: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      };
      break;
    case 'inventory':
      prompt = `Based on the chat history, list the character's inventory as a simple text list. Include quantities. History: ${historyText}`;
      break;
    case 'quests':
      prompt = `Based on the chat history, write a concise quest journal. List active quests and their current status. History: ${historyText}`;
      break;
    case 'npcs':
      prompt = `Identify the key NPCs met in the recent history. Return a JSON array.
      History: ${historyText}`;
      schema = {
          type: Type.ARRAY,
          items: {
              type: Type.OBJECT,
              properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  relationship: { type: Type.STRING, description: "Friendly, Hostile, Neutral, etc." }
              }
          }
      };
      break;
    case 'achievements':
      prompt = `Generate a list of 3-5 'achievements' or milestones the player has recently accomplished based on the history. Be creative. JSON format. History: ${historyText}`;
      schema = {
          type: Type.ARRAY,
          items: {
              type: Type.OBJECT,
              properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
              }
          }
      };
      break;
  }

  try {
    const response = await retryOperation(() => ai.models.generateContent({
      model: getUISettings().activeModel,
      contents: prompt,
      config: {
        responseMimeType: schema ? 'application/json' : 'text/plain',
        responseSchema: schema,
      }
    })) as GenerateContentResponse;

    const text = response.text || '';

    if (section === 'sheet') {
      session.characterSheet = JSON.parse(text) as CharacterSheetData;
    } else if (section === 'inventory') {
      session.inventory = text;
    } else if (section === 'quests') {
      session.questLog = text;
    } else if (section === 'npcs') {
        session.npcList = JSON.parse(text) as NPCState[];
    } else if (section === 'achievements') {
      session.achievements = JSON.parse(text) as Achievement[];
    }

    saveChatHistoryToDB();
    updateLogbook(session);

  } catch (error) {
    console.error(`Failed to update ${section}:`, error);
    alert(`Failed to update ${section}. API Error.`);
  }
}

export async function updateLogbookData(section: 'sheet' | 'inventory' | 'quests' | 'npcs' | 'achievements') {
  if (isGeneratingData()) return;
  setGeneratingData(true);

  const btnMap = {
    sheet: updateSheetBtn,
    inventory: updateInventoryBtn,
    quests: updateQuestsBtn,
    npcs: updateNpcsBtn,
    achievements: updateAchievementsBtn
  };
  const btn = btnMap[section];
  const originalText = btn.textContent;
  btn.textContent = 'Updating...';
  btn.disabled = true;

  try {
    await generateLogbookSection(section);
  } finally {
    btn.textContent = 'Updated!';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
    }, 2000);
    setGeneratingData(false);
  }
}

export async function generateCharacterImage() {
    const session = getCurrentChat();
    if (!session || isGeneratingData()) return;
    
    setGeneratingData(true);
    generateImageBtn.disabled = true;
    characterImagePlaceholder.classList.add('hidden');
    characterImageDisplay.classList.add('hidden');
    characterImageLoading.classList.remove('hidden');

    try {
        // 1. Generate a prompt for the image
        let description = "";
        if (typeof session.characterSheet === 'object' && session.characterSheet) {
            const s = session.characterSheet;
            description = `A ${s.race} ${s.class}, level ${s.level}. Features: ${s.featuresAndTraits?.slice(0,3).join(', ')}.`;
        } else {
            description = "A D&D adventurer.";
        }

        const promptResponse = await retryOperation(() => ai.models.generateContent({
            model: getUISettings().activeModel,
            contents: `Create a detailed visual description for an image generation model of this character: ${description}. The style should be digital fantasy art, detailed, dramatic lighting. Output ONLY the description.`,
        })) as GenerateContentResponse;
        
        const imagePrompt = promptResponse.text || description;

        // 2. Generate the Image using Imagen
        // Use 'any' as the response type for generateImages isn't explicitly imported
        const imageResponse = await retryOperation(() => ai.models.generateImages({
            model: 'imagen-4.0-generate-001', // Explicitly use Imagen
            prompt: imagePrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '1:1',
                outputMimeType: 'image/jpeg'
            }
        })) as any;

        const base64Image = imageResponse.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64Image}`;

        session.characterImageUrl = imageUrl;
        saveChatHistoryToDB();
        updateLogbook(session);

    } catch (error) {
        console.error("Image generation failed:", error);
        alert("Failed to generate image. Please try again.");
        characterImagePlaceholder.classList.remove('hidden');
    } finally {
        characterImageLoading.classList.add('hidden');
        generateImageBtn.disabled = false;
        setGeneratingData(false);
    }
}

export async function fetchAndRenderInventoryPopup() {
    const session = getCurrentChat();
    if (!session) return;
    
    inventoryPopupContent.innerHTML = '<div class="placeholder">Checking bag...</div>';
    
    try {
        // Reuse the existing inventory logic or fetch new structured data
        // For the popup, we want a structured list if possible.
        // If session.inventory is text, we might need to parse it or ask AI to structure it.
        // To be fast, let's just ask AI for a quick JSON list.
        
        const historyText = session.messages
            .slice(-20)
            .map(m => `${m.sender}: ${m.text}`)
            .join('\n');

        const response = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-2.5-flash', // Use Flash for speed in UI elements
            contents: `Based on this history, list the character's inventory items as a JSON list of strings. Be concise. History: ${historyText}`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        })) as GenerateContentResponse;
        
        const items = JSON.parse(response.text || '[]');
        
        if (items.length === 0) {
            inventoryPopupContent.innerHTML = '<div class="placeholder">Bag is empty.</div>';
        } else {
            inventoryPopupContent.innerHTML = `
                <ul>
                    ${items.map((item: string) => `
                        <li>
                            <span class="inventory-item-name">${item}</span>
                            <button class="use-item-btn" data-item-name="${item.replace(/"/g, '&quot;')}">Use</button>
                        </li>
                    `).join('')}
                </ul>
            `;
        }

    } catch (error) {
        console.error("Inventory fetch failed:", error);
        inventoryPopupContent.innerHTML = `<div class="placeholder" style="color: var(--danger-color);">Failed to load inventory.</div>`;
    }
}

// =================================================================================
// WFGY-LITE: SEMANTIC MEMORY SYSTEM
// =================================================================================

export async function commitToSemanticMemory(text: string, importance: number = 0.5) {
    const session = getCurrentChat();
    if (!session) return;
    if (!session.semanticLog) session.semanticLog = [];

    try {
        const embedding = await generateEmbedding(text);
        const node: SemanticNode = {
            id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: text,
            embedding: embedding,
            timestamp: Date.now(),
            importance: importance
        };
        session.semanticLog.push(node);
        saveChatHistoryToDB();
        // console.log("Committed to Semantic Tree:", text.substring(0, 30) + "...");
    } catch (e) {
        console.error("Failed to commit to semantic memory:", e);
    }
}

export async function recallRelevantMemories(query: string, topK: number = 3): Promise<string[]> {
    const session = getCurrentChat();
    if (!session || !session.semanticLog || session.semanticLog.length === 0) return [];

    try {
        const queryEmbedding = await generateEmbedding(query);
        
        // Calculate cosine similarity for all nodes
        const scoredNodes = session.semanticLog.map(node => ({
            content: node.content,
            score: calculateCosineSimilarity(queryEmbedding, node.embedding) * (1 + node.importance * 0.1) // Weight by importance slightly
        }));

        // Sort descending
        scoredNodes.sort((a, b) => b.score - a.score);

        // Filter for reasonable relevance (e.g., > 0.4 similarity)
        const relevant = scoredNodes
            .filter(n => n.score > 0.45)
            .slice(0, topK)
            .map(n => n.content);
            
        return relevant;
    } catch (e) {
        console.error("Memory recall failed:", e);
        return [];
    }
}


// =================================================================================
// EXPORT / IMPORT / THEME / ETC
// =================================================================================

export function exportChatToLocal(sessionId: string) {
    const session = getChatHistory().find(s => s.id === sessionId);
    if (!session) return;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `dmos_export_${session.title.replace(/[^a-z0-9]/gi, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export function exportAllChats() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        version: 2,
        chats: getChatHistory(),
        userContext: getUserContext()
    }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `dmos_full_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export async function handleImportAll(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const json = JSON.parse(e.target?.result as string);
            
            // Handle both single session export and full backup
            if (json.chats && Array.isArray(json.chats)) {
                // Full backup
                // Merge strategy: append new, don't overwrite existing IDs unless prompted?
                // For simplicity, we'll filter out duplicates by ID.
                const existingIds = new Set(getChatHistory().map(c => c.id));
                let importedCount = 0;
                
                for (const chat of json.chats) {
                    if (!existingIds.has(chat.id)) {
                        getChatHistory().push(chat);
                        importedCount++;
                    }
                }
                
                if (json.userContext && Array.isArray(json.userContext)) {
                    const currentContext = new Set(getUserContext());
                    json.userContext.forEach((c: string) => currentContext.add(c));
                    // Fix: Cannot assign to 'userContext' because it is an import.
                    // We need to use a mutator or direct array manipulation if exported as const.
                    // Since state.ts exports 'userContext' as 'let', we can't reassign it here directly via import.
                    // We must use the accessor or modify the array in place.
                    // state.ts exports it as 'export let userContext'.
                    // We'll clear and refill it to be safe, or add to it.
                    // Let's use a helper in state.ts ideally, but here we can just empty and push.
                    const newContextArray = Array.from(currentContext);
                    const stateContext = getUserContext();
                    stateContext.length = 0;
                    stateContext.push(...newContextArray);
                    saveUserContextToDB();
                }
                
                saveChatHistoryToDB();
                alert(`Imported ${importedCount} new chats.`);
                window.location.reload(); // Reload to render
                
            } else if (json.messages && Array.isArray(json.messages)) {
                // Single chat
                const existing = getChatHistory().find(c => c.id === json.id);
                if (existing) {
                    if (confirm(`Chat "${json.title}" already exists. Overwrite?`)) {
                        Object.assign(existing, json);
                        saveChatHistoryToDB();
                        window.location.reload();
                    }
                } else {
                    getChatHistory().push(json);
                    saveChatHistoryToDB();
                    window.location.reload();
                }
            } else {
                throw new Error("Invalid file format");
            }
            
        } catch (err) {
            console.error("Import failed", err);
            alert("Failed to import file. Invalid JSON.");
        }
    };
    
    reader.readAsText(file);
    input.value = ''; // Reset
}

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

// --- Theme Logic ---
const themes = [
  { id: 'high-fantasy-dark', name: 'High Fantasy (Dark)' },
  { id: 'high-fantasy-light', name: 'High Fantasy (Light)' },
  { id: 'dark-fantasy-crimson', name: 'Dark Fantasy Crimson' },
  { id: 'classic-rpg-parchment', name: 'Classic RPG Parchment' },
  { id: 'cyberpunk-hud-advanced', name: 'Cyberpunk HUD' },
  { id: 'cyberpunk-bladerunner', name: 'Blade Runner Neon' },
  { id: 'glitch-terminal', name: 'Glitch Terminal' },
  { id: 'glitch-terminal-crt', name: 'Retro CRT Terminal' },
  { id: 'hacker-terminal', name: 'Matrix Green' },
  { id: 'hacker-terminal-glitch', name: 'Hacker Glitch' },
  { id: 'hacker-terminal-amber', name: 'Retro Amber' },
  { id: 'hacker-terminal-vault-tec', name: 'Vault-Tec Blue/Yellow' },
  { id: 'vampire-gothic-terminal', name: 'Vampire Gothic' },
  { id: 'text-adventure-dark', name: 'Minimalist Text Adventure' },
  { id: 'outer-space-starship', name: 'Sci-Fi Starship' },
  { id: 'outer-space-alert', name: 'Red Alert' },
  { id: 'pirate-sea', name: 'Pirate Map' },
  { id: 'steampunk', name: 'Steampunk Brass' },
  { id: 'art-deco', name: 'BioShock Art Deco' },
  { id: 'solarpunk', name: 'Solarpunk Utopia' },
  { id: 'aquatic', name: 'Deep Sea' },
  { id: 'apocalyptic', name: 'Wasteland Log' },
  { id: '8-bit-arcade', name: '8-Bit Dungeon' },
  { id: 'celestial', name: 'Celestial Void' },
];

export function renderThemeCards() {
    themeGrid.innerHTML = themes.map(theme => `
        <div class="theme-card" data-theme="${theme.id}">
            <div class="theme-preview" style="background: var(--background-color); color: var(--text-color); border: 1px solid var(--border-color);">
                <span style="padding: 10px; font-family: var(--primary-font);">Abc</span>
            </div>
            <div class="theme-name">${theme.name}</div>
        </div>
    `).join('');
}

export function applyTheme(themeId: string) {
    document.body.setAttribute('data-theme', themeId);
    dbSet('dm-os-theme', themeId);
    
    // Re-render cards to show selection state if we wanted to, 
    // but mostly we just update the body attr.
}

// --- File Helper ---
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove Data-URL declaration (e.g. "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}