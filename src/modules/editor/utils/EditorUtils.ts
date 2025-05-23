import { EditorState, ContentState, convertToRaw, convertFromRaw } from 'draft-js';
import debounce from 'lodash/debounce';
import draftToHtml from 'draftjs-to-html';
import htmlToDraft from 'html-to-draftjs';

/**
 * 编辑器工具类
 * 提供编辑器性能优化和内容分块加载功能
 */
export class EditorUtils {
  /**
   * 创建一个防抖保存函数
   * @param saveFunction 保存函数
   * @param delay 延迟时间（毫秒）
   */
  static createDebouncedSave(saveFunction: (content: string) => Promise<void>, delay: number = 2000) {
    return debounce(async (editorState: EditorState) => {
      try {
        const content = JSON.stringify(convertToRaw(editorState.getCurrentContent()));
        await saveFunction(content);
        console.log('内容已自动保存');
      } catch (error) {
        console.error('自动保存失败:', error);
      }
    }, delay);
  }
  
  /**
   * 分块加载大型内容
   * @param content 文本内容
   * @param callback 加载进度回调
   */
  static async loadLargeContent(
    content: string,
    callback?: (progress: number, state: EditorState) => void
  ): Promise<EditorState> {
    // 如果内容很小，直接加载
    if (content.length < 50000) {
      try {
        const parsedContent = JSON.parse(content);
        const contentState = convertFromRaw(parsedContent);
        return EditorState.createWithContent(contentState);
      } catch (e) {
        // 如果解析失败，创建普通文本内容
        const contentState = ContentState.createFromText(content);
        return EditorState.createWithContent(contentState);
      }
    }
    
    // 大型内容分块加载
    return new Promise((resolve) => {
      try {
        // 尝试解析为Draft.js原始格式
        const parsedContent = JSON.parse(content);
        
        // 如果是Draft.js格式，获取所有块
        const blocks = parsedContent.blocks || [];
        const entityMap = parsedContent.entityMap || {};
        
        // 计算总块数
        const totalBlocks = blocks.length;
        
        // 每批加载的块数
        const batchSize = 50;
        
        // 创建初始状态
        let currentState = EditorState.createEmpty();
        
        // 分批加载
        const loadNextBatch = (startIndex: number) => {
          // 计算结束索引
          const endIndex = Math.min(startIndex + batchSize, totalBlocks);
          
          // 获取当前批次的块
          const batchBlocks = blocks.slice(0, endIndex);
          
          // 创建原始内容
          const batchRawContent = {
            blocks: batchBlocks,
            entityMap: entityMap
          };
          
          // 转换为内容状态
          const contentState = convertFromRaw(batchRawContent);
          currentState = EditorState.createWithContent(contentState);
          
          // 报告进度
          const progress = Math.min(100, Math.round((endIndex / totalBlocks) * 100));
          if (callback) {
            callback(progress, currentState);
          }
          
          // 检查是否完成
          if (endIndex >= totalBlocks) {
            resolve(currentState);
          } else {
            // 使用setTimeout分散CPU负载
            setTimeout(() => loadNextBatch(endIndex), 0);
          }
        };
        
        // 开始加载
        loadNextBatch(0);
      } catch (e) {
        // 如果解析失败，创建普通文本内容
        console.warn('无法解析为Draft.js格式，使用普通文本加载:', e);
        
        // 如果内容很大，分块加载纯文本
        const contentState = ContentState.createFromText(content);
        const state = EditorState.createWithContent(contentState);
        
        if (callback) {
          callback(100, state);
        }
        
        resolve(state);
      }
    });
  }
  
  /**
   * 优化编辑器性能
   * @param editorState 编辑器状态
   */
  static optimizeEditorState(editorState: EditorState): EditorState {
    // 获取当前选择状态和内容状态
    const selection = editorState.getSelection();
    const content = editorState.getCurrentContent();
    
    // 获取当前获得焦点的块
    const focusKey = selection.getFocusKey();
    const hasFocus = selection.getHasFocus();
    
    // 如果编辑器没有焦点，不需要优化
    if (!hasFocus) {
      return editorState;
    }
    
    // 获取所有内容块
    const blocks = content.getBlocksAsArray();
    
    // 如果块总数较少，不需要优化
    if (blocks.length < 100) {
      return editorState;
    }
    
    // 找到焦点块的索引
    const focusIndex = blocks.findIndex(block => block.getKey() === focusKey);
    
    // 计算可见区域的开始和结束索引（焦点块前后各50个块）
    const startVisible = Math.max(0, focusIndex - 50);
    const endVisible = Math.min(blocks.length, focusIndex + 50);
    
    // 对于焦点外的块，可以进行内部优化
    // 这里我们不修改实际内容，只是在需要时提供一个优化思路
    
    return editorState;
  }
  
  /**
   * 估算编辑器内容的token数
   * @param editorState 编辑器状态
   * @returns 预估的token数量
   */
  static estimateTokenCount(editorState: EditorState): number {
    const plainText = editorState.getCurrentContent().getPlainText();
    // 简单估算：每4个字符约等于1个token
    return Math.ceil(plainText.length / 4);
  }
  
  /**
   * 计算编辑器内容的字数统计
   * @param editorState 编辑器状态
   * @returns 字数统计信息
   */
  static getWordCount(editorState: EditorState): {
    characters: number;
    words: number;
    paragraphs: number;
  } {
    const content = editorState.getCurrentContent();
    const plainText = content.getPlainText();
    const blocks = content.getBlocksAsArray();
    
    // 字符数（不包括空格）
    const characters = plainText.replace(/\s/g, '').length;
    
    // 单词数（简化计算：按空格分割）
    const words = plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    // 段落数
    const paragraphs = blocks.length;
    
    return {
      characters,
      words,
      paragraphs
    };
  }

  /**
   * 格式化时间（分钟）为可读格式
   * @param minutes 分钟数
   * @returns 格式化后的时间字符串 (例如: 1小时30分钟)
   */
  static formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}分钟`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}小时`;
    }
    
    return `${hours}小时${remainingMinutes}分钟`;
  }

  /**
   * 将HTML内容转换为EditorState
   * @param htmlContent HTML格式的内容
   * @returns EditorState对象
   */
  static htmlToEditorState(htmlContent: string): EditorState {
    if (!htmlContent) {
      return EditorState.createEmpty();
    }
    
    const contentBlock = htmlToDraft(htmlContent);
    if (!contentBlock) {
      return EditorState.createEmpty();
    }
    
    const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
    return EditorState.createWithContent(contentState);
  }

  /**
   * 将EditorState转换为HTML
   * @param editorState EditorState对象
   * @returns HTML格式的内容
   */
  static editorStateToHtml(editorState: EditorState): string {
    if (!editorState) {
      return '';
    }
    
    return draftToHtml(convertToRaw(editorState.getCurrentContent()));
  }

  /**
   * 计算文本的字数
   * @param editorState EditorState对象
   * @returns 字数
   */
  static calculateWordCount(editorState: EditorState): number {
    if (!editorState) {
      return 0;
    }
    
    const contentText = editorState.getCurrentContent().getPlainText();
    return contentText.length;
  }

  /**
   * 获取选中的文本
   * @param editorState EditorState对象
   * @returns 选中的文本，如果没有选中则返回undefined
   */
  static getSelectedText(editorState: EditorState): string | undefined {
    if (!editorState) {
      return undefined;
    }
    
    // 获取当前选择
    const selection = editorState.getSelection();
    
    // 检查是否有选择
    if (selection.isCollapsed()) {
      return undefined;
    }
    
    // 获取内容状态
    const contentState = editorState.getCurrentContent();
    
    // 获取选择的开始和结束位置
    const startKey = selection.getStartKey();
    const startOffset = selection.getStartOffset();
    const endKey = selection.getEndKey();
    const endOffset = selection.getEndOffset();
    
    // 获取所有块
    const blocks = contentState.getBlockMap();
    
    // 如果选择在同一个块内
    if (startKey === endKey) {
      const textBlock = contentState.getBlockForKey(startKey);
      return textBlock.getText().slice(startOffset, endOffset);
    }
    
    // 如果选择跨多个块
    let selectedText = '';
    let inSelection = false;
    
    blocks.forEach((block) => {
      if (!block) return;
      
      const key = block.getKey();
      
      // 开始块
      if (key === startKey) {
        selectedText += block.getText().slice(startOffset);
        inSelection = true;
      } 
      // 结束块
      else if (key === endKey) {
        selectedText += '\n' + block.getText().slice(0, endOffset);
        inSelection = false;
      } 
      // 中间的块
      else if (inSelection) {
        selectedText += '\n' + block.getText();
      }
    });
    
    return selectedText;
  }
}

export default EditorUtils; 