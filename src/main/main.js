const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const logger = require('./utils/logger');
const isDev = process.env.NODE_ENV === 'development';

// 设置控制台编码为UTF-8
process.env.LANG = 'zh_CN.UTF-8';
process.env.LC_ALL = 'zh_CN.UTF-8';
process.env.LC_CTYPE = 'zh_CN.UTF-8';

// 如果是Windows平台，设置控制台代码页为65001(UTF-8)
if (process.platform === 'win32') {
  try {
    require('child_process').execSync('chcp 65001');
    logger.info('已设置控制台代码页为UTF-8');
  } catch (error) {
    logger.error('设置控制台代码页失败:', error);
  }
}

// 引入向量数据库管理器
const { vectorManager } = require('./database/vector/vector-manager');

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
            : "default-src 'self' file:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' file: https://*.openai.com https://*.deepseek.com https://*.dashscope.aliyuncs.com https://*.anthropic.com https://api.stability.ai https://*.baidu.com https://*.qianfan.cloud https://*.volcengine.com https:; img-src 'self' data: file:"
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
  
  // 尝试加载URL
  try {
    mainWindow.loadURL(startUrl);
    logger.info(`尝试加载URL: ${startUrl}`);
  } catch (error) {
    logger.error('加载URL失败:', error);
    
    // 如果加载失败，尝试备用路径
    const backupUrl = url.format({
      pathname: path.join(__dirname, '../../build/index.html'),
      protocol: 'file:',
      slashes: true
    });
    
    logger.info(`尝试加载备用URL: ${backupUrl}`);
    mainWindow.loadURL(backupUrl);
  }

  // 开发环境下打开DevTools
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
    logger.info(`开发环境：加载URL - ${startUrl}`);
  } else {
    logger.info(`生产环境：加载URL - ${startUrl}`);
    logger.info(`__dirname: ${__dirname}`);
    logger.info(`index.html路径: ${path.join(__dirname, '../../build/index.html')}`);
    
    const indexPath = path.join(__dirname, '../../build/index.html');
    const exists = fs.existsSync(indexPath);
    logger.info(`index.html是否存在: ${exists}`);
    
    if (exists) {
      try {
        const content = fs.readFileSync(indexPath, 'utf8');
        logger.info(`index.html内容长度: ${content.length}`);
        logger.info(`index.html前100个字符: ${content.substring(0, 100)}`);
      } catch (error) {
        logger.error('读取index.html失败:', error);
      }
    }
    
    // 在生产环境中也打开开发者工具以便调试
    mainWindow.webContents.openDevTools();
    
    // 在生产环境中也允许打开开发者工具（通过快捷键Ctrl+Shift+I）
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.shift && input.key.toLowerCase() === 'i') {
        mainWindow.webContents.openDevTools();
        event.preventDefault();
      }
    });
  }
  
  // 添加全局错误处理
  process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常:', error);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的Promise拒绝:', reason);
  });
  
  // 监听页面加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    logger.info('页面加载完成');
  });
  
  // 监听页面加载失败事件
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error(`页面加载失败: ${errorCode} - ${errorDescription}`);
    
    // 如果是开发环境且加载失败，可能是webpack-dev-server还未启动，尝试延迟重新加载
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        logger.info('尝试重新加载页面...');
        mainWindow.loadURL(startUrl);
      }, 3000);
    }
  });
}

/**
 * 应用就绪后创建窗口
 */
app.whenReady().then(async () => {
  createWindow();

  // 初始化数据库连接
  require('./database/db-manager');
  
  // 初始化向量数据库管理器
  try {
    logger.info('正在初始化向量数据库管理器...');
    await vectorManager.initialize();
    logger.info('向量数据库管理器初始化成功');
  } catch (error) {
    logger.error('向量数据库管理器初始化失败:', error);
    // 向量数据库初始化失败不影响应用其他功能的使用
  }
  
  // 加载IPC处理器 - 这些模块会自动注册处理器
  require('./ipc/novel-handler');
  require('./ipc/ai-handler');
  require('./ipc/location-handler');
  require('./ipc/outline-handler');

  // 初始化其他IPC处理器
  const { initCharacterHandlers } = require('./ipc/character-handler');
  const { initTimelineHandlers } = require('./ipc/timeline-handler');
  const { initNovelAssociationHandlers } = require('./ipc/novel-association-handler');
  const { initBackupHandlers } = require('./ipc/backup-handler');
  const { initStatisticsHandlers } = require('./ipc/statistics-handler');
  const { registerSettingsHandlers } = require('./ipc/settings-handler');

  // 分别初始化各模块处理器
  initCharacterHandlers();
  initTimelineHandlers();
  initNovelAssociationHandlers();
  initBackupHandlers();
  initStatisticsHandlers();
  registerSettingsHandlers();

  // 设置应用菜单
  setupMenu();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  
  logger.info('应用已启动');
});

/**
 * 所有窗口关闭时退出应用
 */
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

/**
 * 应用退出前关闭服务
 */
app.on('before-quit', async (event) => {
  // 关闭向量数据库服务
  try {
    logger.info('正在关闭向量数据库服务...');
    await vectorManager.shutdown();
    logger.info('向量数据库服务已关闭');
  } catch (error) {
    logger.error('关闭向量数据库服务失败:', error);
  }
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
  logger.info('应用菜单已设置');
}

// 获取数据库路径
function getDatabasePath() {
  // 如果是开发环境，使用项目根目录下的dev_data目录
  if (isDev) {
    const devDataPath = path.join(__dirname, '..', '..', 'dev_data');
    if (!fs.existsSync(devDataPath)) {
      fs.mkdirSync(devDataPath, { recursive: true });
    }
    return path.join(devDataPath, 'novelassist.db');
  }
  
  // 如果是生产环境，尝试读取app-paths.txt文件获取路径
  const appPathsFile = path.join(app.getAppPath(), 'app-paths.txt');
  let dataPath = '';
  
  if (fs.existsSync(appPathsFile)) {
    try {
      const content = fs.readFileSync(appPathsFile, 'utf8');
      const match = content.match(/DATA_PATH=(.+)(\r?\n|$)/);
      if (match && match[1]) {
        dataPath = match[1].trim();
      }
    } catch (error) {
      logger.error('读取app-paths.txt失败:', error);
    }
  }
  
  // 如果读取失败，使用默认路径
  if (!dataPath) {
    dataPath = path.join(app.getPath('userData'), 'data');
  }
  
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  
  return path.join(dataPath, 'novelassist.db');
}

// 获取配置路径
function getConfigPath() {
  // 如果是开发环境，使用项目根目录下的dev_config目录
  if (isDev) {
    const devConfigPath = path.join(__dirname, '..', '..', 'dev_config');
    if (!fs.existsSync(devConfigPath)) {
      fs.mkdirSync(devConfigPath, { recursive: true });
    }
    return devConfigPath;
  }
  
  // 如果是生产环境，尝试读取app-paths.txt文件获取路径
  const appPathsFile = path.join(app.getAppPath(), 'app-paths.txt');
  let configPath = '';
  
  if (fs.existsSync(appPathsFile)) {
    try {
      const content = fs.readFileSync(appPathsFile, 'utf8');
      const match = content.match(/CONFIG_PATH=(.+)(\r?\n|$)/);
      if (match && match[1]) {
        configPath = match[1].trim();
      }
    } catch (error) {
      logger.error('读取app-paths.txt失败:', error);
    }
  }
  
  // 如果读取失败，使用默认路径
  if (!configPath) {
    configPath = path.join(app.getPath('userData'), 'config');
  }
  
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(configPath, { recursive: true });
  }
  
  return configPath;
}

// 导出路径函数，供其他模块使用
module.exports = {
  getDatabasePath,
  getConfigPath
};

// 在初始化数据库时使用这些路径
// 例如: const dbPath = getDatabasePath();
// const db = new sqlite3.Database(dbPath); 