/**
 * AI提供商类型
 */
export enum AIProvider {
  OPENAI = 'openai',
  DEEPSEEK = 'deepseek',
  OLLAMA = 'ollama',
  LMSTUDIO = 'lmstudio',
  OPENAI_COMPATIBLE = 'openai_compatible'
}

/**
 * AI模型类型
 */
export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  description?: string;
  maxTokens?: number;
  contextWindow?: number;
  capabilities?: string[];
}

/**
 * AI设置接口
 */
export interface AISettings {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  models: AIModel[];
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  proxyUrl?: string;
  localServerUrl?: string;
}

/**
 * AI消息类型
 */
export enum ChatMessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant'
}

/**
 * AI聊天消息接口
 */
export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
}

/**
 * AI会话接口
 */
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  modelId: string;
  novelId?: string;
}

/**
 * 聊天完成请求接口
 */
export interface ChatCompletionRequest {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}

/**
 * 聊天完成响应接口
 */
export interface ChatCompletionResponse {
  id: string;
  message: ChatMessage;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 创作提示类型
 */
export interface CreativePrompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
} 