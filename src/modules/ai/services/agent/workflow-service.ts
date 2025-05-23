/**
 * 工作流服务
 * 提供工作流模板管理和工作流执行功能
 */
import { v4 as uuidv4 } from 'uuid';
import { 
  WorkflowTemplate,
  WorkflowInstance,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowEdge
} from '../../types';

/**
 * 工作流服务类
 * 负责工作流模板管理和工作流实例执行
 */
export class WorkflowService {
  private static instance: WorkflowService;
  private templates: Map<string, WorkflowTemplate> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();
  
  /**
   * 获取单例实例
   */
  public static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }
  
  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {
    // 初始化工作流服务
  }
  
  /**
   * 初始化服务
   */
  public async initialize(): Promise<boolean> {
    try {
      // 加载系统预设模板
      await this.loadSystemTemplates();
      // 加载用户自定义模板
      await this.loadUserTemplates();
      return true;
    } catch (error) {
      console.error('[WorkflowService] 初始化失败:', error);
      return false;
    }
  }
  
  /**
   * 加载系统预设模板
   */
  private async loadSystemTemplates(): Promise<void> {
    // 这里应该从配置文件或数据库加载系统预设模板
    // 暂时添加一个示例模板
    const exampleTemplate: WorkflowTemplate = {
      id: 'system-template-1',
      name: '基础编辑工作流',
      description: '使用编辑Agent和风格Agent进行内容优化',
      workflowDefinition: {
        nodes: [
          {
            id: 'start',
            type: WorkflowNodeType.START,
            label: '开始',
            data: {},
            position: { x: 100, y: 100 }
          },
          {
            id: 'editor-agent',
            type: WorkflowNodeType.AGENT,
            label: '编辑Agent',
            data: { agentConfigId: 'editor-agent-1' },
            position: { x: 300, y: 100 }
          },
          {
            id: 'user-review',
            type: WorkflowNodeType.USER_REVIEW,
            label: '用户审核',
            data: { userPrompt: '请审核编辑Agent的修改' },
            position: { x: 500, y: 100 }
          },
          {
            id: 'style-agent',
            type: WorkflowNodeType.AGENT,
            label: '风格Agent',
            data: { agentConfigId: 'style-agent-1' },
            position: { x: 700, y: 100 }
          },
          {
            id: 'end',
            type: WorkflowNodeType.END,
            label: '结束',
            data: {},
            position: { x: 900, y: 100 }
          }
        ],
        edges: [
          {
            id: 'e1',
            source: 'start',
            target: 'editor-agent'
          },
          {
            id: 'e2',
            source: 'editor-agent',
            target: 'user-review'
          },
          {
            id: 'e3',
            source: 'user-review',
            target: 'style-agent'
          },
          {
            id: 'e4',
            source: 'style-agent',
            target: 'end'
          }
        ]
      },
      category: '编辑',
      tags: ['编辑', '风格', '优化'],
      usageCount: 0,
      rating: 5,
      isSystem: true,
      metadata: {}
    };
    
    this.templates.set(exampleTemplate.id, exampleTemplate);
  }
  
  /**
   * 加载用户自定义模板
   */
  private async loadUserTemplates(): Promise<void> {
    // 这里应该从数据库加载用户自定义模板
    // 暂时不添加任何模板
  }
  
  /**
   * 获取所有模板
   */
  public getTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * 获取模板
   * @param templateId 模板ID
   */
  public getTemplate(templateId: string): WorkflowTemplate | undefined {
    return this.templates.get(templateId);
  }
  
  /**
   * 创建模板
   * @param template 模板数据
   */
  public createTemplate(template: Omit<WorkflowTemplate, 'id'>): WorkflowTemplate {
    const id = uuidv4();
    const newTemplate: WorkflowTemplate = {
      ...template,
      id,
      usageCount: 0,
      rating: 0,
      isSystem: false
    };
    
    this.templates.set(id, newTemplate);
    return newTemplate;
  }
  
  /**
   * 更新模板
   * @param templateId 模板ID
   * @param updates 更新数据
   */
  public updateTemplate(
    templateId: string,
    updates: Partial<WorkflowTemplate>
  ): WorkflowTemplate | undefined {
    const template = this.templates.get(templateId);
    
    if (!template) {
      return undefined;
    }
    
    // 系统模板不允许修改
    if (template.isSystem) {
      throw new Error('系统模板不允许修改');
    }
    
    const updatedTemplate = {
      ...template,
      ...updates
    };
    
    this.templates.set(templateId, updatedTemplate);
    return updatedTemplate;
  }
  
  /**
   * 删除模板
   * @param templateId 模板ID
   */
  public deleteTemplate(templateId: string): boolean {
    const template = this.templates.get(templateId);
    
    if (!template) {
      return false;
    }
    
    // 系统模板不允许删除
    if (template.isSystem) {
      throw new Error('系统模板不允许删除');
    }
    
    return this.templates.delete(templateId);
  }
  
  /**
   * 创建工作流实例
   * @param templateId 模板ID
   * @param novelId 小说ID
   * @param name 实例名称
   */
  public createInstance(
    templateId: string,
    novelId: string,
    name: string
  ): WorkflowInstance | undefined {
    const template = this.templates.get(templateId);
    
    if (!template) {
      return undefined;
    }
    
    // 增加模板使用次数
    template.usageCount += 1;
    this.templates.set(templateId, template);
    
    const id = uuidv4();
    const instance: WorkflowInstance = {
      id,
      templateId,
      novelId,
      name,
      status: 'pending',
      workflowData: {
        nodes: [...template.workflowDefinition.nodes],
        edges: [...template.workflowDefinition.edges],
        variables: {}
      },
      executionHistory: [],
      metadata: {}
    };
    
    this.instances.set(id, instance);
    return instance;
  }
  
  /**
   * 获取工作流实例
   * @param instanceId 实例ID
   */
  public getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }
  
  /**
   * 获取小说的所有工作流实例
   * @param novelId 小说ID
   */
  public getNovelInstances(novelId: string): WorkflowInstance[] {
    return Array.from(this.instances.values())
      .filter(instance => instance.novelId === novelId);
  }
  
  /**
   * 执行工作流实例
   * @param instanceId 实例ID
   */
  public async executeWorkflow(instanceId: string): Promise<WorkflowInstance | undefined> {
    const instance = this.instances.get(instanceId);
    
    if (!instance) {
      return undefined;
    }
    
    // 更新状态为运行中
    const updatedInstance = {
      ...instance,
      status: 'running' as const
    };
    
    this.instances.set(instanceId, updatedInstance);
    
    try {
      // 查找开始节点
      const startNode = updatedInstance.workflowData.nodes.find(
        node => node.type === WorkflowNodeType.START
      );
      
      if (!startNode) {
        throw new Error('工作流缺少开始节点');
      }
      
      // 开始执行工作流
      return await this.executeNode(updatedInstance, startNode.id);
    } catch (error) {
      // 更新状态为错误
      const errorInstance = {
        ...updatedInstance,
        status: 'error' as const,
        errorMessage: (error as Error).message
      };
      
      this.instances.set(instanceId, errorInstance);
      return errorInstance;
    }
  }
  
  /**
   * 执行节点
   * @param instance 工作流实例
   * @param nodeId 节点ID
   */
  private async executeNode(
    instance: WorkflowInstance,
    nodeId: string
  ): Promise<WorkflowInstance> {
    // 这里应该实现节点执行逻辑
    // 暂时只更新当前节点和执行历史
    const updatedInstance = {
      ...instance,
      currentNode: nodeId,
      executionHistory: [
        ...instance.executionHistory,
        {
          timestamp: Date.now(),
          nodeId,
          status: 'started'
        }
      ]
    };
    
    this.instances.set(instance.id, updatedInstance);
    
    // 模拟节点执行
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 更新执行历史
    const completedInstance = {
      ...updatedInstance,
      executionHistory: [
        ...updatedInstance.executionHistory,
        {
          timestamp: Date.now(),
          nodeId,
          status: 'completed'
        }
      ]
    };
    
    this.instances.set(instance.id, completedInstance);
    
    // 查找下一个节点
    const nextNodeIds = this.findNextNodes(completedInstance, nodeId);
    
    if (nextNodeIds.length === 0) {
      // 没有下一个节点，工作流结束
      const finishedInstance = {
        ...completedInstance,
        status: 'completed' as const
      };
      
      this.instances.set(instance.id, finishedInstance);
      return finishedInstance;
    }
    
    // 执行下一个节点
    // 暂时只支持单一路径，取第一个节点
    return this.executeNode(completedInstance, nextNodeIds[0]);
  }
  
  /**
   * 查找下一个节点
   * @param instance 工作流实例
   * @param nodeId 当前节点ID
   */
  private findNextNodes(instance: WorkflowInstance, nodeId: string): string[] {
    const outgoingEdges = instance.workflowData.edges.filter(
      edge => edge.source === nodeId
    );
    
    return outgoingEdges.map(edge => edge.target);
  }
  
  /**
   * 暂停工作流实例
   * @param instanceId 实例ID
   */
  public pauseWorkflow(instanceId: string): WorkflowInstance | undefined {
    const instance = this.instances.get(instanceId);
    
    if (!instance || instance.status !== 'running') {
      return undefined;
    }
    
    const pausedInstance = {
      ...instance,
      status: 'paused' as const
    };
    
    this.instances.set(instanceId, pausedInstance);
    return pausedInstance;
  }
  
  /**
   * 恢复工作流实例
   * @param instanceId 实例ID
   */
  public resumeWorkflow(instanceId: string): Promise<WorkflowInstance | undefined> {
    const instance = this.instances.get(instanceId);
    
    if (!instance || instance.status !== 'paused' || !instance.currentNode) {
      return Promise.resolve(undefined);
    }
    
    const resumedInstance = {
      ...instance,
      status: 'running' as const
    };
    
    this.instances.set(instanceId, resumedInstance);
    return this.executeNode(resumedInstance, instance.currentNode);
  }
  
  /**
   * 保存工作流实例
   * @param instance 工作流实例
   */
  private async saveInstance(instance: WorkflowInstance): Promise<void> {
    // 这里应该实现实例的持久化存储
    // 暂时只更新内存中的实例
    this.instances.set(instance.id, instance);
  }
} 