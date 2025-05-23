import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { 
  AIBaseService 
} from './ai-base-service';
import { 
  AIModel, 
  AIProvider, 
  AISettings, 
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatMessage, 
  ChatMessageRole,
  AIProviderType
} from '../types';

/**
 * DeepSeek服务实现
 * 使用与OpenAI兼容的API接口
 */
export class DeepSeekService implements AIBaseService {
  private client: OpenAI | null = null;
  private settings: AISettings | null = null;
  private abortController: AbortController | null = null;
  
  /**
   * 初始化DeepSeek服务
   * @param settings AI设置
   */
  async initialize(settings: AISettings): Promise<boolean> {
    try {
      if (settings.providers.find(p => p.id === settings.activeProviderId)?.type !== AIProvider.DEEPSEEK) {
        throw new Error('无效的AI提供商设置');
      }
      
      if (!settings.providers.find(p => p.id === settings.activeProviderId)?.apiKey) {
        throw new Error('缺少DeepSeek API密钥');
      }
      
      const baseUrl = settings.providers.find(p => p.id === settings.activeProviderId)?.baseUrl || 'https://api.deepseek.com/v1';
      
      this.client = new OpenAI({
        apiKey: settings.providers.find(p => p.id === settings.activeProviderId)?.apiKey,
        baseURL: baseUrl,
        dangerouslyAllowBrowser: true,
      });
      
      this.settings = settings;
      
      // 测试连接
      const isConnected = await this.testConnection();
      return isConnected;
    } catch (error) {
      console.error('初始化DeepSeek服务失败:', error);
      return false;
    }
  }
  
  /**
   * 获取可用的DeepSeek模型列表
   */
  async getAvailableModels(): Promise<AIModel[]> {
    // DeepSeek可能不提供模型列表API，返回硬编码的模型列表
    return [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        providerId: this.settings?.activeProviderId || '',
        description: 'DeepSeek Chat 基础模型',
        contextWindow: 16000,
      },
      {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder',
        providerId: this.settings?.activeProviderId || '',
        description: 'DeepSeek Coder 代码模型',
        contextWindow: 16000,
      },
    ];
  }
  
  /**
   * 发送聊天完成请求
   * @param request 聊天完成请求
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.client) {
      throw new Error('DeepSeek客户端未初始化');
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
      console.error('DeepSeek请求失败:', error);
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
      throw new Error('DeepSeek客户端未初始化');
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
      console.error('DeepSeek流请求失败:', error);
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
    return AIProviderType.DEEPSEEK;
  }
  
  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      
      // 使用简单请求测试连接
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Hello!' }],
        max_tokens: 5,
      });
      
      return !!response.choices.length;
    } catch (error) {
      console.error('DeepSeek连接测试失败:', error);
      return false;
    }
  }
} 