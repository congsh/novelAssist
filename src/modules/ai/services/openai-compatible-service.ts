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
      

      
        // 非siliconflow API的一般处理
        // 如果URL包含完整路径(如/v1/chat/completions)，则提取基础部分
        const urlParts = baseURL.split('/');
        if (urlParts.length > 3) {
          // 检查URL是否包含完整路径
          const pathIndex = urlParts.indexOf('v1');
          if (pathIndex !== -1) {
            // 只保留到域名或v1部分
            baseURL = urlParts.slice(0, pathIndex + 1).join('/');
          }
        }
      
      
      console.log('使用API基础URL:', baseURL);
      
      // 创建自定义HTTPS代理，禁用证书验证
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
      
      // 创建OpenAI客户端实例
      const clientOptions: any = {
        apiKey: activeProvider.apiKey || 'sk-no-key-required', // 某些兼容API可能不需要密钥
        baseURL: baseURL,
        dangerouslyAllowBrowser: true, // 允许在浏览器环境中使用
        httpAgent: httpsAgent, // 禁用SSL证书验证
        defaultHeaders: {
          'Content-Type': 'application/json'
        }
      };
      
      // 对于siliconflow API，不添加defaultQuery
      // 移除这一行，因为它可能导致URL中出现?stream=false
      // if (baseURL.includes('siliconflow')) {
      //   clientOptions.defaultQuery = { stream: false };
      // }
      
      this.client = new OpenAI(clientOptions);
      
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
      const options: any = {
        signal: this.abortController.signal
      };
      
      // 获取当前活动的提供商
      const activeProvider = this.settings?.providers.find(p => p.id === this.settings?.activeProviderId);
      if (!activeProvider) {
        throw new Error('未找到活动提供商');
      }
      
      // 使用模型ID或提供商默认模型
      let model = modelId || activeProvider.defaultModel;
      if (!model) {
        throw new Error('未指定模型ID，且提供商没有默认模型');
      }
      
      // 检查是否为siliconflow API
      const isSpecialApi = activeProvider.baseUrl?.includes('siliconflow');
      
      // 对于siliconflow API，使用标准模型名称而非UUID
      if (isSpecialApi) {
        // 尝试获取模型的实际名称
        try {
          // 获取所有可用模型
          const availableModels = await this.getAvailableModels();
          
          // 查找当前模型ID对应的模型
          const modelInfo = availableModels.find(m => m.id === model);
          
          // 如果找到了模型信息，使用其名称
          if (modelInfo && modelInfo.name) {
            console.log(`将本地模型ID ${model} 映射到模型名称 ${modelInfo.name}`);
            model = modelInfo.name;
          } else {
            // 如果找不到模型信息，使用默认模型名称
            console.log(`无法找到模型ID ${model} 的信息，使用默认模型名称 'gpt-3.5-turbo'`);
            model = 'gpt-3.5-turbo';
          }
        } catch (error) {
          console.warn('获取模型信息失败，使用默认模型名称:', error);
          model = 'gpt-3.5-turbo';
        }
        
        // 添加特定的请求头
        options.headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
      }
      
      console.log(`使用模型: ${model} 发送请求`);
      
      // 准备请求参数
      const requestParams: any = {
        model: model,
        messages: messages.map(msg => ({
          role: msg.role.toLowerCase() as any,
          content: msg.content,
        })),
        temperature: temperature,
        max_tokens: Math.min(Math.max(maxTokens || 1000, 1), 8192),
      };
      
      console.log('发送请求参数:', JSON.stringify(requestParams));
      
      try {
        const response = await this.client.chat.completions.create(requestParams, options);
        
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: ChatMessageRole.ASSISTANT,
          content: response.choices[0]?.message?.content || '',
          timestamp: Date.now(),
        };
        
        return {
          id: response.id || uuidv4(),
          message: assistantMessage,
          model: response.model || model,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
        };
      } catch (error: any) {
        console.error('OpenAI Compatible请求失败:', error);
        
        // 如果是siliconflow API，尝试使用fetch直接发送请求
        if (isSpecialApi) {
          console.log('尝试使用fetch直接发送请求');
          
          try {
            if (!activeProvider.baseUrl) {
              throw new Error('缺少API基础URL');
            }
            
            const baseURL = activeProvider.baseUrl;
            let apiUrl = baseURL;
            
            // 确保URL以https://或http://开头
            if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
              apiUrl = 'https://' + apiUrl;
            }
            
            // 确保URL不以斜杠结尾
            if (apiUrl.endsWith('/')) {
              apiUrl = apiUrl.slice(0, -1);
            }
            
            // 确保URL包含/v1/chat/completions路径
            if (!apiUrl.endsWith('/chat/completions')) {
              if (!apiUrl.endsWith('/v1')) {
                if (!apiUrl.includes('/v1')) {
                  apiUrl = `${apiUrl}/v1`;
                }
              }
              apiUrl = `${apiUrl}/chat/completions`;
            }
            
            console.log('使用直接fetch请求URL:', apiUrl);
            
            const fetchResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${activeProvider.apiKey || 'sk-no-key-required'}`,
              },
              body: JSON.stringify(requestParams),
            });
            
            if (!fetchResponse.ok) {
              throw new Error(`HTTP错误: ${fetchResponse.status} ${fetchResponse.statusText}`);
            }
            
            const data = await fetchResponse.json();
            
            const content = data.choices[0]?.message?.content || '';
            
            const assistantMessage: ChatMessage = {
              id: uuidv4(),
              role: ChatMessageRole.ASSISTANT,
              content: content,
              timestamp: Date.now(),
            };
            
            return {
              id: data.id || uuidv4(),
              message: assistantMessage,
              model: data.model || model,
              usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0,
              },
            };
          } catch (fetchError) {
            console.error('fetch请求也失败了:', fetchError);
            throw fetchError;
          }
        } else {
          throw error;
        }
      }
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
      const options: any = {
        signal: this.abortController.signal
      };
      
      // 获取当前活动的提供商
      const activeProvider = this.settings?.providers.find(p => p.id === this.settings?.activeProviderId);
      if (!activeProvider) {
        throw new Error('未找到活动提供商');
      }
      
      // 使用模型ID或提供商默认模型
      let model = modelId || activeProvider.defaultModel;
      if (!model) {
        throw new Error('未指定模型ID，且提供商没有默认模型');
      }
      
      // 检查是否为不支持流式请求的API
      const isSpecialApi = activeProvider.baseUrl?.includes('siliconflow');
      
      // 对于siliconflow API，使用标准模型名称而非UUID
      if (isSpecialApi) {
        // 尝试获取模型的实际名称
        try {
          // 获取所有可用模型
          const availableModels = await this.getAvailableModels();
          
          // 查找当前模型ID对应的模型
          const modelInfo = availableModels.find(m => m.id === model);
          
          // 如果找到了模型信息，使用其名称
          if (modelInfo && modelInfo.name) {
            console.log(`将本地模型ID ${model} 映射到模型名称 ${modelInfo.name}`);
            model = modelInfo.name;
          } else {
            // 如果找不到模型信息，使用默认模型名称
            console.log(`无法找到模型ID ${model} 的信息，使用默认模型名称 'gpt-3.5-turbo'`);
            model = 'gpt-3.5-turbo';
          }
        } catch (error) {
          console.warn('获取模型信息失败，使用默认模型名称:', error);
          model = 'gpt-3.5-turbo';
        }
      }
      
      console.log(`使用模型: ${model} 发送流式请求`);
      
      // 准备请求参数
      const requestParams: any = {
        model: model,
        messages: messages.map(msg => ({
          role: msg.role.toLowerCase() as any,
          content: msg.content,
        })),
        temperature: temperature,
        max_tokens: Math.min(Math.max(maxTokens || 1000, 1), 8192),
      };
      
      // 只有非特殊API才使用流式
      if (!isSpecialApi) {
        requestParams.stream = true;
      }
      
      // 对于siliconflow API，可能需要特殊处理模型ID
      if (isSpecialApi) {
        // 某些API可能需要特定格式的请求头
        options.headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        console.log('发送非流式请求参数:', JSON.stringify(requestParams));
        
        try {
          // 对于不支持流式请求的API，使用普通请求
          const response = await this.client.chat.completions.create(requestParams, options);
          
          const content = response.choices[0]?.message?.content || '';
          
          const assistantMessage: ChatMessage = {
            id: messageId,
            role: ChatMessageRole.ASSISTANT,
            content: content,
            timestamp: Date.now(),
          };
          
          // 模拟流式响应
          callback(assistantMessage);
          
          return {
            id: response.id || uuidv4(),
            message: assistantMessage,
            model: response.model || model,
            usage: {
              promptTokens: response.usage?.prompt_tokens || 0,
              completionTokens: response.usage?.completion_tokens || 0,
              totalTokens: response.usage?.total_tokens || 0,
            },
          };
        } catch (error: any) {
          console.error('非流式请求失败，错误详情:', error);
          
          // 尝试使用fetch直接发送请求
          console.log('尝试使用fetch直接发送请求');
          
          try {
            if (!activeProvider.baseUrl) {
              throw new Error('缺少API基础URL');
            }
            
            const baseURL = activeProvider.baseUrl;
            let apiUrl = baseURL;
            
            // 确保URL以https://或http://开头
            if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
              apiUrl = 'https://' + apiUrl;
            }
            
            // 确保URL不以斜杠结尾
            if (apiUrl.endsWith('/')) {
              apiUrl = apiUrl.slice(0, -1);
            }
            
            // 确保URL包含/v1/chat/completions路径
            if (!apiUrl.endsWith('/chat/completions')) {
              if (!apiUrl.endsWith('/v1')) {
                if (!apiUrl.includes('/v1')) {
                  apiUrl = `${apiUrl}/v1`;
                }
              }
              apiUrl = `${apiUrl}/chat/completions`;
            }
            
            console.log('使用直接fetch请求URL:', apiUrl);
            
            const fetchResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${activeProvider.apiKey || 'sk-no-key-required'}`,
              },
              body: JSON.stringify(requestParams),
            });
            
            if (!fetchResponse.ok) {
              throw new Error(`HTTP错误: ${fetchResponse.status} ${fetchResponse.statusText}`);
            }
            
            const data = await fetchResponse.json();
            
            const content = data.choices[0]?.message?.content || '';
            
            const assistantMessage: ChatMessage = {
              id: messageId,
              role: ChatMessageRole.ASSISTANT,
              content: content,
              timestamp: Date.now(),
            };
            
            // 模拟流式响应
            callback(assistantMessage);
            
            return {
              id: data.id || uuidv4(),
              message: assistantMessage,
              model: data.model || model,
              usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0,
              },
            };
          } catch (fetchError) {
            console.error('fetch请求也失败了:', fetchError);
            throw fetchError;
          }
        }
      } else {
        // 对于支持流式请求的API，使用流式请求
        console.log('发送流式请求参数:', JSON.stringify(requestParams));
        
        try {
          // 使用any类型绕过TypeScript的类型检查
          const stream: any = await this.client.chat.completions.create(requestParams, options);
          
          // 确保流式响应可用
          if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') {
            throw new Error('API返回的不是有效的流式响应');
          }
          
          let promptTokens = 0;
          let completionTokens = 0;
          
          // 使用for-await循环处理流式响应
          for await (const chunk of stream) {
            // 安全地获取内容
            const content = chunk?.choices?.[0]?.delta?.content || '';
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
            model: model,
            usage: {
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
            },
          };
        } catch (error: any) {
          // 如果流式请求失败，尝试回退到非流式请求
          console.warn('流式请求失败，尝试回退到非流式请求:', error.message);
          
          // 修改为非流式请求
          requestParams.stream = false;
          
          const response = await this.client.chat.completions.create(requestParams, options);
          
          const content = response.choices[0]?.message?.content || '';
          
          const assistantMessage: ChatMessage = {
            id: messageId,
            role: ChatMessageRole.ASSISTANT,
            content: content,
            timestamp: Date.now(),
          };
          
          // 模拟流式响应
          callback(assistantMessage);
          
          return {
            id: response.id || uuidv4(),
            message: assistantMessage,
            model: response.model || model,
            usage: {
              promptTokens: response.usage?.prompt_tokens || 0,
              completionTokens: response.usage?.completion_tokens || 0,
              totalTokens: response.usage?.total_tokens || 0,
            },
          };
        }
      }
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
   * 获取提供商类型
   * @returns 提供商类型
   */
  getProviderType(): AIProviderType {
    return AIProviderType.OPENAI_COMPATIBLE;
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
      try {
        await this.client.models.list();
        return true;
      } catch (error) {
        console.warn('获取模型列表失败，尝试模拟检测:', error);
      }
      
      // 某些API不支持获取models，尝试发送简单请求
      try {
        // 确保有默认模型
        const model = activeProvider.defaultModel;
        if (!model) {
          console.error('未找到默认模型，无法测试连接');
          return false;
        }
        
        console.log(`使用模型 ${model} 测试连接`);
        
        // 使用默认模型发送测试请求
        await this.client.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7,
          max_tokens: 5,
        });
        return true;
      } catch (error) {
        console.error('测试连接彻底失败:', error);
        return false;
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      return false;
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
      // 获取当前活动的提供商
      const activeProvider = this.settings?.providers.find(p => p.id === this.settings?.activeProviderId);
      if (!activeProvider) {
        throw new Error('未找到活动提供商');
      }
      
      // 检查是否为siliconflow API
      const isSpecialApi = activeProvider.baseUrl?.includes('siliconflow');
      
      // 使用模型ID或默认嵌入模型
      let model = modelId || 'text-embedding-ada-002';
      
      // 对于siliconflow API，使用直接fetch请求
      if (isSpecialApi) {
        console.log('检测到siliconflow API，使用直接fetch请求生成嵌入');
        
        if (!activeProvider.baseUrl) {
          throw new Error('缺少API基础URL');
        }
        
        const baseURL = activeProvider.baseUrl;
        let apiUrl = baseURL;
        
        // 确保URL以https://或http://开头
        if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
          apiUrl = 'https://' + apiUrl;
        }
        
        // 确保URL不以斜杠结尾
        if (apiUrl.endsWith('/')) {
          apiUrl = apiUrl.slice(0, -1);
        }
        
        // 确保URL包含/v1/embeddings路径
        if (!apiUrl.endsWith('/embeddings')) {
          if (!apiUrl.endsWith('/v1')) {
            if (!apiUrl.includes('/v1')) {
              apiUrl = `${apiUrl}/v1`;
            }
          }
          apiUrl = `${apiUrl}/embeddings`;
        }
        
        console.log('使用直接fetch请求URL:', apiUrl);
        
        const fetchResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeProvider.apiKey || 'sk-no-key-required'}`,
          },
          body: JSON.stringify({
            model: model,
            input: text,
          }),
        });
        
        if (!fetchResponse.ok) {
          throw new Error(`HTTP错误: ${fetchResponse.status} ${fetchResponse.statusText}`);
        }
        
        const data = await fetchResponse.json();
        
        return {
          id: uuidv4(),
          embedding: data.data[0].embedding,
          model: data.model,
          usage: {
            promptTokens: data.usage.prompt_tokens,
            totalTokens: data.usage.total_tokens
          }
        };
      } else {
        // 使用兼容API创建嵌入
        const response = await this.client.embeddings.create({
          model: model,
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
      }
    } catch (error) {
      console.error('OpenAI Compatible嵌入生成失败:', error);
      throw new Error(`创建嵌入失败: ${(error as Error).message}`);
    }
  }
} 