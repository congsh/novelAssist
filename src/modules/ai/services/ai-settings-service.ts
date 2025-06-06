import { AIProvider, AISettings, AIProviderType, AIModel, AIScenario } from '../types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

/**
 * 默认场景配置
 */
const defaultScenarioConfigs = {
  [AIScenario.CHAT]: {
    enabled: true,
    providerId: '',
    modelId: '',
    temperature: 0.7,
    maxTokens: 1000,
  },
  [AIScenario.NOVEL_COLLABORATION]: {
    enabled: true,
    providerId: '',
    modelId: '',
    temperature: 0.7,
    maxTokens: 1000,
  },
  [AIScenario.CONTEXT_ENHANCEMENT]: {
    enabled: true,
    providerId: '',
    modelId: '',
    temperature: 0.7,
    maxTokens: 1000,
  },
  [AIScenario.NOVEL_ANALYSIS]: {
    enabled: true,
    providerId: '',
    modelId: '',
    temperature: 0.7,
    maxTokens: 1000,
  }
};

/**
 * AI设置默认值（空设置）
 */
const emptyAISettings: AISettings = {
  activeProviderId: '',
  providers: [],
  models: [],
  scenarioConfigs: { ...defaultScenarioConfigs }
};

/**
 * 配置存储键
 */
const SETTINGS_KEY = 'ai:settings';
const PROVIDERS_KEY = 'ai:providers';
const MODELS_KEY = 'ai:models';
const ACTIVE_PROVIDER_ID_KEY = 'ai:active-provider-id';

/**
 * AI设置服务
 * 负责保存和读取AI设置
 */
export class AISettingsService {
  private static instance: AISettingsService;
  private isProductionBuild: boolean;
  
  /**
   * 获取单例实例
   */
  public static getInstance(): AISettingsService {
    if (!AISettingsService.instance) {
      AISettingsService.instance = new AISettingsService();
    }
    return AISettingsService.instance;
  }
  
  /**
   * 确保存在嵌入模型
   */
  async ensureEmbeddingModels(): Promise<void> {
    try {
      const settings = await this.loadSettings();
      
      // 如果没有配置任何AI提供商，则跳过
      if (!this.hasConfiguredAI(settings)) {
        return;
      }
      
      let hasChanges = false;
      
      // 获取所有OpenAI和OpenAI兼容类型的提供商
      const supportedProviders = settings.providers.filter(p => 
        p.type === AIProviderType.OPENAI || p.type === AIProviderType.OPENAI_COMPATIBLE
      );
      
      for (const provider of supportedProviders) {
        // 检查该提供商是否已经有嵌入模型
        const hasEmbeddingModel = settings.models.some(m => 
          m.providerId === provider.id && m.isEmbeddingModel
        );
        
        // 如果没有嵌入模型，添加默认的嵌入模型
        if (!hasEmbeddingModel) {
          const embedModel: AIModel = {
            id: `${provider.id}-text-embedding-ada-002`,
            name: 'text-embedding-ada-002',
            providerId: provider.id,
            description: 'OpenAI文本嵌入模型，用于向量化文本',
            isEmbeddingModel: true,
            capabilities: ['文本嵌入']
          };
          
          settings.models.push(embedModel);
          hasChanges = true;
        }
      }
      
      // 如果有变更，保存设置
      if (hasChanges) {
        await this.saveSettings(settings);
        console.log('成功添加默认嵌入模型');
      }
    } catch (error) {
      console.error('确保嵌入模型存在时出错:', error);
    }
  }
  
  private constructor() {
    // 确定是否是生产构建
    this.isProductionBuild = process.env.NODE_ENV === 'production';
    
    // 如果是生产构建，记录日志
    if (this.isProductionBuild) {
      console.log('AI设置服务运行在生产环境模式');
    }
    
    // 确保存在嵌入模型（异步初始化）
    this.ensureEmbeddingModels().catch(error => {
      console.error('初始化嵌入模型失败:', error);
    });
  }
  
  /**
   * 检查是否配置了AI（是否有可用的AI提供商）
   * @param settings AI设置，如果未提供会加载当前设置
   */
  async hasConfiguredAI(settings?: AISettings): Promise<boolean> {
    try {
      const aiSettings = settings || await this.loadSettings();
      
      // 检查是否有提供商配置
      if (!aiSettings.providers || aiSettings.providers.length === 0) {
        return false;
      }
      
      // 检查是否有活动提供商
      if (!aiSettings.activeProviderId) {
        return false;
      }
      
      // 检查活动提供商是否存在
      const activeProvider = aiSettings.providers.find(p => p.id === aiSettings.activeProviderId);
      if (!activeProvider) {
        return false;
      }
      
      // 检查活动提供商是否有API密钥（对于需要API密钥的提供商类型）
      if ([AIProviderType.OPENAI, AIProviderType.DEEPSEEK, AIProviderType.OPENAI_COMPATIBLE].includes(activeProvider.type)) {
        if (!activeProvider.apiKey) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('检查AI配置状态失败:', error);
      return false;
    }
  }
  
  /**
   * 保存AI设置
   * @param settings AI设置
   */
  async saveSettings(settings: AISettings): Promise<boolean> {
    try {
      // 保存当前活动配置
      await window.electron.invoke('settings:set', { key: SETTINGS_KEY, value: settings });
      
      // 保存活动供应商ID
      await window.electron.invoke('settings:set', { key: ACTIVE_PROVIDER_ID_KEY, value: settings.activeProviderId });
      
      // 保存所有供应商
      await window.electron.invoke('settings:set', { key: PROVIDERS_KEY, value: settings.providers });
      
      // 保存所有模型
      await window.electron.invoke('settings:set', { key: MODELS_KEY, value: settings.models });
      
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
      // 尝试从新结构加载
      const settings = await window.electron.invoke('settings:get', { key: SETTINGS_KEY });
      
      if (settings) {
        return settings;
      }
      
      // 加载各部分
      const activeProviderId = await window.electron.invoke('settings:get', { key: ACTIVE_PROVIDER_ID_KEY }) || '';
      const providers = await window.electron.invoke('settings:get', { key: PROVIDERS_KEY }) || [];
      const models = await window.electron.invoke('settings:get', { key: MODELS_KEY }) || [];
      
      // 如果没有提供商，返回空设置
      if (!providers || providers.length === 0) {
        return emptyAISettings;
      }
      
      // 构建设置
      const newSettings: AISettings = {
        activeProviderId,
        providers,
        models,
        scenarioConfigs: { ...defaultScenarioConfigs }
      };
      
      // 保存设置以便下次直接使用
      await this.saveSettings(newSettings);
      
      return newSettings;
    } catch (error) {
      console.error('读取AI设置失败:', error);
      return emptyAISettings;
    }
  }
  
  /**
   * 获取空设置
   */
  getEmptySettings(): AISettings {
    return { ...emptyAISettings };
  }
  
  /**
   * 保存供应商
   * @param provider 供应商
   */
  async saveProvider(provider: AIProvider): Promise<boolean> {
    try {
      const settings = await this.loadSettings();
      
      // 确保提供商有ID
      if (!provider.id) {
        provider.id = uuidv4();
      }
      
      // 查找是否存在同ID的提供商
      const index = settings.providers.findIndex(p => p.id === provider.id);
      if (index >= 0) {
        // 更新现有提供商
        settings.providers[index] = provider;
      } else {
        // 添加新提供商
        settings.providers.push(provider);
      }
      
      // 保存设置
      return this.saveSettings(settings);
    } catch (error) {
      console.error('保存供应商失败:', error);
      return false;
    }
  }
  
  /**
   * 删除供应商
   * @param providerId 供应商ID
   */
  async deleteProvider(providerId: string): Promise<boolean> {
    try {
      const settings = await this.loadSettings();
      
      // 过滤掉要删除的提供商
      settings.providers = settings.providers.filter(p => p.id !== providerId);
      
      // 过滤掉该提供商的模型
      settings.models = settings.models.filter(m => m.providerId !== providerId);
      
      // 如果删除的是当前活动提供商，切换到第一个提供商
      if (settings.activeProviderId === providerId && settings.providers.length > 0) {
        settings.activeProviderId = settings.providers[0].id;
      }
      
      // 保存设置
      return this.saveSettings(settings);
    } catch (error) {
      console.error('删除供应商失败:', error);
      return false;
    }
  }
  
  /**
   * 设置活动提供商
   * @param providerId 提供商ID
   */
  async setActiveProvider(providerId: string): Promise<boolean> {
    try {
      const settings = await this.loadSettings();
      
      // 确保提供商存在
      const provider = settings.providers.find(p => p.id === providerId);
      if (!provider) {
        return false;
      }
      
      // 更新活动提供商ID
      settings.activeProviderId = providerId;
      
      // 保存设置
      return this.saveSettings(settings);
    } catch (error) {
      console.error('设置活动提供商失败:', error);
      return false;
    }
  }
  
  /**
   * 获取活动提供商
   */
  async getActiveProvider(): Promise<AIProvider | null> {
    try {
      const settings = await this.loadSettings();
      return settings.providers.find(p => p.id === settings.activeProviderId) || null;
    } catch (error) {
      console.error('获取活动提供商失败:', error);
      return null;
    }
  }
  
  /**
   * 保存模型
   * @param model 模型
   */
  async saveModel(model: AIModel): Promise<boolean> {
    try {
      const settings = await this.loadSettings();
      
      // 确保模型有ID
      if (!model.id) {
        model.id = uuidv4();
      }
      
      // 查找是否存在同ID的模型
      const index = settings.models.findIndex(m => m.id === model.id);
      if (index >= 0) {
        // 更新现有模型
        settings.models[index] = model;
      } else {
        // 添加新模型
        settings.models.push(model);
      }
      
      // 保存设置
      return this.saveSettings(settings);
    } catch (error) {
      console.error('保存模型失败:', error);
      return false;
    }
  }
  
  /**
   * 批量保存模型
   * @param models 模型列表
   * @param providerId 关联的提供商ID
   */
  async saveModels(models: AIModel[], providerId: string): Promise<boolean> {
    try {
      const settings = await this.loadSettings();
      
      // 确保所有模型都有providerId
      const updatedModels = models.map(model => ({
        ...model,
        providerId: model.providerId || providerId
      }));
      
      // 替换该提供商的所有模型
      settings.models = [
        ...settings.models.filter(m => m.providerId !== providerId),
        ...updatedModels
      ];
      
      // 保存设置
      return this.saveSettings(settings);
    } catch (error) {
      console.error('批量保存模型失败:', error);
      return false;
    }
  }
  
  /**
   * 删除模型
   * @param modelId 模型ID
   */
  async deleteModel(modelId: string): Promise<boolean> {
    try {
      const settings = await this.loadSettings();
      
      // 过滤掉要删除的模型
      settings.models = settings.models.filter(m => m.id !== modelId);
      
      // 检查是否有提供商使用该模型作为默认模型
      for (const provider of settings.providers) {
        if (provider.defaultModel === modelId) {
          // 如果该提供商还有其他模型，设置为第一个可用模型
          const providerModels = settings.models.filter(m => m.providerId === provider.id);
          if (providerModels.length > 0) {
            provider.defaultModel = providerModels[0].id;
          } else {
            // 否则设置为空
            provider.defaultModel = '';
          }
        }
      }
      
      // 保存设置
      return this.saveSettings(settings);
    } catch (error) {
      console.error('删除模型失败:', error);
      return false;
    }
  }
  
  /**
   * 获取提供商的模型
   * @param providerId 提供商ID
   */
  async getProviderModels(providerId: string): Promise<AIModel[]> {
    try {
      const settings = await this.loadSettings();
      return settings.models.filter(m => m.providerId === providerId);
    } catch (error) {
      console.error('获取提供商模型失败:', error);
      return [];
    }
  }

  /**
   * 尝试迁移旧版配置
   */
  async migrateOldConfigs(): Promise<boolean> {
    try {
      // 尝试加载旧版配置
      const oldSettings = await window.electron.invoke('ai:load-settings');
      const oldConfigs = await window.electron.invoke('settings:get', { key: 'ai:configs' });
      
      if (!oldSettings && (!oldConfigs || !Array.isArray(oldConfigs) || oldConfigs.length === 0)) {
        console.log('没有找到旧版配置，跳过迁移');
        return false;
      }
      
      console.log('开始迁移旧版配置...');
      
      // 创建新的设置对象
      const newSettings: AISettings = {
        activeProviderId: '',
        providers: [],
        models: [],
        scenarioConfigs: { ...defaultScenarioConfigs }
      };
      
      // 处理配置列表
      const configsToMigrate = Array.isArray(oldConfigs) && oldConfigs.length > 0 
        ? oldConfigs 
        : oldSettings ? [oldSettings] : [];
        
      // 迁移每个旧配置到新的提供商和模型
      for (const config of configsToMigrate) {
        const providerId = config.id || uuidv4();
        const provider: AIProvider = {
          id: providerId,
          name: config.name || `${config.provider}配置`,
          type: config.provider,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          localServerUrl: config.localServerUrl,
          defaultModel: config.defaultModel,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          proxyUrl: config.proxyUrl
        };
        
        newSettings.providers.push(provider);
        
        // 迁移模型
        if (config.models && Array.isArray(config.models)) {
          const models = config.models.map((model: any) => ({
            ...model,
            providerId
          }));
          
          newSettings.models.push(...models);
        }
        
        // 迁移场景配置
        if (config.scenarioConfigs) {
          Object.entries(config.scenarioConfigs).forEach(([scenarioKey, scenarioConfig]: [string, any]) => {
            if (scenarioConfig && Object.values(AIScenario).includes(scenarioKey as AIScenario)) {
              const scenario = scenarioKey as AIScenario;
              newSettings.scenarioConfigs[scenario] = {
                enabled: scenarioConfig.enabled ?? true,
                providerId: providerId,
                modelId: scenarioConfig.modelId ?? 'gpt-3.5-turbo',
                temperature: scenarioConfig.temperature,
                maxTokens: scenarioConfig.maxTokens,
                systemPrompt: scenarioConfig.systemPrompt,
                costLimit: scenarioConfig.costLimit
              };
            }
          });
        }
      }
      
      // 设置活动提供商ID
      if (newSettings.providers.length > 0) {
        const activeConfigId = await window.electron.invoke('settings:get', { key: 'ai:active-config-id' });
        const activeProvider = activeConfigId 
          ? newSettings.providers.find(p => p.id === activeConfigId) 
          : newSettings.providers[0];
          
        newSettings.activeProviderId = activeProvider?.id || newSettings.providers[0].id;
      }
      
      // 保存新设置
      const saved = await this.saveSettings(newSettings);
      
      if (saved) {
        console.log('迁移旧版配置成功');
        
        // 清除旧版配置
        await window.electron.invoke('settings:delete', { key: 'ai:configs' });
        await window.electron.invoke('settings:delete', { key: 'ai:active-config-id' });
        
        return true;
      } else {
        console.error('保存迁移后的配置失败');
        return false;
      }
    } catch (error) {
      console.error('迁移旧版配置失败:', error);
      return false;
    }
  }
} 