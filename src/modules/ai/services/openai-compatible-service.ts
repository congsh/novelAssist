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
  ChatMessageRole 
} from '../types';

/**
 * OpenAI Compatible服务实现
 * 用于接入符合OpenAI API标准的第三方服务或自部署服务
 */
export class OpenAICompatibleService implements AIBaseService {
  private client: OpenAI | null = null;
  private settings: AISettings | null = null;
  private abortController: AbortController | null = null;
  
  /**
   * 初始化OpenAI Compatible服务
   * @param settings AI设置
   */
  async initialize(settings: AISettings): Promise<boolean> {
    try {
      if (settings.provider !== AIProvider.OPENAI_COMPATIBLE) {
        throw new Error('无效的AI提供商设置');
      }
      
      if (!settings.baseUrl) {
        throw new Error('缺少API基础URL');
      }
      
      this.client = new OpenAI({
        apiKey: settings.apiKey || 'sk-no-key-required', // 某些兼容API可能不需要密钥
        baseURL: settings.baseUrl,
      });
      
      this.settings = settings;
      
      // 测试连接
      const isConnected = await this.testConnection();
      return isConnected;
    } catch (error) {
      console.error('初始化OpenAI Compatible服务失败:', error);
      return false;
    }
  }
  
  /**
   * 获取可用的模型列表
   */
  async getAvailableModels(): Promise<AIModel[]> {
    try {
      if (!this.client) {
        throw new Error('OpenAI Compatible客户端未初始化');
      }
      
      // 尝试获取模型列表
      const response = await this.client.models.list();
      
      return response.data.map(model => ({
        id: model.id,
        name: model.id,
        provider: AIProvider.OPENAI_COMPATIBLE,
        description: `${model.id} 模型`,
      }));
    } catch (error) {
      console.error('获取OpenAI Compatible模型列表失败:', error);
      
      // 如果无法获取模型列表，则使用默认模型
      // 这里使用settings中的defaultModel作为默认模型
      if (this.settings?.defaultModel) {
        return [
          {
            id: this.settings.defaultModel,
            name: this.settings.defaultModel,
            provider: AIProvider.OPENAI_COMPATIBLE,
            description: '默认模型',
            contextWindow: 4096, // 默认上下文窗口大小
          }
        ];
      }
      
      // 如果没有设置默认模型，则返回空列表
      return [];
    }
  }
  
  /**
   * 发送聊天完成请求
   * @param request 聊天完成请求
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.client) {
      throw new Error('OpenAI Compatible客户端未初始化');
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
        max_tokens: maxTokens,
      }, options);
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: ChatMessageRole.ASSISTANT,
        content: response.choices[0]?.message?.content || '',
        timestamp: Date.now(),
      };
      
      return {
        id: response.id || uuidv4(),
        message: assistantMessage,
        model: response.model || modelId,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('OpenAI Compatible请求失败:', error);
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
      throw new Error('OpenAI Compatible客户端未初始化');
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
        max_tokens: maxTokens,
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
      console.error('OpenAI Compatible流请求失败:', error);
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
      
      // 尝试获取模型列表来测试连接
      const response = await this.client.models.list();
      return response.data.length > 0;
    } catch (error) {
      console.error('OpenAI Compatible连接测试失败:', error);
      
      // 如果无法获取模型列表，尝试发送一个简单的聊天请求
      try {
        if (this.settings?.defaultModel) {
          const response = await this.client?.chat.completions.create({
            model: this.settings.defaultModel,
            messages: [{ role: 'user', content: 'Hello!' }],
            max_tokens: 5,
          });
          
          return !!response;
        }
        return false;
      } catch (chatError) {
        console.error('OpenAI Compatible聊天请求测试失败:', chatError);
        return false;
      }
    }
  }
} 