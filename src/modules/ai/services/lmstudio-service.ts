import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { 
  AIBaseService 
} from './ai-base-service';
import { 
  AIModel, 
  AIProviderType, 
  AISettings, 
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatMessage, 
  ChatMessageRole 
} from '../types';
import https from 'https';

/**
 * LMStudio服务实现
 * 使用与OpenAI兼容的API接口
 */
export class LMStudioService implements AIBaseService {
  private client: OpenAI | null = null;
  private settings: AISettings | null = null;
  private abortController: AbortController | null = null;
  
  /**
   * 初始化LMStudio服务
   * @param settings AI设置
   */
  async initialize(settings: AISettings): Promise<boolean> {
    try {
      // 获取当前活动的提供商
      const activeProvider = settings.providers.find(p => p.id === settings.activeProviderId);
      
      if (!activeProvider) {
        throw new Error('未找到活动提供商');
      }
      
      if (activeProvider.type !== AIProviderType.LMSTUDIO) {
        throw new Error('当前提供商不是LMStudio类型');
      }
      
      const baseUrl = activeProvider.localServerUrl || 'http://localhost:1234/v1';
      
      // 创建自定义HTTPS代理，禁用证书验证
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
      
      this.client = new OpenAI({
        apiKey: 'lm-studio', // LMStudio不需要实际的API密钥，但OpenAI客户端需要一个非空字符串
        baseURL: baseUrl,
        dangerouslyAllowBrowser: true, // 允许在浏览器环境中使用
        httpAgent: httpsAgent, // 禁用HTTPS证书验证
      });
      
      this.settings = settings;
      
      // 测试连接
      const isConnected = await this.testConnection();
      return isConnected;
    } catch (error) {
      console.error('初始化LMStudio服务失败:', error);
      return false;
    }
  }
  
  /**
   * 获取可用的LMStudio模型列表
   */
  async getAvailableModels(): Promise<AIModel[]> {
    try {
      if (!this.client || !this.settings) {
        throw new Error('LMStudio客户端未初始化');
      }
      
      // 获取当前活动的提供商
      const activeProvider = this.settings.providers.find(p => p.id === this.settings?.activeProviderId);
      if (!activeProvider) {
        throw new Error('未找到活动提供商');
      }
      
      // 尝试获取模型列表
      const response = await this.client.models.list();
      
      return response.data.map(model => ({
        id: model.id,
        name: model.id,
        providerId: activeProvider.id,
        description: `LMStudio ${model.id} 模型`,
      }));
    } catch (error) {
      console.error('获取LMStudio模型列表失败:', error);
      
      // 如果无法获取模型列表，返回一个默认模型
      if (!this.settings) {
        return [];
      }
      
      // 获取当前活动的提供商
      const activeProvider = this.settings.providers.find(p => p.id === this.settings?.activeProviderId);
      if (!activeProvider) {
        return [];
      }
      
      return [
        {
          id: 'local-model',
          name: 'LMStudio 本地模型',
          providerId: activeProvider.id,
          description: 'LMStudio 本地运行的模型',
          contextWindow: 4096,
        },
      ];
    }
  }
  
  /**
   * 发送聊天完成请求
   * @param request 聊天完成请求
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.client) {
      throw new Error('LMStudio客户端未初始化');
    }
    
    const { modelId, messages, temperature = 0.7, maxTokens } = request;
    
    try {
      const response = await this.client.chat.completions.create({
        model: modelId,
        messages: messages.map(msg => ({
          role: msg.role.toLowerCase() as any,
          content: msg.content,
        })),
        temperature: temperature,
        max_tokens: Math.min(Math.max(maxTokens || 1000, 1), 8192),
      });
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: ChatMessageRole.ASSISTANT,
        content: response.choices[0]?.message?.content || '',
        timestamp: Date.now(),
      };
      
      return {
        id: response.id,
        message: assistantMessage,
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('LMStudio请求失败:', error);
      throw error;
    }
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
    if (!this.client) {
      throw new Error('LMStudio客户端未初始化');
    }
    
    const { modelId, messages, temperature = 0.7, maxTokens } = request;
    
    const messageId = uuidv4();
    let fullContent = '';
    
    try {
      const stream = await this.client.chat.completions.create({
        model: modelId,
        messages: messages.map(msg => ({
          role: msg.role.toLowerCase() as any,
          content: msg.content,
        })),
        temperature: temperature,
        max_tokens: Math.min(Math.max(maxTokens || 1000, 1), 8192),
        stream: true,
      });
      
      let promptTokens = 0;
      let completionTokens = 0;
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullContent += content;
        
        if (content) {
          const partialMessage: ChatMessage = {
            id: messageId,
            role: ChatMessageRole.ASSISTANT,
            content: fullContent,
            timestamp: Date.now(),
          };
          
          callback(partialMessage);
        }
        
        // 更新token计数（近似值）
        completionTokens += content.split(/\s+/).length;
      }
      
      // 估算prompt tokens（近似值）
      promptTokens = messages.reduce((sum, msg) => sum + msg.content.split(/\s+/).length, 0);
      
      const finalMessage: ChatMessage = {
        id: messageId,
        role: ChatMessageRole.ASSISTANT,
        content: fullContent,
        timestamp: Date.now(),
      };
      
      return {
        id: uuidv4(),
        message: finalMessage,
        model: modelId,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
      };
    } catch (error) {
      console.error('LMStudio流请求失败:', error);
      throw error;
    }
  }
  
  /**
   * 取消正在进行的请求
   */
  cancelRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
  
  /**
   * 获取提供商类型
   * @returns 提供商类型
   */
  getProviderType(): AIProviderType {
    return AIProviderType.LMSTUDIO;
  }
  
  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      
      // 尝试获取模型列表来测试连接
      const response = await this.client.models.list();
      return !!response.data.length;
    } catch (error) {
      console.error('LMStudio连接测试失败:', error);
      return false;
    }
  }
} 