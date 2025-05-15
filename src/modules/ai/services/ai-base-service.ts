import { 
  AIModel, 
  AISettings, 
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage
} from '../types';

/**
 * AI服务基础接口
 */
export interface AIBaseService {
  /**
   * 初始化AI服务
   * @param settings AI设置
   */
  initialize(settings: AISettings): Promise<boolean>;
  
  /**
   * 获取可用的AI模型列表
   */
  getAvailableModels(): Promise<AIModel[]>;
  
  /**
   * 发送聊天完成请求
   * @param request 聊天完成请求
   */
  createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  
  /**
   * 以流的方式发送聊天完成请求
   * @param request 聊天完成请求
   * @param callback 接收部分响应的回调函数
   */
  createChatCompletionStream(
    request: ChatCompletionRequest, 
    callback: (partialResponse: ChatMessage) => void
  ): Promise<ChatCompletionResponse>;
  
  /**
   * 取消正在进行的请求
   */
  cancelRequest(): void;
  
  /**
   * 测试API连接
   */
  testConnection(): Promise<boolean>;
} 