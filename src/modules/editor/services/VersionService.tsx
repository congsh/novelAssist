import { v4 as uuidv4 } from 'uuid';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 版本历史服务
 * 用于处理章节内容的版本历史记录和恢复
 */
class VersionService {
  /**
   * 保存章节版本历史
   * @param chapterId - 章节ID
   * @param content - 章节内容
   * @param comment - 版本备注
   * @returns 保存结果
   */
  async saveVersion(chapterId: string, content: string, comment: string = ''): Promise<ApiResponse> {
    try {
      const response = await window.electron.invoke('save-version-history', {
        id: uuidv4(),
        entity_id: chapterId,
        entity_type: 'chapter',
        content,
        user_comment: comment || `自动保存于 ${new Date().toLocaleString()}`
      });
      
      return response as ApiResponse;
    } catch (error) {
      console.error('保存版本历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取章节的版本历史列表
   * @param chapterId - 章节ID
   * @returns 版本历史列表
   */
  async getVersionHistory(chapterId: string): Promise<ApiResponse> {
    try {
      const response = await window.electron.invoke('get-version-history', {
        entity_id: chapterId,
        entity_type: 'chapter'
      });
      
      return response as ApiResponse;
    } catch (error) {
      console.error('获取版本历史失败:', error);
      throw error;
    }
  }

  /**
   * 恢复到指定版本
   * @param versionId - 版本ID
   * @returns 恢复结果
   */
  async restoreVersion(versionId: string): Promise<ApiResponse> {
    try {
      const response = await window.electron.invoke('restore-version', {
        version_id: versionId
      });
      
      return response as ApiResponse;
    } catch (error) {
      console.error('恢复版本失败:', error);
      throw error;
    }
  }

  /**
   * 删除指定版本
   * @param versionId - 版本ID
   * @returns 删除结果
   */
  async deleteVersion(versionId: string): Promise<ApiResponse> {
    try {
      const response = await window.electron.invoke('delete-version', {
        id: versionId
      });
      
      return response as ApiResponse;
    } catch (error) {
      console.error('删除版本失败:', error);
      throw error;
    }
  }
}

export default new VersionService(); 