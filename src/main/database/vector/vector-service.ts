import * as http from 'http';
import * as https from 'https';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import logger from '../../utils/logger';

// 使用require来避免TypeScript类型问题
const { spawn, ChildProcess } = require('child_process');

/**
 * 向量数据库服务类
 * 负责与Python Chroma服务交互，提供向量数据库操作功能
 */
export class VectorService {
  private pythonProcess: any = null;
  private serverUrl: string;
  private serverPort: number;
  private pythonPath: string;
  private ready: boolean = false;
  private startPromise: Promise<boolean> | null = null;
  private actualPort: number;

  constructor(port: number = 8765) {
    this.serverPort = port;
    this.actualPort = port;
    this.serverUrl = `http://localhost:${port}`;
    this.pythonPath = this.getPythonPath();
  }

  /**
   * 获取Python可执行文件路径
   * 尝试使用系统Python或查找应用内bundled的Python
   */
  private getPythonPath(): string {
    // 首先尝试使用环境变量中的Python
    const systemPython = process.platform === 'win32' ? 'python' : 'python3';
    
    // 如果是打包后的应用，可以考虑使用bundled的Python
    if (app.isPackaged) {
      const appPath = app.getAppPath();
      const bundledPythonPath = path.join(appPath, 'resources', 'python', 
        process.platform === 'win32' ? 'python.exe' : 'bin/python3');
      
      if (fs.existsSync(bundledPythonPath)) {
        return bundledPythonPath;
      }
    }
    
    return systemPython;
  }

  /**
   * 启动Python向量服务
   */
  async start(): Promise<boolean> {
    // 如果服务已经在启动中或已启动，则直接返回启动Promise或true
    if (this.startPromise) {
      return this.startPromise;
    }
    
    if (this.ready) {
      return true;
    }
    
    // 创建启动Promise
    this.startPromise = new Promise<boolean>((resolve, reject) => {
      try {
        logger.info('启动向量数据库服务...');
        
        // 获取脚本路径
        const scriptPath = app.isPackaged
          ? path.join(app.getAppPath(), 'python', 'chroma_server.py')
          : path.join(app.getAppPath(), 'python', 'chroma_server.py');
        
        // 获取向量数据库路径
        const dbPath = app.isPackaged
          ? path.join(app.getPath('userData'), 'vector_db')
          : path.join(app.getAppPath(), 'resources', 'vector_db');
        
        // 确保数据库目录存在
        if (!fs.existsSync(dbPath)) {
          fs.mkdirSync(dbPath, { recursive: true });
        }
        
        // 启动Python进程
        const args = [
          scriptPath,
          '--host', '127.0.0.1',
          '--port', this.serverPort.toString(),
          '--db-path', dbPath,
          '--auto-port'
        ];
        
        logger.info(`执行命令: ${this.pythonPath} ${args.join(' ')}`);
        
        this.pythonProcess = spawn(this.pythonPath, args, {
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // 监听输出
        if (this.pythonProcess.stdout) {
          this.pythonProcess.stdout.on('data', (data: Buffer) => {
            const output = data.toString().trim();
            logger.info(`[Python] ${output}`);
            
            // 检查是否包含端口信息
            const portMatch = output.match(/监听地址: 127\.0\.0\.1:(\d+)/);
            if (portMatch && portMatch[1]) {
              const detectedPort = parseInt(portMatch[1], 10);
              if (detectedPort !== this.serverPort) {
                logger.info(`检测到服务使用了不同的端口: ${detectedPort}`);
                this.serverPort = detectedPort;
                this.serverUrl = `http://localhost:${detectedPort}`;
                this.actualPort = detectedPort;
              }
            }
          });
        }
        
        if (this.pythonProcess.stderr) {
          this.pythonProcess.stderr.on('data', (data: Buffer) => {
            const message = data.toString().trim();
            // 忽略某些不重要的警告消息
            if (!message.includes('WARNING') && !message.includes('INFO')) {
              logger.error(`[Python] ${message}`);
            } else {
              logger.debug(`[Python] ${message}`);
            }
          });
        }
        
        // 监听进程关闭
        this.pythonProcess.on('close', (code: number | null) => {
          logger.info(`Python向量服务关闭，退出码: ${code}`);
          this.ready = false;
          this.pythonProcess = null;
          
          // 如果启动过程中关闭，则认为启动失败
          if (this.startPromise && !this.ready) {
            reject(new Error(`Python服务启动失败，退出码: ${code}`));
            this.startPromise = null;
          }
        });
        
        // 监听错误
        this.pythonProcess.on('error', (err: Error) => {
          logger.error('Python向量服务启动错误:', err);
          this.ready = false;
          
          if (this.startPromise) {
            reject(err);
            this.startPromise = null;
          }
        });
        
        // 等待服务准备就绪
        this.waitForReady()
          .then(() => {
            logger.info('向量数据库服务已启动并就绪');
            this.ready = true;
            this.startPromise = null;
            resolve(true);
          })
          .catch((err) => {
            const error = err instanceof Error ? err : new Error(String(err));
            logger.error('等待向量服务就绪失败:', error);
            this.stopPythonProcess();
            this.ready = false;
            this.startPromise = null;
            reject(error);
          });
        
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('启动向量数据库服务失败:', err);
        this.ready = false;
        this.startPromise = null;
        reject(err);
      }
    });
    
    return this.startPromise;
  }

  /**
   * 等待服务就绪
   */
  private async waitForReady(retries: number = 30, interval: number = 1000): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await this.httpRequest('/health', 'GET');
        const data = JSON.parse(response);
        if (data && data.status === 'ok') {
          return;
        }
      } catch (error) {
        // 忽略错误，继续等待
      }
      
      // 等待指定时间
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`服务未就绪，已尝试 ${retries} 次`);
  }

  /**
   * 执行HTTP请求
   * @param path 路径
   * @param method HTTP方法
   * @param data 请求数据
   */
  private httpRequest(path: string, method: string = 'GET', data?: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: this.serverPort,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            const errorMessage = `HTTP错误: ${res.statusCode} - ${responseData}`;
            reject(new Error(errorMessage));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(error.message));
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  /**
   * 停止Python进程
   */
  private stopPythonProcess(): void {
    if (this.pythonProcess) {
      try {
        const pid = this.pythonProcess.pid;
        logger.info(`正在终止Python进程，PID: ${pid}`);
        
        if (process.platform === 'win32') {
          try {
            // 先尝试直接终止进程
            this.pythonProcess.kill();
            logger.info(`已发送终止信号到进程 ${pid}`);
            
            // 设置一个标志，表示进程已被请求终止
            (this.pythonProcess as any)._terminationRequested = true;
            
            // 等待一段时间让进程自然退出
            setTimeout(() => {
              // 检查进程是否还存在
              this.forceKillProcess(pid);
            }, 2000);
            
          } catch (killError) {
            const err = killError instanceof Error ? killError : new Error(String(killError));
            logger.warn(`直接终止进程失败: ${err.message}`);
            
            // 如果直接kill失败，立即尝试强制终止
            this.forceKillProcess(pid);
          }
          
          // 检查端口占用，使用更可靠的方式
          setTimeout(() => {
            this.checkAndCleanPort(this.actualPort);
          }, 3000);
        } else {
          // Unix平台可以直接kill
          try {
            // @ts-ignore - 忽略类型检查问题
            this.pythonProcess.kill('SIGTERM');
          } catch (e) {
            // 忽略错误，可能是因为进程已经退出
          }
          
          // 给进程一些时间来优雅地退出
          setTimeout(() => {
            try {
              // 检查进程是否还在运行
              const proc = this.pythonProcess;
              if (proc && proc.exitCode === null && !(proc as any)._terminationRequested) {
                logger.warn('进程未响应SIGTERM，尝试SIGKILL...');
                try {
                  // @ts-ignore - 忽略类型检查问题
                  proc.kill('SIGKILL');
                } catch (e) {
                  // 忽略错误，可能是因为进程已经退出
                  logger.debug('进程可能已经退出');
                }
              }
            } catch (e) {
              const err = e instanceof Error ? e : new Error(String(e));
              logger.debug('进程可能已经退出');
            }
          }, 1000);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('停止Python进程失败:', err);
      }
      
      // 无论成功与否，都将引用置空
      this.pythonProcess = null;
    }
  }

  /**
   * 强制终止进程
   * @param pid 进程ID
   */
  private forceKillProcess(pid: number): void {
    if (!pid) return;
    
    try {
      const { execSync } = require('child_process');
      
      // 首先检查进程是否还存在
      try {
        const checkResult = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { 
          encoding: 'buffer',
          windowsHide: true,
          timeout: 3000
        });
        
        // 转换为UTF-8字符串，处理中文编码
        const checkOutput = this.decodeWindowsOutput(checkResult);
        
        if (!checkOutput || checkOutput.includes('没有运行的任务匹配指定标准') || checkOutput.trim() === '') {
          logger.info(`进程 ${pid} 已经不存在，无需强制终止`);
          return;
        }
        
        logger.info(`进程 ${pid} 仍在运行，执行强制终止`);
        
      } catch (checkError) {
        // tasklist命令可能失败，继续尝试终止
        logger.debug(`检查进程状态失败，继续尝试终止进程 ${pid}`);
      }
      
      // 使用taskkill强制终止进程
      try {
        const killResult = execSync(`taskkill /pid ${pid} /f /t`, { 
          encoding: 'buffer',
          windowsHide: true,
          timeout: 5000
        });
        
        const killOutput = this.decodeWindowsOutput(killResult);
        logger.info(`强制终止进程成功: ${killOutput.trim()}`);
        
      } catch (taskKillError: any) {
        // 转换错误输出
        const errorOutput = this.decodeWindowsOutput(taskKillError.stdout || Buffer.alloc(0));
        const errorStderr = this.decodeWindowsOutput(taskKillError.stderr || Buffer.alloc(0));
        
        // 如果进程已经不存在，这是正常的
        if (taskKillError.status === 128 || 
            errorOutput.includes('没有找到该进程') || 
            errorStderr.includes('没有找到该进程')) {
          logger.info(`进程 ${pid} 已经终止`);
        } else {
          logger.warn(`强制终止进程失败 (退出码: ${taskKillError.status}): ${taskKillError.message}`);
          if (errorOutput.trim()) {
            logger.warn(`taskkill stdout: ${errorOutput.trim()}`);
          }
          if (errorStderr.trim()) {
            logger.warn(`taskkill stderr: ${errorStderr.trim()}`);
          }
        }
      }
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`强制终止进程 ${pid} 失败:`, err);
    }
  }

  /**
   * 解码Windows命令输出，处理中文编码问题
   * @param buffer 命令输出的Buffer
   * @returns 解码后的字符串
   */
  private decodeWindowsOutput(buffer: Buffer): string {
    if (!buffer || buffer.length === 0) return '';
    
    try {
      // 尝试使用 GBK 编码解码（Windows中文系统默认编码）
      const iconv = require('iconv-lite');
      if (iconv.encodingExists('gbk')) {
        return iconv.decode(buffer, 'gbk');
      }
    } catch (error) {
      // 如果iconv-lite不可用，fallback到其他方法
      logger.debug('iconv-lite不可用，使用fallback解码方法');
    }
    
    try {
      // 尝试使用cp936编码（GBK的别名）
      return buffer.toString('binary');
    } catch (error) {
      // 最后fallback到UTF-8
      return buffer.toString('utf8');
    }
  }

  /**
   * 检查端口占用并清理
   * 使用更可靠的方式检查和清理端口
   */
  private checkAndCleanPort(port: number): void {
    if (!port) return;
    
    try {
      const { execSync } = require('child_process');
      
      try {
        // 使用buffer编码避免乱码问题
        const stdoutBuffer = execSync(`netstat -ano | findstr :${port}`, { 
          encoding: 'buffer',
          windowsHide: true,
          timeout: 3000
        });
        
        const stdout = this.decodeWindowsOutput(stdoutBuffer);
        
        if (stdout && stdout.includes(`:${port}`)) {
          logger.warn(`端口 ${port} 仍被占用，尝试进一步清理...`);
          
          // 提取PID并尝试杀死进程
          const lines = stdout.split('\n').filter((line: string) => line.includes(`:${port}`));
          for (const line of lines) {
            const pidMatch = line.match(/\s+(\d+)\s*$/);
            if (pidMatch && pidMatch[1]) {
              const remainingPid = parseInt(pidMatch[1].trim(), 10);
              
              // 检查PID是否为系统进程，避免杀死重要系统进程
              if (remainingPid <= 4 || remainingPid === 0) {
                logger.warn(`检测到系统关键进程 PID: ${remainingPid}，跳过终止操作`);
                continue;
              }
              
              logger.warn(`尝试杀死占用端口的进程，PID: ${remainingPid}`);
              
              try {
                const killResultBuffer = execSync(`taskkill /F /PID ${remainingPid} /T`, { 
                  encoding: 'buffer',
                  windowsHide: true,
                  timeout: 3000
                });
                
                const killResult = this.decodeWindowsOutput(killResultBuffer);
                logger.info(`已杀死残留进程: ${killResult.trim()}`);
                
              } catch (err: any) {
                const errorOutput = this.decodeWindowsOutput(err.stdout || Buffer.alloc(0));
                const errorStderr = this.decodeWindowsOutput(err.stderr || Buffer.alloc(0));
                
                if (err.status === 128 || 
                    errorOutput.includes('没有找到该进程') || 
                    errorStderr.includes('没有找到该进程')) {
                  logger.info(`进程 ${remainingPid} 已经终止`);
                } else {
                  logger.error(`杀死残留进程失败: ${err.message}`);
                  if (errorOutput.trim()) logger.error(`stdout: ${errorOutput.trim()}`);
                  if (errorStderr.trim()) logger.error(`stderr: ${errorStderr.trim()}`);
                }
              }
            }
          }
        } else {
          logger.info(`端口 ${port} 已释放`);
        }
      } catch (error: any) {
        // netstat命令可能失败，这不是严重错误
        if (error.status !== 1) { // 状态码1通常表示没有找到匹配项，这是正常的
          logger.debug(`检查端口占用出错: ${error.message}`);
        } else {
          logger.info(`端口 ${port} 未被占用或已释放`);
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('检查端口占用失败:', err);
    }
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    this.stopPythonProcess();
    this.ready = false;
    this.startPromise = null;
    
    // 等待一段时间确保进程完全退出
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 额外检查：确保端口已释放
    this.checkAndCleanPort(this.actualPort);
    
    logger.info('向量数据库服务已停止');
  }

  /**
   * 确保服务已就绪
   */
  private async ensureReady(): Promise<void> {
    if (!this.ready) {
      await this.start();
    }
  }

  /**
   * 列出所有collections
   */
  async listCollections(): Promise<string[]> {
    await this.ensureReady();
    
    try {
      const response = await this.httpRequest('/collections', 'GET');
      const data = JSON.parse(response);
      return data.collections || [];
    } catch (error) {
      logger.error('列出collections失败:', error as Error);
      throw error;
    }
  }

  /**
   * 创建文本向量嵌入
   * 
   * @param id 唯一标识
   * @param text 文本内容
   * @param metadata 元数据
   * @param collectionName 集合名称
   * @param embedding 可选的向量数据，如果提供则直接使用
   */
  async createEmbedding(
    id: string, 
    text: string, 
    metadata: Record<string, any> = {}, 
    collectionName: string = 'default',
    embedding?: number[]
  ): Promise<void> {
    await this.ensureReady();
    
    try {
      const data = { 
        id, 
        text, 
        metadata,
        embedding // 传递向量数据（如果有）
      };
      await this.httpRequest(`/embed?collection_name=${collectionName}`, 'POST', data);
    } catch (error) {
      logger.error('创建向量嵌入失败:', error as Error);
      throw error;
    }
  }

  /**
   * 批量创建文本向量嵌入
   * 
   * @param ids ID数组
   * @param texts 文本数组
   * @param metadatas 元数据数组
   * @param collectionName 集合名称
   * @param embeddings 可选的向量数据数组，如果提供则直接使用
   */
  async createEmbeddingBatch(
    ids: string[],
    texts: string[],
    metadatas: Record<string, any>[] = [],
    collectionName: string = 'default',
    embeddings?: number[][]
  ): Promise<void> {
    await this.ensureReady();
    
    try {
      const data = {
        ids,
        texts,
        metadatas: metadatas.length > 0 ? metadatas : undefined,
        embeddings // 传递向量数据数组（如果有）
      };
      
      await this.httpRequest(`/embed_batch?collection_name=${collectionName}`, 'POST', data);
    } catch (error) {
      logger.error('批量创建向量嵌入失败:', error as Error);
      throw error;
    }
  }

  /**
   * 查询相似向量
   * 
   * @param queryText 查询文本
   * @param filter 过滤条件
   * @param limit 返回结果数量
   * @param collectionName 集合名称
   */
  async querySimilar(
    queryText: string,
    filter: Record<string, any> = {},
    limit: number = 5,
    collectionName: string = 'default'
  ): Promise<any[]> {
    await this.ensureReady();
    
    try {
      const data = {
        query_text: queryText,
        where: Object.keys(filter).length > 0 ? filter : undefined,
        n_results: limit
      };
      
      const response = await this.httpRequest(`/query?collection_name=${collectionName}`, 'POST', data);
      const responseData = JSON.parse(response);
      return responseData.results || [];
    } catch (error) {
      logger.error('查询相似向量失败:', error as Error);
      throw error;
    }
  }

  /**
   * 删除向量
   * 
   * @param ids 要删除的ID数组
   * @param collectionName 集合名称
   */
  async deleteByIds(ids: string[], collectionName: string = 'default'): Promise<void> {
    await this.ensureReady();
    
    try {
      const data = { ids };
      await this.httpRequest(`/delete?collection_name=${collectionName}`, 'POST', data);
    } catch (error) {
      logger.error('删除向量失败:', error as Error);
      throw error;
    }
  }

  /**
   * 按条件删除向量
   * 
   * @param where 过滤条件
   * @param collectionName 集合名称
   */
  async deleteByFilter(where: Record<string, any>, collectionName: string = 'default'): Promise<void> {
    await this.ensureReady();
    
    try {
      const data = { where };
      await this.httpRequest(`/delete?collection_name=${collectionName}`, 'POST', data);
    } catch (error) {
      logger.error('按条件删除向量失败:', error as Error);
      throw error;
    }
  }

  /**
   * 删除集合
   * 
   * @param collectionName 集合名称
   */
  async deleteCollection(collectionName: string): Promise<void> {
    await this.ensureReady();
    
    try {
      await this.httpRequest(`/collection/${collectionName}`, 'DELETE');
    } catch (error) {
      logger.error('删除集合失败:', error as Error);
      throw error;
    }
  }
}

// 添加CommonJS兼容的导出，确保可以通过require正确导入
// 这样在JavaScript文件中可以通过require('./vector-service').VectorService使用
module.exports = { VectorService }; 