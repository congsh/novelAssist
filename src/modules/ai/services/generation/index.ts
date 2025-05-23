/**
 * 内容生成模块
 * 提供文本生成、差异比较和内容修改功能
 */

// 导出生成服务
export { AIEditorService } from '../ai-editor-service';
export { ChatService } from '../chat-service';

// 准备添加的服务
// export { TextGenerationService } from './text-generation-service';
// export { DiffComparisonService } from './diff-comparison-service';
// export { ContentModificationService } from './content-modification-service';

// 导出生成服务类型
export type { 
  EditorAIActionType,
  EditorAIRequest,
  EditorAIResponse,
  TextDiff,
  AIEditHistory,
  ChatMessage,
  ChatSession,
  ChatCompletionRequest,
  ChatCompletionResponse
} from '../../types'; 