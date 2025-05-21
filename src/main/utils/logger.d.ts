/**
 * 简单的日志记录器类型声明
 */
declare interface Logger {
  /**
   * 记录信息日志
   * @param message 日志消息
   */
  info(message: string): void;

  /**
   * 记录警告日志
   * @param message 日志消息
   */
  warn(message: string): void;

  /**
   * 记录错误日志
   * @param message 日志消息
   * @param error 可选的错误对象
   */
  error(message: string, error?: Error): void;

  /**
   * 记录调试日志
   * @param message 日志消息
   */
  debug(message: string): void;
}

declare const logger: Logger;
export default logger; 