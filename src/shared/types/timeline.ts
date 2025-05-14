/**
 * 时间线类型定义
 */

/**
 * 时间线事件对象接口
 */
export interface TimelineEvent {
  id: string;
  novel_id: string;
  title: string;
  description: string;
  event_date: string;  // 事件发生的日期/时间
  importance: string;
  created_at: string;
  updated_at: string;
  character_ids?: string; // JSON格式的关联人物ID数组
  location_id?: string;   // 关联的地点ID
  metadata?: string;      // JSON格式的额外元数据
}

/**
 * 时间线事件创建参数接口
 */
export interface TimelineEventCreateParams {
  novel_id: string;
  title: string;
  description?: string;
  event_date?: string;
  importance?: string;
  character_ids?: string;
  location_id?: string;
  metadata?: string;
}

/**
 * 时间线事件更新参数接口
 */
export interface TimelineEventUpdateParams {
  id: string;
  title?: string;
  description?: string;
  event_date?: string;
  importance?: string;
  character_ids?: string;
  location_id?: string;
  metadata?: string;
}

/**
 * 时间线事件重要性枚举
 */
export enum TimelineEventImportance {
  CRITICAL = 'critical',   // 关键事件
  MAJOR = 'major',         // 主要事件
  MINOR = 'minor',         // 次要事件
  BACKGROUND = 'background' // 背景事件
}

/**
 * 时间线事件查询参数接口
 */
export interface TimelineEventQueryParams {
  novel_id?: string;
  title?: string;
  importance?: TimelineEventImportance;
  character_id?: string;
  location_id?: string;
  date_from?: string;
  date_to?: string;
} 