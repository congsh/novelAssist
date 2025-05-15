const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * 简单的日志记录器
 */
class Logger {
  /**
   * 创建日志记录器
   * @param {string} logFile 日志文件名
   */
  constructor(logFile = 'app.log') {
    this.logDir = path.join(app.getPath('userData'), 'logs');
    this.logPath = path.join(this.logDir, logFile);
    
    // 确保日志目录存在
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 记录信息日志
   * @param {string} message 日志消息
   */
  info(message) {
    this._writeLog('INFO', message);
    console.log(message);
  }

  /**
   * 记录警告日志
   * @param {string} message 日志消息
   */
  warn(message) {
    this._writeLog('WARN', message);
    console.warn(message);
  }

  /**
   * 记录错误日志
   * @param {string} message 日志消息
   * @param {Error} [error] 错误对象
   */
  error(message, error) {
    const errorMsg = error ? `${message}: ${error.message}\n${error.stack}` : message;
    this._writeLog('ERROR', errorMsg);
    console.error(message, error || '');
  }

  /**
   * 记录调试日志
   * @param {string} message 日志消息
   */
  debug(message) {
    if (process.env.NODE_ENV === 'development') {
      this._writeLog('DEBUG', message);
      console.debug(message);
    }
  }

  /**
   * 写入日志到文件
   * @private
   * @param {string} level 日志级别
   * @param {string} message 日志消息
   */
  _writeLog(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    try {
      fs.appendFileSync(this.logPath, logEntry, { encoding: 'utf8' });
    } catch (error) {
      console.error('写入日志失败:', error);
    }
  }
}

// 创建并导出日志记录器实例
const logger = new Logger();
module.exports = logger; 