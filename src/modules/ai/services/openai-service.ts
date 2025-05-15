import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { 
  AIBaseService, 
} from './ai-base-service';
import { 
  AIModel, 
  AIProvider, 
  AISettings, 
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatMessage, 
  ChatMessageRole 
} from '../types';

/**
 * OpenAI服务实现
 */
export class OpenAIService implements AIBaseService {
  private client: OpenAI | null = null;
  private settings: AISettings | null = null;
  private abortController: AbortController | null = null;
  
  /**
   * 初始化OpenAI服务
   * @param settings AI设置
   */
  async initialize(settings: AISettings): Promise<boolean> {
    try {
      if (settings.provider !== AIProvider.OPENAI) {
        throw new Error('无效的AI提供商设置');
      }
      
      if (!settings.apiKey) {
        throw new Error('缺少OpenAI API密钥');
      }
      
      this.client = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl || undefined,
        dangerouslyAllowBrowser: true,
      });
      
      this.settings = settings;
      
      // 测试连接
      const isConnected = await this.testConnection();
      return isConnected;
    } catch (error) {
      console.error('初始化OpenAI服务失败:', error);
      return false;
    }
  }
  
  /**
   * 获取可用的OpenAI模型列表
   */
  async getAvailableModels(): Promise<AIModel[]> {
    try {
      if (!this.client) {
        throw new Error('OpenAI客户端未初始化');
      }
      
      const response = await this.client.models.list();
      
      return response.data
        .filter(model => 
          model.id.includes('gpt') || 
          model.id.includes('text-davinci') ||
          model.id.includes('claude')
        )
        .map(model => ({
          id: model.id,
          name: model.id,
          provider: AIProvider.OPENAI,
          description: `OpenAI ${model.id} 模型`,
        }));
    } catch (error) {
      console.error('获取OpenAI模型列表失败:', error);
      
      // 返回硬编码的默认模型列表
      return [
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: AIProvider.OPENAI,
          description: 'OpenAI GPT-3.5 Turbo 模型',
          contextWindow: 4096,
        },
        {
          id: 'gpt-4',
          name: 'GPT-4',
          provider: AIProvider.OPENAI,
          description: 'OpenAI GPT-4 模型',
          contextWindow: 8192,
        },
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          provider: AIProvider.OPENAI,
          description: 'OpenAI GPT-4 Turbo 模型',
          contextWindow: 128000,
        }
      ];
    }
  }
  
  /**
   * 发送聊天完成请求
   * @param request 聊天完成请求
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.client) {
      throw new Error('OpenAI客户端未初始化');
    }
    
    const { modelId, messages, temperature = 0.7, maxTokens } = request;
    
    this.abortController = new AbortController();
    
    try {
      const options = {
        signal: this.abortController.signal
      };
      
      const response = await this.client.chat.completions.create({
        model: modelId,
        messages: messages.map(msg => ({
          role: msg.role.toLowerCase() as any,
          content: msg.content,
        })),
        temperature: temperature,
        max_tokens: Math.min(Math.max(maxTokens || 1000, 1), 8192),
      }, options);
      
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
      console.error('OpenAI请求失败:', error);
      throw error;
    } finally {
      this.abortController = null;
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
      throw new Error('OpenAI客户端未初始化');
    }
    
    const { modelId, messages, temperature = 0.7, maxTokens } = request;
    
    this.abortController = new AbortController();
    const messageId = uuidv4();
    let fullContent = '';
    
    try {
      const options = {
        signal: this.abortController.signal
      };
      
      const stream = await this.client.chat.completions.create({
        model: modelId,
        messages: messages.map(msg => ({
          role: msg.role.toLowerCase() as any,
          content: msg.content,
        })),
        temperature: temperature,
        max_tokens: Math.min(Math.max(maxTokens || 1000, 1), 8192),
        stream: true,
      }, options);
      
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
      console.error('OpenAI流请求失败:', error);
      throw error;
    } finally {
      this.abortController = null;
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
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      
      // 使用轻量模型发送简单请求测试连接
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello!' }],
        max_tokens: 5,
      });
      
      return !!response.choices.length;
    } catch (error) {
      console.error('OpenAI连接测试失败:', error);
      return false;
    }
  }
} 