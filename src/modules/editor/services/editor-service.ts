import { EditorState, convertToRaw } from 'draft-js';
import { EditorUtils } from '../utils/EditorUtils';

/**
 * 编辑器服务类
 * 提供编辑器相关功能和优化服务
 */
export class EditorService {
  private static instance: EditorService;
  
  /**
   * 获取单例实例
   */
  public static getInstance(): EditorService {
    if (!EditorService.instance) {
      EditorService.instance = new EditorService();
    }
    return EditorService.instance;
  }
  
  /**
   * 私有构造函数
   */
  private constructor() {}
  
  /**
   * 加载章节内容
   * @param chapterId 章节ID
   * @param onProgress 加载进度回调
   */
  async loadChapterContent(
    chapterId: string,
    onProgress?: (progress: number, state: EditorState) => void
  ): Promise<EditorState> {
    try {
      // 获取章节内容
      const response = await window.electron.invoke('get-chapter-content', { id: chapterId });
      
      if (!response.success) {
        throw new Error(response.error || '加载章节内容失败');
      }
      
      const content = response.data?.content || '';
      
      // 使用分块加载方式加载大型内容
      return await EditorUtils.loadLargeContent(content, onProgress);
    } catch (error) {
      console.error('加载章节内容失败:', error);
      // 返回空编辑器状态
      return EditorState.createEmpty();
    }
  }
  
  /**
   * 保存章节内容
   * @param chapterId 章节ID
   * @param editorState 编辑器状态
   */
  async saveChapterContent(chapterId: string, editorState: EditorState): Promise<boolean> {
    try {
      // 将编辑器状态转换为JSON字符串
      const content = JSON.stringify(
        convertToRaw(editorState.getCurrentContent())
      );
      
      // 计算字数
      const wordCount = EditorUtils.getWordCount(editorState).characters;
      
      // 保存章节内容
      const response = await window.electron.invoke('update-chapter', { 
        id: chapterId,
        content,
        word_count: wordCount
      });
      
      return response.success;
    } catch (error) {
      console.error('保存章节内容失败:', error);
      return false;
    }
  }
  
  /**
   * 创建防抖自动保存函数
   * @param chapterId 章节ID
   * @param delay 延迟时间（毫秒）
   */
  createAutoSave(chapterId: string, delay: number = 5000) {
    const saveFunction = async (content: string) => {
      try {
        await window.electron.invoke('update-chapter-content', { 
          id: chapterId,
          content
        });
      } catch (error) {
        console.error('自动保存失败:', error);
      }
    };
    
    return EditorUtils.createDebouncedSave(saveFunction, delay);
  }
  
  /**
   * 优化编辑器性能
   * @param editorState 编辑器状态
   */
  optimizeEditorPerformance(editorState: EditorState): EditorState {
    return EditorUtils.optimizeEditorState(editorState);
  }
  
  /**
   * 获取字数统计
   * @param editorState 编辑器状态
   */
  getWordCount(editorState: EditorState) {
    return EditorUtils.getWordCount(editorState);
  }
}

export const editorService = EditorService.getInstance();
export default editorService; 