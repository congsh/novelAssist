import { AIBaseService } from './ai-base-service';
import { 
  AIProvider, 
  AISettings, 
  AIScenario,
  AIScenarioConfig,
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatMessage,
  ChatMessageRole
} from '../types';

/**
 * AI服务管理器
 * 负责管理和切换不同的AI服务提供商
 */
class AIServiceManager implements AIBaseService {
  private services: Map<AIProvider, AIBaseService> = new Map();
  private currentService: AIBaseService | null = null;
  private currentProvider: AIProvider | null = null;
  private settings: AISettings | null = null;
  
  /**
   * 注册AI服务
   * @param provider AI提供商
   * @param service AI服务实例
   */
  registerService(provider: AIProvider, service: AIBaseService): void {
    this.services.set(provider, service);
  }
  
  /**
   * 根据提供商获取AI服务
   * @param provider AI提供商
   */
  getService(provider: AIProvider): AIBaseService | null {
    return this.services.get(provider) || null;
  }
  
  /**
   * 初始化AI服务
   * @param settings AI设置
   */
  async initialize(settings: AISettings): Promise<boolean> {
    this.settings = settings;
    const service = this.services.get(settings.provider);
    
    if (!service) {
      console.error(`未找到提供商 ${settings.provider} 的服务实现`);
      return false;
    }
    
    try {
      const result = await service.initialize(settings);
      if (result) {
        this.currentService = service;
        this.currentProvider = settings.provider;
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
   * 获取当前使用的AI提供商
   */
  getCurrentProvider(): AIProvider | null {
    return this.currentProvider;
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