import { AIProviderType } from '../types';
import { AIBaseService } from './ai-base-service';
import aiServiceManager from './ai-service-manager';
import { OpenAIService } from './openai-service';
import { DeepSeekService } from './deepseek-service';
import { OllamaService } from './ollama-service';
import { LMStudioService } from './lmstudio-service';
import { OpenAICompatibleService } from './openai-compatible-service';
import { chatService } from './chat-service';
import { AISettingsService } from './ai-settings-service';

// 注册所有AI服务
aiServiceManager.registerService(AIProviderType.OPENAI, new OpenAIService());
aiServiceManager.registerService(AIProviderType.DEEPSEEK, new DeepSeekService());
aiServiceManager.registerService(AIProviderType.OLLAMA, new OllamaService());
aiServiceManager.registerService(AIProviderType.LMSTUDIO, new LMStudioService());
aiServiceManager.registerService(AIProviderType.OPENAI_COMPATIBLE, new OpenAICompatibleService());

export {
  aiServiceManager,
  chatService,
  AISettingsService
};

export * from './ai-base-service';
export * from './openai-service';
export * from './deepseek-service';
export * from './ollama-service';
export * from './lmstudio-service';
export * from './openai-compatible-service'; 