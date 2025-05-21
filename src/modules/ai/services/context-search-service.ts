import { v4 as uuidv4 } from 'uuid';
import { 
  ContextSearchRequest, 
  ContextSearchResult,
  ContextEnhancementRequest,
  ContextEnhancementResponse,
  VectorSearchRequest,
  VectorSearchResult,
  ChatCompletionRequest,
  ChatMessageRole,
  ChatMessage,
  AIScenario
} from '../types';
import { aiServiceManager } from './ai-service-manager';
import { VectorEmbeddingService } from './vector-embedding-service';
import { ChatService } from './chat-service';

/**
 * 上下文搜索服务
 * 提供基于相似度的上下文检索功能，支持从小说中搜索相关内容
 */
export class ContextSearchService {
  private serviceManager: typeof aiServiceManager;
  private embeddingService: VectorEmbeddingService | null = null;
  private chatService: ChatService;
  private initialized: boolean = false;
  
  constructor(
    serviceManager: typeof aiServiceManager, 
    embeddingService: VectorEmbeddingService,
    chatService: ChatService
  ) {
    this.serviceManager = serviceManager;
    this.embeddingService = embeddingService;
    this.chatService = chatService;
  }
  
  /**
   * 初始化服务
   */
  public async initialize(): Promise<boolean> {
    try {
      // 初始化向量嵌入服务（如果有）
      if (this.embeddingService) {
        const settings = this.serviceManager.getSettings();
        if (settings) {
          await this.embeddingService.initialize(settings);
        }
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[ContextSearchService] 初始化失败:', error);
      return false;
    }
  }
  
  /**
   * 检索上下文
   * @param request 上下文检索请求
   */
  public async searchContext(request: ContextSearchRequest): Promise<ContextSearchResult> {
    try {
      // 确保服务已初始化
      if (!this.initialized) {
        await this.initialize();
      }
      
      const { query, novelId, sourceTypes = ['chapter', 'character', 'location', 'outline', 'timeline'], strategy = 'hybrid' } = request;
      
      // 如果使用向量检索（并且有向量服务可用）
      if ((strategy === 'vector' || strategy === 'hybrid') && this.embeddingService) {
        return this.performVectorSearch(query, novelId, sourceTypes, request.limit || 5);
      }
      
      // 否则使用关键词检索
      return this.performKeywordSearch(query, novelId, sourceTypes, request.limit || 5);
    } catch (error) {
      console.error('[ContextSearchService] 上下文检索失败:', error);
      return {
        items: []
      };
    }
  }
  
  /**
   * 增强内容上下文
   * @param request 上下文增强请求
   */
  public async enhanceContext(request: ContextEnhancementRequest): Promise<ContextEnhancementResponse> {
    try {
      const { content, novelId, contextTypes = ['character', 'location', 'outline'], maxResults = 3 } = request;
      
      // 首先从内容中提取关键概念
      const keyConcepts = await this.extractKeyConcepts(content);
      
      // 为每个关键概念检索相关上下文
      const contextResults: Record<string, any[]> = {};
      
      for (const concept of keyConcepts) {
        // 只搜索用户指定的上下文类型
        const searchResult = await this.searchContext({
          query: concept,
          novelId,
          sourceTypes: contextTypes as string[],
          limit: maxResults,
          strategy: 'hybrid'
        });
        
        // 按类型分组结果
        searchResult.items.forEach(item => {
          if (!contextResults[item.type]) {
            contextResults[item.type] = [];
          }
          
          // 避免重复添加
          if (!contextResults[item.type].some(existing => existing.id === item.id)) {
            contextResults[item.type].push(item);
          }
        });
      }
      
      // 使用AI增强内容
      const enhancedContent = await this.generateEnhancedContent(content, contextResults);
      
      // 构建应用的上下文
      const appliedContext = Object.entries(contextResults).map(([type, items]) => ({
        type,
        items
      }));
      
      return {
        enhancedContent,
        appliedContext,
        suggestions: this.generateSuggestions(contextResults)
      };
    } catch (error) {
      console.error('[ContextSearchService] 上下文增强失败:', error);
      return {
        enhancedContent: request.content,
        appliedContext: []
      };
    }
  }
  
  /**
   * 通过向量检索执行上下文搜索
   * @param query 查询文本
   * @param novelId 小说ID
   * @param sourceTypes 源类型数组
   * @param limit 结果数量限制
   */
  private async performVectorSearch(
    query: string, 
    novelId: string,
    sourceTypes: string[],
    limit: number
  ): Promise<ContextSearchResult> {
    console.log(`[ContextSearchService] 执行向量检索: ${query} 在小说 ${novelId}`);
    
    // 检查向量嵌入服务是否可用
    if (!this.embeddingService || !this.embeddingService.isVectorStoreEnabled()) {
      console.warn('[ContextSearchService] 向量嵌入服务不可用，回退到关键词搜索');
      return this.performKeywordSearch(query, novelId, sourceTypes, limit);
    }
    
    try {
      // 准备过滤条件
      const filter: Record<string, any> = {
        novelId: novelId
      };
      
      // 如果有指定源类型，添加到过滤条件
      if (sourceTypes && sourceTypes.length > 0) {
        filter.sourceType = sourceTypes;
      }
      
      // 使用向量嵌入服务进行检索
      const results = await this.embeddingService.querySimilar(
        query, 
        filter, 
        limit,
        `novel_${novelId}` // 使用小说ID作为集合名前缀
      );
      
      // 将结果转换为上下文搜索结果格式
      const contextItems = results.map(result => ({
        id: result.id,
        type: result.metadata.sourceType,
        title: result.metadata.title || '未命名',
        content: result.text,
        relevance: result.similarity || 0.5,
        novelId: result.metadata.novelId
      }));
      
      return {
        items: contextItems,
        summary: `找到了与"${query}"相关的 ${contextItems.length} 个结果`
      };
    } catch (error) {
      console.error('[ContextSearchService] 向量检索失败:', error);
      
      // 如果向量检索失败，回退到关键词搜索
      console.log('[ContextSearchService] 回退到关键词搜索');
      return this.performKeywordSearch(query, novelId, sourceTypes, limit);
    }
  }
  
  /**
   * 通过关键词执行上下文搜索
   * @param query 查询文本
   * @param novelId 小说ID
   * @param sourceTypes 源类型数组
   * @param limit 结果数量限制
   */
  private async performKeywordSearch(
    query: string, 
    novelId: string,
    sourceTypes: string[],
    limit: number
  ): Promise<ContextSearchResult> {
    // 关键词搜索当前作为模拟实现
    // 实际应用需要调用数据库或全文索引进行检索
    console.log(`[ContextSearchService] 执行关键词检索: ${query} 在小说 ${novelId}`);
    
    // 提取查询中的关键词
    const keywords = query.split(/\s+/).filter(word => word.length > 1);
    
    // 暂时返回模拟结果
    return {
      items: [
        {
          id: uuidv4(),
          type: 'chapter',
          title: '模拟章节结果',
          content: '这是一个与查询关键词相关的章节内容...',
          relevance: 0.75,
          novelId
        },
        {
          id: uuidv4(),
          type: 'outline',
          title: '模拟大纲结果',
          content: '这是一个与查询关键词相关的大纲内容...',
          relevance: 0.68,
          novelId
        }
      ],
      summary: `找到了与"${query}"相关的 2 个结果`
    };
  }
  
  /**
   * 从文本中提取关键概念
   * @param content 文本内容
   */
  private async extractKeyConcepts(content: string): Promise<string[]> {
    try {
      // 使用AI提取关键概念
      const messages: ChatMessage[] = [
        {
          id: uuidv4(),
          role: ChatMessageRole.SYSTEM,
          content: '你是一位文本分析专家，专注于从文本中提取关键概念。请从以下文本中提取5个关键概念（人物、地点、事件等），以逗号分隔，不要添加解释。',
          timestamp: Date.now()
        },
        {
          id: uuidv4(),
          role: ChatMessageRole.USER,
          content: content,
          timestamp: Date.now()
        }
      ];
      
      const chatRequest: ChatCompletionRequest = {
        modelId: 'gpt-3.5-turbo', // 使用较轻量的模型
        messages,
        temperature: 0.3, // 低温度以获得更确定的结果
        maxTokens: 100 // 限制生成长度
      };
      
      const response = await this.serviceManager.createChatCompletion(chatRequest, undefined);
      
      // 解析结果，分割逗号分隔的概念
      const concepts = response.message.content
        .split(',')
        .map(concept => concept.trim())
        .filter(concept => concept.length > 0);
      
      return concepts;
    } catch (error) {
      console.error('[ContextSearchService] 提取关键概念失败:', error);
      
      // 回退到简单的关键词提取
      const words = content
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 5);
      
      return words;
    }
  }
  
  /**
   * 使用AI和上下文生成增强内容
   * @param originalContent 原始内容
   * @param contextResults 上下文结果
   */
  private async generateEnhancedContent(
    originalContent: string,
    contextResults: Record<string, any[]>
  ): Promise<string> {
    try {
      // 构建上下文信息
      let contextInfo = '相关上下文信息:\n\n';
      
      Object.entries(contextResults).forEach(([type, items]) => {
        if (items.length > 0) {
          contextInfo += `【${this.getTypeDisplayName(type)}】\n`;
          
          items.forEach(item => {
            contextInfo += `- ${item.title}: ${item.content.substring(0, 100)}...\n`;
          });
          
          contextInfo += '\n';
        }
      });
      
      // 使用AI生成增强内容
      const messages: ChatMessage[] = [
        {
          id: uuidv4(),
          role: ChatMessageRole.SYSTEM,
          content: '你是一位专业的小说创作助手，擅长利用上下文信息丰富和完善小说内容。请根据提供的上下文信息，增强和完善给定的段落。保持原文的风格和主旨，但可以添加更多细节、描述和连贯性。',
          timestamp: Date.now()
        },
        {
          id: uuidv4(),
          role: ChatMessageRole.USER,
          content: `${contextInfo}\n\n原始内容:\n${originalContent}\n\n请根据上下文信息增强这段内容，使其更加丰富和连贯。`,
          timestamp: Date.now()
        }
      ];
      
      const chatRequest: ChatCompletionRequest = {
        modelId: 'gpt-4', // 使用更强大的模型
        messages,
        temperature: 0.7,
        maxTokens: originalContent.length * 2 // 给予充足的生成空间
      };
      
      const response = await this.serviceManager.createChatCompletion(chatRequest, AIScenario.CONTEXT_ENHANCEMENT);
      
      return response.message.content;
    } catch (error) {
      console.error('[ContextSearchService] 生成增强内容失败:', error);
      // 出错时返回原始内容
      return originalContent;
    }
  }
  
  /**
   * 生成基于上下文的写作建议
   * @param contextResults 上下文结果
   */
  private generateSuggestions(contextResults: Record<string, any[]>): string[] {
    const suggestions: string[] = [];
    
    // 生成人物相关建议
    if (contextResults['character'] && contextResults['character'].length > 0) {
      const characters = contextResults['character'];
      if (characters.length === 1) {
        suggestions.push(`考虑更详细地描述 ${characters[0].title} 的特点或情感变化`);
      } else {
        suggestions.push(`探索 ${characters[0].title} 和 ${characters[1].title} 之间的互动或关系`);
      }
    }
    
    // 生成地点相关建议
    if (contextResults['location'] && contextResults['location'].length > 0) {
      suggestions.push(`增加对 ${contextResults['location'][0].title} 的环境描写，以增强场景感`);
    }
    
    // 生成大纲相关建议
    if (contextResults['outline'] && contextResults['outline'].length > 0) {
      suggestions.push(`确保当前内容与大纲中 "${contextResults['outline'][0].title}" 的情节发展保持一致`);
    }
    
    // 如果没有足够的建议，添加一些通用建议
    if (suggestions.length < 3) {
      suggestions.push('考虑增加更多的感官描写，使场景更加生动');
      suggestions.push('尝试通过对话或内心独白展示角色性格');
    }
    
    return suggestions;
  }
  
  /**
   * 获取类型的显示名称
   * @param type 类型字符串
   */
  private getTypeDisplayName(type: string): string {
    switch (type) {
      case 'character':
        return '人物';
      case 'location':
        return '地点';
      case 'outline':
        return '大纲';
      case 'timeline':
        return '时间线';
      case 'chapter':
        return '章节';
      default:
        return type;
    }
  }
} 