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

/**
 * 向量数据库类型枚举
 */
export enum VectorDBType {
  CHROMA = 'chroma',
  MILVUS = 'milvus',
  PGVECTOR = 'pgvector',
  SQLITE_VSS = 'sqlite_vss', // SQLite 向量搜索扩展
  EMBEDDED = 'embedded'      // 内置简单向量存储
}

/**
 * 向量嵌入接口
 */
export interface VectorEmbedding {
  id: string;
  vector: number[];       // 向量值
  text: string;           // 原始文本
  metadata: {             // 元数据
    sourceId: string;     // 来源ID (章节ID、角色ID等)
    sourceType: string;   // 来源类型 (chapter, character, location等)
    novelId: string;      // 关联的小说ID
    title?: string;       // 标题
    createdAt: number;    // 创建时间
    updatedAt: number;    // 更新时间
    section?: string;     // 文本在源文档中的位置/区域
    additionalContext?: any; // 其他上下文信息
  };
}

/**
 * 向量嵌入请求接口
 */
export interface EmbeddingRequest {
  text: string;            // 要嵌入的文本
  modelId: string;         // 嵌入模型ID
  metadata?: any;          // 元数据
}

/**
 * 向量嵌入响应接口
 */
export interface EmbeddingResponse {
  id: string;              // 唯一ID
  embedding: number[];     // 嵌入向量
  model: string;           // 使用的模型
  usage?: {
    promptTokens: number;  // 使用的token数
    totalTokens: number;   // 总token数
  };
}

/**
 * 向量检索请求接口
 */
export interface VectorSearchRequest {
  query: string | number[]; // 查询文本或向量
  filter?: {                // 过滤条件
    novelId?: string;       // 小说ID
    sourceType?: string[];  // 源类型
    sourceId?: string[];    // 源ID
    metadata?: Record<string, any>; // 其他元数据过滤条件
  };
  topK?: number;            // 返回的最大结果数量
  minScore?: number;        // 最小相似度分数
}

/**
 * 向量检索结果接口
 */
export interface VectorSearchResult {
  id: string;               // 向量ID
  score: number;            // 相似度分数
  text: string;             // 原始文本
  metadata: any;            // 元数据
  vector?: number[];        // 可选的向量值
}

/**
 * 上下文检索请求接口
 */
export interface ContextSearchRequest {
  query: string;            // 查询文本
  novelId: string;          // 小说ID
  sourceTypes?: string[];   // 指定搜索的源类型
  strategy?: 'hybrid' | 'vector' | 'keyword'; // 检索策略
  limit?: number;           // 返回结果数量限制
  expandContext?: boolean;  // 是否扩展上下文
}

/**
 * 上下文检索结果接口
 */
export interface ContextSearchResult {
  items: {
    id: string;            // 来源ID
    type: string;          // 来源类型
    title: string;         // 标题
    content: string;       // 内容
    relevance: number;     // 相关性分数
    novelId: string;       // 小说ID
  }[];
  summary?: string;        // 结果摘要
}

/**
 * 上下文增强请求接口
 */
export interface ContextEnhancementRequest {
  content: string;         // 原始内容
  novelId: string;         // 小说ID
  chapterId?: string;      // 章节ID
  contextTypes?: string[]; // 需要的上下文类型
  maxResults?: number;     // 每种类型的最大结果数
}

/**
 * 上下文增强响应接口
 */
export interface ContextEnhancementResponse {
  enhancedContent: string; // 增强后的内容
  appliedContext: {        // 应用的上下文
    type: string;          // 上下文类型
    items: any[];          // 上下文项
  }[];
  suggestions?: string[];  // 建议
}

/**
 * 内容一致性检查类型枚举
 */
export enum ConsistencyCheckType {
  CHARACTER = 'character',   // 人物一致性
  LOCATION = 'location',     // 地点一致性
  TIMELINE = 'timeline',     // 时间线一致性
  PLOT = 'plot',             // 情节一致性
  LOGIC = 'logic',           // 逻辑一致性
  STYLE = 'style',           // 风格一致性
  ALL = 'all'                // 全面检查
}

/**
 * 内容一致性检查请求接口
 */
export interface ConsistencyCheckRequest {
  novelId: string;           // 小说ID
  chapterId?: string;        // 章节ID，不指定则检查整本小说
  checkTypes?: ConsistencyCheckType[]; // 检查类型
  content?: string;          // 要检查的内容
}

/**
 * 内容一致性检查问题级别
 */
export enum ConsistencyIssueLevel {
  INFO = 'info',           // 信息提示
  WARNING = 'warning',     // 警告提示
  ERROR = 'error'          // 错误提示
}

/**
 * 内容一致性问题接口
 */
export interface ConsistencyIssue {
  id: string;              // 问题ID
  type: ConsistencyCheckType; // 问题类型
  level: ConsistencyIssueLevel; // 问题级别
  description: string;     // 问题描述
  context: string;         // 问题上下文
  position?: {             // 问题位置
    chapterId: string;     // 章节ID
    startOffset: number;   // 开始偏移
    endOffset: number;     // 结束偏移
  };
  relatedEntities?: {      // 相关实体
    id: string;            // 实体ID
    type: string;          // 实体类型
    name: string;          // 实体名称
  }[];
  suggestion?: string;     // 修改建议
}

/**
 * 内容一致性检查响应接口
 */
export interface ConsistencyCheckResponse {
  issues: ConsistencyIssue[]; // 发现的问题
  summary: {                  // 问题摘要
    total: number;            // 总问题数
    byLevel: {                // 按级别统计
      info: number;           // 信息数量
      warning: number;        // 警告数量
      error: number;          // 错误数量
    };
    byType: {                 // 按类型统计
      [key in ConsistencyCheckType]?: number;
    };
  };
  status: 'success' | 'error' | 'partial'; // 检查状态
  message?: string;          // 状态消息
} 