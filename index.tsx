
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// Fix: Improved the 'generateContent' call for creating quick start characters by adding a 'responseSchema' to ensure valid JSON output.
// Fix: Implemented the missing 'loadChat' function which is required to switch between adventure sessions and initialize the Gemini API context for the selected chat.
import { Type, GenerateContentResponse } from '@google/genai';
import {
  initDB,
  loadChatHistoryFromDB,
  loadUserContextFromDB,
  getChatHistory,
  getCurrentChat,
  setCurrentChatId,
  saveChatHistoryToDB,
  getGeminiChat,
  setGeminiChat,
  getUserContext,
  saveUserContextToDB,
  isSending,
  setSending,
  isGeneratingData,
  getCurrentPersonaId,
  setCurrentPersonaId,
  getUISettings,
  setUISettings,
  chatHistory,
  dbGet,
  dbSet,
  getChroniclerChat,
  setChroniclerChat,
} from './state';
import {
  chatContainer,
  chatForm,
  chatInput,
  sendButton,
  menuBtn,
  newChatBtn,
  overlay,
  exportAllBtn,
  importAllBtn,
  importAllFileInput,
  contextForm,
  contextInput,
  contextList,
  inventoryBtn,
  inventoryPopup,
  closeInventoryBtn,
  refreshInventoryBtn,
  helpBtn,
  helpModal,
  closeHelpBtn,
  dndHelpBtn,
  dndHelpModal,
  closeDndHelpBtn,
  renameModal,
  renameForm,
  renameInput,
  closeRenameBtn,
  deleteConfirmModal,
  closeDeleteConfirmBtn,
  cancelDeleteBtn,
  confirmDeleteBtn,
  deleteChatName,
  diceRollerBtn,
  diceModal,
  closeDiceBtn,
  diceGrid,
  clearResultsBtn,
  logbookBtn,
  logbookModal,
  closeLogbookBtn,
  logbookNav,
  logbookPanes,
  updateSheetBtn,
  updateInventoryBtn,
  updateQuestsBtn,
  updateNpcsBtn,
  updateAchievementsBtn,
  generateImageBtn,
  fontSizeControls,
  enterToSendToggle,
  experimentalUploadToggle,
  modelSelect,
  apiKeyInput,
  saveApiKeyBtn,
  changeUiBtn,
  themeModal,
  closeThemeBtn,
  themeGrid,
  chatOptionsMenu,
  toggleSidebar,
  closeSidebar,
  openModal,
  closeModal,
  applyUISettings,
  renderChatHistory,
  openChatOptionsMenu,
  closeChatOptionsMenu,
  appendMessage,
  renderMessages,
  updateLogbook,
  renderQuickStartChoices,
  renderSetupChoices,
  quickActionsBar,
  inventoryPopupContent,
  renderUserContext,
  chatHistoryContainer,
  updateCombatTracker,
  combatTracker,
  combatTrackerHeader,
  welcomeModal,
  closeWelcomeBtn,
  fileUploadBtn,
  fileUploadInput,
  appendFileProcessingMessage,
  contextManager,
  contextHeader,
} from './ui';
import {
  stopTTS,
  addUserContext,
  deleteUserContext,
  handleTTS,
  handleDieRoll,
  rollDice,
  updateLogbookData,
  generateCharacterImage,
  fetchAndRenderInventoryPopup,
  exportChatToLocal,
  exportAllChats,
  handleImportAll,
  applyTheme,
  clearDiceResults,
  renderDiceGrid,
  renderThemeCards,
  fileToBase64,
  recallRelevantMemories,
  commitToSemanticMemory
} from './features';
import {
  ai,
  createNewChatInstance,
  dmPersonas,
  getNewGameSetupInstruction,
  getQuickStartCharacterPrompt,
  getChroniclerPrompt,
  resetAI,
} from './gemini';
import { retryOperation } from './utils';
// Fix: import UISettings type
import type { Message, ChatSession, UISettings, GameSettings } from './types';

let chatIdToRename: string | null = null;
let chatIdToDelete: string | null = null;

const quickStartCharacterSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    race: { type: Type.STRING },
    class: { type: Type.STRING },
    level: { type: Type.INTEGER },
    backstory: { type: Type.STRING },
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

/**
 * Displays a boot sequence animation on first load.
 */
function runBootSequence(): Promise<void> {
  return new Promise((resolve) => {
    const bootScreen = document.getElementById('boot-screen');
    const bootTextContainer = document.getElementById('boot-text');
    if (!bootScreen || !bootTextContainer) {
      resolve();
      return;
    }

    const lines = [
      'DM OS v2.1 Initializing...',
      'Connecting to WFGY Core Flagship v2.0... OK',
      'Loading Semantic Tree... 1.2TB nodes loaded.',
      'Calibrating Collapse-Rebirth Cycle (BBCR)... STABLE',
      'Waking Dungeon Master Persona...',
      'Ready.',
    ];

    let lineIndex = 0;

    const typeLine = () => {
      if (lineIndex >= lines.length) {
        // Finished typing
        setTimeout(() => {
          bootScreen.classList.add('fade-out');
          bootScreen.addEventListener('transitionend', () => {
            bootScreen.style.display = 'none';
          }, { once: true });
          document.body.classList.add('app-visible');
          resolve();
        }, 500);
        return;
      }

      const p = document.createElement('p');
      p.textContent = lines[lineIndex];
      p.classList.add('cursor');
      
      const prevLine = bootTextContainer.querySelector('.cursor');
      if (prevLine) {
        prevLine.classList.remove('cursor');
      }

      bootTextContainer.appendChild(p);
      lineIndex++;

      setTimeout(typeLine, lineIndex === lines.length -1 ? 700 : Math.random() * 200 + 100);
    };

    setTimeout(typeLine, 500);
  });
}

/**
 * Checks if the v2 welcome modal has been shown and displays it if not.
 */
function showWelcomeModalIfNeeded() {
    const welcomeShown = localStorage.getItem('dm-os-v2-welcome-shown');
    if (!welcomeShown) {
        openModal(welcomeModal);
        localStorage.setItem('dm-os-v2-welcome-shown', 'true');
    }
}

/**
 * Fix: Implemented the missing loadChat function which is critical for session switching.
 */
async function loadChat(id: string) {
  stopTTS();
  setCurrentChatId(id);
  const session = getCurrentChat();
  if (!session) return;

  closeSidebar();
  renderChatHistory();
  renderMessages(session.messages);
  updateLogbook(session);

  // Reconstruct chat history for initializing the Gemini Chat instance
  const history = session.messages
    .filter(m => !m.hidden && m.sender !== 'error' && m.sender !== 'system')
    .map(m => ({
      role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: m.text }]
    }));

  const personaId = session.personaId || 'purist';
  const persona = dmPersonas.find(p => p.id === personaId) || dmPersonas[0];
  const instruction = persona.getInstruction(session.adminPassword || 'DM-OS-DEFAULT-PWD');

  setGeminiChat(createNewChatInstance(history, instruction));
  // Initialize the Chronicler for background world simulation
  setChroniclerChat(createNewChatInstance([], getChroniclerPrompt(), 'gemini-3-flash-preview'));
}


/**
 * Starts a brand new chat session, guiding the user through the setup process.
 */
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

    const result = await retryOperation(() => setupGeminiChat.sendMessageStream({ message: kickoffMessage })) as any;
    let responseText = '';
    for await (const chunk of result) {
      responseText += chunk.text || '';
    }

    loadingContainer.remove();

    const firstModelMessage: Message = { sender: 'model', text: responseText };
    const newId = `chat-${Date.now()}`;

    const newSession: ChatSession = {
      id: newId,
      title: 'New Game Setup',
      messages: [firstUserMessage, firstModelMessage],
      isPinned: false,
      createdAt: Date.now(),
      personaId: 'purist', // Default persona
      creationPhase: 'guided',
      settings: {
        tone: 'heroic',
        narration: 'descriptive',
      },
      progressClocks: {},
      factions: {},
    };

    getChatHistory().push(newSession);
    saveChatHistoryToDB();
    loadChat(newId);
  } catch (error: any) {
    console.error('New game setup failed:', error);
    loadingContainer.remove();
    
    let errorMessage = `Failed to start game. Error details: ${error.message || 'Unknown error'}`;
    
    // Handle Rate Limit (429) specific message
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
        errorMessage = "⚠️ System Overload (429): The 'Gemini 3.0 Pro' model is currently busy. Please go to Settings (in Logbook) and switch the AI Model to 'Gemini 2.5 Flash' for a smoother experience.";
    }
    
    if (error.message && (error.message.includes('API Key') || error.message.includes('API key'))) {
        errorMessage = 'Error: API Key is missing or invalid. Please check your settings in the Logbook.';
    }
    appendMessage({ sender: 'error', text: errorMessage });
  }
}
