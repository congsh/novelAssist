import { novelAssociationService } from './novelAssociationService';
import { ChapterVectorizationService } from './chapter-vectorization-service';
import { vectorEmbeddingService } from '../../ai/services';

// 创建章节向量化服务实例
const chapterVectorizationService = new ChapterVectorizationService(vectorEmbeddingService);

// 初始化服务
const initializeNovelServices = async () => {
  // 初始化章节向量化服务
  await chapterVectorizationService.initialize();
};

export {
  novelAssociationService,
  chapterVectorizationService,
  initializeNovelServices
}; 