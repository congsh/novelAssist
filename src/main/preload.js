const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露API
contextBridge.exposeInMainWorld('electron', {
  // 发送消息到主进程
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  
  // 从主进程接收消息
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  
  // 向主进程发送消息并等待响应
  invoke: (channel, data) => {
    return ipcRenderer.invoke(channel, data);
  },
  
  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
}); 