import { AIProvider, AISettings } from '../types';

/**
 * AI设置默认值
 */
const defaultAISettings: AISettings = {
  id: 'default',
  name: '默认配置',
  provider: AIProvider.OPENAI,
  apiKey: '',
  models: [],
  defaultModel: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 1000,
};

/**
 * 配置存储键
 */
const SETTINGS_KEY = 'ai:settings';
const CONFIGS_KEY = 'ai:configs';
const ACTIVE_CONFIG_ID_KEY = 'ai:active-config-id';

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
      // 确保设置有ID
      if (!settings.id) {
        settings.id = Date.now().toString();
      }
      
      // 保存当前活动配置
      await window.electron.invoke('ai:save-settings', settings);
      
      // 保存到配置列表
      await this.saveConfig(settings);
      
      // 更新活动配置ID
      await window.electron.invoke('settings:set', { key: ACTIVE_CONFIG_ID_KEY, value: settings.id });
      
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
      // 获取活动配置ID
      const activeConfigId = await window.electron.invoke('settings:get', { key: ACTIVE_CONFIG_ID_KEY });
      
      // 如果有活动配置ID，尝试加载该配置
      if (activeConfigId) {
        const config = await this.loadConfigById(activeConfigId);
        if (config) {
          return config;
        }
      }
      
      // 回退到旧的设置存储方式
      const settings = await window.electron.invoke('ai:load-settings');
      if (settings) {
        // 确保设置有ID
        if (!settings.id) {
          settings.id = 'default';
        }
        
        // 确保设置有名称
        if (!settings.name) {
          settings.name = '默认配置';
        }
        
        // 保存到配置列表
        await this.saveConfig(settings);
        
        return settings;
      }
      
      return defaultAISettings;
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
  
  /**
   * 保存配置到配置列表
   * @param config AI配置
   */
  async saveConfig(config: AISettings): Promise<boolean> {
    try {
      // 确保配置有ID
      if (!config.id) {
        config.id = Date.now().toString();
      }
      
      // 获取现有配置列表
      const configs = await this.loadAllConfigs();
      
      // 更新或添加配置
      const index = configs.findIndex(c => c.id === config.id);
      if (index >= 0) {
        configs[index] = config;
      } else {
        configs.push(config);
      }
      
      // 保存配置列表
      await window.electron.invoke('settings:set', { key: CONFIGS_KEY, value: configs });
      
      return true;
    } catch (error) {
      console.error('保存配置失败:', error);
      return false;
    }
  }
  
  /**
   * 加载所有配置
   */
  async loadAllConfigs(): Promise<AISettings[]> {
    try {
      const configs = await window.electron.invoke('settings:get', { key: CONFIGS_KEY });
      
      if (!configs || !Array.isArray(configs) || configs.length === 0) {
        // 如果没有配置列表，尝试加载旧的设置并创建配置列表
        const settings = await window.electron.invoke('ai:load-settings');
        
        if (settings) {
          // 确保设置有ID和名称
          if (!settings.id) {
            settings.id = 'default';
          }
          
          if (!settings.name) {
            settings.name = '默认配置';
          }
          
          return [settings];
        }
        
        // 如果没有旧设置，返回默认配置
        return [defaultAISettings];
      }
      
      return configs;
    } catch (error) {
      console.error('加载配置列表失败:', error);
      return [defaultAISettings];
    }
  }
  
  /**
   * 根据ID加载配置
   * @param configId 配置ID
   */
  async loadConfigById(configId: string): Promise<AISettings | null> {
    try {
      const configs = await this.loadAllConfigs();
      const config = configs.find(c => c.id === configId);
      
      return config || null;
    } catch (error) {
      console.error('加载配置失败:', error);
      return null;
    }
  }
  
  /**
   * 删除配置
   * @param configId 配置ID
   */
  async deleteConfig(configId: string): Promise<boolean> {
    try {
      // 获取现有配置列表
      const configs = await this.loadAllConfigs();
      
      // 过滤掉要删除的配置
      const newConfigs = configs.filter(c => c.id !== configId);
      
      // 保存新的配置列表
      await window.electron.invoke('settings:set', { key: CONFIGS_KEY, value: newConfigs });
      
      // 如果删除的是当前活动配置，切换到第一个配置
      const activeConfigId = await window.electron.invoke('settings:get', { key: ACTIVE_CONFIG_ID_KEY });
      if (activeConfigId === configId && newConfigs.length > 0) {
        await window.electron.invoke('settings:set', { key: ACTIVE_CONFIG_ID_KEY, value: newConfigs[0].id });
        await window.electron.invoke('ai:save-settings', newConfigs[0]);
      }
      
      return true;
    } catch (error) {
      console.error('删除配置失败:', error);
      return false;
    }
  }
  
  /**
   * 设置活动配置
   * @param configId 配置ID
   */
  async setActiveConfig(configId: string): Promise<boolean> {
    try {
      const config = await this.loadConfigById(configId);
      
      if (!config) {
        return false;
      }
      
      // 更新活动配置ID
      await window.electron.invoke('settings:set', { key: ACTIVE_CONFIG_ID_KEY, value: configId });
      
      // 保存为当前设置
      await window.electron.invoke('ai:save-settings', config);
      
      return true;
    } catch (error) {
      console.error('设置活动配置失败:', error);
      return false;
    }
  }
} 