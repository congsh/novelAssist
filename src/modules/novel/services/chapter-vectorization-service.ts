// import { ipcRenderer } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { VectorEmbeddingService } from '../../ai/services/vector-embedding-service';

/**
 * 章节内容向量化服务
 * 负责将小说章节内容进行向量化处理，并存储到向量数据库
 * 支持章节内容变更时自动更新向量
 */
export class ChapterVectorizationService {
  private vectorService: VectorEmbeddingService;
  private defaultModelId: string = 'text-embedding-3-small'; // 默认使用OpenAI的嵌入模型
  private chapterCollectionName: string = 'novel_chapters';
  private chunkCollectionName: string = 'chapter_chunks';
  private maxChunkSize: number = 1000; // 最大分块大小（字符数）
  private minChunkSize: number = 200;  // 最小分块大小（字符数）
  private chunkOverlap: number = 50;   // 分块重叠大小（字符数）
  
  constructor(vectorService: VectorEmbeddingService) {
    this.vectorService = vectorService;
  }
  
  /**
   * 初始化服务
   */
  public async initialize(): Promise<boolean> {
    if (!this.vectorService.isVectorStoreEnabled()) {
      console.warn('[ChapterVectorizationService] 向量存储未启用，章节向量化功能不可用');
      return false;
    }
    
    return true;
  }
  
  /**
   * 向量化单个章节内容
   * @param chapterId 章节ID
   * @param modelId 模型ID，默认使用OpenAI的text-embedding-3-small
   */
  public async vectorizeChapter(chapterId: string, modelId: string = this.defaultModelId): Promise<boolean> {
    try {
      // 获取章节内容
      const chapter = await this.getChapter(chapterId);
      if (!chapter) {
        console.error(`[ChapterVectorizationService] 获取章节失败: ${chapterId}`);
        return false;
      }
      
      // 创建章节级别的向量表示
      const chapterMetadata = {
        sourceId: chapter.id,
        sourceType: 'chapter',
        novelId: chapter.novel_id,
        title: chapter.title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        additionalContext: {
          wordCount: chapter.word_count,
          chapterCreatedAt: chapter.created_at,
          chapterUpdatedAt: chapter.updated_at,
          parentId: chapter.parent_id
        }
      };
      
      // 向量化并保存章节内容
      const chapterVector = await this.vectorService.createAndSaveVectorEmbedding(
        chapter.content,
        modelId,
        chapterMetadata,
        this.chapterCollectionName
      );
      
      if (!chapterVector) {
        console.error(`[ChapterVectorizationService] 章节向量化失败: ${chapterId}`);
        return false;
      }
      
      // 将章节内容分块并向量化
      await this.vectorizeChapterChunks(chapter, modelId);
      
      console.log(`[ChapterVectorizationService] 章节向量化完成: ${chapter.title}`);
      return true;
    } catch (error) {
      console.error(`[ChapterVectorizationService] 章节向量化出错:`, error);
      return false;
    }
  }
  
  /**
   * 向量化章节内容的分块
   * @param chapter 章节对象
   * @param modelId 模型ID
   */
  private async vectorizeChapterChunks(chapter: any, modelId: string): Promise<boolean> {
    try {
      // 删除该章节已有的分块向量
      await this.deleteChapterChunks(chapter.id);
      
      // 将章节内容分块
      const chunks = this.splitTextIntoChunks(chapter.content);
      if (chunks.length === 0) {
        console.warn(`[ChapterVectorizationService] 章节内容为空或无法分块: ${chapter.id}`);
        return false;
      }
      
      // 准备批量向量化的数据
      const texts = chunks.map(chunk => chunk.text);
      const metadatas = chunks.map(chunk => ({
        sourceId: chunk.id,
        sourceType: 'chunk',
        novelId: chapter.novel_id,
        title: chapter.title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        section: `${chunk.startIndex}-${chunk.endIndex}`,
        additionalContext: {
          chapterId: chapter.id,
          chunkIndex: chunk.index,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          chunkType: chunk.type || 'general'  // 添加分块类型
        }
      }));
      
      // 批量向量化并保存分块
      const chunkVectors = await this.vectorService.createAndSaveVectorEmbeddingBatch(
        texts,
        modelId,
        metadatas,
        this.chunkCollectionName
      );
      
      console.log(`[ChapterVectorizationService] 章节分块向量化完成: ${chapter.title}, 共${chunkVectors.length}个分块`);
      
      // 输出分块类型统计
      const typeCounts = chunks.reduce((acc, chunk) => {
        const type = chunk.type || 'general';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`[ChapterVectorizationService] 分块类型统计:`, typeCounts);
      
      return chunkVectors.length > 0;
    } catch (error) {
      console.error(`[ChapterVectorizationService] 章节分块向量化出错:`, error);
      return false;
    }
  }
  
  /**
   * 将文本分割成多个块
   * @param text 文本内容
   */
  private splitTextIntoChunks(text: string): Array<{
    id: string;
    text: string;
    startIndex: number;
    endIndex: number;
    index: number;
    type?: 'general' | 'scene' | 'dialogue';  // 分块类型
  }> {
    if (!text || text.trim().length === 0) {
      return [];
    }
    
    const chunks: Array<{
      id: string;
      text: string;
      startIndex: number;
      endIndex: number;
      index: number;
      type?: 'general' | 'scene' | 'dialogue';
    }> = [];
    
    // 首先识别场景和对话
    const sections = this.identifySections(text);
    
    let currentChunk = '';
    let currentStartIndex = 0;
    let currentIndex = 0;
    let textPosition = 0;
    let currentType: 'general' | 'scene' | 'dialogue' = 'general';
    
    for (const section of sections) {
      // 如果是新的场景或对话，并且当前块不为空，则保存当前块
      if ((section.type !== currentType || section.text.length > this.maxChunkSize / 2) && 
          currentChunk.length >= this.minChunkSize) {
        chunks.push({
          id: uuidv4(),
          text: currentChunk,
          startIndex: currentStartIndex,
          endIndex: textPosition - 1,
          index: currentIndex,
          type: currentType
        });
        
        // 开始新块，保留一些重叠内容
        const lastPart = currentChunk.slice(-this.chunkOverlap);
        currentChunk = lastPart + section.text;
        currentStartIndex = textPosition - lastPart.length;
        currentIndex++;
        currentType = section.type;
      } else if (currentChunk.length + section.text.length > this.maxChunkSize) {
        // 如果当前块加上当前段落超过最大块大小，则保存当前块并开始新块
        chunks.push({
          id: uuidv4(),
          text: currentChunk,
          startIndex: currentStartIndex,
          endIndex: textPosition - 1,
          index: currentIndex,
          type: currentType
        });
        
        // 开始新块，保留一些重叠内容
        const lastPart = currentChunk.slice(-this.chunkOverlap);
        currentChunk = lastPart + section.text;
        currentStartIndex = textPosition - lastPart.length;
        currentIndex++;
      } else {
        // 否则将段落添加到当前块
        if (currentChunk.length === 0) {
          currentType = section.type; // 如果是新块，设置类型
        }
        currentChunk += section.text;
      }
      
      textPosition += section.text.length;
    }
    
    // 保存最后一个块
    if (currentChunk.length > 0) {
      chunks.push({
        id: uuidv4(),
        text: currentChunk,
        startIndex: currentStartIndex,
        endIndex: textPosition - 1,
        index: currentIndex,
        type: currentType
      });
    }
    
    return chunks;
  }
  
  /**
   * 识别文本中的场景和对话部分
   * @param text 文本内容
   */
  private identifySections(text: string): Array<{
    text: string;
    type: 'general' | 'scene' | 'dialogue';
  }> {
    // 按段落分割
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
    const sections: Array<{
      text: string;
      type: 'general' | 'scene' | 'dialogue';
    }> = [];
    
    // 场景标记正则表达式
    const sceneMarkers = [
      /^(场景|SCENE|Scene|EXT\.|INT\.)/i,
      /^(第.+场|第.+幕)/,
      /^([\s\*\-\_\=]{3,})/,
      /^(时间|地点|场景描述|场景转换)/
    ];
    
    // 对话标记正则表达式
    const dialogueMarkers = [
      /^[\s]*["'""](.+)["'""][\s]*$/,  // 引号包围的内容
      /^[\s]*[A-Za-z\u4e00-\u9fa5]+[:：](.+)$/,  // 人名后跟冒号
      /^[\s]*["'""]/, // 以引号开头
      /^[\s]*[（\(][A-Za-z\u4e00-\u9fa5]+[）\)][:：]/ // (人名):
    ];
    
    let currentType: 'general' | 'scene' | 'dialogue' = 'general';
    let consecutiveDialogueCount = 0;
    let consecutiveGeneralCount = 0;
    
    for (const paragraph of paragraphs) {
      // 检查是否是场景标记
      const isScene = sceneMarkers.some(marker => marker.test(paragraph));
      
      // 检查是否是对话
      const isDialogue = dialogueMarkers.some(marker => marker.test(paragraph));
      
      // 根据上下文和标记确定类型
      let paragraphType: 'general' | 'scene' | 'dialogue';
      
      if (isScene) {
        paragraphType = 'scene';
        consecutiveDialogueCount = 0;
        consecutiveGeneralCount = 0;
      } else if (isDialogue) {
        paragraphType = 'dialogue';
        consecutiveDialogueCount++;
        consecutiveGeneralCount = 0;
      } else {
        // 如果前面有连续对话，并且当前段落较短，可能是对话的一部分
        if (consecutiveDialogueCount > 0 && paragraph.length < 100) {
          paragraphType = 'dialogue';
          consecutiveDialogueCount++;
        } else {
          paragraphType = 'general';
          consecutiveDialogueCount = 0;
          consecutiveGeneralCount++;
        }
      }
      
      // 如果类型变化或者是第一段，创建新的部分
      if (paragraphType !== currentType || sections.length === 0) {
        sections.push({
          text: paragraph + '\n',
          type: paragraphType
        });
        currentType = paragraphType;
      } else {
        // 否则将段落添加到当前部分
        const lastSection = sections[sections.length - 1];
        lastSection.text += paragraph + '\n';
      }
    }
    
    return sections;
  }
  
  /**
   * 删除章节的分块向量
   * @param chapterId 章节ID
   */
  private async deleteChapterChunks(chapterId: string): Promise<boolean> {
    try {
      // 使用向量数据库的过滤功能删除指定章节的所有分块
      await window.electron.invoke('vector:delete-by-filter', {
        where: { 
          additionalContext: { 
            chapterId 
          } 
        },
        collectionName: this.chunkCollectionName
      });
      
      return true;
    } catch (error) {
      console.error(`[ChapterVectorizationService] 删除章节分块向量出错:`, error);
      return false;
    }
  }
  
  /**
   * 向量化小说的所有章节
   * @param novelId 小说ID
   * @param modelId 模型ID
   */
  public async vectorizeNovelChapters(novelId: string, modelId: string = this.defaultModelId): Promise<boolean> {
    try {
      // 获取小说的所有章节
      const chapters = await this.getNovelChapters(novelId);
      if (!chapters || chapters.length === 0) {
        console.warn(`[ChapterVectorizationService] 小说没有章节: ${novelId}`);
        return false;
      }
      
      console.log(`[ChapterVectorizationService] 开始向量化小说章节，共${chapters.length}章`);
      
      // 批量处理所有章节
      let successCount = 0;
      for (const chapter of chapters) {
        const success = await this.vectorizeChapter(chapter.id, modelId);
        if (success) {
          successCount++;
        }
      }
      
      console.log(`[ChapterVectorizationService] 小说章节向量化完成: ${successCount}/${chapters.length}章成功`);
      return successCount > 0;
    } catch (error) {
      console.error(`[ChapterVectorizationService] 小说章节向量化出错:`, error);
      return false;
    }
  }
  
  /**
   * 获取章节内容
   * @param chapterId 章节ID
   */
  private async getChapter(chapterId: string): Promise<any> {
    try {
      const response = await window.electron.invoke('get-chapter', { id: chapterId });
      if (response.success) {
        return response.data;
      } else {
        console.error(`[ChapterVectorizationService] 获取章节失败: ${response.error}`);
        return null;
      }
    } catch (error) {
      console.error(`[ChapterVectorizationService] 获取章节出错:`, error);
      return null;
    }
  }
  
  /**
   * 获取小说的所有章节
   * @param novelId 小说ID
   */
  private async getNovelChapters(novelId: string): Promise<any[]> {
    try {
      const response = await window.electron.invoke('get-chapters', { novelId });
      if (response.success) {
        return response.data;
      } else {
        console.error(`[ChapterVectorizationService] 获取小说章节失败: ${response.error}`);
        return [];
      }
    } catch (error) {
      console.error(`[ChapterVectorizationService] 获取小说章节出错:`, error);
      return [];
    }
  }
  
  /**
   * 根据章节ID查询相似内容
   * @param chapterId 章节ID
   * @param queryText 查询文本
   * @param limit 结果数量限制
   */
  public async querySimilarContent(
    chapterId: string, 
    queryText: string, 
    limit: number = 5
  ): Promise<any[]> {
    try {
      // 查询相似的章节分块
      const filter = { 
        additionalContext: { 
          chapterId 
        } 
      };
      const results = await this.vectorService.querySimilar(
        queryText,
        filter,
        limit,
        this.chunkCollectionName
      );
      
      return results;
    } catch (error) {
      console.error(`[ChapterVectorizationService] 查询相似内容出错:`, error);
      return [];
    }
  }
  
  /**
   * 根据小说ID查询相似内容
   * @param novelId 小说ID
   * @param queryText 查询文本
   * @param limit 结果数量限制
   */
  public async querySimilarContentInNovel(
    novelId: string, 
    queryText: string, 
    limit: number = 5
  ): Promise<any[]> {
    try {
      // 查询相似的章节分块
      const filter = { novelId };
      const results = await this.vectorService.querySimilar(
        queryText,
        filter,
        limit,
        this.chunkCollectionName
      );
      
      return results;
    } catch (error) {
      console.error(`[ChapterVectorizationService] 查询小说相似内容出错:`, error);
      return [];
    }
  }
  
  /**
   * 根据章节ID和分块类型查询相似内容
   * @param chapterId 章节ID
   * @param queryText 查询文本
   * @param chunkType 分块类型（场景、对话或通用）
   * @param limit 结果数量限制
   */
  public async querySimilarContentByType(
    chapterId: string, 
    queryText: string,
    chunkType: 'scene' | 'dialogue' | 'general' = 'general',
    limit: number = 5
  ): Promise<any[]> {
    try {
      // 查询相似的章节分块，按类型过滤
      const filter = { 
        additionalContext: { 
          chapterId,
          chunkType
        } 
      };
      
      const results = await this.vectorService.querySimilar(
        queryText,
        filter,
        limit,
        this.chunkCollectionName
      );
      
      return results;
    } catch (error) {
      console.error(`[ChapterVectorizationService] 按类型查询相似内容出错:`, error);
      return [];
    }
  }
  
  /**
   * 根据小说ID和分块类型查询相似内容
   * @param novelId 小说ID
   * @param queryText 查询文本
   * @param chunkType 分块类型（场景、对话或通用）
   * @param limit 结果数量限制
   */
  public async querySimilarContentInNovelByType(
    novelId: string, 
    queryText: string,
    chunkType: 'scene' | 'dialogue' | 'general' = 'general',
    limit: number = 5
  ): Promise<any[]> {
    try {
      // 查询相似的章节分块，按类型过滤
      const filter = { 
        novelId,
        additionalContext: {
          chunkType
        }
      };
      
      const results = await this.vectorService.querySimilar(
        queryText,
        filter,
        limit,
        this.chunkCollectionName
      );
      
      return results;
    } catch (error) {
      console.error(`[ChapterVectorizationService] 按类型查询小说相似内容出错:`, error);
      return [];
    }
  }
  
  /**
   * 获取章节中的所有场景
   * @param chapterId 章节ID
   * @param limit 结果数量限制
   */
  public async getChapterScenes(chapterId: string, limit: number = 20): Promise<any[]> {
    try {
      // 获取章节内容
      const chapter = await this.getChapter(chapterId);
      if (!chapter) {
        return [];
      }
      
      // 分块并只保留场景类型的块
      const allChunks = this.splitTextIntoChunks(chapter.content);
      const sceneChunks = allChunks.filter(chunk => chunk.type === 'scene');
      
      // 返回场景块，最多limit个
      return sceneChunks.slice(0, limit).map(chunk => ({
        id: chunk.id,
        text: chunk.text,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
        index: chunk.index,
        type: chunk.type
      }));
    } catch (error) {
      console.error(`[ChapterVectorizationService] 获取章节场景出错:`, error);
      return [];
    }
  }
  
  /**
   * 获取章节中的所有对话
   * @param chapterId 章节ID
   * @param limit 结果数量限制
   */
  public async getChapterDialogues(chapterId: string, limit: number = 20): Promise<any[]> {
    try {
      // 获取章节内容
      const chapter = await this.getChapter(chapterId);
      if (!chapter) {
        return [];
      }
      
      // 分块并只保留对话类型的块
      const allChunks = this.splitTextIntoChunks(chapter.content);
      const dialogueChunks = allChunks.filter(chunk => chunk.type === 'dialogue');
      
      // 返回对话块，最多limit个
      return dialogueChunks.slice(0, limit).map(chunk => ({
        id: chunk.id,
        text: chunk.text,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
        index: chunk.index,
        type: chunk.type
      }));
    } catch (error) {
      console.error(`[ChapterVectorizationService] 获取章节对话出错:`, error);
      return [];
    }
  }
}

// 导出章节向量化服务单例
export const chapterVectorizationService = new ChapterVectorizationService(
  // 这里需要在使用时注入VectorEmbeddingService实例
  null as any
); 