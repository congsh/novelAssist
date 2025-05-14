// 使用window.electron代替直接导入
// 注意：window.electron是在预加载脚本中定义的
const electron = (window as any).electron;

import { 
  TimelineEvent, 
  TimelineEventCreateParams, 
  TimelineEventUpdateParams, 
  TimelineEventQueryParams 
} from '../../../shared/types/timeline';

/**
 * 时间线管理服务
 */
export const timelineService = {
  /**
   * 获取时间线事件列表
   * @param params 查询参数
   * @returns 时间线事件列表
   */
  async getTimelineEvents(params: TimelineEventQueryParams = {}): Promise<TimelineEvent[]> {
    try {
      const response = await electron.invoke('get-timeline-events', params);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取时间线事件列表失败:', error);
      throw error;
    }
  },

  /**
   * 获取单个时间线事件详情
   * @param id 事件ID
   * @returns 时间线事件详情
   */
  async getTimelineEvent(id: string): Promise<TimelineEvent> {
    try {
      const response = await electron.invoke('get-timeline-event', { id });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取时间线事件详情失败:', error);
      throw error;
    }
  },

  /**
   * 创建时间线事件
   * @param params 创建参数
   * @returns 创建的时间线事件
   */
  async createTimelineEvent(params: TimelineEventCreateParams): Promise<TimelineEvent> {
    try {
      const response = await electron.invoke('create-timeline-event', params);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('创建时间线事件失败:', error);
      throw error;
    }
  },

  /**
   * 更新时间线事件
   * @param params 更新参数
   * @returns 更新后的时间线事件
   */
  async updateTimelineEvent(params: TimelineEventUpdateParams): Promise<TimelineEvent> {
    try {
      const response = await electron.invoke('update-timeline-event', params);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('更新时间线事件失败:', error);
      throw error;
    }
  },

  /**
   * 删除时间线事件
   * @param id 事件ID
   * @returns 删除结果
   */
  async deleteTimelineEvent(id: string): Promise<{ id: string }> {
    try {
      const response = await electron.invoke('delete-timeline-event', { id });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('删除时间线事件失败:', error);
      throw error;
    }
  }
}; 