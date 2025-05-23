/**
 * Agent系统模块
 * 提供Agent框架、预设Agent和工作链系统
 */

// 准备添加的服务
// export { AgentBaseService } from './agent-base-service';
// export { AgentManager } from './agent-manager';
// export { WorkflowService } from './workflow-service';
// export { EditorAgent } from './agents/editor-agent';
// export { StyleAgent } from './agents/style-agent';
// export { CharacterAgent } from './agents/character-agent';
// export { ContinuationAgent } from './agents/continuation-agent';
// export { ReaderAgent } from './agents/reader-agent';

// 导出Agent系统类型
export type { 
  AgentType,
  AgentCapability,
  AgentConfig,
  AgentSession,
  WorkflowNodeType,
  WorkflowNode,
  WorkflowEdge,
  WorkflowTemplate,
  WorkflowInstance,
  ContextTemplate
} from '../../types'; 