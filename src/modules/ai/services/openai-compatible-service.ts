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
  ChatMessageRole,
  EmbeddingRequest,
  EmbeddingResponse
} from '../types';
import https from 'https';

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
      // 获取当前活动的提供商
      const activeProvider = settings.providers.find(p => p.id === settings.activeProviderId);
      
      if (!activeProvider) {
        throw new Error('未找到活动提供商');
      }
      
      if (activeProvider.type !== AIProviderType.OPENAI_COMPATIBLE) {
        throw new Error('当前提供商不是OpenAI Compatible类型');
      }
      
      if (!activeProvider.baseUrl) {
        throw new Error('缺少API基础URL');
      }
      
      // 规范化基础URL
      let baseURL = activeProvider.baseUrl;
      
      // 确保URL以https://或http://开头
      if (!baseURL.startsWith('http://') && !baseURL.startsWith('https://')) {
        baseURL = 'https://' + baseURL;
      }
      
      // 确保URL不以斜杠结尾
      if (baseURL.endsWith('/')) {
        baseURL = baseURL.slice(0, -1);
      }
      
      console.log('使用API基础URL:', baseURL);
      
      // 创建自定义HTTPS代理，禁用证书验证
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
      
      this.client = new OpenAI({
        apiKey: activeProvider.apiKey || 'sk-no-key-required', // 某些兼容API可能不需要密钥
        baseURL: baseURL,
        dangerouslyAllowBrowser: true, // 允许在浏览器环境中使用
        httpAgent: httpsAgent, // 禁用SSL证书验证
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
      if (!this.settings) {
        return [];
      }
      
      // 获取当前活动的提供商
      const activeProvider = this.settings.providers.find(p => p.id === this.settings?.activeProviderId);
      if (!activeProvider) {
        throw new Error('未找到活动提供商');
      }
      
      // 首先尝试使用用户已经在settings中配置的models
      if (this.settings.models?.length) {
        const compatibleModels = this.settings.models.filter(
          model => model.providerId === this.settings?.activeProviderId
        );
        
        if (compatibleModels.length > 0) {
          return compatibleModels;
        }
      }
      
      // 如果没有配置的模型，但有默认模型设置，使用默认模型
      if (activeProvider.defaultModel) {
        return [
          {
            id: activeProvider.defaultModel,
            name: activeProvider.defaultModel,
            providerId: activeProvider.id,
            description: '默认模型',
            contextWindow: 4096, // 默认上下文窗口大小
          }
        ];
      }
      
      // 尝试从API获取模型列表
      if (this.client) {
        try {
          const models = await this.client.models.list();
          return models.data.map(model => ({
            id: model.id,
            name: model.id,
            providerId: activeProvider.id,
            description: model.owned_by || '兼容模型',
            contextWindow: 4096, // 默认值
          }));
        } catch (error) {
          console.warn('获取模型列表失败，使用默认值:', error);
          // 失败就使用默认值，不影响使用
        }
      }
      
      // 如果都失败了，返回空列表
      return [];
    } catch (error) {
      console.error('获取模型列表出错:', error);
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
        max_tokens: Math.min(Math.max(maxTokens || 1000, 1), 8192),
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
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.client || !this.settings) {
      return false;
    }
    
    try {
      // 获取当前活动的提供商
      const activeProvider = this.settings.providers.find(p => p.id === this.settings?.activeProviderId);
      if (!activeProvider) {
        throw new Error('未找到活动提供商');
      }
      
      // 尝试获取models列表来测试连接
      await this.client.models.list();
      return true;
    } catch (error) {
      console.warn('测试连接失败，尝试模拟检测:', error);
      
      // 某些API不支持获取models，尝试发送简单请求
      try {
        const activeProvider = this.settings.providers.find(p => p.id === this.settings?.activeProviderId);
        if (!activeProvider) {
          return false;
        }

        // 使用默认模型发送测试请求
        await this.client.chat.completions.create({
          model: activeProvider.defaultModel,
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7,
          max_tokens: 5,
        });
        return true;
      } catch (error) {
        console.error('测试连接彻底失败:', error);
        return false;
      }
    }
  }

  /**
   * 创建文本的向量嵌入
   * @param request 嵌入请求
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.client) {
      throw new Error('OpenAI Compatible客户端未初始化');
    }
    
    const { text, modelId } = request;
    
    try {
      // 使用兼容API创建嵌入
      const response = await this.client.embeddings.create({
        model: modelId || 'text-embedding-ada-002', // 默认使用text-embedding-ada-002模型
        input: text,
      });
      
      // 返回嵌入响应
      return {
        id: uuidv4(),
        embedding: response.data[0].embedding,
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens
        }
      };
    } catch (error) {
      console.error('OpenAI Compatible嵌入生成失败:', error);
      throw new Error(`创建嵌入失败: ${(error as Error).message}`);
    }
  }
} 