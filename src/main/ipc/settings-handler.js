const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// 判断是否是生产环境
const isProduction = process.env.NODE_ENV === 'production';
console.log(`当前环境: ${isProduction ? '生产环境' : '开发环境'}`);

// 应用数据目录
let APP_DATA_DIR;

if (isProduction) {
  // 生产环境 - 使用用户AppData目录
  APP_DATA_DIR = path.join(process.env.APPDATA || (process.platform === 'darwin' ? 
    path.join(process.env.HOME, 'Library/Application Support') : 
    path.join(process.env.HOME, '.local/share')), 'NovelAssist');
  console.log(`生产环境数据目录: ${APP_DATA_DIR}`);
} else {
  // 开发环境 - 使用项目目录下的dev_data
  APP_DATA_DIR = path.join(app.getAppPath(), 'dev_data');
  console.log(`开发环境数据目录: ${APP_DATA_DIR}`);
}

// 设置文件路径
const SETTINGS_FILE = path.join(APP_DATA_DIR, 'settings.json');
console.log(`设置文件路径: ${SETTINGS_FILE}`);

// 确保目录存在
if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
  console.log(`创建数据目录: ${APP_DATA_DIR}`);
}

/**
 * 保存设置
 * @param {string} key 设置键
 * @param {any} value 设置值
 */
function saveSetting(key, value) {
  try {
    let settings = {};
    
    // 如果设置文件存在，加载现有设置
    if (fs.existsSync(SETTINGS_FILE)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
    
    // 更新设置
    settings[key] = value;
    
    // 保存设置
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log(`保存设置成功: ${key}`);
    return true;
  } catch (error) {
    console.error('保存设置失败:', error);
    return false;
  }
}

/**
 * 获取设置
 * @param {string} key 设置键
 * @returns {any} 设置值，如果不存在则返回null
 */
function getSetting(key) {
  try {
    // 如果设置文件存在，加载设置
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return settings[key] || null;
    }
    return null;
  } catch (error) {
    console.error('获取设置失败:', error);
    return null;
  }
}

/**
 * 删除设置
 * @param {string} key 设置键
 * @returns {boolean} 是否成功删除
 */
function deleteSetting(key) {
  try {
    // 如果设置文件存在，加载设置
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (key in settings) {
        delete settings[key];
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        console.log(`删除设置成功: ${key}`);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('删除设置失败:', error);
    return false;
  }
}

/**
 * 注册设置IPC处理器
 */
function registerSettingsHandlers() {
  // 设置相关
  ipcMain.handle('settings:set', (event, params) => {
    if (params && typeof params === 'object' && 'key' in params && 'value' in params) {
      return saveSetting(params.key, params.value);
    }
    console.error('settings:set 参数格式错误', params);
    return false;
  });
  
  ipcMain.handle('settings:get', (event, params) => {
    if (params && typeof params === 'object' && 'key' in params) {
      return getSetting(params.key);
    }
    console.error('settings:get 参数格式错误', params);
    return null;
  });
  
  ipcMain.handle('settings:delete', (event, params) => {
    if (params && typeof params === 'object' && 'key' in params) {
      return deleteSetting(params.key);
    }
    console.error('settings:delete 参数格式错误', params);
    return false;
  });
}

module.exports = { registerSettingsHandlers }; 