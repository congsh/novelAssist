import { v4 as uuidv4 } from 'uuid';
// import { ipcRenderer } from 'electron';
import { 
  AISettings, 
  AIProviderType,
  EmbeddingRequest, 
  EmbeddingResponse,
  VectorEmbedding,
  VectorStoreType
} from '../types';
import { aiServiceManager } from './ai-service-manager';
import { AIRequestQueue } from './ai-request-queue';
import { AIBaseService } from './ai-base-service';
import { VectorEmbeddingUtils } from './vector-embedding-service-utils';

/**
 * 向量嵌入服务
 * 提供文本向量化功能，支持使用不同的模型和服务进行文本嵌入
 * 添加对向量数据库的支持，可保存和检索向量
 */
export class VectorEmbeddingService {
  private serviceManager: typeof aiServiceManager;
  private requestQueue: AIRequestQueue;
  private settings: AISettings | null = null;
  private embeddingCache: Map<string, EmbeddingResponse> = new Map();
  private cacheKeyPrefix = 'embed_';
  private maxCacheSize = 1000; // 最大缓存数量
  private vectorStoreEnabled = false; // 是否启用向量存储
  private vectorStoreType: VectorStoreType = VectorStoreType.CHROMA; // 向量存储类型
  
  constructor(serviceManager: typeof aiServiceManager, requestQueue: AIRequestQueue) {
    this.serviceManager = serviceManager;
    this.requestQueue = requestQueue;
  }
  
  /**
   * 初始化服务
   * @param settings AI设置
   */
  public async initialize(settings: AISettings): Promise<boolean> {
    this.settings = settings;
    
    // 检查向量数据库是否可用
    try {
      // 使用IPC调用主进程检查向量数据库是否可用
      const collections = await window.electron.invoke('vector:list-collections');
      console.log('[VectorEmbeddingService] 向量数据库可用，已加载集合:', collections);
      this.vectorStoreEnabled = true;
    } catch (error) {
      console.warn('[VectorEmbeddingService] 向量数据库不可用:', error);
      this.vectorStoreEnabled = false;
    }
    
    return true;
  }
  
  /**
   * 检查向量存储是否可用
   */
  public isVectorStoreEnabled(): boolean {
    return this.vectorStoreEnabled;
  }
  
  /**
   * 获取向量存储类型
   */
  public getVectorStoreType(): VectorStoreType {
    return this.vectorStoreType;
  }
  
  /**
   * 获取AI设置
   */
  public getSettings(): AISettings | null {
    return this.settings;
  }
  
  /**
   * 生成文本的向量嵌入
   * @param request 嵌入请求
   */
  public async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    // 检查缓存
    const cacheKey = VectorEmbeddingUtils.getCacheKey(request.text, request.modelId);
    const cachedEmbedding = this.embeddingCache.get(cacheKey);
    
    if (cachedEmbedding) {
      console.log(`[VectorEmbeddingService] 从缓存获取嵌入: ${cacheKey.slice(0, 20)}...`);
      return cachedEmbedding;
    }
    
    // 尝试使用合适的服务创建嵌入
    try {
      // 检查是否配置了AI
      const aiSettingsService = await import('./ai-settings-service').then(m => m.AISettingsService.getInstance());
      const settings = this.settings || this.serviceManager.getSettings();
      
      if (settings) {
        const hasConfiguredAI = await aiSettingsService.hasConfiguredAI(settings);
        
        if (!hasConfiguredAI) {
          // 通知UI显示配置提示
          await window.electron.invoke('dialog:show', {
            type: 'info',
            title: 'AI服务未配置',
            message: '请先在AI设置中配置OpenAI或兼容服务才能使用嵌入功能',
            buttons: ['确定']
          });
          
          // 打开AI设置页面
          await window.electron.invoke('app:navigate', { path: '/settings/ai' });
          
          throw new Error('AI服务未配置，请先配置AI服务');
        }
      }
      
      // 将请求加入队列，等待处理
      const response = await this.processQueuedRequest(
        'embedding',
        async () => this.processEmbeddingRequest(request)
      );
      
      // 添加到缓存
      this.addToCache(cacheKey, response);
      
      return response;
    } catch (error) {
      console.error('[VectorEmbeddingService] 创建嵌入失败:', error);
      throw new Error(`创建嵌入失败: ${(error as Error).message}`);
    }
  }
  
  /**
   * 处理排队请求
   * @param requestType 请求类型
   * @param requestFn 请求处理函数
   */
  private async processQueuedRequest<T>(requestType: string, requestFn: () => Promise<T>): Promise<T> {
    // 实际应用时，这里应该使用AIRequestQueue的队列处理机制
    // 现在先提供一个简单的实现
    console.log(`[VectorEmbeddingService] 处理${requestType}请求`);
    return requestFn();
  }
  
  /**
   * 批量生成文本的向量嵌入
   * @param texts 文本数组
   * @param modelId 模型ID
   * @param batchSize 批处理大小
   */
  public async createEmbeddingBatch(
    texts: string[], 
    modelId: string, 
    batchSize: number = 10
  ): Promise<EmbeddingResponse[]> {
    const results: EmbeddingResponse[] = [];
    
    // 批量处理文本
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => 
        this.createEmbedding({ text, modelId })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
  
  /**
   * 处理嵌入请求
   * @param request 嵌入请求
   */
  private async processEmbeddingRequest(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.settings) {
      // 尝试从服务管理器获取当前设置
      const currentSettings = this.serviceManager.getSettings();
      
      if (currentSettings) {
        // 如果服务管理器有设置，则自动初始化
        await this.initialize(currentSettings);
      } else {
        throw new Error('向量嵌入服务未初始化，且无法自动获取设置');
      }
    }
    
    // 再次检查初始化状态
    if (!this.settings) {
      throw new Error('向量嵌入服务未初始化');
    }
    
    // 检查是否配置了AI
    const aiSettingsService = await import('./ai-settings-service').then(m => m.AISettingsService.getInstance());
    const hasConfiguredAI = await aiSettingsService.hasConfiguredAI(this.settings);
    
    if (!hasConfiguredAI) {
      // 通知UI显示配置提示
      await window.electron.invoke('dialog:show', {
        type: 'info',
        title: 'AI服务未配置',
        message: '请先在AI设置中配置OpenAI或兼容服务才能使用嵌入功能',
        buttons: ['确定']
      });
      
      // 打开AI设置页面
      await window.electron.invoke('app:navigate', { path: '/settings/ai' });
      
      throw new Error('AI服务未配置，请先配置AI服务');
    }
    
    // 查找支持嵌入的提供商和模型
    const { providerId, service, targetModel } = this.findEmbeddingProvider(request.modelId);
    
    if (!service) {
      throw new Error(`未找到支持嵌入的服务提供商(${request.modelId})`);
    }
    
    if (!service.getProviderType) {
      throw new Error(`服务提供商(${providerId})不支持获取提供商类型`);
    }
    
    // 创建嵌入请求，使用正确的模型名称
    const embeddingRequest: EmbeddingRequest = {
      text: request.text,
      modelId: targetModel.name || targetModel.id // 优先使用模型名称
    };
    
    // 根据提供商类型选择不同的处理方法
    try {
      const providerType = service.getProviderType();
      switch (providerType) {
        case AIProviderType.OPENAI:
          return await this.createOpenAIEmbedding(embeddingRequest, providerId);
        case AIProviderType.DEEPSEEK:
          return await this.createDeepSeekEmbedding(embeddingRequest, providerId);
        case AIProviderType.OPENAI_COMPATIBLE:
          return await this.createOpenAICompatibleEmbedding(embeddingRequest, providerId);
        default:
          // 对于不支持嵌入的服务，使用简单的本地嵌入
          console.warn(`提供商 ${providerType} 不支持嵌入，使用本地嵌入`);
          return {
            id: uuidv4(),
            embedding: VectorEmbeddingUtils.createLocalEmbedding(request.text),
            model: 'local-embedding-model'
          };
      }
    } catch (error) {
      console.error('[VectorEmbeddingService] 处理嵌入请求失败:', error);
      throw error;
    }
  }
  
  /**
   * 查找支持嵌入的提供商和服务
   * @param modelId 模型ID，优先查找指定的模型
   * @returns 提供商ID和服务
   */
  private findEmbeddingProvider(modelId: string) {
    if (!this.settings) {
      throw new Error('向量嵌入服务未初始化');
    }
    
    // 查找嵌入模型
    const embeddingModels = this.settings.models.filter(m => m.isEmbeddingModel);
    
    // 如果没有配置任何嵌入模型，给出明确提示
    if (embeddingModels.length === 0) {
      throw new Error(
        '未配置嵌入模型。请前往 AI设置 > 模型管理，添加嵌入模型并启用"嵌入模型"开关。' +
        '对于SiliconFlow等服务，推荐使用BAAI/bge-large-zh-v1.5或BAAI/bge-m3等嵌入模型。'
      );
    }
    
    // 如果指定了模型ID，优先查找指定的模型
    let targetModel: any = null;
    if (modelId) {
      targetModel = this.settings.models.find(m => m.id === modelId);
      if (targetModel && !targetModel.isEmbeddingModel) {
        console.warn(`指定的模型 ${modelId} 不是嵌入模型，将使用默认嵌入模型`);
        targetModel = null;
      }
    }
    
    // 如果没有找到指定的模型，使用第一个嵌入模型
    if (!targetModel) {
      targetModel = embeddingModels[0];
    }
    
    const providerId = targetModel.providerId;
    const service = this.serviceManager.getService(providerId);
    
    if (!service) {
      throw new Error(
        `未找到嵌入模型 "${targetModel.name}" 对应的服务提供商。` +
        '请检查 AI设置 中的提供商配置是否正确。'
      );
    }
    
    return { providerId, service, targetModel };
  }
  
  /**
   * 使用OpenAI服务创建嵌入
   * @param request 嵌入请求
   * @param providerId 提供商ID
   */
  private async createOpenAIEmbedding(
    request: EmbeddingRequest, 
    providerId: string
  ): Promise<EmbeddingResponse> {
    try {
      const service = this.serviceManager.getService(providerId);
      
      if (!service) {
        throw new Error(`未找到ID为 ${providerId} 的OpenAI服务`);
      }
      
      // 调用OpenAI API创建嵌入，传递完整的request对象
      const embedding = await service.createEmbedding?.(request);
      
      if (!embedding) {
        throw new Error('OpenAI服务不支持嵌入功能');
      }
      
      return embedding;
    } catch (error) {
      console.error('[VectorEmbeddingService] OpenAI嵌入创建失败:', error);
      throw error;
    }
  }
  
  /**
   * 使用DeepSeek服务创建嵌入
   * @param request 嵌入请求
   * @param providerId 提供商ID
   */
  private async createDeepSeekEmbedding(
    request: EmbeddingRequest, 
    providerId: string
  ): Promise<EmbeddingResponse> {
    try {
      const service = this.serviceManager.getService(providerId);
      
      if (!service) {
        throw new Error(`未找到ID为 ${providerId} 的DeepSeek服务`);
      }
      
      // 调用DeepSeek API创建嵌入，传递完整的request对象
      const embedding = await service.createEmbedding?.(request);
      
      if (!embedding) {
        throw new Error('DeepSeek服务不支持嵌入功能');
      }
      
      return embedding;
    } catch (error) {
      console.error('[VectorEmbeddingService] DeepSeek嵌入创建失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建OpenAI兼容嵌入
   * @param request 嵌入请求
   * @param providerId 提供商ID
   */
  private async createOpenAICompatibleEmbedding(
    request: EmbeddingRequest, 
    providerId: string
  ): Promise<EmbeddingResponse> {
    try {
      const service = this.serviceManager.getService(providerId);
      
      if (!service) {
        throw new Error(`未找到ID为 ${providerId} 的OpenAI兼容服务`);
      }
      
      // 调用OpenAI兼容API创建嵌入，传递完整的request对象
      const embedding = await service.createEmbedding?.(request);
      
      if (!embedding) {
        throw new Error('OpenAI兼容服务不支持嵌入功能');
      }
      
      return embedding;
    } catch (error) {
      console.error('[VectorEmbeddingService] OpenAI兼容嵌入创建失败:', error);
      throw error;
    }
  }
  
  /**
   * 添加到缓存
   * @param key 缓存键
   * @param embedding 嵌入响应
   */
  private addToCache(key: string, embedding: EmbeddingResponse): void {
    // 如果缓存已满，删除最旧的条目
    if (this.embeddingCache.size >= this.maxCacheSize) {
      const oldestKey = this.embeddingCache.keys().next().value;
      if (oldestKey) {
        this.embeddingCache.delete(oldestKey);
      }
    }
    
    // 添加到缓存
    this.embeddingCache.set(key, embedding);
  }
  
  /**
   * 清空缓存
   */
  public clearCache(): void {
    this.embeddingCache.clear();
    console.log('[VectorEmbeddingService] 缓存已清空');
  }
  
  /**
   * 保存向量嵌入到向量存储
   * @param vectorEmbedding 向量嵌入
   * @param collectionName 集合名称
   */
  public async saveToVectorStore(
    vectorEmbedding: VectorEmbedding, 
    collectionName: string = 'default'
  ): Promise<boolean> {
    if (!this.vectorStoreEnabled) {
      console.warn('[VectorEmbeddingService] 向量存储未启用，无法保存向量');
      return false;
    }
    
    try {
      // 扁平化元数据，确保Chroma可以处理
      const flattenedMetadata = VectorEmbeddingUtils.flattenMetadata(vectorEmbedding.metadata);
      
      // 额外验证：确保元数据中没有null值，并过滤掉空字符串
      const validatedMetadata: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(flattenedMetadata)) {
        if (value !== null && value !== undefined && value !== '') {
          validatedMetadata[key] = value;
        }
      }
      
      console.log(`[VectorEmbeddingService] 准备保存向量，ID: ${vectorEmbedding.id}, 元数据: `, validatedMetadata);
      
      // 调用主进程保存向量，包含实际的向量数据
      await window.electron.invoke('vector:create-embedding', {
        id: vectorEmbedding.id,
        text: vectorEmbedding.text,
        embedding: vectorEmbedding.embedding, // 传递实际的向量数据
        metadata: validatedMetadata,
        collectionName
      });
      
      console.log(`[VectorEmbeddingService] 向量已保存到集合: ${collectionName}`);
      return true;
    } catch (error) {
      console.error('[VectorEmbeddingService] 保存向量失败:', error);
      throw error;
    }
  }
  
  /**
   * 批量保存向量嵌入到向量存储
   * @param vectorEmbeddings 向量嵌入数组
   * @param collectionName 集合名称
   */
  public async saveToVectorStoreBatch(
    vectorEmbeddings: VectorEmbedding[], 
    collectionName: string = 'default'
  ): Promise<boolean> {
    if (!this.vectorStoreEnabled) {
      console.warn('[VectorEmbeddingService] 向量存储未启用，无法批量保存向量');
      return false;
    }
    
    if (vectorEmbeddings.length === 0) {
      return true;
    }
    
    try {
      // 准备批量保存的数据，扁平化所有元数据
      const ids = vectorEmbeddings.map(v => v.id);
      const texts = vectorEmbeddings.map(v => v.text);
      const embeddings = vectorEmbeddings.map(v => v.embedding); // 提取实际的向量数据
      
      // 验证和处理元数据
      const validatedMetadatas = vectorEmbeddings.map(v => {
        const flattenedMetadata = VectorEmbeddingUtils.flattenMetadata(v.metadata);
        
        // 额外验证：确保元数据中没有null值，并过滤掉空字符串
        const validatedMetadata: Record<string, string | number | boolean> = {};
        for (const [key, value] of Object.entries(flattenedMetadata)) {
          if (value !== null && value !== undefined && value !== '') {
            validatedMetadata[key] = value;
          }
        }
        
        return validatedMetadata;
      });
      
      console.log(`[VectorEmbeddingService] 准备批量保存 ${vectorEmbeddings.length} 个向量`);
      
      // 调用主进程批量保存向量，包含实际的向量数据
      await window.electron.invoke('vector:create-embedding-batch', {
        ids,
        texts,
        embeddings, // 传递实际的向量数据数组
        metadatas: validatedMetadatas,
        collectionName
      });
      
      console.log(`[VectorEmbeddingService] 已批量保存 ${vectorEmbeddings.length} 个向量到集合: ${collectionName}`);
      return true;
    } catch (error) {
      console.error('[VectorEmbeddingService] 批量保存向量失败:', error);
      throw error;
    }
  }
  
  /**
   * 查询相似向量
   * @param queryText 查询文本
   * @param filter 过滤条件
   * @param limit 限制结果数量
   * @param collectionName 集合名称
   */
  public async querySimilar(
    queryText: string,
    filter: Record<string, any> = {},
    limit: number = 5,
    collectionName: string = 'default'
  ): Promise<any[]> {
    if (!this.vectorStoreEnabled) {
      console.warn('[VectorEmbeddingService] 向量存储未启用，无法查询相似向量');
      return [];
    }
    
    try {
      // 调用主进程查询相似向量
      const results = await window.electron.invoke('vector:query-similar', {
        queryText,
        filter,
        limit,
        collectionName
      });
      
      console.log(`[VectorEmbeddingService] 查询到 ${results.length} 个相似向量`);
      return results;
    } catch (error) {
      console.error('[VectorEmbeddingService] 查询相似向量失败:', error);
      throw error;
    }
  }
  
  /**
   * 从向量存储中删除向量
   * @param ids 向量ID数组
   * @param collectionName 集合名称
   */
  public async deleteFromVectorStore(
    ids: string[],
    collectionName: string = 'default'
  ): Promise<boolean> {
    if (!this.vectorStoreEnabled) {
      console.warn('[VectorEmbeddingService] 向量存储未启用，无法删除向量');
      return false;
    }
    
    if (ids.length === 0) {
      return true;
    }
    
    try {
      // 调用主进程删除向量
      await window.electron.invoke('vector:delete-by-ids', {
        ids,
        collectionName
      });
      
      console.log(`[VectorEmbeddingService] 已删除 ${ids.length} 个向量`);
      return true;
    } catch (error) {
      console.error('[VectorEmbeddingService] 删除向量失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建和保存向量嵌入
   * @param text 文本
   * @param modelId 模型ID
   * @param metadata 元数据
   * @param collectionName 集合名称
   */
  public async createAndSaveVectorEmbedding(
    text: string,
    modelId: string,
    metadata: Partial<VectorEmbedding['metadata']> = {},
    collectionName: string = 'default'
  ): Promise<VectorEmbedding | null> {
    try {
      // 创建嵌入
      const embeddingResponse = await this.createEmbedding({ text, modelId });
      
      // 创建向量嵌入对象
      const vectorEmbedding = VectorEmbeddingUtils.createVectorEmbedding(
        text,
        embeddingResponse.embedding,
        metadata
      );
      
      // 保存到向量存储
      if (this.vectorStoreEnabled) {
        await this.saveToVectorStore(vectorEmbedding, collectionName);
      }
      
      return vectorEmbedding;
    } catch (error) {
      console.error('[VectorEmbeddingService] 创建和保存向量嵌入失败:', error);
      return null;
    }
  }
  
  /**
   * 批量创建和保存向量嵌入
   * @param texts 文本数组
   * @param modelId 模型ID
   * @param metadatas 元数据数组
   * @param collectionName 集合名称
   */
  public async createAndSaveVectorEmbeddingBatch(
    texts: string[],
    modelId: string,
    metadatas: Partial<VectorEmbedding['metadata']>[] = [],
    collectionName: string = 'default'
  ): Promise<VectorEmbedding[]> {
    try {
      // 创建嵌入
      const embeddingResponses = await this.createEmbeddingBatch(texts, modelId);
      
      // 创建向量嵌入对象
      const vectorEmbeddings = embeddingResponses.map((response, index) => {
        return VectorEmbeddingUtils.createVectorEmbedding(
          texts[index],
          response.embedding,
          metadatas[index] || {}
        );
      });
      
      // 保存到向量存储
      if (this.vectorStoreEnabled && vectorEmbeddings.length > 0) {
        await this.saveToVectorStoreBatch(vectorEmbeddings, collectionName);
      }
      
      return vectorEmbeddings;
    } catch (error) {
      console.error('[VectorEmbeddingService] 批量创建和保存向量嵌入失败:', error);
      return [];
    }
  }
} 