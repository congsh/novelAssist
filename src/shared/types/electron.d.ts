/**
 * Electron API 类型定义
 * 这些类型定义对应于 preload.js 中暴露的 API
 */

interface ElectronAPI {
  /**
   * 发送消息到主进程
   * @param channel 通道名称
   * @param data 要发送的数据
   */
  send: (channel: string, data?: any) => void;
  
  /**
   * 从主进程接收消息
   * @param channel 通道名称
   * @param func 接收消息的回调函数
   */
  on: (channel: string, func: (...args: any[]) => void) => void;
  
  /**
   * 向主进程发送消息并等待响应
   * @param channel 通道名称
   * @param data 要发送的数据
   * @returns 主进程的响应
   */
  invoke: (channel: string, data?: any) => Promise<any>;
  
  /**
   * 移除所有监听器
   * @param channel 通道名称
   */
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    /**
     * Electron API，由 preload.js 暴露
     */
    electron: ElectronAPI;
  }
}

export {}; 