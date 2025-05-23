import { EditorState } from 'draft-js';
import { EditorUtils } from '../utils/EditorUtils';
import debounce from 'lodash/debounce';

/**
 * 自动保存服务接口
 */
export interface ISaveCallback {
  (content: string, title: string): Promise<boolean>;
}

/**
 * 自动保存服务
 * 负责管理编辑器内容的自动保存功能
 */
export class AutoSaveService {
  private autoSaveTimerRef: NodeJS.Timeout | null = null;
  private contentChanged: boolean = false;
  private lastSavedContent: string = '';
  private saveCallback: ISaveCallback | null = null;
  private autoSaveEnabled: boolean = true;
  private autoSaveInterval: number = 5 * 60 * 1000; // 默认5分钟
  
  /**
   * 初始化自动保存服务
   * @param initialContent 初始内容
   * @param saveCallback 保存回调函数
   * @param enabled 是否启用自动保存
   * @param interval 自动保存间隔(毫秒)
   */
  constructor(
    initialContent: string = '',
    saveCallback: ISaveCallback | null = null,
    enabled: boolean = true,
    interval: number = 5 * 60 * 1000
  ) {
    this.lastSavedContent = initialContent;
    this.saveCallback = saveCallback;
    this.autoSaveEnabled = enabled;
    this.autoSaveInterval = interval;
  }

  /**
   * 设置内容已变更标志
   * @param changed 是否已变更
   */
  public setContentChanged(changed: boolean): void {
    this.contentChanged = changed;
  }

  /**
   * 获取内容是否已变更
   * @returns 内容是否已变更
   */
  public isContentChanged(): boolean {
    return this.contentChanged;
  }

  /**
   * 设置是否启用自动保存
   * @param enabled 是否启用
   */
  public setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    
    // 如果禁用，清除计时器
    if (!enabled && this.autoSaveTimerRef) {
      clearTimeout(this.autoSaveTimerRef);
      this.autoSaveTimerRef = null;
    }
  }

  /**
   * 更新上次保存的内容
   * @param content 内容
   */
  public updateLastSavedContent(content: string): void {
    this.lastSavedContent = content;
    this.contentChanged = false;
  }

  /**
   * 设置保存回调函数
   * @param callback 回调函数
   */
  public setSaveCallback(callback: ISaveCallback): void {
    this.saveCallback = callback;
  }

  /**
   * 处理编辑器内容变更
   * @param editorState 编辑器状态
   * @param title 标题
   */
  public handleEditorChange(editorState: EditorState, title: string): void {
    if (!this.autoSaveEnabled) return;
    
    // 标记内容已更改
    this.contentChanged = true;
    
    // 清除之前的计时器
    if (this.autoSaveTimerRef) {
      clearTimeout(this.autoSaveTimerRef);
    }
    
    // 设置新的自动保存计时器
    this.autoSaveTimerRef = setTimeout(() => {
      this.triggerAutoSave(editorState, title);
    }, this.autoSaveInterval);
  }

  /**
   * 触发自动保存
   * @param editorState 编辑器状态
   * @param title 标题
   */
  private async triggerAutoSave(editorState: EditorState, title: string): Promise<void> {
    if (!this.contentChanged || !this.saveCallback) return;
    
    const contentHtml = EditorUtils.editorStateToHtml(editorState);
    
    // 如果内容没有变化，不执行自动保存
    if (contentHtml === this.lastSavedContent) {
      return;
    }
    
    try {
      // 调用保存回调
      const success = await this.saveCallback(contentHtml, title);
      
      if (success) {
        this.lastSavedContent = contentHtml;
        this.contentChanged = false;
      }
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  }

  /**
   * 清理服务
   */
  public dispose(): void {
    if (this.autoSaveTimerRef) {
      clearTimeout(this.autoSaveTimerRef);
      this.autoSaveTimerRef = null;
    }
  }
} 