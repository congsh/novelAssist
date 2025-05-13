import { ipcRenderer } from 'electron';
import { 
  OutlineItem, 
  OutlineCreateParams, 
  OutlineUpdateParams, 
  OutlineQueryParams,
  OutlineTreeNode
} from '../../../shared/types/outline';

/**
 * 大纲管理服务
 */
export const outlineService = {
  /**
   * 获取大纲列表
   * @param params 查询参数
   * @returns 大纲列表
   */
  async getOutlines(params: OutlineQueryParams = {}): Promise<OutlineItem[]> {
    try {
      const response = await ipcRenderer.invoke('get-outlines', params);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取大纲列表失败:', error);
      throw error;
    }
  },

  /**
   * 获取单个大纲详情
   * @param id 大纲ID
   * @returns 大纲详情
   */
  async getOutline(id: string): Promise<OutlineItem> {
    try {
      const response = await ipcRenderer.invoke('get-outline', { id });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取大纲详情失败:', error);
      throw error;
    }
  },

  /**
   * 创建大纲
   * @param params 创建参数
   * @returns 创建的大纲
   */
  async createOutline(params: OutlineCreateParams): Promise<OutlineItem> {
    try {
      const response = await ipcRenderer.invoke('create-outline', params);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('创建大纲失败:', error);
      throw error;
    }
  },

  /**
   * 更新大纲
   * @param params 更新参数
   * @returns 更新后的大纲
   */
  async updateOutline(params: OutlineUpdateParams): Promise<OutlineItem> {
    try {
      const response = await ipcRenderer.invoke('update-outline', params);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('更新大纲失败:', error);
      throw error;
    }
  },

  /**
   * 删除大纲
   * @param id 大纲ID
   * @param recursive 是否递归删除子项
   * @returns 删除结果
   */
  async deleteOutline(id: string, recursive: boolean = false): Promise<{ id: string }> {
    try {
      const response = await ipcRenderer.invoke('delete-outline', { id, recursive });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('删除大纲失败:', error);
      throw error;
    }
  },

  /**
   * 获取大纲树结构
   * @param novelId 小说ID
   * @returns 大纲树结构
   */
  async getOutlineTree(novelId: string): Promise<OutlineTreeNode[]> {
    try {
      const response = await ipcRenderer.invoke('get-outline-tree', { novel_id: novelId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取大纲树结构失败:', error);
      throw error;
    }
  }
}; 