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
  provider: AIProvider;
  description?: string;
  maxTokens?: number;
  contextWindow?: number;
  capabilities?: string[];
  costPerToken?: number;  // 每千token的成本（美元）
}

/**
 * AI设置接口
 */
export interface AISettings {
  id?: string;           // 配置ID，用于多配置管理
  name?: string;         // 配置名称，用于显示
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  models: AIModel[];
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  proxyUrl?: string;
  localServerUrl?: string;
  scenarioConfigs?: Record<AIScenario, AIScenarioConfig>;  // 不同场景的配置
}

/**
 * AI场景配置
 */
export interface AIScenarioConfig {
  enabled: boolean;           // 是否启用
  providerId: AIProvider;     // 使用的AI提供商
  modelId: string;            // 使用的模型ID
  temperature?: number;       // 温度（可选，覆盖全局设置）
  maxTokens?: number;         // 最大token数（可选，覆盖全局设置）
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