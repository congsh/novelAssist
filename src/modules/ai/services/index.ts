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

// 准备添加的向量化服务 (待实现)
// import { VectorEmbeddingService } from './vector-embedding-service';
// import { VectorSearchService } from './vector-search-service';
// import { ContextEnhancementService } from './context-enhancement-service';
// import { ConsistencyCheckService } from './consistency-check-service';
export {
  aiServiceManager,
  AISettingsService,
  AIRequestQueue,
  ChatContextManager,

  // 提供商服务
  OpenAIService,
  OllamaService,
  DeepSeekService,
  LMStudioService,
  OpenAICompatibleService,

  // 聊天和编辑器服务
  ChatService,
  AIEditorService
};
  export type {
    // 基础服务
    AIBaseService
  };

// 默认导出服务管理器
export default aiServiceManager;