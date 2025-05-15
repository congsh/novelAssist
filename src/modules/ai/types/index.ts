/**
 * AI提供商类型枚举
 */
export enum AIProviderType {
  OPENAI = 'openai',
  DEEPSEEK = 'deepseek',
  OLLAMA = 'ollama',
  LMSTUDIO = 'lmstudio',
  OPENAI_COMPATIBLE = 'openai_compatible'
}

/**
 * AI场景类型
 */
export enum AIScenario {
  CHAT = 'chat',                // 对话聊天
  NOVEL_COLLABORATION = 'novel_collaboration', // 小说协作
  CONTEXT_ENHANCEMENT = 'context_enhancement', // 上下文补充
  NOVEL_ANALYSIS = 'novel_analysis'  // 小说拆解分析
}

/**
 * AI模型类型
 */
export interface AIModel {
  id: string;
  name: string;
  providerId: string;  // 关联到提供商ID
  description?: string;
  maxTokens?: number;
  contextWindow?: number;
  capabilities?: string[];
  costPerToken?: number;  // 每千token的成本（美元）
}

/**
 * AI提供商实例
 */
export interface AIProvider {
  id: string;           // 供应商唯一ID
  name: string;         // 显示名称，可自定义
  type: AIProviderType; // 提供商类型
  apiKey?: string;      // API密钥
  baseUrl?: string;     // 基础URL (OpenAI, DeepSeek, OpenAI兼容)
  localServerUrl?: string; // 本地服务URL (Ollama, LMStudio)
  defaultModel: string; // 默认模型ID
  temperature: number;  // 默认温度
  maxTokens: number;    // 默认最大令牌数
  proxyUrl?: string;    // 代理URL
}

/**
 * AI全局设置
 */
export interface AISettings {
  activeProviderId: string;  // 当前活动的供应商ID
  providers: AIProvider[];   // 所有供应商实例
  models: AIModel[];         // 所有模型
  scenarioConfigs: Record<AIScenario, AIScenarioConfig>;  // 场景配置
}

/**
 * AI场景配置
 */
export interface AIScenarioConfig {
  enabled: boolean;           // 是否启用
  providerId: string;         // 使用的AI提供商ID
  modelId: string;            // 使用的模型ID
  temperature?: number;       // 温度
  maxTokens?: number;         // 最大token数
  systemPrompt?: string;      // 系统提示词
  costLimit?: number;         // 成本限制（美元/月）
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
  providerId: string;  // 关联的提供商ID
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
  providerId?: string;  // 指定提供商ID
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

// 为了兼容旧版本，保留AIProvider枚举别名
export const AIProvider = AIProviderType; 