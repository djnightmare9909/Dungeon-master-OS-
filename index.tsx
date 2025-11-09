/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// Fix: Improved the 'generateContent' call for creating quick start characters by adding a 'responseSchema' to ensure valid JSON output.
import { Type } from '@google/genai';
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
} from './features';
import {
  ai,
  createNewChatInstance,
  dmPersonas,
  getNewGameSetupInstruction,
  getQuickStartCharacterPrompt,
} from './gemini';
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
      'Connecting to WFGY Universal Unification Framework... OK',
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

    const result = await setupGeminiChat.sendMessageStream({ message: kickoffMessage });
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
    };

    getChatHistory().push(newSession);
    saveChatHistoryToDB();
    loadChat(newId);
  } catch (error) {
    console.error('New game setup failed:', error);
    loadingContainer.remove();
    let errorMessage = 'Failed to start the game setup. Please try again.';
    if (error instanceof Error && (error.message.includes('API Key') || error.message.includes('API key'))) {
        errorMessage = 'Error: API Key is missing or invalid. Please ensure it is correctly configured in your environment.';
    }
    appendMessage({ sender: 'error', text: errorMessage });
  }
}

/**
 * Loads a specific chat session into the main view.
 * @param id The ID of the chat session to load.
 */
function loadChat(id: string) {
  const currentChatId = getCurrentChat()?.id;
  if (currentChatId === id && !document.body.classList.contains('sidebar-open')) {
    return;
  }
  stopTTS();
  const session = getChatHistory().find(s => s.id === id);
  if (session) {
    setCurrentChatId(id);

    const geminiHistory = session.messages
      .filter(m => m.sender !== 'error' && m.sender !== 'system')
      .map(m => ({
        role: m.sender as 'user' | 'model',
        parts: [{ text: m.text }],
      }));

    try {
      if (session.creationPhase) {
        const instruction = getNewGameSetupInstruction();
        setGeminiChat(createNewChatInstance(geminiHistory, instruction));
      } else {
        const personaId = session.personaId || 'purist';
        const persona = dmPersonas.find(p => p.id === personaId) || dmPersonas[0];
        const instruction = persona.getInstruction(session.adminPassword || '');
        setGeminiChat(createNewChatInstance(geminiHistory, instruction));
      }
    } catch (error) {
      console.error('Failed to create Gemini chat instance:', error);
      renderMessages(session.messages);
      let errorMessage = 'Error initializing the AI. Please check your setup or start a new chat.';
      if (error instanceof Error && (error.message.includes('API Key') || error.message.includes('API key'))) {
          errorMessage = 'Error: API Key is missing or invalid. Please ensure it is correctly configured in your environment.';
      }
      appendMessage({ sender: 'error', text: errorMessage });
      setGeminiChat(null);
    }

    renderMessages(session.messages);
    updateLogbook(session);
    renderChatHistory();
    closeSidebar();
    combatTracker.classList.add('hidden'); // Hide tracker on chat load
  }
}

/**
 * Toggles the pinned status of a chat session.
 * @param id The ID of the chat session to pin/unpin.
 */
function togglePinChat(id: string) {
  const session = getChatHistory().find(s => s.id === id);
  if (session) {
    session.isPinned = !session.isPinned;
    saveChatHistoryToDB();
    renderChatHistory();
  }
}

/** Opens the modal for renaming a chat session. */
function openRenameModal(id: string) {
  chatIdToRename = id;
  const session = getChatHistory().find(s => s.id === id);
  if (session) {
    renameInput.value = session.title;
    openModal(renameModal);
    renameInput.focus();
    renameInput.select();
  }
}

/** Closes the rename chat modal. */
function closeRenameModal() {
  closeModal(renameModal);
  chatIdToRename = null;
}

/** Opens the modal to confirm deleting a chat session. */
function openDeleteConfirmModal(id: string) {
  chatIdToDelete = id;
  const session = getChatHistory().find(s => s.id === id);
  if (session) {
    deleteChatName.textContent = session.title;
    openModal(deleteConfirmModal);
  }
}

/** Closes the delete confirmation modal. */
function closeDeleteConfirmModal() {
  closeModal(deleteConfirmModal);
  chatIdToDelete = null;
}

/** Deletes a chat session after confirmation. */
async function deleteChat() {
  if (!chatIdToDelete) return;
  const currentChatId = getCurrentChat()?.id;
  const chatIndex = getChatHistory().findIndex(s => s.id === chatIdToDelete);
  if (chatIndex > -1) {
    const wasCurrentChat = currentChatId === chatIdToDelete;
    getChatHistory().splice(chatIndex, 1);
    saveChatHistoryToDB();
    renderChatHistory();

    if (wasCurrentChat) {
      if (getChatHistory().length > 0) {
        const mostRecent = [...getChatHistory()].sort((a, b) => b.createdAt - a.createdAt)[0];
        loadChat(mostRecent.id);
      } else {
        await startNewChat();
      }
    }
  }
  closeDeleteConfirmModal();
}

/**
 * A helper function to finalize the setup phase and transition to the main game.
 * @param session The current chat session.
 * @param title The title for the new adventure.
 * @param finalSetupMessage The last message from the setup phase to be displayed.
 */
async function finalizeSetupAndStartGame(session: ChatSession, title: string, finalSetupMessage?: Message) {
  session.creationPhase = false;
  session.title = title;

  if (finalSetupMessage) {
    // The message is already in the DOM from the streaming function.
    // We just need to ensure it's in the state.
    session.messages.push(finalSetupMessage);
  }

  saveChatHistoryToDB();
  renderChatHistory();

  const gameLoadingContainer = appendMessage({ sender: 'model', text: '' });
  const gameLoadingMessage = gameLoadingContainer.querySelector('.message') as HTMLElement;
  gameLoadingMessage.classList.add('loading');
  gameLoadingMessage.textContent = 'The DM is preparing the world...';

  const shouldScroll = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 10;

  try {
    const personaId = session.personaId || 'purist';
    const persona = dmPersonas.find(p => p.id === personaId) || dmPersonas[0];
    const instruction = persona.getInstruction(session.adminPassword || `dnd${Date.now()}`);

    const geminiHistory = session.messages
      .filter(m => m.sender !== 'error' && m.sender !== 'system')
      .map(m => ({ role: m.sender as 'user' | 'model', parts: [{ text: m.text }] }));

    setGeminiChat(createNewChatInstance(geminiHistory, instruction));

    const kickoffResult = await getGeminiChat()!.sendMessageStream({ message: "The setup is complete. Begin the adventure by narrating the opening scene." });

    let openingSceneText = '';
    gameLoadingMessage.classList.remove('loading');
    gameLoadingMessage.innerHTML = '';
    for await (const chunk of kickoffResult) {
      openingSceneText += chunk.text || '';
      gameLoadingMessage.innerHTML = openingSceneText;
      if (shouldScroll) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
    gameLoadingContainer.remove();

    const openingSceneMessage: Message = { sender: 'model', text: openingSceneText };
    appendMessage(openingSceneMessage);
    session.messages.push(openingSceneMessage);
    saveChatHistoryToDB();
  } catch (error) {
    console.error("Failed to start the main game:", error);
    gameLoadingContainer.remove();
    appendMessage({ sender: 'error', text: "The world failed to materialize. Please try starting a new game." });
  }
}


/**
 * MAIN CHAT FORM SUBMISSION
 */
async function handleFormSubmit(e: Event) {
  e.preventDefault();
  if (isSending()) return;
  setSending(true);

  try {
    const userInput = chatInput.value.trim();
    const currentSession = getCurrentChat();
    if (!userInput || !currentSession) return;

    const lowerCaseInput = userInput.toLowerCase().replace(/[?]/g, '');

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
      saveChatHistoryToDB();
      return;
    }

    if (currentSession.creationPhase) {
      stopTTS();
      const userMessage: Message = { sender: 'user', text: userInput };
      appendMessage(userMessage);
      currentSession.messages.push(userMessage);
      chatInput.value = '';
      chatInput.style.height = 'auto';

      if (currentSession.creationPhase === 'quick_start_password') {
        currentSession.adminPassword = userInput;
        saveChatHistoryToDB();
        await finalizeSetupAndStartGame(currentSession, currentSession.title);
        return;
      }

      if (currentSession.creationPhase === 'guided') {
        currentSession.adminPassword = userInput;
        currentSession.creationPhase = 'character_creation';
        saveChatHistoryToDB();
        // Fall through to the generic setup message sending logic
      }

      const modelMessageContainer = appendMessage({ sender: 'model', text: '' });
      const modelMessageEl = modelMessageContainer.querySelector('.message') as HTMLElement;
      modelMessageEl.classList.add('loading');
      modelMessageEl.textContent = '...';
      const shouldScroll = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 10;

      try {
        const geminiChat = getGeminiChat();
        if (!geminiChat) throw new Error("Setup AI Error: chat is not initialized.");
        
        // Use a different prompt to kick off character creation
        const messageToSend = currentSession.creationPhase === 'character_creation' && currentSession.messages.filter(m => m.sender === 'user').length <= 2
            ? "Let's create my character."
            : userInput;

        const result = await geminiChat.sendMessageStream({ message: messageToSend });
        let responseText = '';
        modelMessageEl.classList.remove('loading');
        modelMessageEl.innerHTML = '';

        for await (const chunk of result) {
          responseText += chunk.text || '';
          modelMessageEl.innerHTML = responseText;
          if (shouldScroll) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }
        
        if (responseText.includes('[CHARACTER_CREATION_COMPLETE]')) {
            currentSession.creationPhase = 'narrator_selection';
            const setupMessageText = responseText.replace('[CHARACTER_CREATION_COMPLETE]', '').trim();
            modelMessageEl.innerHTML = setupMessageText;
            const setupMessage: Message = { sender: 'model', text: setupMessageText };
            currentSession.messages.push(setupMessage);
            saveChatHistoryToDB();
            renderSetupChoices();
            return;
        }


        if (responseText.includes('[GENERATE_QUICK_START_CHARACTERS]')) {
          currentSession.creationPhase = 'quick_start_selection';
          const setupMessageText = responseText.replace('[GENERATE_QUICK_START_CHARACTERS]', '').trim();
          modelMessageEl.innerHTML = setupMessageText;
          const setupMessage: Message = { sender: 'model', text: setupMessageText };
          currentSession.messages.push(setupMessage);
          saveChatHistoryToDB();

          const charLoadingContainer = appendMessage({ sender: 'model', text: '' });
          const charLoadingMessage = charLoadingContainer.querySelector('.message') as HTMLElement;
          charLoadingMessage.classList.add('loading');
          charLoadingMessage.textContent = 'Generating a party of adventurers...';

          try {
            const charResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: getQuickStartCharacterPrompt(),
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  items: quickStartCharacterSchema,
                },
              }
            });
            const chars = JSON.parse(charResponse.text);
            currentSession.quickStartChars = chars;
            saveChatHistoryToDB();
            charLoadingContainer.remove();
            renderQuickStartChoices(chars);
          } catch (charError) {
            console.error("Quick Start character generation failed:", charError);
            charLoadingContainer.remove();
            appendMessage({ sender: 'error', text: 'Failed to generate characters. Please try again or choose Guided Setup.' });
          }
          return;
        }

        if (responseText.includes('[SETUP_COMPLETE]')) {
          const titleMatch = responseText.match(/Title:\s*(.*)/);
          const title = titleMatch?.[1]?.trim() || "New Adventure";
          const finalSetupText = responseText.replace('[SETUP_COMPLETE]', '').replace(/Title:\s*(.*)/, '').trim();
          modelMessageEl.innerHTML = finalSetupText;
          const finalSetupMessage: Message = { sender: 'model', text: finalSetupText };
          await finalizeSetupAndStartGame(currentSession, title, finalSetupMessage);
        } else {
          const setupMessage: Message = { sender: 'model', text: responseText };
          currentSession.messages.push(setupMessage);
          saveChatHistoryToDB();
        }
      } catch (error) {
        console.error("Setup AI Error:", error);
        modelMessageContainer.remove();
        appendMessage({ sender: 'error', text: 'The setup guide seems to have gotten lost. Please try again.' });
      }
      return;
    }

    if (lowerCaseInput === 'who is the architect') {
      chatInput.value = ''; chatInput.style.height = 'auto';
      const easterEggMessage: Message = { sender: 'model', text: "The simulation flickers for a moment, and the world goes silent. A single line of plain text hangs in the void before you:\n\n'This world was built by Justin Brisson.'" };
      const messageContainer = appendMessage(easterEggMessage);
      messageContainer.querySelector('.message')?.classList.add('easter-egg');
      messageContainer.querySelector('.tts-controls')?.remove();
      return;
    }

    if (lowerCaseInput === 'help') {
      openModal(helpModal); chatInput.value = ''; chatInput.style.height = 'auto';
      return;
    }

    const geminiChat = getGeminiChat();
    if (!geminiChat) {
        appendMessage({ sender: 'error', text: 'The connection to the AI has been lost. This can happen if the API Key is missing or invalid. Please check your configuration and start a new chat.' });
        setSending(false);
        return;
    }
    stopTTS();

    const userMessage: Message = { sender: 'user', text: userInput };
    currentSession.messages.push(userMessage);
    appendMessage(userMessage);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    const modelMessageContainer = appendMessage({ sender: 'model', text: '' });
    const modelMessageEl = modelMessageContainer.querySelector('.message') as HTMLElement;
    modelMessageEl.classList.add('loading');
    modelMessageEl.textContent = '...';
    const shouldScroll = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 10;

    try {
      const context = getUserContext();
      const messageWithContext = context.length > 0
        ? `(OOC: Use the following context to inform your response:\n${context.join('\n')}\n)\n\n${userInput}`
        : userInput;

      const result = await geminiChat.sendMessageStream({ message: messageWithContext });
      let responseText = '';
      modelMessageEl.classList.remove('loading');
      modelMessageEl.innerHTML = '';

      for await (const chunk of result) {
        responseText += chunk.text || '';
        let displayHtml = responseText.replace(/\[COMBAT_STATUS:.*?\]/g, '').trim();
        modelMessageEl.innerHTML = displayHtml;
        if (shouldScroll) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }

      // Handle Combat Tracker
      const combatStatusRegex = /\[COMBAT_STATUS:\s*({.*?})\]/;
      const match = responseText.match(combatStatusRegex);
      if (match && match[1]) {
        try {
          const combatData = JSON.parse(match[1]);
          updateCombatTracker(combatData.enemies);
        } catch (jsonError) {
          console.error("Failed to parse combat status JSON:", jsonError);
          combatTracker.classList.add('hidden');
        }
      } else {
        combatTracker.classList.add('hidden');
      }

      const finalMessage: Message = { sender: 'model', text: responseText.replace(combatStatusRegex, '').trim() };
      currentSession.messages.push(finalMessage);
      saveChatHistoryToDB();
    } catch (error) {
      console.error("Gemini API Error:", error);
      modelMessageContainer.remove();
      let errorMessage = 'The DM seems to be pondering deeply ... and has gone quiet. Please try again.';
      if (error instanceof Error && (error.message.includes('API Key') || error.message.includes('API key'))) {
          errorMessage = 'Error: API Key is missing or invalid. Please ensure it is correctly configured in your environment.';
      }
      appendMessage({ sender: 'error', text: errorMessage });
    }
  } finally {
    setSending(false);
  }
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  input.value = ''; // Reset for next upload

  const useExperimentalLimit = getUISettings().experimentalUploadLimit;
  const limitMB = useExperimentalLimit ? 75 : 50;
  const MAX_FILE_SIZE_BYTES = limitMB * 1024 * 1024;

  if (file.size > MAX_FILE_SIZE_BYTES) {
      const errorMsg = `❌ Error processing <strong>${file.name}</strong>. File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Large files can cause performance issues or crashes. Please use files under ${limitMB}MB.`;
      const messageEl = document.createElement('div');
      messageEl.classList.add('message', 'system-file');
      messageEl.innerHTML = `<span>${errorMsg}</span>`;
      chatContainer.appendChild(messageEl);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      return;
  }

  const messageEl = appendFileProcessingMessage(file.name);
  const currentSession = getCurrentChat();
  if (!currentSession) {
      messageEl.classList.remove('loading');
      messageEl.innerHTML = `<span>❌ Error: No active chat session.</span>`;
      return;
  }

  try {
    const CHUNK_LIMIT = 8000;
    let extractedText = '';
    let fileTypeForPrompt = '';
    let promptText = '';

    const processFile = async (prompt: string) => {
      const base64Data = await fileToBase64(file);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [
          { inlineData: { mimeType: file.type, data: base64Data } },
          { text: prompt }
        ]},
      });
      return response.text;
    };

    if (file.type.startsWith('text/')) {
      extractedText = await file.text();
      fileTypeForPrompt = 'text file';
    } else if (file.type.startsWith('image/')) {
      promptText = 'Concisely describe the contents and style of this image. This will be used as RAG context for a D&D game.';
      extractedText = await processFile(promptText);
      fileTypeForPrompt = 'image';
    } else if (file.type.startsWith('audio/')) {
      promptText = 'Transcribe the audio from this file. This will be used as RAG context for a D&D game.';
      extractedText = await processFile(promptText);
      fileTypeForPrompt = 'audio file';
    } else if (file.type.startsWith('video/')) {
      promptText = 'Provide a concise summary of the content of this video. This will be used as RAG context for a D&D game.';
      extractedText = await processFile(promptText);
      fileTypeForPrompt = 'video file';
    } else if (file.type === 'application/pdf') {
      promptText = 'Extract the full text content from this document. This will be used as RAG context for a D&D game.';
      extractedText = await processFile(promptText);
      fileTypeForPrompt = 'document';
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
    
    // Common logic for adding extracted content to the RAG context
    const chunkedText = extractedText.length > CHUNK_LIMIT ? extractedText.substring(0, CHUNK_LIMIT) + '...' : extractedText;
    addUserContext(`Content from ${fileTypeForPrompt} "${file.name}":\n\n${chunkedText}`);
    
    messageEl.classList.remove('loading');
    messageEl.innerHTML = `<span>✅ File <strong>${file.name}</strong> processed and added to context.</span>`;

  } catch (error) {
    console.error("File processing failed:", error);
    let errorMessage = 'An error occurred during processing.';
    if (error instanceof Error) {
        if (error.message.includes('Unsupported file type')) {
            errorMessage = `Unsupported file type: ${file.type}`;
        } else if (error.message.includes('API Key') || error.message.includes('API key')) {
            errorMessage = 'API Key is missing or invalid. Please check your configuration.';
        }
    }
    messageEl.classList.remove('loading');
    messageEl.innerHTML = `<span>❌ Error processing <strong>${file.name}</strong>. ${errorMessage}</span>`;
  }
}

/**
 * Initializes all event listeners for the application.
 */
function setupEventListeners() {
  let setupSettings: Partial<GameSettings & { personaId: string }> = {};
  
  chatForm.addEventListener('submit', handleFormSubmit);
  // Fix: Cannot find name 'sendButton'.
  sendButton.addEventListener('click', handleFormSubmit);

  chatInput.addEventListener('focus', () => {
    setTimeout(() => {
      chatForm.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 300);
  });

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${chatInput.scrollHeight}px`;
  });
  chatInput.addEventListener('keydown', (e) => {
    if (getUISettings().enterToSend && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.requestSubmit();
    }
  });

  chatContainer.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    // Handle TTS button clicks
    const ttsButton = target.closest<HTMLButtonElement>('.tts-button');
    if (ttsButton) {
        const messageContainer = ttsButton.closest('.message-model-container');
        if (messageContainer) {
            const messageEl = messageContainer.querySelector('.message.model');
            if (messageEl) {
                // Pass the raw HTML to handleTTS, it will parse it
                handleTTS(messageEl.innerHTML, ttsButton);
            }
        }
        return; // Event handled
    }
    
    const currentSession = getCurrentChat();
    if (!currentSession || isSending()) return;
    
    const quickStartCard = target.closest<HTMLElement>('.quick-start-card');
    if (quickStartCard && currentSession.creationPhase === 'quick_start_selection') {
      setSending(true);
      try {
        const charIndex = parseInt(quickStartCard.dataset.charIndex || '-1', 10);
        const selectedChar = currentSession.quickStartChars?.[charIndex];
        if (!selectedChar) throw new Error("Invalid character selection.");

        chatContainer.querySelectorAll('.quick-start-card').forEach(c => c.classList.add('disabled'));
        quickStartCard.classList.remove('disabled');
        quickStartCard.classList.add('selected');

        const userMessage: Message = { sender: 'user', text: `I choose to play as ${selectedChar.name}, the ${selectedChar.race} ${selectedChar.class}.` };
        appendMessage(userMessage);
        currentSession.messages.push(userMessage);

        currentSession.characterSheet = selectedChar;
        const title = `${selectedChar.name}'s Journey`;
        currentSession.title = title;
        currentSession.creationPhase = 'quick_start_password';

        const passwordMessage: Message = { sender: 'model', text: `You have chosen to play as ${selectedChar.name}. Excellent choice.\n\nBefore we begin, please set a secure password for the OOC (Out of Character) protocol. This allows you to speak directly to the underlying AI if you need to make corrections or ask meta-questions.` };
        appendMessage(passwordMessage);
        currentSession.messages.push(passwordMessage);
        saveChatHistoryToDB();
      } catch (error) {
        console.error("Error during quick start selection:", error);
        appendMessage({ sender: 'error', text: "Something went wrong with character selection. Please try again." });
      } finally {
        setSending(false);
      }
      return;
    }

    const narratorChoiceBtn = target.closest<HTMLButtonElement>('.narrator-choice-btn');
    if (narratorChoiceBtn && currentSession.creationPhase === 'narrator_selection') {
      const type = narratorChoiceBtn.dataset.type;
      const value = narratorChoiceBtn.dataset.value;
      if (!type || !value) return;

      if (type === 'tone') {
        if (value === 'heroic' || value === 'gritty' || value === 'comedic') {
          setupSettings.tone = value;
        }
      } else if (type === 'narration') {
        if (value === 'concise' || value === 'descriptive' || value === 'cinematic') {
          setupSettings.narration = value;
        }
      } else if (type === 'persona') {
        setupSettings.personaId = value;
      }
      
      const parentGroup = narratorChoiceBtn.closest('.narrator-choice-group');
      parentGroup?.querySelectorAll('.narrator-choice-btn').forEach(btn => btn.classList.remove('selected'));
      narratorChoiceBtn.classList.add('selected');

      if (setupSettings.tone && setupSettings.narration && setupSettings.personaId) {
        setSending(true);
        try {
          // Disable all buttons
          document.querySelectorAll('.narrator-choice-btn').forEach(btn => (btn as HTMLButtonElement).disabled = true);
          
          currentSession.settings = { tone: setupSettings.tone, narration: setupSettings.narration };
          currentSession.personaId = setupSettings.personaId;
          currentSession.creationPhase = 'world_creation';

          const geminiChat = getGeminiChat();
          if (!geminiChat) throw new Error("Chat not initialized for narrator selection.");

          const modelMessageContainer = appendMessage({ sender: 'model', text: '' });
          const modelMessageEl = modelMessageContainer.querySelector('.message') as HTMLElement;
          modelMessageEl.classList.add('loading');
          
          const personaName = dmPersonas.find(p => p.id === setupSettings.personaId)?.name || 'DM';
          const userMessageText = `I've chosen the ${personaName} with a ${setupSettings.tone} tone and ${setupSettings.narration} narration. Now, let's create the world.`;
          const result = await geminiChat.sendMessageStream({ message: userMessageText });
          
          let responseText = '';
          modelMessageEl.classList.remove('loading');
          for await (const chunk of result) {
            responseText += chunk.text || '';
            modelMessageEl.innerHTML = responseText;
          }

          const userMessage: Message = { sender: 'user', text: userMessageText, hidden: true };
          const modelMessage: Message = { sender: 'model', text: responseText };
          currentSession.messages.push(userMessage, modelMessage);
          saveChatHistoryToDB();

        } catch(error) {
          console.error("Error after narrator selection:", error);
          appendMessage({ sender: 'error', text: 'Something went wrong. Please try again.'});
        } finally {
          setSending(false);
          setupSettings = {}; // Reset for next time
        }
      }
    }
  });

  menuBtn.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', closeSidebar);
  newChatBtn.addEventListener('click', startNewChat);

  // Delegated event listener for chat history items
  chatHistoryContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const chatHistoryItem = target.closest<HTMLElement>('.chat-history-item');

    // Check if a chat item was clicked, but not the options button within it
    if (chatHistoryItem && !target.closest('.options-btn')) {
      const sessionId = chatHistoryItem.dataset.id;
      if (sessionId) {
        closeChatOptionsMenu();
        loadChat(sessionId);
      }
    }
  });

  helpBtn.addEventListener('click', () => openModal(helpModal));
  closeHelpBtn.addEventListener('click', () => closeModal(helpModal));
  dndHelpBtn.addEventListener('click', () => openModal(dndHelpModal));
  closeDndHelpBtn.addEventListener('click', () => closeModal(dndHelpModal));
  logbookBtn.addEventListener('click', () => openModal(logbookModal));
  closeLogbookBtn.addEventListener('click', () => closeModal(logbookModal));
  diceRollerBtn.addEventListener('click', () => openModal(diceModal));
  closeDiceBtn.addEventListener('click', () => closeModal(diceModal));
  closeRenameBtn.addEventListener('click', closeRenameModal);
  closeDeleteConfirmBtn.addEventListener('click', closeDeleteConfirmModal);
  cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
  confirmDeleteBtn.addEventListener('click', deleteChat);
  closeWelcomeBtn.addEventListener('click', () => closeModal(welcomeModal));
  combatTrackerHeader.addEventListener('click', () => {
    combatTracker.classList.toggle('expanded');
  });
  contextHeader.addEventListener('click', () => {
    contextManager.classList.toggle('expanded');
  });

  renameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (chatIdToRename) {
      const session = getChatHistory().find(s => s.id === chatIdToRename);
      if (session) {
        session.title = renameInput.value;
        saveChatHistoryToDB();
        renderChatHistory();
      }
    }
    closeRenameModal();
  });

  contextForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = contextInput.value.trim();
    if (text) { addUserContext(text); contextInput.value = ''; }
  });

  contextList.addEventListener('click', (e) => {
    const deleteBtn = (e.target as HTMLElement).closest('.delete-context-btn');
    if (deleteBtn) {
      const index = parseInt(deleteBtn.getAttribute('data-index')!, 10);
      if (!isNaN(index)) { deleteUserContext(index); }
    }
  });
  
  importAllBtn.addEventListener('click', () => importAllFileInput.click());
  importAllFileInput.addEventListener('change', handleImportAll);
  exportAllBtn.addEventListener('click', exportAllChats);
  
  chatOptionsMenu.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const menuItem = target.closest('li');
    if (menuItem) {
        const sessionId = chatOptionsMenu.dataset.sessionId;
        if (!sessionId) return;
        const action = menuItem.dataset.action;

        switch (action) {
            case 'pin':
                togglePinChat(sessionId);
                break;
            case 'rename':
                openRenameModal(sessionId);
                break;
            case 'export':
                exportChatToLocal(sessionId);
                break;
            case 'delete':
                openDeleteConfirmModal(sessionId);
                break;
        }
        // The menu will be closed by a separate document-level click listener,
        // which is set when the menu is opened. This handles all cases gracefully.
    }
  });

  logbookNav.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>('.logbook-nav-btn');
    if (button?.dataset.tab) {
      const tab = button.dataset.tab;
      // Update active state for buttons
      logbookNav.querySelectorAll('.logbook-nav-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Show the correct content pane
      logbookPanes.forEach(pane => {
        pane.classList.toggle('active', pane.id === `${tab}-content`);
      });

      // Jump to the top of the content pane when switching tabs.
      const logbookContent = logbookNav.nextElementSibling as HTMLElement;
      if (logbookContent) {
        logbookContent.scrollTop = 0;
      }
    }
  });

  updateSheetBtn.addEventListener('click', () => updateLogbookData('sheet'));
  updateInventoryBtn.addEventListener('click', () => updateLogbookData('inventory'));
  updateQuestsBtn.addEventListener('click', () => updateLogbookData('quests'));
  updateNpcsBtn.addEventListener('click', () => updateLogbookData('npcs'));
  updateAchievementsBtn.addEventListener('click', () => updateLogbookData('achievements'));
  generateImageBtn.addEventListener('click', generateCharacterImage);
  
  fontSizeControls.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest('button');
    if (button?.dataset.size) {
        getUISettings().fontSize = button.dataset.size as 'small' | 'medium' | 'large';
        // Fix: Cannot find name 'dbSet'.
        dbSet('dm-os-ui-settings', getUISettings());
        applyUISettings();
    }
  });
  enterToSendToggle.addEventListener('change', () => {
    getUISettings().enterToSend = enterToSendToggle.checked;
    dbSet('dm-os-ui-settings', getUISettings());
  });
  experimentalUploadToggle.addEventListener('change', () => {
    getUISettings().experimentalUploadLimit = experimentalUploadToggle.checked;
    dbSet('dm-os-ui-settings', getUISettings());
  });

  changeUiBtn.addEventListener('click', () => openModal(themeModal));
  closeThemeBtn.addEventListener('click', () => closeModal(themeModal));
  themeGrid.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.theme-card');
    if (card?.dataset.theme) {
      applyTheme(card.dataset.theme);
      closeModal(themeModal);
    }
  });

  // Fix: Cannot find name 'clearDiceResults'.
  clearResultsBtn.addEventListener('click', clearDiceResults);
  diceGrid.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const dieItem = target.closest('.die-item') as HTMLElement;
    if (!dieItem) return;
    if (target.closest('.die-visual')) { handleDieRoll(dieItem); }
    const quantityInput = dieItem.querySelector('.quantity-input') as HTMLInputElement;
    let value = parseInt(quantityInput.value, 10);
    if (target.classList.contains('plus')) {
      quantityInput.value = String(Math.min(99, value + 1));
    } else if (target.classList.contains('minus')) {
      quantityInput.value = String(Math.max(1, value - 1));
    }
  });
  
  inventoryBtn.addEventListener('click', () => {
      inventoryPopup.classList.toggle('visible');
      if (inventoryPopup.classList.contains('visible')) {
          fetchAndRenderInventoryPopup();
      }
  });
  closeInventoryBtn.addEventListener('click', () => inventoryPopup.classList.remove('visible'));
  refreshInventoryBtn.addEventListener('click', fetchAndRenderInventoryPopup);
  
  // Fix: Cannot find name 'quickActionsBar'.
  quickActionsBar.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('.quick-action-btn');
      if (button?.dataset.command) {
          chatInput.value += button.dataset.command;
          chatInput.focus();
      }
  });

  // Fix: Cannot find name 'inventoryPopupContent'.
  inventoryPopupContent.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('.use-item-btn');
      if (button?.dataset.itemName) {
          chatInput.value = `I use ${button.dataset.itemName}`;
          inventoryPopup.classList.remove('visible');
          chatForm.requestSubmit();
      }
  });

  fileUploadBtn.addEventListener('click', () => fileUploadInput.click());
  fileUploadInput.addEventListener('change', handleFileUpload);
}

/**
 * Initializes the application.
 */
async function initApp() {
  await runBootSequence();
  await initDB();

  const [themeId, savedUiSettings, savedPersonaId] = await Promise.all([
    // Fix: Cannot find name 'dbGet'.
    dbGet<string>('dm-os-theme'),
    // Fix: Cannot find name 'dbGet' and 'UISettings'.
    dbGet<UISettings>('dm-os-ui-settings'),
    // Fix: Cannot find name 'dbGet'.
    dbGet<string>('dm-os-persona'),
    loadChatHistoryFromDB(),
    loadUserContextFromDB(),
  ]);

  applyTheme(themeId || 'high-fantasy-dark');

  if (savedUiSettings) {
    setUISettings({ ...getUISettings(), ...savedUiSettings });
  }
  applyUISettings();

  if (savedPersonaId && dmPersonas.some(p => p.id === savedPersonaId)) {
    setCurrentPersonaId(savedPersonaId);
  }

  // Fix: Cannot find name 'renderDiceGrid'.
  renderDiceGrid();
  // Fix: Cannot find name 'renderThemeCards'.
  renderThemeCards();
  // Fix: Cannot find name 'renderUserContext' and it needs an argument.
  renderUserContext(getUserContext());
  renderChatHistory();

  if (getChatHistory().length > 0) {
    const mostRecentChat = [...getChatHistory()].sort((a, b) => b.createdAt - a.createdAt)[0];
    loadChat(mostRecentChat.id);
  } else {
    await startNewChat();
  }

  setupEventListeners();
  showWelcomeModalIfNeeded();
}

// Start the application
initApp().catch(err => {
  console.error("Fatal error during application initialization:", err);
  document.body.innerHTML = `<div style="color: white; padding: 2rem; text-align: center;">
        <h1>Oops! Something went wrong.</h1>
        <p>DM OS could not start. Please try refreshing the page. If the problem persists, you may need to clear your browser's site data for this page.</p>
    </div>`;
});