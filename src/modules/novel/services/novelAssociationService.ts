// 使用window.electron代替直接导入
// 注意：window.electron是在预加载脚本中定义的
const electron = (window as any).electron;

import { Character } from '../../../shared/types/character';
import { Location } from '../../../shared/types/location';
import { OutlineTreeNode } from '../../../shared/types/outline';
import { TimelineEvent } from '../../../shared/types/timeline';

/**
 * 小说关联服务
 * 处理小说与人物、地点、大纲和时间线的关联关系
 */
export const novelAssociationService = {
  /**
   * 获取小说关联的人物列表
   * @param novelId 小说ID
   * @returns 人物列表
   */
  async getNovelCharacters(novelId: string): Promise<Character[]> {
    try {
      const response = await electron.invoke('get-novel-characters', { novelId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取小说关联的人物失败:', error);
      throw error;
    }
  },

  /**
   * 关联人物到小说
   * @param novelId 小说ID
   * @param characterId 人物ID
   * @returns 关联结果
   */
  async associateCharacter(novelId: string, characterId: string): Promise<any> {
    try {
      const response = await electron.invoke('associate-character-novel', { novelId, characterId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('关联人物到小说失败:', error);
      throw error;
    }
  },

  /**
   * 解除人物与小说的关联
   * @param novelId 小说ID
   * @param characterId 人物ID
   * @returns 解除关联结果
   */
  async disassociateCharacter(novelId: string, characterId: string): Promise<any> {
    try {
      const response = await electron.invoke('disassociate-character-novel', { novelId, characterId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('解除人物与小说的关联失败:', error);
      throw error;
    }
  },

  /**
   * 获取小说关联的地点列表
   * @param novelId 小说ID
   * @returns 地点列表
   */
  async getNovelLocations(novelId: string): Promise<Location[]> {
    try {
      const response = await electron.invoke('get-novel-locations', { novelId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取小说关联的地点失败:', error);
      throw error;
    }
  },

  /**
   * 关联地点到小说
   * @param novelId 小说ID
   * @param locationId 地点ID
   * @returns 关联结果
   */
  async associateLocation(novelId: string, locationId: string): Promise<any> {
    try {
      const response = await electron.invoke('associate-location-novel', { novelId, locationId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('关联地点到小说失败:', error);
      throw error;
    }
  },

  /**
   * 解除地点与小说的关联
   * @param novelId 小说ID
   * @param locationId 地点ID
   * @returns 解除关联结果
   */
  async disassociateLocation(novelId: string, locationId: string): Promise<any> {
    try {
      const response = await electron.invoke('disassociate-location-novel', { novelId, locationId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('解除地点与小说的关联失败:', error);
      throw error;
    }
  },

  /**
   * 获取小说关联的大纲列表
   * @param novelId 小说ID
   * @returns 大纲树结构
   */
  async getNovelOutlines(novelId: string): Promise<OutlineTreeNode[]> {
    try {
      const response = await electron.invoke('get-novel-outlines', { novelId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取小说关联的大纲失败:', error);
      throw error;
    }
  },

  /**
   * 关联大纲到小说
   * @param novelId 小说ID
   * @param outlineId 大纲ID
   * @returns 关联结果
   */
  async associateOutline(novelId: string, outlineId: string): Promise<any> {
    try {
      const response = await electron.invoke('associate-outline-novel', { novelId, outlineId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('关联大纲到小说失败:', error);
      throw error;
    }
  },

  /**
   * 解除大纲与小说的关联
   * @param novelId 小说ID
   * @param outlineId 大纲ID
   * @returns 解除关联结果
   */
  async disassociateOutline(novelId: string, outlineId: string): Promise<any> {
    try {
      const response = await electron.invoke('disassociate-outline-novel', { novelId, outlineId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('解除大纲与小说的关联失败:', error);
      throw error;
    }
  },

  /**
   * 获取小说关联的时间线事件列表
   * @param novelId 小说ID
   * @returns 时间线事件列表
   */
  async getNovelTimelineEvents(novelId: string): Promise<TimelineEvent[]> {
    try {
      const response = await electron.invoke('get-novel-timeline-events', { novelId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取小说关联的时间线事件失败:', error);
      throw error;
    }
  },

  /**
   * 关联时间线事件到小说
   * @param novelId 小说ID
   * @param timelineEventId 时间线事件ID
   * @returns 关联结果
   */
  async associateTimelineEvent(novelId: string, timelineEventId: string): Promise<any> {
    try {
      const response = await electron.invoke('associate-timeline-event-novel', { novelId, timelineEventId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('关联时间线事件到小说失败:', error);
      throw error;
    }
  },

  /**
   * 解除时间线事件与小说的关联
   * @param novelId 小说ID
   * @param timelineEventId 时间线事件ID
   * @returns 解除关联结果
   */
  async disassociateTimelineEvent(novelId: string, timelineEventId: string): Promise<any> {
    try {
      const response = await electron.invoke('disassociate-timeline-event-novel', { novelId, timelineEventId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('解除时间线事件与小说的关联失败:', error);
      throw error;
    }
  },

  /**
   * 获取可关联到小说的大纲列表
   * @param novelId 小说ID
   * @returns 可关联的大纲列表
   */
  async getAvailableOutlines(novelId: string): Promise<any[]> {
    try {
      const response = await electron.invoke('get-available-outlines', { novelId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取可关联的大纲失败:', error);
      throw error;
    }
  },

  /**
   * 获取可关联到小说的时间线事件列表
   * @param novelId 小说ID
   * @returns 可关联的时间线事件列表
   */
  async getAvailableTimelineEvents(novelId: string): Promise<any[]> {
    try {
      const response = await electron.invoke('get-available-timeline-events', { novelId });
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取可关联的时间线事件失败:', error);
      throw error;
    }
  }
}; 