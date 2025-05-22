import { 
  EditorAIRequest, 
  EditorAIResponse, 
  EditorAIActionType, 
  ChatMessage, 
  ChatMessageRole, 
  AIScenario,
  TextDiff,
  AIProvider
} from '../types';
import aiServiceManager from './ai-service-manager';
import { AISettingsService } from './ai-settings-service';
import { v4 as uuidv4 } from 'uuid';

/**
 * 编辑器AI服务
 * 提供与编辑器集成的AI功能
 */
export class AIEditorService {
  private aiServiceManager = aiServiceManager;
  private aiSettingsService = AISettingsService.getInstance();
  private editHistoryCache: Map<string, any> = new Map();
  private initialized: boolean = false;

  constructor() {
    // 使用全局单例
    this.initializeService();
  }

  /**
   * 初始化AI服务
   */
  private async initializeService(): Promise<void> {
    try {
      // 加载AI设置
      const settings = await this.aiSettingsService.loadSettings();
      
      // 检查AI是否已配置
      const isConfigured = await this.aiSettingsService.hasConfiguredAI(settings);
      if (!isConfigured) {
        console.warn('AI服务未配置，跳过初始化');
        this.initialized = false;
        return;
      }
      
      // 检查activeProviderId是否有效
      if (!settings.activeProviderId || !settings.providers.some(p => p.id === settings.activeProviderId)) {
        console.error('未找到有效的活动提供商ID');
        this.initialized = false;
        return;
      }
      
      // 初始化AI服务管理器
      const result = await this.aiServiceManager.initialize(settings);
      
      this.initialized = result;
      
      if (!result) {
        console.error('AI服务初始化失败');
      } else {
        console.log('AI服务初始化成功');
      }
    } catch (error) {
      console.error('初始化AI编辑器服务失败:', error);
      this.initialized = false;
    }
  }

  /**
   * 检查AI服务是否已初始化
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    // 如果未初始化，先检查AI是否已配置
    try {
      const settings = await this.aiSettingsService.loadSettings();
      const isConfigured = await this.aiSettingsService.hasConfiguredAI(settings);
      
      if (!isConfigured) {
        console.warn('AI服务未配置，无法初始化');
        return false;
      }
      
      // 尝试重新初始化
      const result = await this.aiServiceManager.initialize(settings);
      this.initialized = result;
      return result;
    } catch (error) {
      console.error('确保AI服务初始化失败:', error);
      return false;
    }
  }

  /**
   * 执行编辑器AI操作
   * @param request 编辑器AI请求
   * @returns 编辑器AI响应
   */
  public async executeAction(request: EditorAIRequest): Promise<EditorAIResponse> {
    try {
      // 确保AI服务已初始化
      const isInitialized = await this.ensureInitialized();
      if (!isInitialized) {
        return {
          actionType: request.actionType,
          originalContent: request.content,
          status: 'error',
          error: 'AI服务未初始化，请在设置中配置AI服务'
        };
      }

      switch (request.actionType) {
        case EditorAIActionType.POLISH:
          return await this.polishText(request);
        case EditorAIActionType.CONTINUE:
          return await this.continueText(request);
        case EditorAIActionType.EXTRACT_CHARACTER:
          return await this.extractCharacter(request);
        case EditorAIActionType.EXTRACT_LOCATION:
          return await this.extractLocation(request);
        case EditorAIActionType.UPDATE_OUTLINE:
          return await this.updateOutline(request);
        case EditorAIActionType.ADD_TIMELINE:
          return await this.addTimeline(request);
        default:
          throw new Error(`不支持的AI操作类型: ${request.actionType}`);
      }
    } catch (error) {
      console.error('执行编辑器AI操作失败:', error);
      return {
        actionType: request.actionType,
        originalContent: request.content,
        status: 'error',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 润色文本
   * @param request 编辑器AI请求
   * @returns 编辑器AI响应
   */
  private async polishText(request: EditorAIRequest): Promise<EditorAIResponse> {
    const textToPolish = request.selection || request.content;
    
    const messages: ChatMessage[] = [
      {
        id: uuidv4(),
        role: ChatMessageRole.SYSTEM,
        content: '你是一位专业的文学编辑，擅长润色和改进文本。请对提供的文本进行润色，使其更加流畅、生动，同时保持原意。只返回润色后的文本，不要添加解释。',
        timestamp: Date.now()
      },
      {
        id: uuidv4(),
        role: ChatMessageRole.USER,
        content: `请润色以下文本：\n\n${textToPolish}`,
        timestamp: Date.now()
      }
    ];

    const response = await this.aiServiceManager.createChatCompletion({
      modelId: this.aiServiceManager.getSettings()?.providers.find((p: AIProvider) => 
        p.id === this.aiServiceManager.getCurrentProviderId())?.defaultModel || '',
      messages
    }, AIScenario.NOVEL_COLLABORATION);

    const polishedText = response.message.content;
    
    // 计算差异
    const diffs = this.computeTextDiff(textToPolish, polishedText);
    
    // 如果是部分选择，则只替换选中部分
    let modifiedContent = request.content;
    if (request.selection) {
      modifiedContent = request.content.replace(request.selection, polishedText);
    } else {
      modifiedContent = polishedText;
    }

    return {
      actionType: EditorAIActionType.POLISH,
      originalContent: request.content,
      modifiedContent,
      diff: diffs,
      status: 'success'
    };
  }

  /**
   * 续写文本
   * @param request 编辑器AI请求
   * @returns 编辑器AI响应
   */
  private async continueText(request: EditorAIRequest): Promise<EditorAIResponse> {
    // 获取光标位置前的内容作为上下文
    const cursorPosition = request.cursorPosition || request.content.length;
    const contextText = request.content.substring(0, cursorPosition);
    
    const messages: ChatMessage[] = [
      {
        id: uuidv4(),
        role: ChatMessageRole.SYSTEM,
        content: '你是一位专业的小说创作助手，擅长根据已有内容续写故事。请根据提供的文本片段，续写合理的后续内容，保持风格一致。只返回续写的内容，不要添加解释。',
        timestamp: Date.now()
      },
      {
        id: uuidv4(),
        role: ChatMessageRole.USER,
        content: `请根据以下内容续写：\n\n${contextText}\n\n请直接续写，不要重复已有内容，不要添加标题或解释。`,
        timestamp: Date.now()
      }
    ];

    const response = await this.aiServiceManager.createChatCompletion({
      modelId: this.aiServiceManager.getSettings()?.providers.find((p: AIProvider) => 
        p.id === this.aiServiceManager.getCurrentProviderId())?.defaultModel || '',
      messages
    }, AIScenario.NOVEL_COLLABORATION);

    const continuedText = response.message.content;
    
    // 在光标位置插入续写内容
    const modifiedContent = contextText + continuedText + request.content.substring(cursorPosition);

    // 计算差异（只针对新增部分）
    const diffs: TextDiff[] = [{
      type: 'insert',
      value: continuedText,
      position: cursorPosition
    }];

    return {
      actionType: EditorAIActionType.CONTINUE,
      originalContent: request.content,
      modifiedContent,
      diff: diffs,
      status: 'success'
    };
  }

  /**
   * 提取角色信息
   * @param request 编辑器AI请求
   * @returns 编辑器AI响应
   */
  private async extractCharacter(request: EditorAIRequest): Promise<EditorAIResponse> {
    const textToAnalyze = request.selection || request.content;
    
    const messages: ChatMessage[] = [
      {
        id: uuidv4(),
        role: ChatMessageRole.SYSTEM,
        content: '你是一位专业的文学分析师，擅长从文本中提取角色信息。请分析提供的文本，提取其中的角色信息，包括姓名、性别、年龄、外貌、性格、背景等。以JSON格式返回结果。',
        timestamp: Date.now()
      },
      {
        id: uuidv4(),
        role: ChatMessageRole.USER,
        content: `请从以下文本中提取角色信息：\n\n${textToAnalyze}\n\n请以JSON格式返回，包含以下字段：name(姓名), gender(性别), age(年龄), appearance(外貌), personality(性格), background(背景)`,
        timestamp: Date.now()
      }
    ];

    const response = await this.aiServiceManager.createChatCompletion({
      modelId: this.aiServiceManager.getSettings()?.providers.find((p: AIProvider) => 
        p.id === this.aiServiceManager.getCurrentProviderId())?.defaultModel || '',
      messages
    }, AIScenario.NOVEL_ANALYSIS);

    // 尝试解析JSON响应
    let extractedData;
    try {
      // 提取JSON部分
      const jsonMatch = response.message.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.message.content.match(/```\n([\s\S]*?)\n```/) ||
                        response.message.content.match(/{[\s\S]*?}/);
      
      const jsonString = jsonMatch ? jsonMatch[0] : response.message.content;
      extractedData = JSON.parse(jsonString.replace(/```json|```/g, '').trim());
    } catch (error) {
      console.error('解析角色JSON失败:', error);
      extractedData = { 
        error: '无法解析角色信息',
        rawResponse: response.message.content 
      };
    }

    return {
      actionType: EditorAIActionType.EXTRACT_CHARACTER,
      originalContent: request.content,
      extractedData,
      status: 'success'
    };
  }

  /**
   * 提取地点信息
   * @param request 编辑器AI请求
   * @returns 编辑器AI响应
   */
  private async extractLocation(request: EditorAIRequest): Promise<EditorAIResponse> {
    const textToAnalyze = request.selection || request.content;
    
    const messages: ChatMessage[] = [
      {
        id: uuidv4(),
        role: ChatMessageRole.SYSTEM,
        content: '你是一位专业的文学分析师，擅长从文本中提取地点信息。请分析提供的文本，提取其中的地点信息，包括名称、描述、特点、重要性等。以JSON格式返回结果。',
        timestamp: Date.now()
      },
      {
        id: uuidv4(),
        role: ChatMessageRole.USER,
        content: `请从以下文本中提取地点信息：\n\n${textToAnalyze}\n\n请以JSON格式返回，包含以下字段：name(名称), description(描述), features(特点), importance(重要性)`,
        timestamp: Date.now()
      }
    ];

    const response = await this.aiServiceManager.createChatCompletion({
      modelId: this.aiServiceManager.getSettings()?.providers.find((p: AIProvider) => 
        p.id === this.aiServiceManager.getCurrentProviderId())?.defaultModel || '',
      messages
    }, AIScenario.NOVEL_ANALYSIS);

    // 尝试解析JSON响应
    let extractedData;
    try {
      // 提取JSON部分
      const jsonMatch = response.message.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.message.content.match(/```\n([\s\S]*?)\n```/) ||
                        response.message.content.match(/{[\s\S]*?}/);
      
      const jsonString = jsonMatch ? jsonMatch[0] : response.message.content;
      extractedData = JSON.parse(jsonString.replace(/```json|```/g, '').trim());
    } catch (error) {
      console.error('解析地点JSON失败:', error);
      extractedData = { 
        error: '无法解析地点信息',
        rawResponse: response.message.content 
      };
    }

    return {
      actionType: EditorAIActionType.EXTRACT_LOCATION,
      originalContent: request.content,
      extractedData,
      status: 'success'
    };
  }

  /**
   * 更新大纲
   * @param request 编辑器AI请求
   * @returns 编辑器AI响应
   */
  private async updateOutline(request: EditorAIRequest): Promise<EditorAIResponse> {
    const textToAnalyze = request.content;
    const currentOutline = request.context?.outline || {};
    
    const messages: ChatMessage[] = [
      {
        id: uuidv4(),
        role: ChatMessageRole.SYSTEM,
        content: '你是一位专业的文学编辑，擅长分析文本并生成或更新大纲。请分析提供的文本，根据现有大纲进行更新或补充。以JSON格式返回结果。',
        timestamp: Date.now()
      },
      {
        id: uuidv4(),
        role: ChatMessageRole.USER,
        content: `请分析以下章节内容：\n\n${textToAnalyze}\n\n当前大纲：${JSON.stringify(currentOutline, null, 2)}\n\n请更新大纲，以JSON格式返回，包含以下字段：title(标题), summary(摘要), keyPoints(关键点), characters(涉及角色), locations(涉及地点)`,
        timestamp: Date.now()
      }
    ];

    const response = await this.aiServiceManager.createChatCompletion({
      modelId: this.aiServiceManager.getSettings()?.providers.find((p: AIProvider) => 
        p.id === this.aiServiceManager.getCurrentProviderId())?.defaultModel || '',
      messages
    }, AIScenario.NOVEL_ANALYSIS);

    // 尝试解析JSON响应
    let extractedData;
    try {
      // 提取JSON部分
      const jsonMatch = response.message.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.message.content.match(/```\n([\s\S]*?)\n```/) ||
                        response.message.content.match(/{[\s\S]*?}/);
      
      const jsonString = jsonMatch ? jsonMatch[0] : response.message.content;
      extractedData = JSON.parse(jsonString.replace(/```json|```/g, '').trim());
    } catch (error) {
      console.error('解析大纲JSON失败:', error);
      extractedData = { 
        error: '无法解析大纲信息',
        rawResponse: response.message.content 
      };
    }

    return {
      actionType: EditorAIActionType.UPDATE_OUTLINE,
      originalContent: request.content,
      extractedData,
      status: 'success'
    };
  }

  /**
   * 添加时间线
   * @param request 编辑器AI请求
   * @returns 编辑器AI响应
   */
  private async addTimeline(request: EditorAIRequest): Promise<EditorAIResponse> {
    const textToAnalyze = request.selection || request.content;
    
    const messages: ChatMessage[] = [
      {
        id: uuidv4(),
        role: ChatMessageRole.SYSTEM,
        content: '你是一位专业的文学分析师，擅长从文本中提取时间线事件。请分析提供的文本，提取其中的事件信息，包括事件名称、时间、描述、相关人物等。以JSON格式返回结果。',
        timestamp: Date.now()
      },
      {
        id: uuidv4(),
        role: ChatMessageRole.USER,
        content: `请从以下文本中提取时间线事件：\n\n${textToAnalyze}\n\n请以JSON格式返回，包含以下字段：title(事件名称), time(时间), description(描述), characters(相关人物), location(地点)`,
        timestamp: Date.now()
      }
    ];

    const response = await this.aiServiceManager.createChatCompletion({
      modelId: this.aiServiceManager.getSettings()?.providers.find((p: AIProvider) => 
        p.id === this.aiServiceManager.getCurrentProviderId())?.defaultModel || '',
      messages
    }, AIScenario.NOVEL_ANALYSIS);

    // 尝试解析JSON响应
    let extractedData;
    try {
      // 提取JSON部分
      const jsonMatch = response.message.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.message.content.match(/```\n([\s\S]*?)\n```/) ||
                        response.message.content.match(/{[\s\S]*?}/);
      
      const jsonString = jsonMatch ? jsonMatch[0] : response.message.content;
      extractedData = JSON.parse(jsonString.replace(/```json|```/g, '').trim());
    } catch (error) {
      console.error('解析时间线JSON失败:', error);
      extractedData = { 
        error: '无法解析时间线信息',
        rawResponse: response.message.content 
      };
    }

    return {
      actionType: EditorAIActionType.ADD_TIMELINE,
      originalContent: request.content,
      extractedData,
      status: 'success'
    };
  }

  /**
   * 计算文本差异
   * @param original 原始文本
   * @param modified 修改后的文本
   * @returns 文本差异数组
   */
  private computeTextDiff(original: string, modified: string): TextDiff[] {
    // 简单差异计算实现，实际项目中可以使用更复杂的差异算法库
    // 如 diff-match-patch, jsdiff 等
    
    // 这里使用一个简化的实现
    const diffs: TextDiff[] = [];
    
    // 如果文本完全相同，返回一个相等的差异项
    if (original === modified) {
      diffs.push({
        type: 'equal',
        value: original,
        position: 0
      });
      return diffs;
    }
    
    // 简单处理：将整个文本视为一个替换
    diffs.push({
      type: 'delete',
      value: original,
      position: 0
    });
    
    diffs.push({
      type: 'insert',
      value: modified,
      position: 0
    });
    
    return diffs;
  }

  /**
   * 保存AI编辑历史
   * @param historyItem AI编辑历史项
   */
  public saveEditHistory(historyItem: any): void {
    // 实际项目中应该将历史保存到数据库
    // 这里简单使用内存缓存
    this.editHistoryCache.set(historyItem.id, historyItem);
  }

  /**
   * 获取AI编辑历史
   * @param chapterId 章节ID
   * @returns AI编辑历史数组
   */
  public getEditHistory(chapterId: string): any[] {
    // 实际项目中应该从数据库查询
    // 这里简单使用内存缓存
    const history: any[] = [];
    this.editHistoryCache.forEach(item => {
      if (item.chapterId === chapterId) {
        history.push(item);
      }
    });
    
    // 按时间戳排序，最新的在前
    return history.sort((a, b) => b.timestamp - a.timestamp);
  }
} 