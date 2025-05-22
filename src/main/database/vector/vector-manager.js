"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vectorManager = exports.VectorManager = void 0;
const electron_1 = require("electron");
const vector_service_1 = require("./vector-service");
const logger_1 = __importDefault(require("../../utils/logger"));
/**
 * 向量数据库管理器
 * 负责初始化和管理VectorService，提供IPC接口与渲染进程交互
 */
class VectorManager {
    constructor() {
        this.initialized = false;
        this.vectorService = new vector_service_1.VectorService();
    }
    /**
     * 初始化向量数据库管理器
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            logger_1.default.info('初始化向量数据库管理器...');
            // 启动向量数据库服务
            await this.vectorService.start();
            // 注册IPC处理器
            this.registerIpcHandlers();
            this.initialized = true;
            logger_1.default.info('向量数据库管理器初始化完成');
        }
        catch (error) {
            logger_1.default.error('初始化向量数据库管理器失败:', error);
            throw error;
        }
    }
    /**
     * 注册IPC处理器
     */
    registerIpcHandlers() {
        // 列出所有collections
        electron_1.ipcMain.handle('vector:list-collections', async () => {
            try {
                return await this.vectorService.listCollections();
            }
            catch (error) {
                logger_1.default.error('列出collections失败:', error);
                throw error;
            }
        });
        // 创建单个文本embedding
        electron_1.ipcMain.handle('vector:create-embedding', async (_, args) => {
            try {
                const { id, text, metadata, collectionName } = args;
                await this.vectorService.createEmbedding(id, text, metadata, collectionName);
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('创建embedding失败:', error);
                throw error;
            }
        });
        // 批量创建文本embedding
        electron_1.ipcMain.handle('vector:create-embedding-batch', async (_, args) => {
            try {
                const { ids, texts, metadatas, collectionName } = args;
                await this.vectorService.createEmbeddingBatch(ids, texts, metadatas, collectionName);
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('批量创建embedding失败:', error);
                throw error;
            }
        });
        // 查询相似向量
        electron_1.ipcMain.handle('vector:query-similar', async (_, args) => {
            try {
                const { queryText, filter, limit, collectionName } = args;
                return await this.vectorService.querySimilar(queryText, filter, limit, collectionName);
            }
            catch (error) {
                logger_1.default.error('查询相似向量失败:', error);
                throw error;
            }
        });
        // 通过ID删除向量
        electron_1.ipcMain.handle('vector:delete-by-ids', async (_, args) => {
            try {
                const { ids, collectionName } = args;
                await this.vectorService.deleteByIds(ids, collectionName);
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('通过ID删除向量失败:', error);
                throw error;
            }
        });
        // 通过条件删除向量
        electron_1.ipcMain.handle('vector:delete-by-filter', async (_, args) => {
            try {
                const { where, collectionName } = args;
                await this.vectorService.deleteByFilter(where, collectionName);
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('通过条件删除向量失败:', error);
                throw error;
            }
        });
        // 删除集合
        electron_1.ipcMain.handle('vector:delete-collection', async (_, args) => {
            try {
                const { collectionName } = args;
                await this.vectorService.deleteCollection(collectionName);
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('删除集合失败:', error);
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
            electron_1.ipcMain.removeHandler('vector:list-collections');
            electron_1.ipcMain.removeHandler('vector:create-embedding');
            electron_1.ipcMain.removeHandler('vector:create-embedding-batch');
            electron_1.ipcMain.removeHandler('vector:query-similar');
            electron_1.ipcMain.removeHandler('vector:delete-by-ids');
            electron_1.ipcMain.removeHandler('vector:delete-by-filter');
            electron_1.ipcMain.removeHandler('vector:delete-collection');
            this.initialized = false;
            logger_1.default.info('向量数据库管理器已关闭');
        }
        catch (error) {
            logger_1.default.error('关闭向量数据库管理器失败:', error);
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
exports.VectorManager = VectorManager;
// 创建单例实例
exports.vectorManager = new VectorManager();
// 添加CommonJS兼容的导出，确保可以通过require正确导入
module.exports = { vectorManager: exports.vectorManager, VectorManager };
//# sourceMappingURL=vector-manager.js.map