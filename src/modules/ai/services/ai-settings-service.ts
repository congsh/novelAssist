import { AIProvider, AISettings } from '../types';

/**
 * AI设置默认值
 */
const defaultAISettings: AISettings = {
  provider: AIProvider.OPENAI,
  apiKey: '',
  models: [],
  defaultModel: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 1000,
};

/**
 * AI设置服务
 * 负责保存和读取AI设置
 */
export class AISettingsService {
  private static instance: AISettingsService;
  
  /**
   * 获取单例实例
   */
  public static getInstance(): AISettingsService {
    if (!AISettingsService.instance) {
      AISettingsService.instance = new AISettingsService();
    }
    return AISettingsService.instance;
  }
  
  private constructor() {}
  
  /**
   * 保存AI设置
   * @param settings AI设置
   */
  async saveSettings(settings: AISettings): Promise<boolean> {
    try {
      await window.electron.invoke('ai:save-settings', settings);
      return true;
    } catch (error) {
      console.error('保存AI设置失败:', error);
      return false;
    }
  }
  
  /**
   * 读取AI设置
   */
  async loadSettings(): Promise<AISettings> {
    try {
      const settings = await window.electron.invoke('ai:load-settings');
      return settings || defaultAISettings;
    } catch (error) {
      console.error('读取AI设置失败:', error);
      return defaultAISettings;
    }
  }
  
  /**
   * 获取默认设置
   */
  getDefaultSettings(): AISettings {
    return { ...defaultAISettings };
  }
} 