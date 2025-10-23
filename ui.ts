/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { getChatHistory, getCurrentChat, getUISettings } from './state';
import type { Message, ChatSession, CharacterSheetData, Achievement, NPCState } from './types';
import { dmPersonas } from './gemini';

// =================================================================================
// DOM ELEMENT SELECTORS
// =================================================================================

export const chatContainer = document.getElementById('chat-container') as HTMLElement;
export const chatForm = document.getElementById('chat-form') as HTMLFormElement;
export const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
export const sendButton = chatForm.querySelector('button[type="submit"]') as HTMLButtonElement;
export const menuBtn = document.getElementById('menu-btn') as HTMLButtonElement;
export const newChatBtn = document.getElementById('new-chat-btn') as HTMLButtonElement;
export const sidebar = document.getElementById('sidebar') as HTMLElement;
export const overlay = document.getElementById('overlay') as HTMLElement;
export const chatHistoryContainer = document.getElementById('chat-history-container') as HTMLElement;
export const pinnedChatsList = document.getElementById('pinned-chats-list') as HTMLUListElement;
export const recentChatsList = document.getElementById('recent-chats-list') as HTMLUListElement;
const ttsTemplate = document.getElementById('tts-controls-template') as HTMLTemplateElement;
export const exportAllBtn = document.getElementById('export-all-btn') as HTMLButtonElement;
export const importAllBtn = document.getElementById('import-all-btn') as HTMLButtonElement;
export const importAllFileInput = document.getElementById('import-all-file-input') as HTMLInputElement;
export const contextForm = document.getElementById('context-form') as HTMLFormElement;
export const contextInput = document.getElementById('context-input') as HTMLInputElement;
export const contextList = document.getElementById('context-list') as HTMLUListElement;
export const quickActionsBar = document.getElementById('quick-actions-bar') as HTMLElement;
export const inventoryBtn = document.getElementById('inventory-btn') as HTMLButtonElement;
export const inventoryPopup = document.getElementById('inventory-popup') as HTMLElement;
export const inventoryPopupContent = document.getElementById('inventory-popup-content') as HTMLElement;
export const closeInventoryBtn = document.getElementById('close-inventory-btn') as HTMLButtonElement;
export const refreshInventoryBtn = document.getElementById('refresh-inventory-btn') as HTMLButtonElement;
export const helpBtn = document.getElementById('help-btn') as HTMLButtonElement;
export const helpModal = document.getElementById('help-modal') as HTMLElement;
export const closeHelpBtn = document.getElementById('close-help-btn') as HTMLButtonElement;
export const dndHelpBtn = document.getElementById('dnd-help-btn') as HTMLButtonElement;
export const dndHelpModal = document.getElementById('dnd-help-modal') as HTMLElement;
export const closeDndHelpBtn = document.getElementById('close-dnd-help-btn') as HTMLButtonElement;
export const renameModal = document.getElementById('rename-modal') as HTMLElement;
export const renameForm = document.getElementById('rename-form') as HTMLFormElement;
export const renameInput = document.getElementById('rename-input') as HTMLInputElement;
export const closeRenameBtn = document.getElementById('close-rename-btn') as HTMLButtonElement;
export const deleteConfirmModal = document.getElementById('delete-confirm-modal') as HTMLElement;
export const closeDeleteConfirmBtn = document.getElementById('close-delete-confirm-btn') as HTMLButtonElement;
export const cancelDeleteBtn = document.getElementById('cancel-delete-btn') as HTMLButtonElement;
export const confirmDeleteBtn = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
export const deleteChatName = document.getElementById('delete-chat-name') as HTMLElement;
export const diceRollerBtn = document.getElementById('dice-roller-btn') as HTMLButtonElement;
export const diceModal = document.getElementById('dice-modal') as HTMLElement;
export const closeDiceBtn = document.getElementById('close-dice-btn') as HTMLButtonElement;
export const diceGrid = document.getElementById('dice-grid') as HTMLElement;
export const clearResultsBtn = document.getElementById('clear-results-btn') as HTMLButtonElement;
export const diceResultsLog = document.getElementById('dice-results-log') as HTMLElement;
export const diceTotalValue = document.getElementById('dice-total-value') as HTMLElement;
export const logbookBtn = document.getElementById('logbook-btn') as HTMLButtonElement;
export const logbookModal = document.getElementById('logbook-modal') as HTMLElement;
export const closeLogbookBtn = document.getElementById('close-logbook-btn') as HTMLButtonElement;
export const logbookNav = document.querySelector('.logbook-nav') as HTMLElement;
export const logbookPanes = document.querySelectorAll('.logbook-pane') as NodeListOf<HTMLElement>;
// Fix: Export characterSheetDisplay for use in other modules
export const characterSheetDisplay = document.getElementById('character-sheet-display') as HTMLElement;
// Fix: Export inventoryDisplay for use in other modules
export const inventoryDisplay = document.getElementById('inventory-display') as HTMLElement;
// Fix: Export questsDisplay for use in other modules
export const questsDisplay = document.getElementById('quests-display') as HTMLElement;
// Fix: Export npcsDisplay for use in other modules
export const npcsDisplay = document.getElementById('npcs-display') as HTMLElement;
// Fix: Export achievementsDisplay for use in other modules
export const achievementsDisplay = document.getElementById('achievements-display') as HTMLElement;
export const updateSheetBtn = document.getElementById('update-sheet-btn') as HTMLButtonElement;
export const updateInventoryBtn = document.getElementById('update-inventory-btn') as HTMLButtonElement;
export const updateQuestsBtn = document.getElementById('update-quests-btn') as HTMLButtonElement;
export const updateNpcsBtn = document.getElementById('update-npcs-btn') as HTMLButtonElement;
export const updateAchievementsBtn = document.getElementById('update-achievements-btn') as HTMLButtonElement;
export const generateImageBtn = document.getElementById('generate-image-btn') as HTMLButtonElement;
// Fix: Export characterImageDisplay for use in other modules
export const characterImageDisplay = document.getElementById('character-image-display') as HTMLImageElement;
export const characterImagePlaceholder = document.getElementById('character-image-placeholder') as HTMLElement;
export const characterImageLoading = document.getElementById('character-image-loading') as HTMLElement;
export const fontSizeControls = document.getElementById('font-size-controls') as HTMLElement;
export const enterToSendToggle = document.getElementById('setting-enter-send') as HTMLInputElement;
export const changeUiBtn = document.getElementById('change-ui-btn') as HTMLButtonElement;
export const themeModal = document.getElementById('theme-modal') as HTMLElement;
export const closeThemeBtn = document.getElementById('close-theme-btn') as HTMLButtonElement;
export const themeGrid = document.getElementById('theme-grid') as HTMLElement;
export const chatOptionsMenu = document.getElementById('chat-options-menu') as HTMLUListElement;
export const combatTracker = document.getElementById('combat-tracker') as HTMLElement;
export const combatEnemyList = document.getElementById('combat-enemy-list') as HTMLUListElement;
export const welcomeModal = document.getElementById('update-welcome-modal') as HTMLElement;
export const closeWelcomeBtn = document.getElementById('close-welcome-btn') as HTMLButtonElement;

// =================================================================================
// UI & MODAL MANAGEMENT
// =================================================================================

export function toggleSidebar() {
  document.body.classList.toggle('sidebar-open');
}

export function closeSidebar() {
  document.body.classList.remove('sidebar-open');
}

export function openModal(modal: HTMLElement) {
  modal.style.display = 'flex';
}

export function closeModal(modal: HTMLElement) {
  modal.style.display = 'none';
}

export function applyUISettings() {
  const uiSettings = getUISettings();
  document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
  document.body.classList.add(`font-size-${uiSettings.fontSize}`);

  if (fontSizeControls) {
    (fontSizeControls.querySelector('.active') as HTMLElement)?.classList.remove('active');
    (fontSizeControls.querySelector(`[data-size="${uiSettings.fontSize}"]`) as HTMLElement)?.classList.add('active');
  }
  if (enterToSendToggle) {
    enterToSendToggle.checked = uiSettings.enterToSend;
  }
}

// =================================================================================
// RENDERING FUNCTIONS
// =================================================================================

export function renderChatHistory() {
  pinnedChatsList.innerHTML = '';
  recentChatsList.innerHTML = '';

  const sortedHistory = [...getChatHistory()].sort((a, b) => b.createdAt - a.createdAt);
  const currentChatId = getCurrentChat()?.id;

  sortedHistory.forEach(session => {
    const li = document.createElement('li');
    li.className = 'chat-history-item';
    li.dataset.id = session.id;
    li.innerHTML = `
      <span class="chat-title">${session.title}</span>
      <button class="options-btn" aria-label="Chat options">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9-2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9-2-2-.9-2-2-2z"/></svg>
      </button>
    `;

    if (session.id === currentChatId) {
      li.classList.add('active');
    }

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

export function openChatOptionsMenu(sessionId: string, buttonEl: HTMLElement) {
  if (chatOptionsMenu.style.display === 'block' && chatOptionsMenu.dataset.sessionId === sessionId) {
    closeChatOptionsMenu();
    return;
  }

  const session = getChatHistory().find(s => s.id === sessionId);
  if (!session) return;

  chatOptionsMenu.dataset.sessionId = sessionId;
  chatOptionsMenu.innerHTML = `
        <li role="menuitem" data-action="pin">${session.isPinned ? 'Unpin Chat' : 'Pin Chat'}</li>
        <li role="menuitem" data-action="rename">Rename</li>
        <li role="menuitem" data-action="export">Export Chat</li>
        <li role="menuitem" data-action="delete" class="danger-action">Delete Chat</li>
    `;

  const rect = buttonEl.getBoundingClientRect();
  chatOptionsMenu.style.top = `${rect.bottom + 4}px`;
  chatOptionsMenu.style.left = `${rect.left}px`;
  chatOptionsMenu.style.display = 'block';

  setTimeout(() => document.addEventListener('click', closeChatOptionsMenu, { once: true }), 0);
}

export function closeChatOptionsMenu() {
  chatOptionsMenu.style.display = 'none';
  chatOptionsMenu.removeAttribute('data-session-id');
}

export function renderMessages(messages: Message[], container: HTMLElement = chatContainer) {
  container.innerHTML = '';
  messages.forEach(msg => {
    if (!msg.hidden) {
      appendMessage(msg, container);
    }
  });
}

export function appendMessage(message: Message, container: HTMLElement = chatContainer) {
  if (message.sender === 'user') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'user');
    messageElement.textContent = message.text;
    container.appendChild(messageElement);
  } else if (message.sender === 'system') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'system-roll');
    messageElement.innerHTML = message.text;
    container.appendChild(messageElement);
  } else {
    const msgContainer = document.createElement('div');
    msgContainer.className = 'message-model-container';

    const messageElement = document.createElement('div');
    messageElement.classList.add('message', message.sender);
    messageElement.innerHTML = message.text;
    msgContainer.appendChild(messageElement);

    if (message.sender === 'model' && message.text && container === chatContainer) {
      const ttsControls = ttsTemplate.content.cloneNode(true) as DocumentFragment;
      // Event listener for this will be in features.ts, attached by the main controller
      msgContainer.appendChild(ttsControls);
    }
    container.appendChild(msgContainer);
  }

  container.scrollTop = container.scrollHeight;
  return container.lastElementChild as HTMLElement;
}

export function renderQuickStartChoices(characters: CharacterSheetData[]) {
  const currentSession = getCurrentChat();
  if (!currentSession) return;

  const choiceHtml = `
      <p>Choose your adventurer:</p>
      <div class="quick-start-grid">
        ${characters.map((char, index) => `
          <div class="quick-start-card" data-char-index="${index}">
            <h3 class="quick-start-name">${char.name}</h3>
            <p class="quick-start-race-class">${char.race} ${char.class}</p>
            <p class="quick-start-desc">${char.backstory}</p>
          </div>
        `).join('')}
      </div>
    `;

  const choiceMessage: Message = { sender: 'model', text: choiceHtml };
  appendMessage(choiceMessage);
  currentSession.messages.push(choiceMessage);
  // save handled by controller
}

export function renderSetupChoices() {
  const currentSession = getCurrentChat();
  if (!currentSession) return;

  const choiceHtml = `
      <p>Excellent. Before we create the world, let's define the feel of the game.</p>
      <div class="narrator-selection-grid">
        <div class="narrator-choice-group">
          <h4>DM Persona</h4>
          ${dmPersonas.map(persona => `
            <button class="narrator-choice-btn" data-type="persona" data-value="${persona.id}">
              <div class="choice-title">${persona.name}</div>
              <div class="choice-desc">${persona.description}</div>
            </button>
          `).join('')}
        </div>
        <div class="narrator-choice-group">
          <h4>Game Tone</h4>
          <button class="narrator-choice-btn" data-type="tone" data-value="heroic">
            <div class="choice-title">Heroic Fantasy</div>
          </button>
          <button class="narrator-choice-btn" data-type="tone" data-value="gritty">
            <div class="choice-title">Serious & Gritty</div>
          </button>
          <button class="narrator-choice-btn" data-type="tone" data-value="comedic">
            <div class="choice-title">Comedic</div>
          </button>
        </div>
        <div class="narrator-choice-group">
          <h4>Narration Style</h4>
          <button class="narrator-choice-btn" data-type="narration" data-value="concise">
            <div class="choice-title">Concise</div>
          </button>
          <button class="narrator-choice-btn" data-type="narration" data-value="descriptive">
            <div class="choice-title">Descriptive</div>
          </button>
          <button class="narrator-choice-btn" data-type="narration" data-value="cinematic">
            <div class="choice-title">Cinematic</div>
          </button>
        </div>
      </div>
    `;

  const choiceMessage: Message = { sender: 'model', text: choiceHtml };
  appendMessage(choiceMessage);
  currentSession.messages.push(choiceMessage);
}

export function renderCharacterSheet(data: CharacterSheetData) {
  characterSheetDisplay.innerHTML = `
      <header class="sheet-header">
          <div><h3 class="sheet-char-name">${data.name || 'Character Name'}</h3></div>
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
                  <div class="stat-box"><div class="stat-box-label">Armor Class</div><div class="stat-box-score">${data.armorClass || 10}</div></div>
                  <div class="stat-box"><div class="stat-box-label">Hit Points</div><div class="stat-box-score">${data.hitPoints?.current ?? 10}/${data.hitPoints?.max ?? 10}</div></div>
                  <div class="stat-box"><div class="stat-box-label">Speed</div><div class="stat-box-score">${data.speed || '30ft'}</div></div>
              </div>
          </div>
          <div class="sheet-skills-column">
              <h4>Skills</h4>
              <ul class="sheet-skills-list">
                  ${(data.skills || []).map(skill => `<li class="skill-item"><span class="skill-prof ${skill.proficient ? 'proficient' : ''}"></span><span class="skill-name">${skill.name}</span></li>`).join('')}
              </ul>
              <div class="sheet-features">
                  <h4>Features & Traits</h4>
                  <ul>${(data.featuresAndTraits || []).map(feature => `<li>${feature}</li>`).join('')}</ul>
              </div>
          </div>
      </div>
    `;
}

export function renderAchievements(achievements: Achievement[]) {
  if (!achievements || achievements.length === 0) {
    achievementsDisplay.innerHTML = `<div class="sheet-placeholder"><p>No achievements unlocked yet. Go make your mark on the world!</p></div>`;
    return;
  }
  achievementsDisplay.innerHTML = `
        <ul class="achievements-list">
            ${achievements.map(ach => `
                <li class="achievement-item">
                    <div class="achievement-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l-5.5 9h11L12 2zm0 10.5L6.5 4h11L12 12.5zM12 22l5.5-9h-11L12 22zm0-10.5l5.5 9h-11l5.5-9z"/></svg></div>
                    <div class="achievement-details">
                        <h4 class="achievement-name">${ach.name}</h4>
                        <p class="achievement-desc">${ach.description}</p>
                    </div>
                </li>
            `).join('')}
        </ul>
    `;
}

export function updateLogbook(session: ChatSession | undefined) {
  if (!session) return;

  if (typeof session.characterSheet === 'object' && session.characterSheet !== null) {
    renderCharacterSheet(session.characterSheet as CharacterSheetData);
  } else if (typeof session.characterSheet === 'string') {
    characterSheetDisplay.innerHTML = `<div class="sheet-placeholder"><p>${session.characterSheet}</p></div>`;
  } else {
    characterSheetDisplay.innerHTML = `<div class="sheet-placeholder"><p>No data. Click below to generate your character sheet from the adventure log.</p></div>`;
  }

  inventoryDisplay.textContent = session.inventory || "No data. Ask the DM to summarize your inventory.";
  questsDisplay.textContent = session.questLog || "No quest data. Ask the DM to update your journal.";
  
  if (session.npcList && session.npcList.length > 0) {
    npcsDisplay.innerHTML = session.npcList.map(npc => `
        <div class="npc-log-entry">
            <h4>${npc.name}</h4>
            <p><strong>Description:</strong> ${npc.description}</p>
            <p><strong>Relationship:</strong> ${npc.relationship}</p>
        </div>
    `).join('');
  } else {
      npcsDisplay.innerHTML = "<p>No NPC data. Ask the DM for a list of characters you've met.</p>";
  }


  renderAchievements(session.achievements || []);

  if (session.characterImageUrl) {
    characterImageDisplay.src = session.characterImageUrl;
    characterImageDisplay.classList.remove('hidden');
    characterImagePlaceholder.classList.add('hidden');
  } else {
    characterImageDisplay.src = '';
    characterImageDisplay.classList.add('hidden');
    characterImagePlaceholder.classList.remove('hidden');
  }
}

export function renderUserContext(userContext: string[]) {
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

export function updateCombatTracker(enemies: { name: string, status: string }[]) {
  if (!enemies || enemies.length === 0) {
    combatTracker.classList.add('hidden');
    return;
  }

  combatEnemyList.innerHTML = '';
  enemies.forEach(enemy => {
    const li = document.createElement('li');
    li.className = 'combat-enemy-item';
    const statusClass = `status-${enemy.status.replace(' ', '-')}`;
    li.innerHTML = `
      <span class="name">${enemy.name}</span>
      <span class="status ${statusClass}">${enemy.status}</span>
    `;
    combatEnemyList.appendChild(li);
  });
  combatTracker.classList.remove('hidden');
}