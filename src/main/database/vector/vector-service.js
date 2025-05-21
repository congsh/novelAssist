const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const logger = require('../../utils/logger');

/**
 * 向量数据库服务类
 * 负责与Python Chroma服务交互，提供向量数据库操作功能
 */
class VectorService {
  constructor(port = 8000) {
    this.pythonProcess = null;
    this.serverPort = port;
    this.serverUrl = `http://localhost:${port}`;
    this.pythonPath = this.getPythonPath();
    this.ready = false;
    this.startPromise = null;
  }

  /**
   * 获取Python可执行文件路径
   * 尝试使用系统Python或查找应用内bundled的Python
   */
  getPythonPath() {
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
  async start() {
    // 如果服务已经在启动中或已启动，则直接返回启动Promise或true
    if (this.startPromise) {
      return this.startPromise;
    }
    
    if (this.ready) {
      return true;
    }
    
    // 创建启动Promise
    this.startPromise = new Promise((resolve, reject) => {
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
  async waitForReady(retries = 30, interval = 1000) {
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
  httpRequest(path, method = 'GET', data) {
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
  stopPythonProcess() {
    if (this.pythonProcess) {
      try {
        if (process.platform === 'win32') {
          // Windows平台使用taskkill强制终止进程树
          spawn('taskkill', ['/pid', String(this.pythonProcess.pid), '/f', '/t']);
        } else {
          // Unix平台可以直接kill
          this.pythonProcess.kill('SIGTERM');
        }
      } catch (error) {
        logger.error('终止Python进程失败:', error);
      }
    }
  }

  /**
   * 停止向量服务
   */
  async stop() {
    if (this.pythonProcess) {
      this.stopPythonProcess();
      this.ready = false;
      logger.info('向量数据库服务已停止');
    }
  }

  /**
   * 确保服务已就绪
   */
  async ensureReady() {
    if (!this.ready) {
      await this.start();
    }
  }

  /**
   * 列出所有collections
   */
  async listCollections() {
    await this.ensureReady();
    
    try {
      const response = await this.httpRequest('/collections', 'GET');
      const data = JSON.parse(response);
      return data.collections || [];
    } catch (error) {
      logger.error('列出collections失败:', error);
      throw error;
    }
  }

  /**
   * 创建单个文本embedding
   */
  async createEmbedding(id, text, metadata = {}, collectionName = 'default') {
    await this.ensureReady();
    
    try {
      const data = {
        id,
        text,
        metadata
      };
      
      await this.httpRequest(`/embed?collection_name=${collectionName}`, 'POST', data);
      logger.debug(`已创建embedding, ID: ${id}, 集合: ${collectionName}`);
    } catch (error) {
      logger.error(`创建embedding失败, ID: ${id}, 集合: ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 批量创建文本embedding
   */
  async createEmbeddingBatch(ids, texts, metadatas = [], collectionName = 'default') {
    await this.ensureReady();
    
    if (ids.length !== texts.length) {
      throw new Error('IDs和texts数组长度必须相同');
    }
    
    // 如果没有提供metadata，则为每个文本创建空对象
    if (!metadatas || metadatas.length === 0) {
      metadatas = Array(ids.length).fill({});
    } else if (metadatas.length !== ids.length) {
      throw new Error('metadata数组长度必须与IDs相同');
    }
    
    try {
      const data = {
        ids,
        texts,
        metadatas
      };
      
      await this.httpRequest(`/embed_batch?collection_name=${collectionName}`, 'POST', data);
      logger.debug(`已批量创建${ids.length}个embeddings, 集合: ${collectionName}`);
    } catch (error) {
      logger.error(`批量创建embeddings失败, 集合: ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 查询相似向量
   */
  async querySimilar(queryText, filter = {}, limit = 5, collectionName = 'default') {
    await this.ensureReady();
    
    try {
      const data = {
        query_text: queryText,
        n_results: limit,
        where: filter
      };
      
      const response = await this.httpRequest(`/query?collection_name=${collectionName}`, 'POST', data);
      const responseData = JSON.parse(response);
      
      if (responseData && responseData.status === 'success') {
        return responseData.results || [];
      }
      
      return [];
    } catch (error) {
      logger.error(`查询相似向量失败, 集合: ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 通过ID删除向量
   */
  async deleteByIds(ids, collectionName = 'default') {
    await this.ensureReady();
    
    try {
      const data = { ids };
      await this.httpRequest(`/delete?collection_name=${collectionName}`, 'POST', data);
      logger.debug(`已删除${ids.length}个embeddings, 集合: ${collectionName}`);
    } catch (error) {
      logger.error(`通过ID删除向量失败, 集合: ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 通过条件删除向量
   */
  async deleteByFilter(where, collectionName = 'default') {
    await this.ensureReady();
    
    try {
      const data = { where };
      await this.httpRequest(`/delete?collection_name=${collectionName}`, 'POST', data);
      logger.debug(`已删除符合条件的embeddings, 集合: ${collectionName}`);
    } catch (error) {
      logger.error(`通过条件删除向量失败, 集合: ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 删除集合
   */
  async deleteCollection(collectionName) {
    await this.ensureReady();
    
    try {
      await this.httpRequest(`/collection/${collectionName}`, 'DELETE');
      logger.debug(`已删除集合: ${collectionName}`);
    } catch (error) {
      logger.error(`删除集合失败: ${collectionName}:`, error);
      throw error;
    }
  }
}

module.exports = { VectorService }; 