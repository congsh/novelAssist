// 使用window.electron代替直接导入
// 注意：window.electron是在预加载脚本中定义的
const electron = (window as any).electron;

import { 
  Character, 
  CharacterCreateParams, 
  CharacterUpdateParams, 
  CharacterQueryParams 
} from '../../../shared/types/character';

/**
 * 人物管理服务
 */
export const characterService = {
  /**
   * 获取人物列表
   * @param params 查询参数
   * @returns 人物列表
   */
  async getCharacters(params: CharacterQueryParams = {}): Promise<Character[]> {
    try {
      const response = await electron.invoke('get-characters', params);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取人物列表失败:', error);
      throw error;
    }
  },

  /**
   * 获取单个人物详情
   * @param id 人物ID
   * @returns 人物详情
   */
  async getCharacter(id: string): Promise<Character> {
    try {
      const response = await electron.invoke('get-character', { id });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取人物详情失败:', error);
      throw error;
    }
  },

  /**
   * 创建人物
   * @param params 创建参数
   * @returns 创建的人物
   */
  async createCharacter(params: CharacterCreateParams): Promise<Character> {
    try {
      const response = await electron.invoke('create-character', params);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('创建人物失败:', error);
      throw error;
    }
  },

  /**
   * 更新人物
   * @param params 更新参数
   * @returns 更新后的人物
   */
  async updateCharacter(params: CharacterUpdateParams): Promise<Character> {
    try {
      const response = await electron.invoke('update-character', params);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('更新人物失败:', error);
      throw error;
    }
  },

  /**
   * 删除人物
   * @param id 人物ID
   * @returns 删除结果
   */
  async deleteCharacter(id: string): Promise<{ id: string }> {
    try {
      const response = await electron.invoke('delete-character', { id });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('删除人物失败:', error);
      throw error;
    }
  }
}; 