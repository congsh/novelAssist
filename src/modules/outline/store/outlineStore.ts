import { create } from 'zustand';
import { 
  OutlineItem, 
  OutlineCreateParams, 
  OutlineUpdateParams,
  OutlineTreeNode
} from '../../../shared/types/outline';
import { outlineService } from '../services/outlineService';

interface OutlineState {
  // 状态
  outlines: OutlineItem[];
  outlineTree: OutlineTreeNode[];
  currentOutline: OutlineItem | null;
  loading: boolean;
  error: string | null;
  
  // 操作
  fetchOutlines: (novelId: string) => Promise<void>;
  fetchOutlineTree: (novelId: string) => Promise<void>;
  fetchOutlineDetail: (id: string) => Promise<void>;
  createOutline: (params: OutlineCreateParams) => Promise<OutlineItem>;
  updateOutline: (params: OutlineUpdateParams) => Promise<OutlineItem>;
  deleteOutline: (id: string, recursive?: boolean) => Promise<void>;
  setCurrentOutline: (outline: OutlineItem | null) => void;
}

/**
 * 大纲管理状态存储
 */
export const useOutlineStore = create<OutlineState>((set, get) => ({
  // 初始状态
  outlines: [],
  outlineTree: [],
  currentOutline: null,
  loading: false,
  error: null,
  
  // 获取大纲列表
  fetchOutlines: async (novelId: string) => {
    try {
      set({ loading: true, error: null });
      const outlines = await outlineService.getOutlines({ novel_id: novelId });
      set({ outlines, loading: false });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '获取大纲列表失败' 
      });
    }
  },
  
  // 获取大纲树结构
  fetchOutlineTree: async (novelId: string) => {
    try {
      set({ loading: true, error: null });
      const outlineTree = await outlineService.getOutlineTree(novelId);
      set({ outlineTree, loading: false });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '获取大纲树结构失败' 
      });
    }
  },
  
  // 获取大纲详情
  fetchOutlineDetail: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const outline = await outlineService.getOutline(id);
      set({ currentOutline: outline, loading: false });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '获取大纲详情失败' 
      });
    }
  },
  
  // 创建大纲
  createOutline: async (params: OutlineCreateParams) => {
    try {
      set({ loading: true, error: null });
      const newOutline = await outlineService.createOutline(params);
      set(state => ({ 
        outlines: [...state.outlines, newOutline],
        loading: false 
      }));
      
      // 重新获取树结构以保持同步
      if (params.novel_id) {
        get().fetchOutlineTree(params.novel_id);
      }
      
      return newOutline;
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '创建大纲失败' 
      });
      throw error;
    }
  },
  
  // 更新大纲
  updateOutline: async (params: OutlineUpdateParams) => {
    try {
      set({ loading: true, error: null });
      const updatedOutline = await outlineService.updateOutline(params);
      set(state => ({ 
        outlines: state.outlines.map(item => 
          item.id === updatedOutline.id ? updatedOutline : item
        ),
        currentOutline: state.currentOutline?.id === updatedOutline.id 
          ? updatedOutline 
          : state.currentOutline,
        loading: false 
      }));
      
      // 获取当前大纲所属的小说ID，用于更新树结构
      const novelId = updatedOutline.novel_id;
      if (novelId) {
        get().fetchOutlineTree(novelId);
      }
      
      return updatedOutline;
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '更新大纲失败' 
      });
      throw error;
    }
  },
  
  // 删除大纲
  deleteOutline: async (id: string, recursive: boolean = false) => {
    try {
      set({ loading: true, error: null });
      
      // 获取要删除的大纲，以便后续更新树结构
      const outlineToDelete = get().outlines.find(item => item.id === id);
      
      await outlineService.deleteOutline(id, recursive);
      set(state => ({ 
        outlines: state.outlines.filter(item => item.id !== id),
        currentOutline: state.currentOutline?.id === id ? null : state.currentOutline,
        loading: false 
      }));
      
      // 如果找到了被删除的大纲，更新树结构
      if (outlineToDelete?.novel_id) {
        get().fetchOutlineTree(outlineToDelete.novel_id);
      }
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '删除大纲失败' 
      });
      throw error;
    }
  },
  
  // 设置当前选中的大纲
  setCurrentOutline: (outline: OutlineItem | null) => {
    set({ currentOutline: outline });
  }
})); 