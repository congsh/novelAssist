// 导出所有AI服务

// 基础服务
import { AIBaseService } from './ai-base-service';
import { aiServiceManager } from './ai-service-manager';
import { AISettingsService } from './ai-settings-service';
import { AIRequestQueue } from './ai-request-queue';
import { ChatContextManager } from './chat-context-manager';

// 提供商服务
import { OpenAIService } from './openai-service';
import { OllamaService } from './ollama-service';
import { DeepSeekService } from './deepseek-service';
import { LMStudioService } from './lmstudio-service';
import { OpenAICompatibleService } from './openai-compatible-service';
import { ChatService } from './chat-service';
import { AIEditorService } from './ai-editor-service';
import { ConsistencyCheckService } from './consistency-check-service';
import { ContextSearchService } from './context-search-service';
import { VectorEmbeddingService } from './vector-embedding-service';
import { EntityVectorService } from './entity-vector-service';
import { AIProviderType } from '../types';

// 准备添加的向量化服务 (待实现)
// import { VectorSearchService } from './vector-search-service';
// import { ContextEnhancementService } from './context-enhancement-service';

// 获取单例实例
const aiRequestQueue = new AIRequestQueue();
const aiSettingsService = AISettingsService.getInstance();
const chatContextManager = new ChatContextManager();

// 创建服务实例
const openAIService = new OpenAIService();
const ollamaService = new OllamaService();
const deepSeekService = new DeepSeekService();
const lmStudioService = new LMStudioService();
const openAICompatibleService = new OpenAICompatibleService();

// 注册服务到服务管理器
aiServiceManager.registerService(AIProviderType.OPENAI, openAIService);
aiServiceManager.registerService(AIProviderType.OLLAMA, ollamaService);
aiServiceManager.registerService(AIProviderType.DEEPSEEK, deepSeekService);
aiServiceManager.registerService(AIProviderType.LMSTUDIO, lmStudioService);
aiServiceManager.registerService(AIProviderType.OPENAI_COMPATIBLE, openAICompatibleService);

const vectorEmbeddingService = new VectorEmbeddingService(aiServiceManager, aiRequestQueue);
const entityVectorService = new EntityVectorService(vectorEmbeddingService);

// 创建依赖于其他服务的服务实例
const chatService = ChatService.getInstance();
const aiEditorService = new AIEditorService();
const consistencyCheckService = new ConsistencyCheckService(aiServiceManager, chatService);
const contextSearchService = new ContextSearchService(aiServiceManager, vectorEmbeddingService, chatService);

// 初始化依赖服务
const initializeAIServices = async () => {
  const settings = await aiSettingsService.loadSettings();
  
  // 初始化服务
  if (settings) {
    await aiServiceManager.initialize(settings);
    await vectorEmbeddingService.initialize(settings);
    await chatService.initialize();
    await contextSearchService.initialize();
  }
  
  return !!settings;
};

export {
  aiServiceManager,
  aiRequestQueue,
  aiSettingsService,
  chatContextManager,
  chatService,
  aiEditorService,
  vectorEmbeddingService,
  entityVectorService,
  consistencyCheckService,
  contextSearchService,
  initializeAIServices
};
export type {
  // 基础服务
  AIBaseService
};

// 默认导出服务管理器
export default aiServiceManager;