import { ChatCompletionRequest, ChatCompletionResponse, ChatMessage } from '../types';
import aiServiceManager from './ai-service-manager';

export interface AIRequest {
  request: ChatCompletionRequest;
  scenario?: any;
  stream?: boolean;
  callback?: (partialResponse: ChatMessage) => void;
}

// 定义错误接口
interface AIError extends Error {
  name: string;
  status?: number;
  code?: string;
}

/**
 * AI请求队列
 * 负责管理AI请求的队列和优先级，提高响应的稳定性
 */
export class AIRequestQueue {
  private queue: Array<{
    request: AIRequest;
    priority: number;
    resolve: Function;
    reject: Function;
  }> = [];
  private processing = false;
  private controller: AbortController | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  
  /**
   * 添加请求到队列
   * @param request AI请求
   * @param priority 优先级（数字越大优先级越高）
   */
  addRequest(request: AIRequest, priority: number = 1): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ 
        request, 
        priority, 
        resolve, 
        reject 
      });
      
      // 按优先级排序队列
      this.queue.sort((a, b) => b.priority - a.priority);
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * 处理队列中的请求
   */
  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    const { request, resolve, reject } = this.queue.shift()!;
    
    try {
      const result = await this.executeRequest(request);
      resolve(result);
    } catch (error: any) {
      // 如果是超时错误，添加更有意义的错误信息
      if (error.name === 'AbortError') {
        reject(new Error('AI响应超时，请稍后重试'));
      } else {
        reject(error);
      }
    } finally {
      // 清理定时器和控制器
      this.clearTimeoutAndController();
      
      // 继续处理队列中的下一个请求
      this.processQueue();
    }
  }
  
  /**
   * 执行AI请求
   * @param request AI请求
   */
  private async executeRequest(aiRequest: AIRequest): Promise<ChatCompletionResponse> {
    // 创建AbortController用于超时控制
    this.controller = new AbortController();
    
    // 设置30秒超时
    this.timeoutId = setTimeout(() => {
      if (this.controller) {
        this.controller.abort();
      }
    }, 30000);
    
    try {
      let result: ChatCompletionResponse;
      
      // 处理流式请求
      if (aiRequest.stream && aiRequest.callback) {
        let lastUpdate = Date.now();
        
        // 包装回调函数，在每次收到token时重置超时
        const wrappedCallback = (token: ChatMessage) => {
          // 重置超时计时器
          if (this.timeoutId) {
            clearTimeout(this.timeoutId);
          }
          
          // 如果两次更新之间的间隔超过10秒，则认为可能存在问题
          const now = Date.now();
          if (now - lastUpdate > 10000) {
            console.warn('AI响应间隔过长，可能存在连接问题');
          }
          
          lastUpdate = now;
          
          // 设置新的超时
          this.timeoutId = setTimeout(() => {
            if (this.controller) {
              this.controller.abort();
            }
          }, 30000);
          
          // 调用原始回调
          aiRequest.callback!(token);
        };
        
        // 执行流式请求
        result = await aiServiceManager.createChatCompletionStream(
          aiRequest.request,
          wrappedCallback,
          aiRequest.scenario
        );
      } else {
        // 执行普通请求
        result = await aiServiceManager.createChatCompletion(
          aiRequest.request,
          aiRequest.scenario
        );
      }
      
      this.clearTimeoutAndController();
      return result;
    } catch (error: any) {
      // 如果错误是由于超时导致的，使用更友好的错误信息
      if (error.name === 'AbortError') {
        throw new Error('AI响应超时，请稍后重试');
      }
      
      // 根据错误类型决定是否需要重试
      if (this.shouldRetry(error)) {
        return this.retryRequest(aiRequest);
      }
      
      throw error;
    }
  }
  
  /**
   * 清理超时计时器和控制器
   */
  private clearTimeoutAndController() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    this.controller = null;
  }
  
  /**
   * 判断是否应该重试请求
   * @param error 错误对象
   */
  private shouldRetry(error: AIError): boolean {
    // 服务器错误(5xx)可以重试
    if (error.status && error.status >= 500) {
      return true;
    }
    
    // 网络错误可以重试
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND' ||
        error.message?.includes('network')) {
      return true;
    }
    
    // 速率限制(429)可以重试，但需要延迟更长时间
    if (error.status === 429) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 重试请求
   * @param request 请求对象
   */
  private async retryRequest(aiRequest: AIRequest, maxRetries: number = 3): Promise<ChatCompletionResponse> {
    let retries = 0;
    let lastError: AIError | null = null;
    
    while (retries < maxRetries) {
      try {
        retries++;
        console.log(`AI请求失败，正在进行第${retries}次重试`);
        
        // 根据重试次数增加等待时间
        const delay = Math.min(1000 * Math.pow(2, retries), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // 重新创建控制器
        this.controller = new AbortController();
        
        if (aiRequest.stream && aiRequest.callback) {
          return await aiServiceManager.createChatCompletionStream(
            aiRequest.request,
            aiRequest.callback,
            aiRequest.scenario
          );
        } else {
          return await aiServiceManager.createChatCompletion(
            aiRequest.request,
            aiRequest.scenario
          );
        }
      } catch (error: any) {
        lastError = error;
        
        // 如果是不应该重试的错误，直接抛出
        if (!this.shouldRetry(error)) {
          throw error;
        }
        
        // 最后一次重试失败，抛出错误
        if (retries >= maxRetries) {
          throw new Error(`AI请求失败，已重试${maxRetries}次: ${error.message}`);
        }
      }
    }
    
    // 确保有错误对象可以抛出
    throw lastError || new Error('未知错误导致AI请求失败');
  }
  
  /**
   * 取消所有请求
   */
  cancelAll(): void {
    if (this.controller) {
      this.controller.abort();
    }
    
    // 拒绝所有排队的请求
    while (this.queue.length > 0) {
      const { reject } = this.queue.shift()!;
      reject(new Error('请求已取消'));
    }
    
    this.processing = false;
  }
  
  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
  }
}

// 导出单例实例
export const aiRequestQueue = new AIRequestQueue();
export default aiRequestQueue; 