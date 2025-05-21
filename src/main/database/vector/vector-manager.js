const { ipcMain } = require('electron');
const { VectorService } = require('./vector-service');
const logger = require('../../utils/logger');

/**
 * 向量数据库管理器
 * 负责初始化和管理VectorService，提供IPC接口与渲染进程交互
 */
class VectorManager {
  constructor() {
    this.vectorService = new VectorService();
    this.initialized = false;
  }

  /**
   * 初始化向量数据库管理器
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('初始化向量数据库管理器...');

      // 启动向量数据库服务
      await this.vectorService.start();

      // 注册IPC处理器
      this.registerIpcHandlers();

      this.initialized = true;
      logger.info('向量数据库管理器初始化完成');
    } catch (error) {
      logger.error('初始化向量数据库管理器失败:', error);
      throw error;
    }
  }

  /**
   * 注册IPC处理器
   */
  registerIpcHandlers() {
    // 列出所有collections
    ipcMain.handle('vector:list-collections', async () => {
      try {
        return await this.vectorService.listCollections();
      } catch (error) {
        logger.error('列出collections失败:', error);
        throw error;
      }
    });

    // 创建单个文本embedding
    ipcMain.handle('vector:create-embedding', async (_, args) => {
      try {
        const { id, text, metadata, collectionName } = args;
        await this.vectorService.createEmbedding(id, text, metadata, collectionName);
        return { success: true };
      } catch (error) {
        logger.error('创建embedding失败:', error);
        throw error;
      }
    });

    // 批量创建文本embedding
    ipcMain.handle('vector:create-embedding-batch', async (_, args) => {
      try {
        const { ids, texts, metadatas, collectionName } = args;
        await this.vectorService.createEmbeddingBatch(ids, texts, metadatas, collectionName);
        return { success: true };
      } catch (error) {
        logger.error('批量创建embedding失败:', error);
        throw error;
      }
    });

    // 查询相似向量
    ipcMain.handle('vector:query-similar', async (_, args) => {
      try {
        const { queryText, filter, limit, collectionName } = args;
        return await this.vectorService.querySimilar(queryText, filter, limit, collectionName);
      } catch (error) {
        logger.error('查询相似向量失败:', error);
        throw error;
      }
    });

    // 通过ID删除向量
    ipcMain.handle('vector:delete-by-ids', async (_, args) => {
      try {
        const { ids, collectionName } = args;
        await this.vectorService.deleteByIds(ids, collectionName);
        return { success: true };
      } catch (error) {
        logger.error('通过ID删除向量失败:', error);
        throw error;
      }
    });

    // 通过条件删除向量
    ipcMain.handle('vector:delete-by-filter', async (_, args) => {
      try {
        const { where, collectionName } = args;
        await this.vectorService.deleteByFilter(where, collectionName);
        return { success: true };
      } catch (error) {
        logger.error('通过条件删除向量失败:', error);
        throw error;
      }
    });

    // 删除集合
    ipcMain.handle('vector:delete-collection', async (_, args) => {
      try {
        const { collectionName } = args;
        await this.vectorService.deleteCollection(collectionName);
        return { success: true };
      } catch (error) {
        logger.error('删除集合失败:', error);
        throw error;
      }
    });
  }

  /**
   * 关闭向量数据库管理器
   */
  async shutdown() {
    if (!this.initialized) {
      return;
    }

    try {
      // 关闭向量数据库服务
      await this.vectorService.stop();

      // 移除IPC处理器
      ipcMain.removeHandler('vector:list-collections');
      ipcMain.removeHandler('vector:create-embedding');
      ipcMain.removeHandler('vector:create-embedding-batch');
      ipcMain.removeHandler('vector:query-similar');
      ipcMain.removeHandler('vector:delete-by-ids');
      ipcMain.removeHandler('vector:delete-by-filter');
      ipcMain.removeHandler('vector:delete-collection');

      this.initialized = false;
      logger.info('向量数据库管理器已关闭');
    } catch (error) {
      logger.error('关闭向量数据库管理器失败:', error);
      throw error;
    }
  }

  /**
   * 获取向量服务实例
   */
  getVectorService() {
    return this.vectorService;
  }
}

// 创建单例实例
const vectorManager = new VectorManager();

module.exports = { vectorManager, VectorManager }; 