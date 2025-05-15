const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const url = require('url');

/**
 * 创建主窗口
 */
function createWindow() {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // 设置CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          process.env.NODE_ENV === 'development'
            ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:3000 http://localhost:3000 https://*.openai.com https://*.deepseek.com https://*.dashscope.aliyuncs.com https://*.anthropic.com https://api.stability.ai https://*.baidu.com https://*.qianfan.cloud https://*.volcengine.com https:; img-src 'self' data: http://localhost:3000"
            : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.openai.com https://*.deepseek.com https://*.dashscope.aliyuncs.com https://*.anthropic.com https://api.stability.ai https://*.baidu.com https://*.qianfan.cloud https://*.volcengine.com https:; img-src 'self' data:"
        ]
      }
    });
  });

  // 根据环境加载不同URL
  const startUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000'
    : url.format({
        pathname: path.join(__dirname, '../../build/index.html'),
        protocol: 'file:',
        slashes: true
      });
  
  mainWindow.loadURL(startUrl);

  // 开发环境下打开DevTools
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
    console.log('开发环境：加载URL -', startUrl);
  }
  
  // 监听页面加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('页面加载完成');
  });
  
  // 监听页面加载失败事件
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
    
    // 如果是开发环境且加载失败，可能是webpack-dev-server还未启动，尝试延迟重新加载
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        console.log('尝试重新加载页面...');
        mainWindow.loadURL(startUrl);
      }, 3000);
    }
  });
}

/**
 * 应用就绪后创建窗口
 */
app.whenReady().then(() => {
  createWindow();

  // 初始化数据库连接
  require('./database/db-manager');

  // 设置应用菜单
  setupMenu();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/**
 * 所有窗口关闭时退出应用
 */
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

/**
 * 设置应用菜单
 */
function setupMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建小说',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            BrowserWindow.getFocusedWindow().webContents.send('menu-new-novel');
          }
        },
        {
          label: '打开小说',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            BrowserWindow.getFocusedWindow().webContents.send('menu-open-novel');
          }
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            BrowserWindow.getFocusedWindow().webContents.send('menu-save');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'delete', label: '删除' },
        { type: 'separator' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            BrowserWindow.getFocusedWindow().webContents.send('menu-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 加载IPC处理器
require('./ipc/novel-handler');
require('./ipc/ai-handler');
require('./ipc/location-handler');
require('./ipc/outline-handler');

// 加载人物和时间线IPC处理器
const { initCharacterHandlers } = require('./ipc/character-handler');
const { initTimelineHandlers } = require('./ipc/timeline-handler');
const { initNovelAssociationHandlers } = require('./ipc/novel-association-handler');
const { initBackupHandlers } = require('./ipc/backup-handler');
const { initStatisticsHandlers } = require('./ipc/statistics-handler');
const { registerAIHandlers } = require('./ipc/ai-handler');
const { registerSettingsHandlers } = require('./ipc/settings-handler');

// 初始化人物和时间线IPC处理器
initCharacterHandlers();
initTimelineHandlers();
initNovelAssociationHandlers();
initBackupHandlers();
initStatisticsHandlers();
registerAIHandlers();
registerSettingsHandlers(); 