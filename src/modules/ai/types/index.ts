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

/**
 * 编辑器AI操作类型
 */
export enum EditorAIActionType {
  POLISH = 'polish',         // 润色文本
  CONTINUE = 'continue',     // 续写文本
  EXTRACT_CHARACTER = 'extract_character', // 提取角色
  EXTRACT_LOCATION = 'extract_location',   // 提取地点
  UPDATE_OUTLINE = 'update_outline',       // 更新大纲
  ADD_TIMELINE = 'add_timeline',           // 添加时间线
}

/**
 * 编辑器AI操作请求
 */
export interface EditorAIRequest {
  actionType: EditorAIActionType;
  content: string;           // 当前内容
  selection?: string;        // 选中的文本
  cursorPosition?: number;   // 光标位置
  chapterId: string;         // 章节ID
  novelId: string;           // 小说ID
  context?: {                // 上下文信息
    title?: string;          // 章节标题
    previousContent?: string; // 前一章节内容
    outline?: any;           // 相关大纲
    characters?: any[];      // 相关角色
    locations?: any[];       // 相关地点
  };
  instructions?: string;     // 用户特定指令
}

/**
 * 编辑器AI操作响应
 */
export interface EditorAIResponse {
  actionType: EditorAIActionType;
  originalContent: string;   // 原始内容
  modifiedContent?: string;  // 修改后的内容
  diff?: TextDiff[];         // 文本差异
  extractedData?: any;       // 提取的数据（角色、地点等）
  message?: string;          // 操作消息
  status: 'success' | 'error' | 'pending'; // 操作状态
  error?: string;            // 错误信息
}

/**
 * 文本差异项
 */
export interface TextDiff {
  type: 'insert' | 'delete' | 'equal'; // 差异类型
  value: string;                       // 差异值
  position: number;                    // 在原文中的位置
}

/**
 * AI编辑历史记录
 */
export interface AIEditHistory {
  id: string;
  chapterId: string;
  novelId: string;
  actionType: EditorAIActionType;
  originalContent: string;
  modifiedContent: string;
  appliedContent?: string;  // 最终应用的内容
  timestamp: number;
  userId?: string;
  status: 'applied' | 'rejected' | 'modified';
} 