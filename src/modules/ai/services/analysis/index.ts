/**
 * 内容分析模块
 * 提供文本分析、特征提取和一致性检查功能
 */

// 导出分析服务
export { ConsistencyCheckService } from '../consistency-check-service';

// 准备添加的服务
// export { TextAnalysisService } from './text-analysis-service';
// export { StyleAnalysisService } from './style-analysis-service';
// export { StructureAnalysisService } from './structure-analysis-service';

// 导出分析服务类型
export type { 
  ConsistencyCheckType,
  ConsistencyCheckRequest,
  ConsistencyCheckResponse,
  ConsistencyIssue,
  ConsistencyIssueLevel
} from '../../types'; 