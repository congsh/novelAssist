const { ipcMain, dialog, BrowserWindow } = require('electron');

/**
 * 注册应用相关的IPC处理器
 */
function registerAppHandlers() {
  // 显示对话框
  ipcMain.handle('dialog:show', async (event, options) => {
    try {
      const { type = 'info', title, message, buttons = ['确定'] } = options;
      
      const result = await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
        type,
        title,
        message,
        buttons
      });
      
      return { 
        success: true, 
        response: result.response,
        checkboxChecked: result.checkboxChecked 
      };
    } catch (error) {
      console.error('显示对话框失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 应用内导航
  ipcMain.handle('app:navigate', async (event, options) => {
    try {
      const { path } = options;
      
      // 获取当前窗口
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (!focusedWindow) {
        throw new Error('未找到焦点窗口');
      }
      
      // 发送导航事件到渲染进程
      focusedWindow.webContents.send('navigate-to', path);
      
      return { success: true };
    } catch (error) {
      console.error('应用导航失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取应用信息
  ipcMain.handle('app:get-info', async () => {
    try {
      const { app } = require('electron');
      
      return {
        success: true,
        data: {
          name: app.getName(),
          version: app.getVersion(),
          path: app.getAppPath()
        }
      };
    } catch (error) {
      console.error('获取应用信息失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 重启应用
  ipcMain.handle('app:restart', async () => {
    try {
      const { app } = require('electron');
      
      app.relaunch();
      app.exit(0);
      
      return { success: true };
    } catch (error) {
      console.error('重启应用失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 退出应用
  ipcMain.handle('app:quit', async () => {
    try {
      const { app } = require('electron');
      
      app.quit();
      
      return { success: true };
    } catch (error) {
      console.error('退出应用失败:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('应用IPC处理器已注册');
}

module.exports = {
  registerAppHandlers
}; 