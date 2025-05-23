/**
 * Agent基础服务
 * 提供Agent系统的基础功能和接口
 */
import { v4 as uuidv4 } from 'uuid';
import { 
  AgentType, 
  AgentConfig, 
  AgentSession,
  AgentCapability
} from '../../types';

/**
 * Agent基础服务抽象类
 * 所有Agent实现都应继承此类
 */
export abstract class AgentBaseService {
  protected config: AgentConfig;
  
  /**
   * 构造函数
   * @param config Agent配置
   */
  constructor(config: AgentConfig) {
    this.config = config;
  }
  
  /**
   * 获取Agent配置
   */
  public getConfig(): AgentConfig {
    return this.config;
  }
  
  /**
   * 获取Agent类型
   */
  public getType(): AgentType {
    return this.config.agentType;
  }
  
  /**
   * 检查Agent是否具有指定能力
   * @param capability 要检查的能力
   */
  public hasCapability(capability: AgentCapability): boolean {
    return this.config.capabilities.includes(capability);
  }
  
  /**
   * 创建新的Agent会话
   * @param novelId 小说ID
   * @param title 会话标题
   * @param initialContext 初始上下文
   */
  public createSession(
    novelId: string,
    title: string,
    initialContext?: Partial<AgentSession['context']>
  ): AgentSession {
    const now = Date.now();
    
    return {
      id: uuidv4(),
      agentConfigId: this.config.id,
      novelId,
      title,
      status: 'active',
      context: {
        task: '',
        inputs: {},
        references: [],
        ...(initialContext || {})
      },
      history: [
        {
          timestamp: now,
          type: 'info',
          content: `会话已创建，使用Agent: ${this.config.name}`
        }
      ],
      results: {
        outputs: {}
      },
      metrics: {
        startTime: now
      }
    };
  }
  
  /**
   * 执行Agent任务
   * @param session Agent会话
   * @param task 任务描述
   * @param inputs 输入数据
   */
  public abstract executeTask(
    session: AgentSession,
    task: string,
    inputs: Record<string, any>
  ): Promise<AgentSession>;
  
  /**
   * 中止Agent任务
   * @param session Agent会话
   */
  public abstract stopTask(session: AgentSession): Promise<AgentSession>;
  
  /**
   * 保存Agent会话
   * @param session Agent会话
   */
  protected async saveSession(session: AgentSession): Promise<AgentSession> {
    // 这里应该实现会话的持久化存储
    // 暂时只返回会话对象
    return session;
  }
  
  /**
   * 更新Agent会话
   * @param session Agent会话
   * @param updates 更新内容
   */
  protected updateSession(
    session: AgentSession,
    updates: Partial<AgentSession>
  ): AgentSession {
    return {
      ...session,
      ...updates
    };
  }
  
  /**
   * 添加会话历史记录
   * @param session Agent会话
   * @param type 记录类型
   * @param content 记录内容
   */
  protected addHistory(
    session: AgentSession,
    type: AgentSession['history'][0]['type'],
    content: any
  ): AgentSession {
    const history = [
      ...session.history,
      {
        timestamp: Date.now(),
        type,
        content
      }
    ];
    
    return {
      ...session,
      history
    };
  }
  
  /**
   * 设置会话结果
   * @param session Agent会话
   * @param outputs 输出数据
   * @param summary 摘要
   * @param recommendations 建议
   */
  protected setResults(
    session: AgentSession,
    outputs: Record<string, any>,
    summary?: string,
    recommendations?: string[]
  ): AgentSession {
    return {
      ...session,
      results: {
        outputs,
        summary,
        recommendations
      }
    };
  }
  
  /**
   * 完成会话
   * @param session Agent会话
   */
  protected completeSession(session: AgentSession): AgentSession {
    const now = Date.now();
    const startTime = session.metrics?.startTime || now;
    
    return {
      ...session,
      status: 'completed',
      metrics: {
        startTime,
        ...session.metrics,
        endTime: now
      }
    };
  }
  
  /**
   * 设置会话错误
   * @param session Agent会话
   * @param error 错误信息
   */
  protected setError(session: AgentSession, error: string): AgentSession {
    return this.addHistory(
      {
        ...session,
        status: 'error'
      },
      'error',
      error
    );
  }
} 