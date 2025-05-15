// 导出AI模块的所有组件、服务和类型

// 导出类型
export * from './types';

// 导出服务
export { default as aiServiceManager } from './services/ai-service-manager';
export { AIEditorService } from './services/ai-editor-service';

// 创建编辑器AI服务实例
import { AIEditorService } from './services/ai-editor-service';
const aiEditorService = new AIEditorService();
export { aiEditorService }; 