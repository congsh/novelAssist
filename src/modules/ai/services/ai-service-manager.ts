import { AIBaseService } from './ai-base-service';
import { AIProvider, AISettings, ChatCompletionRequest, ChatCompletionResponse, ChatMessage } from '../types';

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
  async getAvailableModels() {
    if (!this.currentService) {
      throw new Error('AI服务未初始化');
    }
    
    return this.currentService.getAvailableModels();
  }
  
  /**
   * 发送聊天完成请求
   * @param request 聊天完成请求
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.currentService) {
      throw new Error('AI服务未初始化');
    }
    
    return this.currentService.createChatCompletion(request);
  }
  
  /**
   * 以流的方式发送聊天完成请求
   * @param request 聊天完成请求
   * @param callback 接收部分响应的回调函数
   */
  async createChatCompletionStream(
    request: ChatCompletionRequest, 
    callback: (partialResponse: ChatMessage) => void
  ): Promise<ChatCompletionResponse> {
    if (!this.currentService) {
      throw new Error('AI服务未初始化');
    }
    
    return this.currentService.createChatCompletionStream(request, callback);
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
   * 获取当前使用的AI提供商
   */
  getCurrentProvider(): AIProvider | null {
    return this.currentProvider;
  }
  
  /**
   * The settings of the current service
   */
  getSettings(): AISettings | null {
    return this.settings;
  }
}

// 创建单例实例
const aiServiceManager = new AIServiceManager();
export default aiServiceManager; 