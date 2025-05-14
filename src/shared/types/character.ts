/**
 * 人物类型定义
 */

/**
 * 人物对象接口
 */
export interface Character {
  id: string;
  novel_id: string;
  name: string;
  role: string;
  description: string;
  background: string;
  personality: string;
  appearance: string;
  created_at: string;
  updated_at: string;
  image_path?: string;
  metadata?: string;    // JSON格式的额外元数据
}

/**
 * 人物创建参数接口
 */
export interface CharacterCreateParams {
  novel_id: string;
  name: string;
  role?: string;
  description?: string;
  background?: string;
  personality?: string;
  appearance?: string;
  image_path?: string;
  metadata?: string;
}

/**
 * 人物更新参数接口
 */
export interface CharacterUpdateParams {
  id: string;
  name?: string;
  role?: string;
  description?: string;
  background?: string;
  personality?: string;
  appearance?: string;
  image_path?: string;
  metadata?: string;
}

/**
 * 人物角色类型枚举
 */
export enum CharacterRole {
  PROTAGONIST = 'protagonist',   // 主角
  ANTAGONIST = 'antagonist',     // 反派
  SUPPORTING = 'supporting',     // 配角
  MINOR = 'minor'                // 次要角色
}

/**
 * 人物查询参数接口
 */
export interface CharacterQueryParams {
  novel_id?: string;
  name?: string;
  role?: CharacterRole;
} 