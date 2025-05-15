const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../database/db-manager');
const OpenAI = require('openai');

let openai = null;

// 应用数据目录
const APP_DATA_DIR = path.join(process.env.APPDATA || (process.platform === 'darwin' ? 
  path.join(process.env.HOME, 'Library/Application Support') : 
  path.join(process.env.HOME, '.local/share')), 'NovelAssist');

// AI设置文件路径
const AI_SETTINGS_FILE = path.join(APP_DATA_DIR, 'ai-settings.json');

// 聊天会话目录
const CHAT_SESSIONS_DIR = path.join(APP_DATA_DIR, 'chat-sessions');

// 确保目录存在
if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
}

if (!fs.existsSync(CHAT_SESSIONS_DIR)) {
  fs.mkdirSync(CHAT_SESSIONS_DIR, { recursive: true });
}

/**
 * 初始化OpenAI API客户端
 */
function initializeOpenAI(apiKey) {
  try {
    openai = new OpenAI({
      apiKey: apiKey
    });
    return true;
  } catch (error) {
    console.error('初始化OpenAI API失败:', error);
    return false;
  }
}

/**
 * 保存AI设置
 */
function saveAISettings(settings) {
  try {
    // 敏感信息加密处理（简单示例，实际应用中应使用更安全的加密方法）
    const settingsToSave = { ...settings };
    if (settingsToSave.apiKey) {
      // 这里只是简单示例，实际应该使用更安全的加密方法
      settingsToSave.apiKey = Buffer.from(settingsToSave.apiKey).toString('base64');
    }
    
    fs.writeFileSync(AI_SETTINGS_FILE, JSON.stringify(settingsToSave, null, 2));
    return true;
  } catch (error) {
    console.error('保存AI设置失败:', error);
    return false;
  }
}

/**
 * 加载AI设置
 */
function loadAISettings() {
  try {
    if (fs.existsSync(AI_SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(AI_SETTINGS_FILE, 'utf8'));
      
      // 解密敏感信息
      if (settings.apiKey) {
        settings.apiKey = Buffer.from(settings.apiKey, 'base64').toString('utf8');
      }
      
      return settings;
    }
    return null;
  } catch (error) {
    console.error('加载AI设置失败:', error);
    return null;
  }
}

/**
 * 保存聊天会话
 */
function saveChatSession(session) {
  try {
    const sessionFile = path.join(CHAT_SESSIONS_DIR, `${session.id}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
    return true;
  } catch (error) {
    console.error('保存聊天会话失败:', error);
    return false;
  }
}

/**
 * 加载聊天会话
 */
function loadChatSession(sessionId) {
  try {
    const sessionFile = path.join(CHAT_SESSIONS_DIR, `${sessionId}.json`);
    if (fs.existsSync(sessionFile)) {
      return JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error('加载聊天会话失败:', error);
    return null;
  }
}

/**
 * 获取所有聊天会话
 */
function getAllChatSessions() {
  try {
    const sessions = [];
    const files = fs.readdirSync(CHAT_SESSIONS_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionFile = path.join(CHAT_SESSIONS_DIR, file);
        const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        sessions.push(session);
      }
    }
    
    return sessions;
  } catch (error) {
    console.error('获取所有聊天会话失败:', error);
    return [];
  }
}

/**
 * 删除聊天会话
 */
function deleteChatSession(sessionId) {
  try {
    const sessionFile = path.join(CHAT_SESSIONS_DIR, `${sessionId}.json`);
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile);
    }
    return true;
  } catch (error) {
    console.error('删除聊天会话失败:', error);
    return false;
  }
}

/**
 * 注册AI IPC处理器
 */
function registerAIHandlers() {
  // 原有的OpenAI相关处理
  ipcMain.handle('ai:initialize', async (event, apiKey) => {
    return initializeOpenAI(apiKey);
  });

  ipcMain.handle('ai:generate-text', async (event, prompt) => {
    try {
      if (!openai) {
        return { error: 'OpenAI API未初始化' };
      }

      const completion = await openai.completions.create({
        model: 'text-davinci-003',
        prompt: prompt,
        max_tokens: 1000,
        temperature: 0.7
      });

      return { text: completion.choices[0].text };
    } catch (error) {
      console.error('生成文本失败:', error);
      return { error: error.message };
    }
  });
  
  // AI设置相关
  ipcMain.handle('ai:save-settings', (event, settings) => {
    return saveAISettings(settings);
  });
  
  ipcMain.handle('ai:load-settings', () => {
    return loadAISettings();
  });
  
  // 聊天会话相关
  ipcMain.handle('ai:save-chat-session', (event, session) => {
    return saveChatSession(session);
  });
  
  ipcMain.handle('ai:load-chat-session', (event, sessionId) => {
    return loadChatSession(sessionId);
  });
  
  ipcMain.handle('ai:get-all-chat-sessions', () => {
    return getAllChatSessions();
  });
  
  ipcMain.handle('ai:delete-chat-session', (event, sessionId) => {
    return deleteChatSession(sessionId);
  });
}

module.exports = {
  registerAIHandlers,
  initializeOpenAI
}; 