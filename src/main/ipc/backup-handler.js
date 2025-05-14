const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');
const path = require('path');
const { DbManager } = require('../database/db-manager');
const archiver = require('archiver');
const extract = require('extract-zip');

/**
 * 初始化备份相关的IPC处理器
 */
function initBackupHandlers() {
  /**
   * 创建数据库备份
   * 将数据库文件和用户上传的图片等资源打包为zip文件
   */
  ipcMain.handle('create-backup', async () => {
    try {
      // 获取用户选择的保存路径
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '保存备份文件',
        defaultPath: path.join(app.getPath('documents'), `novelassist-backup-${getFormattedDate()}.zip`),
        filters: [{ name: '备份文件', extensions: ['zip'] }],
        properties: ['createDirectory']
      });

      if (canceled || !filePath) {
        return { success: false, error: '操作已取消' };
      }

      // 创建一个写入流
      const output = fs.createWriteStream(filePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      // 监听所有archive数据都已被写入
      const finishPromise = new Promise((resolve, reject) => {
        output.on('close', () => resolve(true));
        archive.on('error', (err) => reject(err));
      });

      // 将输出流与archive关联
      archive.pipe(output);

      // 添加数据库文件
      const dbPath = path.join(app.getPath('userData'), 'novelassist.db');
      if (fs.existsSync(dbPath)) {
        archive.file(dbPath, { name: 'novelassist.db' });
      }

      // 添加用户上传的图片
      const imagesDir = path.join(app.getPath('userData'), 'images');
      if (fs.existsSync(imagesDir)) {
        archive.directory(imagesDir, 'images');
      }

      // 添加导出的文件
      const exportsDir = path.join(app.getPath('userData'), 'exports');
      if (fs.existsSync(exportsDir)) {
        archive.directory(exportsDir, 'exports');
      }

      // 完成归档
      await archive.finalize();
      await finishPromise;

      return { 
        success: true, 
        message: '备份创建成功', 
        path: filePath 
      };
    } catch (error) {
      console.error('创建备份失败:', error);
      return { 
        success: false, 
        error: `创建备份失败: ${error.message}` 
      };
    }
  });

  /**
   * 恢复数据库备份
   * 从zip文件中提取数据库文件和资源文件
   */
  ipcMain.handle('restore-backup', async () => {
    try {
      // 获取用户选择的备份文件
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: '选择备份文件',
        filters: [{ name: '备份文件', extensions: ['zip'] }],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, error: '操作已取消' };
      }

      const backupPath = filePaths[0];
      
      // 创建临时目录用于解压文件
      const tempDir = path.join(app.getPath('temp'), `novelassist-restore-${Date.now()}`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // 解压备份文件到临时目录
      await extract(backupPath, { dir: tempDir });

      // 检查备份文件是否有效
      const backupDbPath = path.join(tempDir, 'novelassist.db');
      if (!fs.existsSync(backupDbPath)) {
        return { success: false, error: '无效的备份文件：找不到数据库文件' };
      }

      // 关闭当前数据库连接
      const dbManager = new DbManager();
      dbManager.close();

      // 备份当前数据库文件
      const currentDbPath = path.join(app.getPath('userData'), 'novelassist.db');
      const dbBackupPath = path.join(app.getPath('userData'), `novelassist.db.bak-${getFormattedDate()}`);
      
      if (fs.existsSync(currentDbPath)) {
        fs.copyFileSync(currentDbPath, dbBackupPath);
      }

      // 复制恢复的数据库文件
      fs.copyFileSync(backupDbPath, currentDbPath);

      // 恢复图片文件
      const backupImagesDir = path.join(tempDir, 'images');
      const currentImagesDir = path.join(app.getPath('userData'), 'images');
      
      if (fs.existsSync(backupImagesDir)) {
        // 确保目标目录存在
        if (!fs.existsSync(currentImagesDir)) {
          fs.mkdirSync(currentImagesDir, { recursive: true });
        }
        
        // 复制所有图片文件
        copyDirRecursive(backupImagesDir, currentImagesDir);
      }

      // 清理临时目录
      fs.rmSync(tempDir, { recursive: true, force: true });

      return { 
        success: true, 
        message: '备份恢复成功，请重启应用以应用更改' 
      };
    } catch (error) {
      console.error('恢复备份失败:', error);
      return { 
        success: false, 
        error: `恢复备份失败: ${error.message}` 
      };
    }
  });
}

/**
 * 获取格式化的日期字符串
 * @returns {string} 格式化的日期字符串，如：20230101-120530
 */
function getFormattedDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * 递归复制目录
 * @param {string} src - 源目录路径
 * @param {string} dest - 目标目录路径
 */
function copyDirRecursive(src, dest) {
  // 读取源目录中的所有文件和子目录
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // 如果是目录，递归复制
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDirRecursive(srcPath, destPath);
    } else {
      // 如果是文件，直接复制
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = { initBackupHandlers }; 