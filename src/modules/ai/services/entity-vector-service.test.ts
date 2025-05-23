/**
 * 实体向量化服务测试
 * 用于验证人物、地点、大纲和时间线的向量化功能
 */

import { EntityVectorService } from './entity-vector-service';
import { VectorEmbeddingService } from './vector-embedding-service';
import { Character } from '../../../shared/types/character';
import { Location } from '../../../shared/types/location';
import { OutlineItem } from '../../../shared/types/outline';
import { TimelineEvent } from '../../../shared/types/timeline';

/**
 * 模拟数据
 */
const mockCharacter: Character = {
  id: 'char-001',
  novel_id: 'novel-001',
  name: '张三',
  role: 'protagonist',
  description: '一个勇敢的年轻人',
  background: '出生在小村庄，从小立志成为英雄',
  personality: '勇敢、善良、有正义感',
  appearance: '身材高大，眼神坚定',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockLocation: Location = {
  id: 'loc-001',
  novel_id: 'novel-001',
  name: '青山村',
  description: '一个宁静的小村庄',
  importance: 'major',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  coordinates: '{"lat": 30.0, "lng": 120.0}'
};

const mockOutlineItem: OutlineItem = {
  id: 'outline-001',
  novel_id: 'novel-001',
  title: '第一章：英雄的起源',
  content: '主角在村庄中的成长经历',
  sort_order: 1,
  parent_id: null,
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockTimelineEvent: TimelineEvent = {
  id: 'timeline-001',
  novel_id: 'novel-001',
  title: '主角出生',
  description: '在青山村出生的重要时刻',
  event_date: '2000-01-01',
  importance: 'critical',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  character_ids: '["char-001"]',
  location_id: 'loc-001'
};

/**
 * 测试实体向量化功能
 */
export class EntityVectorServiceTest {
  private entityVectorService: EntityVectorService;
  private vectorEmbeddingService: VectorEmbeddingService;
  
  constructor(vectorEmbeddingService: VectorEmbeddingService) {
    this.vectorEmbeddingService = vectorEmbeddingService;
    this.entityVectorService = new EntityVectorService(vectorEmbeddingService);
  }
  
  /**
   * 获取可用的embedding模型
   */
  private async getAvailableEmbeddingModel(): Promise<string> {
    try {
      // 首先尝试从AI设置中获取配置的embedding模型
      const settings = this.vectorEmbeddingService.getSettings();
      if (settings && settings.models && settings.activeProviderId) {
        const activeProvider = settings.providers.find(p => p.id === settings.activeProviderId);
        if (activeProvider) {
          // 查找标记为embedding的模型
          const embeddingModel = settings.models.find(model => 
            model.providerId === activeProvider.id && model.isEmbeddingModel
          );
          if (embeddingModel) {
            console.log('[测试] 使用配置的embedding模型:', embeddingModel.name);
            return embeddingModel.name;
          }
          
          // 如果没有专门的embedding模型，查找同一提供商的第一个可用模型
          const providerModels = settings.models.filter(model => model.providerId === activeProvider.id);
          if (providerModels.length > 0) {
            console.log('[测试] 使用提供商的第一个可用模型:', providerModels[0].name);
            return providerModels[0].name;
          }
        }
      }
      
      // 如果没有配置模型，根据提供商类型使用默认模型
      if (settings && settings.providers && settings.activeProviderId) {
        const activeProvider = settings.providers.find(p => p.id === settings.activeProviderId);
        if (activeProvider) {
          switch (activeProvider.type) {
            case 'openai':
              console.log('[测试] 使用OpenAI默认embedding模型: text-embedding-ada-002');
              return 'text-embedding-ada-002';
            case 'deepseek':
              console.log('[测试] 使用DeepSeek默认embedding模型: text-embedding-v1');
              return 'text-embedding-v1';
            case 'openai_compatible':
              console.log('[测试] 使用OpenAI兼容默认embedding模型: text-embedding-ada-002');
              return 'text-embedding-ada-002';
            default:
              break;
          }
        }
      }
      
      // 最后回退到本地模型（这会触发下载）
      console.log('[测试] 未找到配置的embedding模型，将使用本地all-MiniLM-L6-v2模型（需要下载）');
      return 'all-MiniLM-L6-v2';
      
    } catch (error) {
      console.error('[测试] 获取embedding模型失败:', error);
      // 回退到本地模型
      console.log('[测试] 回退到本地all-MiniLM-L6-v2模型（需要下载）');
      return 'all-MiniLM-L6-v2';
    }
  }
  
  /**
   * 测试人物向量化
   */
  async testCharacterVectorization(): Promise<boolean> {
    try {
      console.log('[测试] 开始测试人物向量化...');
      
      const modelName = await this.getAvailableEmbeddingModel();
      const result = await this.entityVectorService.vectorizeCharacter(
        mockCharacter, 
        modelName
      );
      
      if (result) {
        console.log('[测试] 人物向量化成功:', result.id);
        return true;
      } else {
        console.error('[测试] 人物向量化失败: 返回结果为空');
        return false;
      }
    } catch (error) {
      console.error('[测试] 人物向量化失败:', error);
      return false;
    }
  }
  
  /**
   * 测试地点向量化
   */
  async testLocationVectorization(): Promise<boolean> {
    try {
      console.log('[测试] 开始测试地点向量化...');
      
      const modelName = await this.getAvailableEmbeddingModel();
      const result = await this.entityVectorService.vectorizeLocation(
        mockLocation, 
        modelName
      );
      
      if (result) {
        console.log('[测试] 地点向量化成功:', result.id);
        return true;
      } else {
        console.error('[测试] 地点向量化失败: 返回结果为空');
        return false;
      }
    } catch (error) {
      console.error('[测试] 地点向量化失败:', error);
      return false;
    }
  }
  
  /**
   * 测试大纲向量化
   */
  async testOutlineVectorization(): Promise<boolean> {
    try {
      console.log('[测试] 开始测试大纲向量化...');
      
      const modelName = await this.getAvailableEmbeddingModel();
      const result = await this.entityVectorService.vectorizeOutlineItem(
        mockOutlineItem, 
        modelName
      );
      
      if (result) {
        console.log('[测试] 大纲向量化成功:', result.id);
        return true;
      } else {
        console.error('[测试] 大纲向量化失败: 返回结果为空');
        return false;
      }
    } catch (error) {
      console.error('[测试] 大纲向量化失败:', error);
      return false;
    }
  }
  
  /**
   * 测试时间线向量化
   */
  async testTimelineVectorization(): Promise<boolean> {
    try {
      console.log('[测试] 开始测试时间线向量化...');
      
      const modelName = await this.getAvailableEmbeddingModel();
      const result = await this.entityVectorService.vectorizeTimelineEvent(
        mockTimelineEvent, 
        modelName
      );
      
      if (result) {
        console.log('[测试] 时间线向量化成功:', result.id);
        return true;
      } else {
        console.error('[测试] 时间线向量化失败: 返回结果为空');
        return false;
      }
    } catch (error) {
      console.error('[测试] 时间线向量化失败:', error);
      return false;
    }
  }
  
  /**
   * 测试相似实体查询
   */
  async testSimilarEntityQuery(): Promise<boolean> {
    try {
      console.log('[测试] 开始测试相似实体查询...');
      
      const results = await this.entityVectorService.querySimilarEntities(
        '勇敢的主角',
        'novel-001',
        ['character', 'location', 'outline', 'timeline'],
        5
      );
      
      console.log('[测试] 查询结果数量:', results.length);
      results.forEach((result, index) => {
        console.log(`[测试] 结果 ${index + 1}:`, {
          type: result.entity_type,
          name: result.metadata?.entity_name,
          similarity: result.similarity
        });
      });
      
      return true;
    } catch (error) {
      console.error('[测试] 相似实体查询失败:', error);
      return false;
    }
  }
  
  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log('[测试] 开始运行实体向量化服务测试...');
    
    const tests = [
      { name: '人物向量化', test: () => this.testCharacterVectorization() },
      { name: '地点向量化', test: () => this.testLocationVectorization() },
      { name: '大纲向量化', test: () => this.testOutlineVectorization() },
      { name: '时间线向量化', test: () => this.testTimelineVectorization() },
      { name: '相似实体查询', test: () => this.testSimilarEntityQuery() }
    ];
    
    let passedCount = 0;
    let totalCount = tests.length;
    
    for (const { name, test } of tests) {
      try {
        const passed = await test();
        if (passed) {
          console.log(`[测试] ✅ ${name} - 通过`);
          passedCount++;
        } else {
          console.log(`[测试] ❌ ${name} - 失败`);
        }
      } catch (error) {
        console.log(`[测试] ❌ ${name} - 异常:`, error);
      }
      
      // 测试间隔，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`[测试] 测试完成: ${passedCount}/${totalCount} 通过`);
    
    if (passedCount === totalCount) {
      console.log('[测试] 🎉 所有测试通过！实体向量化功能正常工作。');
    } else {
      console.log('[测试] ⚠️ 部分测试失败，请检查配置和服务状态。');
    }
  }
}

/**
 * 导出测试函数，供外部调用
 */
export const runEntityVectorTests = async (vectorEmbeddingService: VectorEmbeddingService): Promise<void> => {
  const tester = new EntityVectorServiceTest(vectorEmbeddingService);
  await tester.runAllTests();
}; 