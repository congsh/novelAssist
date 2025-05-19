import { v4 as uuidv4 } from 'uuid';
import { 
  ConsistencyCheckRequest, 
  ConsistencyCheckResponse, 
  ConsistencyCheckType,
  ConsistencyIssue, 
  ConsistencyIssueLevel,
  ChatCompletionRequest,
  ChatMessageRole,
  ChatCompletionResponse
} from '../types';
import { aiServiceManager } from './ai-service-manager';
import { ChatService } from './chat-service';

/**
 * 内容一致性检查服务
 * 提供小说内容一致性检查功能，帮助作者发现潜在的问题和矛盾
 */
export class ConsistencyCheckService {
  private serviceManager: typeof aiServiceManager;
  private chatService: ChatService;
  
  constructor(serviceManager: typeof aiServiceManager, chatService: ChatService) {
    this.serviceManager = serviceManager;
    this.chatService = chatService;
  }
  
  /**
   * 执行内容一致性检查
   * @param request 一致性检查请求
   * @returns 一致性检查结果
   */
  public async checkConsistency(request: ConsistencyCheckRequest): Promise<ConsistencyCheckResponse> {
    try {
      // 确定要检查的类型
      const checkTypes = request.checkTypes || [ConsistencyCheckType.ALL];
      
      // 收集检查结果
      const allIssues: ConsistencyIssue[] = [];
      let status: 'success' | 'error' | 'partial' = 'success';
      
      // 对每种类型执行检查
      for (const checkType of checkTypes) {
        try {
          const issues = await this.performCheck(request, checkType);
          allIssues.push(...issues);
        } catch (error) {
          console.error(`[ConsistencyCheckService] ${checkType} 检查失败:`, error);
          status = 'partial';
        }
      }
      
      // 创建摘要统计
      const summary = this.createSummary(allIssues);
      
      return {
        issues: allIssues,
        summary,
        status,
        message: status === 'success' 
          ? '一致性检查完成' 
          : '部分检查项未能完成，结果可能不完整'
      };
    } catch (error) {
      console.error('[ConsistencyCheckService] 一致性检查失败:', error);
      return {
        issues: [],
        summary: {
          total: 0,
          byLevel: { info: 0, warning: 0, error: 0 },
          byType: {}
        },
        status: 'error',
        message: `一致性检查失败: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * 执行特定类型的一致性检查
   * @param request 一致性检查请求
   * @param checkType 检查类型
   * @returns 发现的问题列表
   */
  private async performCheck(
    request: ConsistencyCheckRequest, 
    checkType: ConsistencyCheckType
  ): Promise<ConsistencyIssue[]> {
    // 根据检查类型选择不同的检查方法
    switch (checkType) {
      case ConsistencyCheckType.CHARACTER:
        return this.checkCharacterConsistency(request);
        
      case ConsistencyCheckType.LOCATION:
        return this.checkLocationConsistency(request);
        
      case ConsistencyCheckType.TIMELINE:
        return this.checkTimelineConsistency(request);
        
      case ConsistencyCheckType.PLOT:
        return this.checkPlotConsistency(request);
        
      case ConsistencyCheckType.LOGIC:
        return this.checkLogicConsistency(request);
        
      case ConsistencyCheckType.STYLE:
        return this.checkStyleConsistency(request);
        
      case ConsistencyCheckType.ALL:
        // 对于ALL类型，跳过此处检查，因为外部循环会分别检查所有类型
        return [];
        
      default:
        throw new Error(`不支持的检查类型: ${checkType}`);
    }
  }
  
  /**
   * 检查人物一致性
   * @param request 一致性检查请求
   */
  private async checkCharacterConsistency(request: ConsistencyCheckRequest): Promise<ConsistencyIssue[]> {
    // 获取小说相关的人物信息
    const characters = await this.fetchCharacterData(request.novelId);
    
    // 获取待检查的内容
    const content = request.content || await this.fetchContent(request);
    
    // 如果没有人物信息或内容，无法进行检查
    if (!characters.length || !content) {
      return [];
    }
    
    // 使用AI进行人物一致性检查
    const prompt = this.createCharacterCheckPrompt(content, characters);
    const issues = await this.analyzeWithAI(prompt, ConsistencyCheckType.CHARACTER, request);
    
    return issues;
  }
  
  /**
   * 检查地点一致性
   * @param request 一致性检查请求
   */
  private async checkLocationConsistency(request: ConsistencyCheckRequest): Promise<ConsistencyIssue[]> {
    // 获取小说相关的地点信息
    const locations = await this.fetchLocationData(request.novelId);
    
    // 获取待检查的内容
    const content = request.content || await this.fetchContent(request);
    
    // 如果没有地点信息或内容，无法进行检查
    if (!locations.length || !content) {
      return [];
    }
    
    // 使用AI进行地点一致性检查
    const prompt = this.createLocationCheckPrompt(content, locations);
    const issues = await this.analyzeWithAI(prompt, ConsistencyCheckType.LOCATION, request);
    
    return issues;
  }
  
  /**
   * 检查时间线一致性
   * @param request 一致性检查请求
   */
  private async checkTimelineConsistency(request: ConsistencyCheckRequest): Promise<ConsistencyIssue[]> {
    // 获取小说相关的时间线信息
    const timelineEvents = await this.fetchTimelineData(request.novelId);
    
    // 获取待检查的内容
    const content = request.content || await this.fetchContent(request);
    
    // 如果没有时间线信息或内容，无法进行检查
    if (!timelineEvents.length || !content) {
      return [];
    }
    
    // 使用AI进行时间线一致性检查
    const prompt = this.createTimelineCheckPrompt(content, timelineEvents);
    const issues = await this.analyzeWithAI(prompt, ConsistencyCheckType.TIMELINE, request);
    
    return issues;
  }
  
  /**
   * 检查情节一致性
   * @param request 一致性检查请求
   */
  private async checkPlotConsistency(request: ConsistencyCheckRequest): Promise<ConsistencyIssue[]> {
    // 获取小说大纲信息
    const outline = await this.fetchOutlineData(request.novelId);
    
    // 获取待检查的内容
    const content = request.content || await this.fetchContent(request);
    
    // 如果没有大纲信息或内容，无法进行检查
    if (!outline || !content) {
      return [];
    }
    
    // 使用AI进行情节一致性检查
    const prompt = this.createPlotCheckPrompt(content, outline);
    const issues = await this.analyzeWithAI(prompt, ConsistencyCheckType.PLOT, request);
    
    return issues;
  }
  
  /**
   * 检查逻辑一致性
   * @param request 一致性检查请求
   */
  private async checkLogicConsistency(request: ConsistencyCheckRequest): Promise<ConsistencyIssue[]> {
    // 获取待检查的内容
    const content = request.content || await this.fetchContent(request);
    
    if (!content) {
      return [];
    }
    
    // 使用AI进行逻辑一致性检查
    const prompt = this.createLogicCheckPrompt(content);
    const issues = await this.analyzeWithAI(prompt, ConsistencyCheckType.LOGIC, request);
    
    return issues;
  }
  
  /**
   * 检查风格一致性
   * @param request 一致性检查请求
   */
  private async checkStyleConsistency(request: ConsistencyCheckRequest): Promise<ConsistencyIssue[]> {
    // 获取待检查的内容
    const content = request.content || await this.fetchContent(request);
    
    // 获取小说的样本章节，用于风格比较
    const samples = await this.fetchSampleChapters(request.novelId, request.chapterId);
    
    if (!content || !samples) {
      return [];
    }
    
    // 使用AI进行风格一致性检查
    const prompt = this.createStyleCheckPrompt(content, samples);
    const issues = await this.analyzeWithAI(prompt, ConsistencyCheckType.STYLE, request);
    
    return issues;
  }
  
  /**
   * 使用AI分析内容并提取一致性问题
   * @param prompt 分析提示
   * @param checkType 检查类型
   * @param request 原始检查请求
   */
  private async analyzeWithAI(
    prompt: string, 
    checkType: ConsistencyCheckType,
    request: ConsistencyCheckRequest
  ): Promise<ConsistencyIssue[]> {
    try {
      // 构建AI请求
      const chatRequest: ChatCompletionRequest = {
        modelId: 'gpt-4', // 使用具有更强分析能力的模型
        messages: [
          {
            id: 'system-' + Date.now(),
            role: ChatMessageRole.SYSTEM,
            content: `你是一位专业的小说编辑和顾问，专注于检查小说内容的一致性和连贯性。你的任务是分析作者提供的内容，找出可能存在的${this.getCheckTypeDisplayName(checkType)}问题。
请以JSON格式返回分析结果，格式如下:
[
  {
    "level": "info|warning|error",
    "description": "问题描述",
    "context": "问题相关的上下文内容",
    "suggestion": "修改建议"
  }
]
只返回JSON数组，不要包含其他说明文字。如果没有发现问题，返回空数组 []。`,
            timestamp: Date.now()
          },
          {
            id: 'user-' + Date.now(),
            role: ChatMessageRole.USER,
            content: prompt,
            timestamp: Date.now()
          }
        ],
        maxTokens: 4000
      };
      
      // 先添加系统提示消息
      await this.chatService.addSystemMessage(chatRequest.messages[0].content);
      
      // 发送用户消息到AI服务并获取响应
      const response = await this.chatService.sendMessage(
        chatRequest.messages[1].content,
      );
      
      // 解析响应
      const resultText = response.message.content;
      let issues: ConsistencyIssue[] = [];
      
      try {
        // 尝试将响应解析为JSON
        const parsedResults = this.extractJsonFromText(resultText);
        
        if (Array.isArray(parsedResults)) {
          // 将解析结果转换为标准格式的问题
          issues = parsedResults.map(item => this.createIssue(item, checkType, request));
        }
      } catch (parseError) {
        console.error('[ConsistencyCheckService] 解析AI响应失败:', parseError);
        // 创建一个解析错误问题
        issues = [{
          id: uuidv4(),
          type: checkType,
          level: ConsistencyIssueLevel.INFO,
          description: '无法解析AI分析结果',
          context: resultText.slice(0, 100) + '...',
        }];
      }
      
      return issues;
    } catch (error) {
      console.error('[ConsistencyCheckService] AI分析失败:', error);
      throw new Error(`AI分析失败: ${(error as Error).message}`);
    }
  }
  
  /**
   * 从文本中提取JSON
   * @param text 可能包含JSON的文本
   */
  private extractJsonFromText(text: string): any {
    // 尝试识别JSON数组开始和结束的位置
    const startIdx = text.indexOf('[');
    const endIdx = text.lastIndexOf(']') + 1;
    
    if (startIdx >= 0 && endIdx > startIdx) {
      const jsonText = text.substring(startIdx, endIdx);
      return JSON.parse(jsonText);
    }
    
    // 如果找不到明确的数组标记，尝试直接解析整个文本
    return JSON.parse(text);
  }
  
  /**
   * 创建一致性问题对象
   * @param rawIssue 原始问题数据
   * @param checkType 检查类型
   * @param request 原始检查请求
   */
  private createIssue(
    rawIssue: any, 
    checkType: ConsistencyCheckType,
    request: ConsistencyCheckRequest
  ): ConsistencyIssue {
    return {
      id: uuidv4(),
      type: checkType,
      level: this.parseIssueLevel(rawIssue.level),
      description: rawIssue.description || '未提供描述',
      context: rawIssue.context || '',
      suggestion: rawIssue.suggestion,
      position: request.chapterId ? {
        chapterId: request.chapterId,
        startOffset: -1, // 目前无法确定具体位置
        endOffset: -1
      } : undefined,
      relatedEntities: rawIssue.relatedEntities
    };
  }
  
  /**
   * 解析问题级别
   * @param levelStr 级别字符串
   */
  private parseIssueLevel(levelStr?: string): ConsistencyIssueLevel {
    if (!levelStr) return ConsistencyIssueLevel.INFO;
    
    switch (levelStr.toLowerCase()) {
      case 'error':
        return ConsistencyIssueLevel.ERROR;
      case 'warning':
        return ConsistencyIssueLevel.WARNING;
      case 'info':
      default:
        return ConsistencyIssueLevel.INFO;
    }
  }
  
  /**
   * 创建问题摘要
   * @param issues 问题列表
   */
  private createSummary(issues: ConsistencyIssue[]): ConsistencyCheckResponse['summary'] {
    // 初始化计数器
    const byLevel = {
      info: 0,
      warning: 0,
      error: 0
    };
    
    const byType: Record<string, number> = {};
    
    // 统计问题
    issues.forEach(issue => {
      // 按级别统计
      byLevel[issue.level]++;
      
      // 按类型统计
      byType[issue.type] = (byType[issue.type] || 0) + 1;
    });
    
    return {
      total: issues.length,
      byLevel,
      byType: byType as Record<ConsistencyCheckType, number>
    };
  }
  
  /**
   * 获取检查类型的显示名称
   * @param type 检查类型
   */
  private getCheckTypeDisplayName(type: ConsistencyCheckType): string {
    switch (type) {
      case ConsistencyCheckType.CHARACTER:
        return '人物';
      case ConsistencyCheckType.LOCATION:
        return '地点';
      case ConsistencyCheckType.TIMELINE:
        return '时间线';
      case ConsistencyCheckType.PLOT:
        return '情节';
      case ConsistencyCheckType.LOGIC:
        return '逻辑';
      case ConsistencyCheckType.STYLE:
        return '风格';
      case ConsistencyCheckType.ALL:
        return '综合';
      default:
        return type;
    }
  }
  
  /**
   * 创建人物检查提示
   * @param content 内容
   * @param characters 人物数据
   */
  private createCharacterCheckPrompt(content: string, characters: any[]): string {
    const charactersInfo = characters.map(char => 
      `人物名称: ${char.name}\n特点: ${char.traits || '无'}\n背景: ${char.background || '无'}`
    ).join('\n\n');
    
    return `请检查以下内容中的人物描述是否与已定义的人物资料一致。找出任何不一致、矛盾或错误的地方。

已定义的人物资料:
${charactersInfo}

待检查内容:
${this.truncateContent(content)}

请分析内容中是否有:
1. 人物名称错误或不一致
2. 人物特点描述与资料不符
3. 人物行为与背景或性格不符
4. 人物关系描述混淆
5. 其他人物相关的一致性问题`;
  }
  
  /**
   * 创建地点检查提示
   * @param content 内容
   * @param locations 地点数据
   */
  private createLocationCheckPrompt(content: string, locations: any[]): string {
    const locationsInfo = locations.map(loc => 
      `地点名称: ${loc.name}\n描述: ${loc.description || '无'}\n特点: ${loc.features || '无'}`
    ).join('\n\n');
    
    return `请检查以下内容中的地点描述是否与已定义的地点资料一致。找出任何不一致、矛盾或错误的地方。

已定义的地点资料:
${locationsInfo}

待检查内容:
${this.truncateContent(content)}

请分析内容中是否有:
1. 地点名称错误或不一致
2. 地点描述与资料不符
3. 地点位置关系错误
4. 地点特征描述混淆
5. 其他地点相关的一致性问题`;
  }
  
  /**
   * 创建时间线检查提示
   * @param content 内容
   * @param events 时间线事件
   */
  private createTimelineCheckPrompt(content: string, events: any[]): string {
    const timelineInfo = events.map(event => 
      `事件: ${event.title}\n时间: ${event.date || '未指定'}\n描述: ${event.description || '无'}`
    ).join('\n\n');
    
    return `请检查以下内容中的时间和事件描述是否与已定义的时间线一致。找出任何不一致、矛盾或错误的地方。

已定义的时间线:
${timelineInfo}

待检查内容:
${this.truncateContent(content)}

请分析内容中是否有:
1. 事件发生顺序错误
2. 时间点描述与时间线不符
3. 事件描述与时间线中的描述冲突
4. 事件持续时间不合理
5. 其他时间相关的一致性问题`;
  }
  
  /**
   * 创建情节检查提示
   * @param content 内容
   * @param outline 大纲数据
   */
  private createPlotCheckPrompt(content: string, outline: any): string {
    const outlineText = typeof outline === 'string' 
      ? outline 
      : JSON.stringify(outline, null, 2);
    
    return `请检查以下内容的情节是否与既定大纲一致。找出任何不一致、矛盾或偏离大纲的地方。

小说大纲:
${outlineText}

待检查内容:
${this.truncateContent(content)}

请分析内容中是否有:
1. 情节发展与大纲不符
2. 关键情节点缺失
3. 添加了大纲中未提及的重要情节
4. 情节顺序错误
5. 其他情节相关的一致性问题`;
  }
  
  /**
   * 创建逻辑检查提示
   * @param content 内容
   */
  private createLogicCheckPrompt(content: string): string {
    return `请检查以下内容中是否存在逻辑问题、矛盾或不合理之处。

待检查内容:
${this.truncateContent(content)}

请分析内容中是否有:
1. 情节逻辑漏洞
2. 因果关系不明确或错误
3. 角色动机不合理或前后矛盾
4. 世界设定规则被打破
5. 叙事视角混乱
6. 其他逻辑一致性问题`;
  }
  
  /**
   * 创建风格检查提示
   * @param content 内容
   * @param samples 样本章节
   */
  private createStyleCheckPrompt(content: string, samples: string): string {
    return `请检查以下内容的写作风格是否与样本内容一致。找出任何风格上的不一致或突兀之处。

样本内容(代表作者的一贯风格):
${this.truncateContent(samples, 2000)}

待检查内容:
${this.truncateContent(content)}

请分析待检查内容中是否有:
1. 叙述语气与样本不一致
2. 句式结构明显不同
3. 词汇选择风格变化
4. 修辞手法使用不一致
5. 其他风格相关的一致性问题`;
  }
  
  /**
   * 截断内容以符合token限制
   * @param content 内容
   * @param maxLength 最大长度
   */
  private truncateContent(content: string, maxLength: number = 3000): string {
    if (content.length <= maxLength) {
      return content;
    }
    
    return content.substring(0, maxLength) + '...（内容已截断）';
  }
  
  /**
   * 获取人物数据
   * @param novelId 小说ID
   */
  private async fetchCharacterData(novelId: string): Promise<any[]> {
    // 这里需要通过IPC或其他机制获取数据库中的人物信息
    // 实际实现时需要替换为真实的数据获取逻辑
    try {
      return []; // 临时返回空数组，实际实现时需要替换
    } catch (error) {
      console.error('[ConsistencyCheckService] 获取人物数据失败:', error);
      return [];
    }
  }
  
  /**
   * 获取地点数据
   * @param novelId 小说ID
   */
  private async fetchLocationData(novelId: string): Promise<any[]> {
    // 实际实现时需要替换为真实的数据获取逻辑
    try {
      return []; // 临时返回空数组，实际实现时需要替换
    } catch (error) {
      console.error('[ConsistencyCheckService] 获取地点数据失败:', error);
      return [];
    }
  }
  
  /**
   * 获取时间线数据
   * @param novelId 小说ID
   */
  private async fetchTimelineData(novelId: string): Promise<any[]> {
    // 实际实现时需要替换为真实的数据获取逻辑
    try {
      return []; // 临时返回空数组，实际实现时需要替换
    } catch (error) {
      console.error('[ConsistencyCheckService] 获取时间线数据失败:', error);
      return [];
    }
  }
  
  /**
   * 获取大纲数据
   * @param novelId 小说ID
   */
  private async fetchOutlineData(novelId: string): Promise<any> {
    // 实际实现时需要替换为真实的数据获取逻辑
    try {
      return null; // 临时返回null，实际实现时需要替换
    } catch (error) {
      console.error('[ConsistencyCheckService] 获取大纲数据失败:', error);
      return null;
    }
  }
  
  /**
   * 获取章节内容
   * @param request 一致性检查请求
   */
  private async fetchContent(request: ConsistencyCheckRequest): Promise<string | null> {
    // 如果没有指定章节ID，则无法获取内容
    if (!request.chapterId) {
      return null;
    }
    
    // 实际实现时需要替换为真实的数据获取逻辑
    try {
      return ''; // 临时返回空字符串，实际实现时需要替换
    } catch (error) {
      console.error('[ConsistencyCheckService] 获取章节内容失败:', error);
      return null;
    }
  }
  
  /**
   * 获取样本章节内容
   * @param novelId 小说ID
   * @param excludeChapterId 要排除的章节ID
   */
  private async fetchSampleChapters(novelId: string, excludeChapterId?: string): Promise<string | null> {
    // 实际实现时需要替换为真实的数据获取逻辑
    try {
      return ''; // 临时返回空字符串，实际实现时需要替换
    } catch (error) {
      console.error('[ConsistencyCheckService] 获取样本章节失败:', error);
      return null;
    }
  }
} 