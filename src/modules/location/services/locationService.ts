import { ipcRenderer } from 'electron';
import { 
  Location, 
  LocationCreateParams, 
  LocationUpdateParams, 
  LocationQueryParams 
} from '../../../shared/types/location';

/**
 * 地点管理服务
 */
export const locationService = {
  /**
   * 获取地点列表
   * @param params 查询参数
   * @returns 地点列表
   */
  async getLocations(params: LocationQueryParams = {}): Promise<Location[]> {
    try {
      const response = await ipcRenderer.invoke('get-locations', params);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取地点列表失败:', error);
      throw error;
    }
  },

  /**
   * 获取单个地点详情
   * @param id 地点ID
   * @returns 地点详情
   */
  async getLocation(id: string): Promise<Location> {
    try {
      const response = await ipcRenderer.invoke('get-location', { id });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取地点详情失败:', error);
      throw error;
    }
  },

  /**
   * 创建地点
   * @param params 创建参数
   * @returns 创建的地点
   */
  async createLocation(params: LocationCreateParams): Promise<Location> {
    try {
      const response = await ipcRenderer.invoke('create-location', params);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('创建地点失败:', error);
      throw error;
    }
  },

  /**
   * 更新地点
   * @param params 更新参数
   * @returns 更新后的地点
   */
  async updateLocation(params: LocationUpdateParams): Promise<Location> {
    try {
      const response = await ipcRenderer.invoke('update-location', params);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('更新地点失败:', error);
      throw error;
    }
  },

  /**
   * 删除地点
   * @param id 地点ID
   * @returns 删除结果
   */
  async deleteLocation(id: string): Promise<{ id: string }> {
    try {
      const response = await ipcRenderer.invoke('delete-location', { id });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('删除地点失败:', error);
      throw error;
    }
  }
}; 