/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Chat } from '@google/genai';
import { migrateAndValidateSession } from './utils';
import type { ChatSession, UISettings } from './types';

// =================================================================================
// STATE
// =================================================================================

let db: IDBDatabase;
export let chatHistory: ChatSession[] = [];
export let userContext: string[] = [];
let currentChatId: string | null = null;
let geminiChat: Chat | null = null;
let isSendingFlag = false;
let isGeneratingDataFlag = false;
let currentPersonaId: string = 'purist';
let uiSettings: UISettings = {
  enterToSend: true,
  fontSize: 'medium',
  experimentalUploadLimit: false,
};

// =================================================================================
// STATE ACCESSORS
// =================================================================================

export const getChatHistory = () => chatHistory;
export const getUserContext = () => userContext;
export const getCurrentChat = (): ChatSession | undefined => chatHistory.find(s => s.id === currentChatId);
export const setCurrentChatId = (id: string | null) => { currentChatId = id; };
export const getGeminiChat = () => geminiChat;
export const setGeminiChat = (chat: Chat | null) => { geminiChat = chat; };
export const isSending = () => isSendingFlag;
export const setSending = (state: boolean) => { isSendingFlag = state; };
export const isGeneratingData = () => isGeneratingDataFlag;
export const setGeneratingData = (state: boolean) => { isGeneratingDataFlag = state; };
export const getCurrentPersonaId = () => currentPersonaId;
export const setCurrentPersonaId = (id: string) => { currentPersonaId = id; };
export const getUISettings = () => uiSettings;
export const setUISettings = (settings: UISettings) => { uiSettings = settings; };

// =================================================================================
// DATABASE (INDEXEDDB)
// =================================================================================

export function initDB(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DM-OS-DB', 1);
    request.onerror = () => { console.error('Error opening IndexedDB'); reject(false); };
    request.onsuccess = () => { db = request.result; resolve(true); };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('KeyValueStore')) {
        db.createObjectStore('KeyValueStore', { keyPath: 'key' });
      }
    };
  });
}

export function dbGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (!db) { console.error("DB not initialized!"); return resolve(undefined); }
    const transaction = db.transaction(['KeyValueStore'], 'readonly');
    const store = transaction.objectStore('KeyValueStore');
    const request = store.get(key);
    request.onsuccess = () => { resolve(request.result?.value); };
    request.onerror = () => { console.error(`Error getting key ${key} from DB`); resolve(undefined); };
  });
}

export function dbSet(key: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) { console.error("DB not initialized!"); return reject(); }
    const transaction = db.transaction(['KeyValueStore'], 'readwrite');
    const store = transaction.objectStore('KeyValueStore');
    const request = store.put({ key, value });
    request.onsuccess = () => { resolve(); };
    request.onerror = () => { console.error(`Error setting key ${key} in DB`); reject(); };
  });
}

// =================================================================================
// DATA HYDRATION/PERSISTENCE
// =================================================================================

export async function loadChatHistoryFromDB() {
  const storedHistory = await dbGet<any[]>('dm-os-chat-history');
  chatHistory = (storedHistory || []).map(migrateAndValidateSession);
}

export function saveChatHistoryToDB() {
  dbSet('dm-os-chat-history', chatHistory);
}

export async function loadUserContextFromDB() {
  const storedContext = await dbGet<string[]>('dm-os-user-context');
  userContext = storedContext || [];
}

export function saveUserContextToDB() {
  dbSet('dm-os-user-context', userContext);
}