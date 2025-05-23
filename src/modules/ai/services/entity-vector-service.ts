/**
 * 实体向量化服务
 * 负责管理人物、地点、大纲和时间线等实体的向量化处理
 */
import { VectorEmbeddingService } from './vector-embedding-service';
import { Character } from '../../../shared/types/character';
import { Location } from '../../../shared/types/location';
import { OutlineItem } from '../../../shared/types/outline';
import { TimelineEvent } from '../../../shared/types/timeline';
import { VectorEmbedding } from '../types';

/**
 * 实体向量化任务进度信息
 */
export interface EntityVectorTaskProgress {
  entityType: string;
  entityId: string;
  entityName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

/**
 * 实体向量化批处理进度
 */
export interface EntityVectorBatchProgress {
  totalCount: number;
  completedCount: number;
  errorCount: number;
  currentTask: EntityVectorTaskProgress | null;
  tasks: EntityVectorTaskProgress[];
  isCompleted: boolean;
}

/**
 * 实体向量化服务
 */
export class EntityVectorService {
  private vectorEmbeddingService: VectorEmbeddingService;
  private progressCallbacks: Map<string, (progress: EntityVectorBatchProgress) => void> = new Map();
  
  constructor(vectorEmbeddingService: VectorEmbeddingService) {
    this.vectorEmbeddingService = vectorEmbeddingService;
  }
  
  /**
   * 设置进度回调函数
   * @param sessionId 会话ID
   * @param callback 进度回调
   */
  public setProgressCallback(sessionId: string, callback: (progress: EntityVectorBatchProgress) => void): void {
    this.progressCallbacks.set(sessionId, callback);
  }
  
  /**
   * 移除进度回调函数
   * @param sessionId 会话ID
   */
  public removeProgressCallback(sessionId: string): void {
    this.progressCallbacks.delete(sessionId);
  }
  
  /**
   * 向量化单个人物
   * @param character 人物对象
   * @param modelId 嵌入模型ID
   * @returns 向量化结果
   */
  public async vectorizeCharacter(character: Character, modelId: string): Promise<VectorEmbedding | null> {
    try {
      // 构建人物的向量化文本
      const characterText = this.buildCharacterText(character);
      
      // 创建向量嵌入
      const vectorEmbedding = await this.vectorEmbeddingService.createAndSaveVectorEmbedding(
        characterText,
        modelId,
        {
          sourceId: character.id,
          sourceType: 'character',
          novelId: character.novel_id,
          title: character.name,
          createdAt: Date.now(),
          updatedAt: new Date(character.updated_at).getTime(),
          additionalContext: {
            entity_type: 'character',
            entity_id: character.id,
            entity_name: character.name,
            role: character.role,
            description: character.description,
            background: character.background,
            personality: character.personality,
            appearance: character.appearance,
            source_content: characterText
          }
        },
        `novel_${character.novel_id}_characters`
      );
      
      console.log(`[EntityVectorService] 人物向量化完成: ${character.name}`);
      return vectorEmbedding;
    } catch (error) {
      console.error(`[EntityVectorService] 人物向量化失败: ${character.name}`, error);
      throw new Error(`人物"${character.name}"向量化失败: ${(error as Error).message}`);
    }
  }
  
  /**
   * 向量化单个地点
   * @param location 地点对象
   * @param modelId 嵌入模型ID
   * @returns 向量化结果
   */
  public async vectorizeLocation(location: Location, modelId: string): Promise<VectorEmbedding | null> {
    try {
      // 构建地点的向量化文本
      const locationText = this.buildLocationText(location);
      
      // 创建向量嵌入
      const vectorEmbedding = await this.vectorEmbeddingService.createAndSaveVectorEmbedding(
        locationText,
        modelId,
        {
          sourceId: location.id,
          sourceType: 'location',
          novelId: location.novel_id,
          title: location.name,
          createdAt: Date.now(),
          updatedAt: new Date(location.updated_at).getTime(),
          additionalContext: {
            entity_type: 'location',
            entity_id: location.id,
            entity_name: location.name,
            description: location.description,
            importance: location.importance,
            coordinates: location.coordinates,
            source_content: locationText
          }
        },
        `novel_${location.novel_id}_locations`
      );
      
      console.log(`[EntityVectorService] 地点向量化完成: ${location.name}`);
      return vectorEmbedding;
    } catch (error) {
      console.error(`[EntityVectorService] 地点向量化失败: ${location.name}`, error);
      throw new Error(`地点"${location.name}"向量化失败: ${(error as Error).message}`);
    }
  }
  
  /**
   * 向量化单个大纲项目
   * @param outlineItem 大纲项目对象
   * @param modelId 嵌入模型ID
   * @returns 向量化结果
   */
  public async vectorizeOutlineItem(outlineItem: OutlineItem, modelId: string): Promise<VectorEmbedding | null> {
    try {
      // 构建大纲项目的向量化文本
      const outlineText = this.buildOutlineItemText(outlineItem);
      
      // 创建向量嵌入
      const vectorEmbedding = await this.vectorEmbeddingService.createAndSaveVectorEmbedding(
        outlineText,
        modelId,
        {
          sourceId: outlineItem.id,
          sourceType: 'outline',
          novelId: outlineItem.novel_id,
          title: outlineItem.title,
          createdAt: Date.now(),
          updatedAt: new Date(outlineItem.updated_at).getTime(),
          additionalContext: {
            entity_type: 'outline',
            entity_id: outlineItem.id,
            entity_name: outlineItem.title,
            content: outlineItem.content,
            status: outlineItem.status,
            parent_id: outlineItem.parent_id,
            sort_order: outlineItem.sort_order,
            source_content: outlineText
          }
        },
        `novel_${outlineItem.novel_id}_outlines`
      );
      
      console.log(`[EntityVectorService] 大纲项目向量化完成: ${outlineItem.title}`);
      return vectorEmbedding;
    } catch (error) {
      console.error(`[EntityVectorService] 大纲项目向量化失败: ${outlineItem.title}`, error);
      throw new Error(`大纲项目"${outlineItem.title}"向量化失败: ${(error as Error).message}`);
    }
  }
  
  /**
   * 向量化单个时间线事件
   * @param timelineEvent 时间线事件对象
   * @param modelId 嵌入模型ID
   * @returns 向量化结果
   */
  public async vectorizeTimelineEvent(timelineEvent: TimelineEvent, modelId: string): Promise<VectorEmbedding | null> {
    try {
      // 构建时间线事件的向量化文本
      const timelineText = this.buildTimelineEventText(timelineEvent);
      
      // 创建向量嵌入
      const vectorEmbedding = await this.vectorEmbeddingService.createAndSaveVectorEmbedding(
        timelineText,
        modelId,
        {
          sourceId: timelineEvent.id,
          sourceType: 'timeline',
          novelId: timelineEvent.novel_id,
          title: timelineEvent.title,
          createdAt: Date.now(),
          updatedAt: new Date(timelineEvent.updated_at).getTime(),
          additionalContext: {
            entity_type: 'timeline',
            entity_id: timelineEvent.id,
            entity_name: timelineEvent.title,
            description: timelineEvent.description,
            event_date: timelineEvent.event_date,
            importance: timelineEvent.importance,
            character_ids: timelineEvent.character_ids,
            location_id: timelineEvent.location_id,
            source_content: timelineText
          }
        },
        `novel_${timelineEvent.novel_id}_timeline`
      );
      
      console.log(`[EntityVectorService] 时间线事件向量化完成: ${timelineEvent.title}`);
      return vectorEmbedding;
    } catch (error) {
      console.error(`[EntityVectorService] 时间线事件向量化失败: ${timelineEvent.title}`, error);
      throw new Error(`时间线事件"${timelineEvent.title}"向量化失败: ${(error as Error).message}`);
    }
  }
  
  /**
   * 批量向量化小说的所有实体
   * @param novelId 小说ID
   * @param modelId 嵌入模型ID
   * @param sessionId 会话ID，用于进度回调
   */
  public async vectorizeNovelEntities(novelId: string, modelId: string, sessionId?: string): Promise<void> {
    try {
      console.log(`[EntityVectorService] 开始向量化小说 ${novelId} 的所有实体`);
      
      // 获取所有实体数据
      const [characters, locations, outlineItems, timelineEvents] = await Promise.all([
        this.getCharactersByNovelId(novelId),
        this.getLocationsByNovelId(novelId),
        this.getOutlineItemsByNovelId(novelId),
        this.getTimelineEventsByNovelId(novelId)
      ]);
      
      // 创建任务列表
      const tasks: EntityVectorTaskProgress[] = [
        ...characters.map(c => ({
          entityType: 'character',
          entityId: c.id,
          entityName: c.name,
          status: 'pending' as const
        })),
        ...locations.map(l => ({
          entityType: 'location',
          entityId: l.id,
          entityName: l.name,
          status: 'pending' as const
        })),
        ...outlineItems.map(o => ({
          entityType: 'outline',
          entityId: o.id,
          entityName: o.title,
          status: 'pending' as const
        })),
        ...timelineEvents.map(t => ({
          entityType: 'timeline',
          entityId: t.id,
          entityName: t.title,
          status: 'pending' as const
        }))
      ];
      
      const progress: EntityVectorBatchProgress = {
        totalCount: tasks.length,
        completedCount: 0,
        errorCount: 0,
        currentTask: null,
        tasks,
        isCompleted: false
      };
      
      // 发送初始进度
      if (sessionId) {
        this.notifyProgress(sessionId, progress);
      }
      
      // 处理人物
      for (const character of characters) {
        await this.processEntityWithProgress(
          'character',
          character,
          () => this.vectorizeCharacter(character, modelId),
          progress,
          sessionId
        );
      }
      
      // 处理地点
      for (const location of locations) {
        await this.processEntityWithProgress(
          'location',
          location,
          () => this.vectorizeLocation(location, modelId),
          progress,
          sessionId
        );
      }
      
      // 处理大纲项目
      for (const outlineItem of outlineItems) {
        await this.processEntityWithProgress(
          'outline',
          outlineItem,
          () => this.vectorizeOutlineItem(outlineItem, modelId),
          progress,
          sessionId
        );
      }
      
      // 处理时间线事件
      for (const timelineEvent of timelineEvents) {
        await this.processEntityWithProgress(
          'timeline',
          timelineEvent,
          () => this.vectorizeTimelineEvent(timelineEvent, modelId),
          progress,
          sessionId
        );
      }
      
      // 完成
      progress.isCompleted = true;
      progress.currentTask = null;
      
      if (sessionId) {
        this.notifyProgress(sessionId, progress);
      }
      
      console.log(`[EntityVectorService] 小说 ${novelId} 的所有实体向量化完成`);
    } catch (error) {
      console.error(`[EntityVectorService] 批量向量化失败:`, error);
      throw error;
    }
  }
  
  /**
   * 处理单个实体并更新进度
   */
  private async processEntityWithProgress<T>(
    entityType: string,
    entity: T,
    processFunction: () => Promise<any>,
    progress: EntityVectorBatchProgress,
    sessionId?: string
  ): Promise<void> {
    const entityId = (entity as any).id;
    const entityName = (entity as any).name || (entity as any).title;
    
    // 找到对应的任务
    const task = progress.tasks.find(t => t.entityId === entityId);
    if (!task) return;
    
    try {
      // 设置当前任务
      task.status = 'processing';
      progress.currentTask = task;
      
      if (sessionId) {
        this.notifyProgress(sessionId, progress);
      }
      
      // 执行向量化
      await processFunction();
      
      // 任务完成
      task.status = 'completed';
      progress.completedCount++;
    } catch (error) {
      // 任务失败
      task.status = 'error';
      task.error = (error as Error).message;
      progress.errorCount++;
      console.error(`实体向量化失败: ${entityType} ${entityName}`, error);
    }
    
    // 更新进度
    if (sessionId) {
      this.notifyProgress(sessionId, progress);
    }
  }
  
  /**
   * 发送进度通知
   */
  private notifyProgress(sessionId: string, progress: EntityVectorBatchProgress): void {
    const callback = this.progressCallbacks.get(sessionId);
    if (callback) {
      callback(progress);
    }
  }
  
  /**
   * 构建人物的向量化文本
   */
  private buildCharacterText(character: Character): string {
    const parts = [
      `人物：${character.name}`,
      character.role && `角色：${character.role}`,
      character.description && `描述：${character.description}`,
      character.background && `背景：${character.background}`,
      character.personality && `性格：${character.personality}`,
      character.appearance && `外貌：${character.appearance}`
    ].filter(Boolean);
    
    return parts.join('\n');
  }
  
  /**
   * 构建地点的向量化文本
   */
  private buildLocationText(location: Location): string {
    const parts = [
      `地点：${location.name}`,
      location.description && `描述：${location.description}`,
      location.importance && `重要性：${location.importance}`,
      location.coordinates && `坐标：${location.coordinates}`
    ].filter(Boolean);
    
    return parts.join('\n');
  }
  
  /**
   * 构建大纲项目的向量化文本
   */
  private buildOutlineItemText(outlineItem: OutlineItem): string {
    const parts = [
      `大纲：${outlineItem.title}`,
      outlineItem.content && `内容：${outlineItem.content}`,
      outlineItem.status && `状态：${outlineItem.status}`
    ].filter(Boolean);
    
    return parts.join('\n');
  }
  
  /**
   * 构建时间线事件的向量化文本
   */
  private buildTimelineEventText(timelineEvent: TimelineEvent): string {
    const parts = [
      `事件：${timelineEvent.title}`,
      timelineEvent.description && `描述：${timelineEvent.description}`,
      timelineEvent.event_date && `时间：${timelineEvent.event_date}`,
      timelineEvent.importance && `重要性：${timelineEvent.importance}`
    ].filter(Boolean);
    
    return parts.join('\n');
  }
  
  /**
   * 获取小说的所有人物
   */
  private async getCharactersByNovelId(novelId: string): Promise<Character[]> {
    try {
      const response = await window.electron.invoke('get-characters', { novel_id: novelId });
      return response.success ? response.data : [];
    } catch (error) {
      console.error('获取人物列表失败:', error);
      return [];
    }
  }
  
  /**
   * 获取小说的所有地点
   */
  private async getLocationsByNovelId(novelId: string): Promise<Location[]> {
    try {
      const response = await window.electron.invoke('get-locations', { novel_id: novelId });
      return response.success ? response.data : [];
    } catch (error) {
      console.error('获取地点列表失败:', error);
      return [];
    }
  }
  
  /**
   * 获取小说的所有大纲项目
   */
  private async getOutlineItemsByNovelId(novelId: string): Promise<OutlineItem[]> {
    try {
      const response = await window.electron.invoke('get-outlines', { novel_id: novelId });
      return response.success ? response.data : [];
    } catch (error) {
      console.error('获取大纲列表失败:', error);
      return [];
    }
  }
  
  /**
   * 获取小说的所有时间线事件
   */
  private async getTimelineEventsByNovelId(novelId: string): Promise<TimelineEvent[]> {
    try {
      const response = await window.electron.invoke('get-timeline-events', { novel_id: novelId });
      return response.success ? response.data : [];
    } catch (error) {
      console.error('获取时间线事件列表失败:', error);
      return [];
    }
  }
  
  /**
   * 清理指定小说的所有实体向量
   * @param novelId 小说ID
   */
  public async clearNovelEntityVectors(novelId: string): Promise<void> {
    try {
      const collections = [
        `novel_${novelId}_characters`,
        `novel_${novelId}_locations`,
        `novel_${novelId}_outlines`,
        `novel_${novelId}_timeline`
      ];
      
      for (const collection of collections) {
        try {
          // 删除整个集合
          await window.electron.invoke('vector:delete-collection', { collection });
          console.log(`[EntityVectorService] 已清理集合: ${collection}`);
        } catch (error) {
          console.warn(`[EntityVectorService] 清理集合失败: ${collection}`, error);
        }
      }
    } catch (error) {
      console.error('[EntityVectorService] 清理实体向量失败:', error);
      throw error;
    }
  }
  
  /**
   * 查询相似实体
   * @param queryText 查询文本
   * @param novelId 小说ID
   * @param entityTypes 实体类型过滤
   * @param limit 返回数量限制
   */
  public async querySimilarEntities(
    queryText: string,
    novelId: string,
    entityTypes: string[] = ['character', 'location', 'outline', 'timeline'],
    limit: number = 10
  ): Promise<any[]> {
    try {
      const results = [];
      
      for (const entityType of entityTypes) {
        const collection = `novel_${novelId}_${entityType === 'timeline' ? 'timeline' : entityType + 's'}`;
        
        try {
          const similarItems = await this.vectorEmbeddingService.querySimilar(
            queryText,
            {},
            Math.ceil(limit / entityTypes.length),
            collection
          );
          
          results.push(...similarItems.map(item => ({
            ...item,
            entity_type: entityType
          })));
        } catch (error) {
          console.warn(`查询 ${entityType} 相似项失败:`, error);
        }
      }
      
      // 按相似度排序并限制数量
      return results
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('查询相似实体失败:', error);
      throw error;
    }
  }
} 