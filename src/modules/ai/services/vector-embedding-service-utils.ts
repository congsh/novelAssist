import { v4 as uuidv4 } from 'uuid';
import { 
  EmbeddingRequest,
  EmbeddingResponse,
  VectorEmbedding
} from '../types';

/**
 * 向量嵌入服务工具类
 * 提供辅助向量嵌入服务的通用工具函数
 */
export class VectorEmbeddingUtils {
  /**
   * 扁平化元数据，确保所有值都是Chroma支持的基本类型
   * @param metadata 原始元数据
   * @returns 扁平化的元数据
   */
  public static flattenMetadata(metadata: any): Record<string, string | number | boolean> {
    const flattened: Record<string, string | number | boolean> = {};
    
    const flatten = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}_${key}` : key;
        
        if (value === null || value === undefined) {
          // 跳过null和undefined值，不添加到结果中
          continue;
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          flattened[newKey] = value;
        } else if (value instanceof Date) {
          flattened[newKey] = value.toISOString();
        } else if (Array.isArray(value)) {
          // 数组转换为字符串，但只有非空数组才添加
          if (value.length > 0) {
            flattened[newKey] = JSON.stringify(value);
          }
        } else if (typeof value === 'object') {
          // 递归扁平化对象
          flatten(value, newKey);
        } else {
          // 其他类型转换为字符串，但确保不是空字符串
          const stringValue = String(value);
          if (stringValue && stringValue !== 'null' && stringValue !== 'undefined') {
            flattened[newKey] = stringValue;
          }
        }
      }
    };
    
    if (metadata && typeof metadata === 'object') {
      flatten(metadata);
    }
    
    return flattened;
  }

  /**
   * 创建向量嵌入对象
   * @param text 文本内容
   * @param vector 向量数组
   * @param metadata 元数据
   * @returns 向量嵌入对象
   */
  public static createVectorEmbedding(
    text: string, 
    vector: number[], 
    metadata: Partial<{
      sourceId: string; 
      sourceType: string; 
      novelId: string;
      title?: string;
      createdAt: number;
      updatedAt: number;
      section?: string;
      additionalContext?: any;
    }>
  ): VectorEmbedding {
    // 准备基本元数据，确保所有值都不为空
    const baseMetadata = {
      sourceId: metadata.sourceId || 'unknown',
      sourceType: metadata.sourceType || 'text',
      novelId: metadata.novelId || 'unknown',
      title: metadata.title || '',
      createdAt: metadata.createdAt || Date.now(),
      updatedAt: metadata.updatedAt || Date.now(),
      section: metadata.section || ''
    };
    
    // 处理额外的上下文数据
    let flattenedAdditionalContext = {};
    if (metadata.additionalContext) {
      flattenedAdditionalContext = VectorEmbeddingUtils.flattenMetadata(metadata.additionalContext);
    }
    
    // 合并基本元数据和扁平化的额外上下文
    const finalMetadata = {
      ...baseMetadata,
      ...flattenedAdditionalContext
    };
    
    // 创建嵌入对象
    return {
      id: uuidv4(),
      text,
      vector,
      embedding: vector, // 保持与Chroma兼容
      metadata: finalMetadata
    };
  }

  /**
   * 创建缓存键
   * @param text 文本内容
   * @param modelId 模型ID
   * @returns 缓存键
   */
  public static getCacheKey(text: string, modelId: string): string {
    // 简单的哈希函数，用于生成缓存键
    const textHash = VectorEmbeddingUtils.simpleHash(text);
    return `embed_${modelId}_${textHash}`;
  }

  /**
   * 简单哈希函数
   * @param str 输入字符串
   * @returns 哈希字符串
   */
  public static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 创建本地简单向量嵌入
   * 这是一个简单实现，用于在无法获取真实嵌入时提供基本功能
   * @param text 文本内容
   * @returns 向量数组
   */
  public static createLocalEmbedding(text: string): number[] {
    // 简单的向量生成方法，实际应用中应使用更复杂的算法
    const vector: number[] = [];
    const normalized = text.toLowerCase().trim();
    
    // 生成简单的特征向量
    // 仅用于演示，不适合实际应用
    for (let i = 0; i < 100; i++) {
      if (i < normalized.length) {
        vector.push((normalized.charCodeAt(i % normalized.length) % 100) / 100);
      } else {
        vector.push(0);
      }
    }
    
    // 简单的向量归一化处理
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => magnitude > 0 ? val / magnitude : 0);
  }
  
  /**
   * 将文本分块
   * @param text 要分块的文本
   * @param maxChunkSize 最大块大小
   * @param minChunkSize 最小块大小
   * @param overlap 块之间的重叠字符数
   * @returns 分块后的文本数组
   */
  public static chunkText(
    text: string,
    maxChunkSize: number = 1000,
    minChunkSize: number = 200,
    overlap: number = 100
  ): string[] {
    if (!text) return [];
    
    // 如果文本长度小于最大块大小，直接返回整个文本
    if (text.length <= maxChunkSize) {
      return [text];
    }
    
    const chunks: string[] = [];
    let startIndex = 0;
    
    while (startIndex < text.length) {
      // 计算当前块的结束位置
      let endIndex = startIndex + maxChunkSize;
      
      // 如果超出文本长度，设置为文本长度
      if (endIndex > text.length) {
        endIndex = text.length;
      } 
      // 尝试找到自然分隔点
      else {
        const naturalBreakCandidates = [
          text.lastIndexOf('\n\n', endIndex), // 双换行
          text.lastIndexOf('\n', endIndex),   // 单换行
          text.lastIndexOf('. ', endIndex),   // 句号后空格
          text.lastIndexOf('? ', endIndex),   // 问号后空格
          text.lastIndexOf('! ', endIndex),   // 感叹号后空格
          text.lastIndexOf(';', endIndex),    // 分号
        ];
        
        // 找到最佳的自然分隔点
        const naturalBreak = Math.max(...naturalBreakCandidates);
        
        // 如果找到合适的分隔点且不会使块太小，使用它
        if (naturalBreak > startIndex + minChunkSize) {
          endIndex = naturalBreak + 1; // 包含分隔符
        }
      }
      
      // 提取当前块并添加到结果中
      chunks.push(text.substring(startIndex, endIndex));
      
      // 更新下一块的起始位置
      startIndex = endIndex - overlap;
    }
    
    return chunks;
  }
} 