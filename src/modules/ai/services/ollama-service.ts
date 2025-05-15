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
 * Ollama服务实现
 */
export class OllamaService implements AIBaseService {
  private serverUrl: string | null = null;
  private settings: AISettings | null = null;
  private abortController: AbortController | null = null;
  
  /**
   * 初始化Ollama服务
   * @param settings AI设置
   */
  async initialize(settings: AISettings): Promise<boolean> {
    try {
      if (settings.provider !== AIProvider.OLLAMA) {
        throw new Error('无效的AI提供商设置');
      }
      
      this.serverUrl = settings.localServerUrl || 'http://localhost:11434';
      this.settings = settings;
      
      // 测试连接
      const isConnected = await this.testConnection();
      return isConnected;
    } catch (error) {
      console.error('初始化Ollama服务失败:', error);
      return false;
    }
  }
  
  /**
   * 获取可用的Ollama模型列表
   */
  async getAvailableModels(): Promise<AIModel[]> {
    try {
      if (!this.serverUrl) {
        throw new Error('Ollama服务器URL未设置');
      }
      
      const response = await fetch(`${this.serverUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Ollama API请求失败: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.models) {
        return [];
      }
      
      return data.models.map((model: any) => ({
        id: model.name,
        name: model.name,
        provider: AIProvider.OLLAMA,
        description: `Ollama ${model.name} 模型`,
        contextWindow: 4096, // 默认值，可能根据实际模型而异
      }));
    } catch (error) {
      console.error('获取Ollama模型列表失败:', error);
      
      // 返回一些常见的Ollama模型作为后备
      return [
        {
          id: 'llama2',
          name: 'Llama 2',
          provider: AIProvider.OLLAMA,
          description: 'Llama 2 模型',
          contextWindow: 4096,
        },
        {
          id: 'mistral',
          name: 'Mistral',
          provider: AIProvider.OLLAMA,
          description: 'Mistral 模型',
          contextWindow: 8192,
        },
        {
          id: 'vicuna',
          name: 'Vicuna',
          provider: AIProvider.OLLAMA,
          description: 'Vicuna 模型',
          contextWindow: 4096,
        }
      ];
    }
  }
  
  /**
   * 发送聊天完成请求
   * @param request 聊天完成请求
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.serverUrl) {
      throw new Error('Ollama服务器URL未设置');
    }
    
    const { modelId, messages, temperature = 0.7, maxTokens } = request;
    
    this.abortController = new AbortController();
    
    try {
      // 格式化消息为Ollama预期的格式
      const ollamaMessages = messages.map(msg => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
      }));
      
      const response = await fetch(`${this.serverUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          messages: ollamaMessages,
          options: {
            temperature: temperature,
            num_predict: maxTokens,
          },
          stream: false,
        }),
        signal: this.abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API请求失败: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: ChatMessageRole.ASSISTANT,
        content: data.message?.content || '',
        timestamp: Date.now(),
      };
      
      return {
        id: uuidv4(),
        message: assistantMessage,
        model: modelId,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      };
    } catch (error) {
      console.error('Ollama请求失败:', error);
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
    if (!this.serverUrl) {
      throw new Error('Ollama服务器URL未设置');
    }
    
    const { modelId, messages, temperature = 0.7, maxTokens } = request;
    
    this.abortController = new AbortController();
    const messageId = uuidv4();
    let fullContent = '';
    
    try {
      // 格式化消息为Ollama预期的格式
      const ollamaMessages = messages.map(msg => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
      }));
      
      const response = await fetch(`${this.serverUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          messages: ollamaMessages,
          options: {
            temperature: temperature,
            num_predict: maxTokens,
          },
          stream: true,
        }),
        signal: this.abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API请求失败: ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      
      if (!reader) {
        throw new Error('无法读取响应流');
      }
      
      let promptTokens = 0;
      let completionTokens = 0;
      
      const decoder = new TextDecoder();
      
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          try {
            const parsedLine = JSON.parse(line);
            const content = parsedLine.message?.content || '';
            
            if (content && !parsedLine.done) {
              fullContent += content;
              
              const partialMessage: ChatMessage = {
                id: messageId,
                role: ChatMessageRole.ASSISTANT,
                content: fullContent,
                timestamp: Date.now(),
              };
              
              callback(partialMessage);
              
              // 更新token计数
              completionTokens = parsedLine.eval_count || 0;
              promptTokens = parsedLine.prompt_eval_count || 0;
            }
          } catch (e) {
            console.error('解析Ollama流响应失败:', e);
          }
        }
      }
      
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
      console.error('Ollama流请求失败:', error);
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
      if (!this.serverUrl) {
        return false;
      }
      
      const response = await fetch(`${this.serverUrl}/api/version`);
      return response.ok;
    } catch (error) {
      console.error('Ollama连接测试失败:', error);
      return false;
    }
  }
} 