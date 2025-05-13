import { create } from 'zustand';
import { Location, LocationCreateParams, LocationUpdateParams } from '../../../shared/types/location';
import { locationService } from '../services/locationService';

interface LocationState {
  // 状态
  locations: Location[];
  currentLocation: Location | null;
  loading: boolean;
  error: string | null;
  
  // 操作
  fetchLocations: (novelId: string) => Promise<void>;
  fetchLocationDetail: (id: string) => Promise<void>;
  createLocation: (params: LocationCreateParams) => Promise<Location>;
  updateLocation: (params: LocationUpdateParams) => Promise<Location>;
  deleteLocation: (id: string) => Promise<void>;
  setCurrentLocation: (location: Location | null) => void;
}

/**
 * 地点管理状态存储
 */
export const useLocationStore = create<LocationState>((set, get) => ({
  // 初始状态
  locations: [],
  currentLocation: null,
  loading: false,
  error: null,
  
  // 获取地点列表
  fetchLocations: async (novelId: string) => {
    try {
      set({ loading: true, error: null });
      const locations = await locationService.getLocations({ novel_id: novelId });
      set({ locations, loading: false });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '获取地点列表失败' 
      });
    }
  },
  
  // 获取地点详情
  fetchLocationDetail: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const location = await locationService.getLocation(id);
      set({ currentLocation: location, loading: false });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '获取地点详情失败' 
      });
    }
  },
  
  // 创建地点
  createLocation: async (params: LocationCreateParams) => {
    try {
      set({ loading: true, error: null });
      const newLocation = await locationService.createLocation(params);
      set(state => ({ 
        locations: [...state.locations, newLocation],
        loading: false 
      }));
      return newLocation;
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '创建地点失败' 
      });
      throw error;
    }
  },
  
  // 更新地点
  updateLocation: async (params: LocationUpdateParams) => {
    try {
      set({ loading: true, error: null });
      const updatedLocation = await locationService.updateLocation(params);
      set(state => ({ 
        locations: state.locations.map(loc => 
          loc.id === updatedLocation.id ? updatedLocation : loc
        ),
        currentLocation: state.currentLocation?.id === updatedLocation.id 
          ? updatedLocation 
          : state.currentLocation,
        loading: false 
      }));
      return updatedLocation;
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '更新地点失败' 
      });
      throw error;
    }
  },
  
  // 删除地点
  deleteLocation: async (id: string) => {
    try {
      set({ loading: true, error: null });
      await locationService.deleteLocation(id);
      set(state => ({ 
        locations: state.locations.filter(loc => loc.id !== id),
        currentLocation: state.currentLocation?.id === id ? null : state.currentLocation,
        loading: false 
      }));
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '删除地点失败' 
      });
      throw error;
    }
  },
  
  // 设置当前选中的地点
  setCurrentLocation: (location: Location | null) => {
    set({ currentLocation: location });
  }
})); 