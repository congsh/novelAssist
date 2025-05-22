import { AIBaseService } from './ai-base-service';
import { 
  AIProviderType, 
  AISettings, 
  AIScenario,
  AIScenarioConfig,
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatMessage,
  ChatMessageRole
} from '../types';
import { AISettingsService } from './ai-settings-service';

/**
 * AI服务管理器
 * 负责管理和切换不同的AI服务提供商
 */
class AIServiceManager implements AIBaseService {
  private services: Map<string, AIBaseService> = new Map();
  private currentService: AIBaseService | null = null;
  private currentProviderId: string | null = null;
  private settings: AISettings | null = null;
  private aiSettingsService: AISettingsService;
  
  constructor() {
    this.aiSettingsService = AISettingsService.getInstance();
  }
  
  /**
   * 注册AI服务
   * @param providerId AI提供商ID
   * @param service AI服务实例
   */
  registerService(providerId: string, service: AIBaseService): void {
    this.services.set(providerId, service);
  }
  
  /**
   * 根据提供商获取AI服务
   * @param providerId AI提供商ID
   */
  getService(providerId: string): AIBaseService | null {
    return this.services.get(providerId) || null;
  }
  
  /**
   * 检查AI是否已配置
   * @param showDialog 是否显示对话框提示用户配置AI
   */
  async checkAIConfigured(showDialog: boolean = true): Promise<boolean> {
    const hasConfiguredAI = await this.aiSettingsService.hasConfiguredAI(this.settings || undefined);
    
    if (!hasConfiguredAI && showDialog) {
      // 通知UI显示配置提示
      await window.electron.invoke('dialog:show', {
        type: 'info',
        title: 'AI服务未配置',
        message: '请先在AI设置中配置OpenAI或兼容服务才能使用AI功能',
        buttons: ['确定']
      });
      
      // 打开AI设置页面
      await window.electron.invoke('app:navigate', { path: '/settings/ai' });
    }
    
    return hasConfiguredAI;
  }
  
  /**
   * 初始化AI服务
   * @param settings AI设置
   */
  async initialize(settings: AISettings): Promise<boolean> {
    this.settings = settings;
    
    // 检查AI是否已配置
    const isConfigured = await this.aiSettingsService.hasConfiguredAI(settings);
    if (!isConfigured) {
      console.warn('AI服务未配置，跳过初始化');
      return false;
    }
    
    // 检查activeProviderId是否有效
    if (!settings.activeProviderId || !settings.providers.some(p => p.id === settings.activeProviderId)) {
      console.error('未找到有效的活动提供商ID');
      return false;
    }
    
    // 注册所有提供商中对应的服务(如果尚未注册)
    settings.providers.forEach(provider => {
      // 检查是否已经注册了该providerId对应的服务
      if (!this.services.has(provider.id)) {
        // 根据provider.type为每个提供商ID注册对应类型的服务
        // 获取该类型已注册的服务
        const typeService = this.services.get(provider.type);
        if (typeService) {
          console.log(`为提供商 ${provider.id} (${provider.type}) 注册服务`);
          this.services.set(provider.id, typeService);
        }
      }
    });
    
    const service = this.services.get(settings.activeProviderId);
    
    if (!service) {
      console.error(`未找到提供商 ${settings.activeProviderId} 的服务实现`);
      return false;
    }
    
    try {
      const result = await service.initialize(settings);
      if (result) {
        this.currentService = service;
        this.currentProviderId = settings.activeProviderId;
      }
      return result;
    } catch (error) {
      console.error('初始化AI服务失败:', error);
      return false;
    }
  }
  
  /**
   * 获取可用的AI模型列表
   */
  async getAvailableModels(): Promise<any[]> {
    if (!this.currentService) {
      // 检查AI是否已配置
      const isConfigured = await this.checkAIConfigured();
      if (!isConfigured) {
        throw new Error('AI服务未配置');
      }
      throw new Error('AI服务未初始化');
    }
    
    return this.currentService.getAvailableModels();
  }
  
  /**
   * 发送聊天完成请求
   * @param request 聊天完成请求
   * @param scenario 可选的AI场景，用于选择特定的服务和配置
   */
  async createChatCompletion(
    request: ChatCompletionRequest, 
    scenario?: AIScenario
  ): Promise<ChatCompletionResponse> {
    // 检查AI是否已配置
    const isConfigured = await this.checkAIConfigured();
    if (!isConfigured) {
      throw new Error('AI服务未配置');
    }
    
    const service = this.getServiceForScenario(scenario);
    
    if (!service) {
      throw new Error('AI服务未初始化');
    }
    
    // 应用场景特定配置
    const configuredRequest = this.applyScenarioConfig(request, scenario);
    
    return service.createChatCompletion(configuredRequest);
  }
  
  /**
   * 以流的方式发送聊天完成请求
   * @param request 聊天完成请求
   * @param callback 接收部分响应的回调函数
   * @param scenario 可选的AI场景，用于选择特定的服务和配置
   */
  async createChatCompletionStream(
    request: ChatCompletionRequest, 
    callback: (partialResponse: ChatMessage) => void,
    scenario?: AIScenario
  ): Promise<ChatCompletionResponse> {
    // 检查AI是否已配置
    const isConfigured = await this.checkAIConfigured();
    if (!isConfigured) {
      throw new Error('AI服务未配置');
    }
    
    const service = this.getServiceForScenario(scenario);
    
    if (!service) {
      throw new Error('AI服务未初始化');
    }
    
    // 应用场景特定配置
    const configuredRequest = this.applyScenarioConfig(request, scenario);
    
    return service.createChatCompletionStream(configuredRequest, callback);
  }
  
  /**
   * 根据场景获取对应的AI服务
   * @param scenario AI场景
   * @returns 对应场景的AI服务
   */
  private getServiceForScenario(scenario?: AIScenario): AIBaseService | null {
    if (!this.settings) {
      return this.currentService;
    }
    
    // 如果没有指定场景或者没有场景配置，使用默认服务
    if (!scenario || !this.settings.scenarioConfigs || !this.settings.scenarioConfigs[scenario]) {
      return this.currentService;
    }
    
    const scenarioConfig = this.settings.scenarioConfigs[scenario];
    
    // 如果场景配置未启用，使用默认服务
    if (!scenarioConfig.enabled) {
      return this.currentService;
    }
    
    // 获取场景指定的服务
    const scenarioService = this.services.get(scenarioConfig.providerId);
    
    // 如果找不到场景指定的服务，回退到默认服务
    return scenarioService || this.currentService;
  }
  
  /**
   * 应用场景特定配置到请求
   * @param request 原始请求
   * @param scenario AI场景
   * @returns 应用了场景配置的请求
   */
  private applyScenarioConfig(request: ChatCompletionRequest, scenario?: AIScenario): ChatCompletionRequest {
    if (!scenario || !this.settings?.scenarioConfigs || !this.settings.scenarioConfigs[scenario]) {
      return request;
    }
    
    const scenarioConfig = this.settings.scenarioConfigs[scenario];
    
    // 如果场景配置未启用，使用原始请求
    if (!scenarioConfig.enabled) {
      return request;
    }
    
    // 复制请求并应用场景特定配置
    const configuredRequest = { ...request };
    
    // 应用模型ID
    if (scenarioConfig.modelId) {
      configuredRequest.modelId = scenarioConfig.modelId;
    }
    
    // 应用温度
    if (scenarioConfig.temperature !== undefined) {
      configuredRequest.temperature = scenarioConfig.temperature;
    }
    
    // 应用最大token数
    if (scenarioConfig.maxTokens !== undefined) {
      configuredRequest.maxTokens = scenarioConfig.maxTokens;
    }
    
    // 应用系统提示词
    if (scenarioConfig.systemPrompt && configuredRequest.messages.length > 0) {
      // 如果第一条消息是系统消息，更新它
      if (configuredRequest.messages[0].role === ChatMessageRole.SYSTEM) {
        configuredRequest.messages[0].content = scenarioConfig.systemPrompt;
      } else {
        // 否则添加一条系统消息到最前面
        configuredRequest.messages.unshift({
          id: 'system-' + Date.now(),
          role: ChatMessageRole.SYSTEM,
          content: scenarioConfig.systemPrompt,
          timestamp: Date.now()
        });
      }
    }
    
    return configuredRequest;
  }
  
  /**
   * 取消正在进行的请求
   */
  cancelRequest(): void {
    if (this.currentService) {
      this.currentService.cancelRequest();
    }
  }
  
  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.currentService) {
      throw new Error('AI服务未初始化');
    }
    
    return this.currentService.testConnection();
  }
  
  /**
   * 获取当前AI设置
   */
  getSettings(): AISettings | null {
    return this.settings;
  }
  
  /**
   * 获取当前使用的AI提供商ID
   */
  getCurrentProviderId(): string | null {
    return this.currentProviderId;
  }
  
  /**
   * 获取场景配置
   * @param scenario AI场景
   */
  getScenarioConfig(scenario: AIScenario): AIScenarioConfig | null {
    if (!this.settings?.scenarioConfigs) {
      return null;
    }
    return this.settings.scenarioConfigs[scenario] || null;
  }
  
  /**
   * 更新场景配置
   * @param scenario AI场景
   * @param config 场景配置
   */
  updateScenarioConfig(scenario: AIScenario, config: AIScenarioConfig): void {
    if (!this.settings) {
      throw new Error('AI服务未初始化');
    }
    
    if (!this.settings.scenarioConfigs) {
      this.settings.scenarioConfigs = {} as Record<AIScenario, AIScenarioConfig>;
    }
    
    this.settings.scenarioConfigs[scenario] = config;
  }
}

// 创建单例实例
const aiServiceManager = new AIServiceManager();

export { aiServiceManager };
export default aiServiceManager; 