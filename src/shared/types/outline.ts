/**
 * 大纲类型定义
 */

/**
 * 大纲项目接口
 */
export interface OutlineItem {
  id: string;
  novel_id: string;
  title: string;
  content: string;
  sort_order: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  metadata?: string; // JSON格式的额外元数据
}

/**
 * 大纲创建参数接口
 */
export interface OutlineCreateParams {
  novel_id: string;
  title: string;
  content?: string;
  sort_order?: number;
  parent_id?: string | null;
  status?: string;
  metadata?: string;
}

/**
 * 大纲更新参数接口
 */
export interface OutlineUpdateParams {
  id: string;
  title?: string;
  content?: string;
  sort_order?: number;
  parent_id?: string | null;
  status?: string;
  metadata?: string;
}

/**
 * 大纲状态枚举
 */
export enum OutlineStatus {
  ACTIVE = 'active',       // 活跃状态
  COMPLETED = 'completed', // 已完成
  DRAFT = 'draft',         // 草稿
  ARCHIVED = 'archived'    // 已归档
}

/**
 * 大纲查询参数接口
 */
export interface OutlineQueryParams {
  novel_id?: string;
  title?: string;
  parent_id?: string | null;
  status?: OutlineStatus;
}

/**
 * 大纲树形节点接口（用于树形展示）
 */
export interface OutlineTreeNode extends OutlineItem {
  children?: OutlineTreeNode[];
  isLeaf?: boolean;
  expanded?: boolean;
} 