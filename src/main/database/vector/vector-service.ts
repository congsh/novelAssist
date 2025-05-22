import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';
import * as https from 'https';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import logger from '../../utils/logger';

/**
 * 向量数据库服务类
 * 负责与Python Chroma服务交互，提供向量数据库操作功能
 */
export class VectorService {
  private pythonProcess: ChildProcess | null = null;
  private serverUrl: string;
  private serverPort: number;
  private pythonPath: string;
  private ready: boolean = false;
  private startPromise: Promise<boolean> | null = null;

  constructor(port: number = 8765) {
    this.serverPort = port;
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
          '--db-path', dbPath
        ];
        
        logger.info(`执行命令: ${this.pythonPath} ${args.join(' ')}`);
        
        this.pythonProcess = spawn(this.pythonPath, args, {
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // 监听输出
        if (this.pythonProcess.stdout) {
          this.pythonProcess.stdout.on('data', (data) => {
            logger.info(`[Python] ${data.toString().trim()}`);
          });
        }
        
        if (this.pythonProcess.stderr) {
          this.pythonProcess.stderr.on('data', (data) => {
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
        this.pythonProcess.on('close', (code) => {
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
        this.pythonProcess.on('error', (err) => {
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
        if (process.platform === 'win32') {
          // Windows平台使用taskkill强制终止进程树
          const taskkill = spawn('taskkill', ['/pid', this.pythonProcess.pid!.toString(), '/f', '/t'], {
            // 设置编码以解决乱码问题
            windowsHide: true
          });
          
          // 监听taskkill的输出和错误
          if (taskkill.stdout) {
            taskkill.stdout.on('data', (data: Buffer) => {
              logger.info(`taskkill输出: ${data.toString().trim()}`);
            });
          }
          
          if (taskkill.stderr) {
            taskkill.stderr.on('data', (data: Buffer) => {
              logger.error(`taskkill错误: ${data.toString().trim()}`);
            });
          }
          
          // 监听taskkill结束
          taskkill.on('close', (code: number | null) => {
            logger.info(`taskkill进程退出，退出码: ${code}`);
            
            // 额外检查端口占用情况
            try {
              const { exec } = require('child_process');
              const execOptions = { windowsHide: true };
              
              exec(`netstat -ano | findstr :${this.serverPort}`, execOptions, (error: Error | null, stdout: string) => {
                if (error) {
                  logger.debug(`检查端口占用出错: ${error.message}`);
                  return;
                }
                
                if (stdout && stdout.includes(`:${this.serverPort}`)) {
                  logger.warn(`端口 ${this.serverPort} 仍被占用，尝试进一步清理...`);
                  
                  // 提取PID并尝试终止进程
                  const pidMatch = stdout.match(/\s+(\d+)\s*$/m);
                  if (pidMatch && pidMatch[1]) {
                    const remainingPid = parseInt(pidMatch[1].trim(), 10);
                    
                    // 检查PID是否为系统进程，避免杀死重要系统进程
                    if (remainingPid <= 4 || remainingPid === 0) {
                      logger.warn(`检测到系统关键进程 PID: ${remainingPid}，跳过终止操作`);
                      return;
                    }
                    
                    logger.warn(`尝试杀死占用端口的进程，PID: ${remainingPid}`);
                    
                    exec(`taskkill /F /PID ${remainingPid} /T`, execOptions, (err: Error | null, out: string) => {
                      if (err) {
                        logger.error(`杀死残留进程失败: ${err.message}`);
                      } else {
                        logger.info(`已杀死残留进程: ${out.trim()}`);
                      }
                    });
                  }
                }
              });
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              logger.error('检查端口占用失败:', err);
            }
          });
        } else {
          // Unix平台可以直接kill
          this.pythonProcess.kill('SIGTERM');
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('停止Python进程失败:', err);
      }
      
      this.pythonProcess = null;
    }
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    this.stopPythonProcess();
    this.ready = false;
    this.startPromise = null;
    
    // 额外检查：确保端口已释放
    try {
      const { exec } = require('child_process');
      const execOptions = { windowsHide: true };
      
      exec(`netstat -ano | findstr :${this.serverPort}`, execOptions, (error: Error | null, stdout: string) => {
        // 忽略错误，因为可能是没有找到匹配项
        if (stdout && stdout.includes(`:${this.serverPort}`)) {
          logger.warn(`停止服务后端口 ${this.serverPort} 仍被占用，尝试额外清理...`);
          
          // 提取PID并尝试杀死进程
          const pidMatch = stdout.match(/\s+(\d+)\s*$/m);
          if (pidMatch && pidMatch[1]) {
            const remainingPid = parseInt(pidMatch[1].trim(), 10);
            
            // 检查PID是否为系统进程，避免杀死重要系统进程
            if (remainingPid <= 4 || remainingPid === 0) {
              logger.warn(`检测到系统关键进程 PID: ${remainingPid}，跳过终止操作`);
              return;
            }
            
            logger.warn(`尝试杀死占用端口的进程，PID: ${remainingPid}`);
            
            exec(`taskkill /F /PID ${remainingPid} /T`, execOptions, (err: Error | null, out: string) => {
              if (err) {
                logger.error(`杀死残留进程失败: ${err.message}`);
              } else {
                logger.info(`已杀死残留进程: ${out.trim()}`);
              }
            });
          }
        }
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('检查端口占用失败:', err);
    }
    
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
   */
  async createEmbedding(
    id: string, 
    text: string, 
    metadata: Record<string, any> = {}, 
    collectionName: string = 'default'
  ): Promise<void> {
    await this.ensureReady();
    
    try {
      const data = { id, text, metadata };
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
   */
  async createEmbeddingBatch(
    ids: string[],
    texts: string[],
    metadatas: Record<string, any>[] = [],
    collectionName: string = 'default'
  ): Promise<void> {
    await this.ensureReady();
    
    try {
      const data = {
        ids,
        texts,
        metadatas: metadatas.length > 0 ? metadatas : undefined
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