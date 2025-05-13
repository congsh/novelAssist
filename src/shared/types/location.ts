/**
 * 地点类型定义
 */

/**
 * 地点对象接口
 */
export interface Location {
  id: string;
  novel_id: string;
  name: string;
  description: string;
  importance: string;
  created_at: string;
  updated_at: string;
  image_path?: string;
  coordinates?: string; // JSON格式的坐标信息
  metadata?: string;    // JSON格式的额外元数据
}

/**
 * 地点创建参数接口
 */
export interface LocationCreateParams {
  novel_id: string;
  name: string;
  description?: string;
  importance?: string;
  image_path?: string;
  coordinates?: string;
  metadata?: string;
}

/**
 * 地点更新参数接口
 */
export interface LocationUpdateParams {
  id: string;
  name?: string;
  description?: string;
  importance?: string;
  image_path?: string;
  coordinates?: string;
  metadata?: string;
}

/**
 * 地点重要性枚举
 */
export enum LocationImportance {
  CRITICAL = 'critical',   // 关键地点
  MAJOR = 'major',         // 主要地点
  MINOR = 'minor',         // 次要地点
  BACKGROUND = 'background' // 背景地点
}

/**
 * 地点查询参数接口
 */
export interface LocationQueryParams {
  novel_id?: string;
  name?: string;
  importance?: LocationImportance;
} 