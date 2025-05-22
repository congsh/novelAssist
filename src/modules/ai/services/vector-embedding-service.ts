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
    const cacheKey = this.getCacheKey(request.text, request.modelId);
    const cachedEmbedding = this.embeddingCache.get(cacheKey);
    
    if (cachedEmbedding) {
      console.log(`[VectorEmbeddingService] 从缓存获取嵌入: ${cacheKey.slice(0, 20)}...`);
      return cachedEmbedding;
    }
    
    // 尝试使用合适的服务创建嵌入
    try {
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
    
    // 查找可以生成嵌入的服务
    const provider = this.findEmbeddingProvider(request.modelId);
    
    if (!provider) {
      throw new Error(`找不到支持嵌入的服务提供商: ${request.modelId}`);
    }
    
    // 如果没有指定模型ID，或者指定的模型ID不是嵌入模型，尝试使用合适的嵌入模型
    let embeddingModelId = request.modelId;
    
    if (!embeddingModelId) {
      // 查找该提供商下的嵌入模型
      const embeddingModel = this.settings.models.find(m => 
        m.providerId === provider.id && m.isEmbeddingModel
      );
      
      if (embeddingModel) {
        embeddingModelId = embeddingModel.id;
      } else {
        // 使用默认嵌入模型ID
        embeddingModelId = 'text-embedding-ada-002';
      }
    }
    
    // 创建新的请求，使用找到的嵌入模型ID
    const embeddingRequest = {
      ...request,
      modelId: embeddingModelId
    };
    
    // 根据提供商类型选择不同的嵌入方法
    switch (provider.type) {
      case AIProviderType.OPENAI:
        return this.createOpenAIEmbedding(embeddingRequest, provider.id);
        
      case AIProviderType.DEEPSEEK:
        return this.createDeepSeekEmbedding(embeddingRequest, provider.id);
        
      // 添加其他可能支持嵌入的服务类型
      case AIProviderType.OPENAI_COMPATIBLE:
        return this.createOpenAICompatibleEmbedding(embeddingRequest, provider.id);
        
      default:
        throw new Error(`提供商 ${provider.type} 不支持嵌入生成`);
    }
  }
  
  /**
   * 查找能够生成嵌入的提供商
   * @param modelId 模型ID
   */
  private findEmbeddingProvider(modelId: string) {
    if (!this.settings) {
      return null;
    }
    
    // 首先尝试直接查找与模型ID匹配的提供商
    const model = this.settings.models.find(m => m.id === modelId);
    
    if (model) {
      return this.settings.providers.find(p => p.id === model.providerId);
    }
    
    // 如果没有找到指定模型，尝试查找标记为嵌入模型的模型
    const embeddingModels = this.settings.models.filter(m => m.isEmbeddingModel);
    
    if (embeddingModels.length > 0) {
      // 按提供商类型排序，优先选择OpenAI
      const sortedModels = [...embeddingModels].sort((a, b) => {
        const providerA = this.settings?.providers.find(p => p.id === a.providerId);
        const providerB = this.settings?.providers.find(p => p.id === b.providerId);
        
        if (providerA?.type === AIProviderType.OPENAI && providerB?.type !== AIProviderType.OPENAI) {
          return -1;
        } else if (providerA?.type !== AIProviderType.OPENAI && providerB?.type === AIProviderType.OPENAI) {
          return 1;
        }
        return 0;
      });
      
      // 使用第一个可用的嵌入模型
      const selectedModel = sortedModels[0];
      return this.settings.providers.find(p => p.id === selectedModel.providerId);
    }
    
    // 如果没有找到嵌入模型，使用默认的兼容嵌入的提供商
    return this.settings.providers.find(p => 
      p.type === AIProviderType.OPENAI || 
      p.type === AIProviderType.DEEPSEEK ||
      p.type === AIProviderType.OPENAI_COMPATIBLE
    );
  }
  
  /**
   * 创建OpenAI嵌入
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
        throw new Error(`OpenAI服务未注册: ${providerId}`);
      }
      
      // 这里假设OpenAI服务实现了嵌入API (需要在OpenAIService中添加此功能)
      // 实际实现时，需要在OpenAIService中添加createEmbedding方法
      const response = await (service as any).createEmbedding({
        text: request.text,
        modelId: request.modelId
      });
      
      return {
        id: uuidv4(),
        embedding: response.embedding,
        model: response.model,
        usage: response.usage
      };
    } catch (error) {
      console.error('[VectorEmbeddingService] OpenAI嵌入生成失败:', error);
      throw new Error(`OpenAI嵌入生成失败: ${(error as Error).message}`);
    }
  }
  
  /**
   * 创建DeepSeek嵌入
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
        throw new Error(`DeepSeek服务未注册: ${providerId}`);
      }
      
      // 需要在DeepSeekService中添加createEmbedding方法
      const response = await (service as any).createEmbedding({
        text: request.text,
        modelId: request.modelId
      });
      
      return {
        id: uuidv4(),
        embedding: response.embedding,
        model: response.model,
        usage: response.usage
      };
    } catch (error) {
      console.error('[VectorEmbeddingService] DeepSeek嵌入生成失败:', error);
      throw new Error(`DeepSeek嵌入生成失败: ${(error as Error).message}`);
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
        throw new Error(`OpenAI兼容服务未注册: ${providerId}`);
      }
      
      // 需要在OpenAICompatibleService中添加createEmbedding方法
      const response = await (service as any).createEmbedding({
        text: request.text,
        modelId: request.modelId
      });
      
      return {
        id: uuidv4(),
        embedding: response.embedding,
        model: response.model,
        usage: response.usage
      };
    } catch (error) {
      console.error('[VectorEmbeddingService] OpenAI兼容嵌入生成失败:', error);
      throw new Error(`OpenAI兼容嵌入生成失败: ${(error as Error).message}`);
    }
  }
  
  /**
   * 生成本地嵌入 (备用方案，使用简单的统计方法)
   * @param text 文本
   */
  private createLocalEmbedding(text: string): number[] {
    // 这是一个非常简单的本地嵌入方案，仅作为备用
    // 实际应用中应使用专业的嵌入模型
    const words = text.toLowerCase().split(/\s+/);
    const embedding: number[] = new Array(128).fill(0);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length && j < 128; j++) {
        const charCode = word.charCodeAt(j);
        embedding[j] += charCode / 255;
      }
    }
    
    // 归一化
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => (magnitude === 0 ? 0 : val / magnitude));
  }
  
  /**
   * 创建向量嵌入数据对象
   * @param text 文本
   * @param vector 向量
   * @param metadata 元数据
   */
  public createVectorEmbedding(
    text: string, 
    vector: number[], 
    metadata: Partial<VectorEmbedding['metadata']>
  ): VectorEmbedding {
    return {
      id: uuidv4(),
      vector,
      embedding: vector,
      text,
      metadata: {
        sourceId: metadata.sourceId || uuidv4(),
        sourceType: metadata.sourceType || 'text',
        novelId: metadata.novelId || '',
        createdAt: metadata.createdAt || Date.now(),
        updatedAt: metadata.updatedAt || Date.now(),
        title: metadata.title,
        section: metadata.section,
        additionalContext: metadata.additionalContext
      }
    };
  }
  
  /**
   * 获取缓存键
   * @param text 文本
   * @param modelId 模型ID
   */
  private getCacheKey(text: string, modelId: string): string {
    // 使用文本哈希和模型ID作为缓存键
    const textHash = this.simpleHash(text);
    return `${this.cacheKeyPrefix}${modelId}_${textHash}`;
  }
  
  /**
   * 简单的字符串哈希函数
   * @param str 字符串
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }
  
  /**
   * 添加嵌入到缓存
   * @param key 缓存键
   * @param embedding 嵌入
   */
  private addToCache(key: string, embedding: EmbeddingResponse): void {
    // 如果缓存已满，移除最早的条目
    if (this.embeddingCache.size >= this.maxCacheSize) {
      const keys = Array.from(this.embeddingCache.keys());
      if (keys.length > 0) {
        // 安全地获取第一个键
        this.embeddingCache.delete(keys[0]);
      }
    }
    
    this.embeddingCache.set(key, embedding);
  }
  
  /**
   * 清除嵌入缓存
   */
  public clearCache(): void {
    this.embeddingCache.clear();
  }
  
  /**
   * 保存向量到向量存储
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
      // 将向量保存到向量存储
      await window.electron.invoke('vector:create-embedding', {
        id: vectorEmbedding.id,
        vector: vectorEmbedding.vector,
        text: vectorEmbedding.text,
        metadata: vectorEmbedding.metadata,
        collectionName
      });
      
      return true;
    } catch (error) {
      console.error('[VectorEmbeddingService] 保存向量到向量存储失败:', error);
      return false;
    }
  }
  
  /**
   * 批量保存向量到向量存储
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
      // 批量保存向量到向量存储
      await window.electron.invoke('vector:create-embedding-batch', {
        ids: vectorEmbeddings.map(ve => ve.id),
        vectors: vectorEmbeddings.map(ve => ve.vector),
        texts: vectorEmbeddings.map(ve => ve.text),
        metadatas: vectorEmbeddings.map(ve => ve.metadata),
        collectionName
      });
      
      return true;
    } catch (error) {
      console.error('[VectorEmbeddingService] 批量保存向量到向量存储失败:', error);
      return false;
    }
  }
  
  /**
   * 查询相似向量
   * @param queryText 查询文本
   * @param filter 过滤条件
   * @param limit 结果数量限制
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
      // 查询相似向量
      const results = await window.electron.invoke('vector:query-similar', {
        queryText,
        filter,
        limit,
        collectionName
      });
      
      return results;
    } catch (error) {
      console.error('[VectorEmbeddingService] 查询相似向量失败:', error);
      return [];
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
    
    try {
      // 从向量存储中删除向量
      await window.electron.invoke('vector:delete-by-ids', {
        ids,
        collectionName
      });
      
      return true;
    } catch (error) {
      console.error('[VectorEmbeddingService] 从向量存储中删除向量失败:', error);
      return false;
    }
  }
  
  /**
   * 创建向量嵌入对象并保存到向量数据库
   * 
   * @param text 文本内容
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
      // 生成文本的向量嵌入
      const embeddingResponse = await this.createEmbedding({ text, modelId });
      
      // 创建向量嵌入对象
      const vectorEmbedding = this.createVectorEmbedding(
        text,
        embeddingResponse.embedding,
        metadata
      );
      
      // 保存到向量数据库
      if (this.vectorStoreEnabled) {
        await this.saveToVectorStore(vectorEmbedding, collectionName);
      }
      
      return vectorEmbedding;
    } catch (error) {
      console.error('[VectorEmbeddingService] 创建并保存向量嵌入失败:', error);
      return null;
    }
  }
  
  /**
   * 批量创建向量嵌入对象并保存到向量数据库
   * 
   * @param texts 文本内容数组
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
      // 生成文本的向量嵌入
      const embeddingResponses = await this.createEmbeddingBatch(texts, modelId);
      
      // 创建向量嵌入对象
      const vectorEmbeddings = embeddingResponses.map((response, index) => {
        const metadata = metadatas.length > index ? metadatas[index] : {};
        return this.createVectorEmbedding(
          texts[index],
          response.embedding,
          metadata
        );
      });
      
      // 保存到向量数据库
      if (this.vectorStoreEnabled && vectorEmbeddings.length > 0) {
        await this.saveToVectorStoreBatch(vectorEmbeddings, collectionName);
      }
      
      return vectorEmbeddings;
    } catch (error) {
      console.error('[VectorEmbeddingService] 批量创建并保存向量嵌入失败:', error);
      return [];
    }
  }
} 