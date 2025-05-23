"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorService = void 0;
const http = __importStar(require("http"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const electron_1 = require("electron");
const logger_1 = __importDefault(require("../../utils/logger"));
// 使用require来避免TypeScript类型问题
const { spawn, ChildProcess } = require('child_process');
/**
 * 向量数据库服务类
 * 负责与Python Chroma服务交互，提供向量数据库操作功能
 */
class VectorService {
    constructor(port = 8765) {
        this.pythonProcess = null;
        this.ready = false;
        this.startPromise = null;
        this.serverPort = port;
        this.actualPort = port;
        this.serverUrl = `http://localhost:${port}`;
        this.pythonPath = this.getPythonPath();
    }
    /**
     * 获取Python可执行文件路径
     * 尝试使用系统Python或查找应用内bundled的Python
     */
    getPythonPath() {
        // 首先尝试使用环境变量中的Python
        const systemPython = process.platform === 'win32' ? 'python' : 'python3';
        // 如果是打包后的应用，可以考虑使用bundled的Python
        if (electron_1.app.isPackaged) {
            const appPath = electron_1.app.getAppPath();
            const bundledPythonPath = path_1.default.join(appPath, 'resources', 'python', process.platform === 'win32' ? 'python.exe' : 'bin/python3');
            if (fs_1.default.existsSync(bundledPythonPath)) {
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
                logger_1.default.info('启动向量数据库服务...');
                // 获取脚本路径
                const scriptPath = electron_1.app.isPackaged
                    ? path_1.default.join(electron_1.app.getAppPath(), 'python', 'chroma_server.py')
                    : path_1.default.join(electron_1.app.getAppPath(), 'python', 'chroma_server.py');
                // 获取向量数据库路径
                const dbPath = electron_1.app.isPackaged
                    ? path_1.default.join(electron_1.app.getPath('userData'), 'vector_db')
                    : path_1.default.join(electron_1.app.getAppPath(), 'resources', 'vector_db');
                // 确保数据库目录存在
                if (!fs_1.default.existsSync(dbPath)) {
                    fs_1.default.mkdirSync(dbPath, { recursive: true });
                }
                // 启动Python进程
                const args = [
                    scriptPath,
                    '--host', '127.0.0.1',
                    '--port', this.serverPort.toString(),
                    '--db-path', dbPath,
                    '--auto-port'
                ];
                logger_1.default.info(`执行命令: ${this.pythonPath} ${args.join(' ')}`);
                this.pythonProcess = spawn(this.pythonPath, args, {
                    env: { ...process.env },
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                // 监听输出
                if (this.pythonProcess.stdout) {
                    this.pythonProcess.stdout.on('data', (data) => {
                        const output = data.toString().trim();
                        logger_1.default.info(`[Python] ${output}`);
                        // 检查是否包含端口信息
                        const portMatch = output.match(/监听地址: 127\.0\.0\.1:(\d+)/);
                        if (portMatch && portMatch[1]) {
                            const detectedPort = parseInt(portMatch[1], 10);
                            if (detectedPort !== this.serverPort) {
                                logger_1.default.info(`检测到服务使用了不同的端口: ${detectedPort}`);
                                this.serverPort = detectedPort;
                                this.serverUrl = `http://localhost:${detectedPort}`;
                                this.actualPort = detectedPort;
                            }
                        }
                    });
                }
                if (this.pythonProcess.stderr) {
                    this.pythonProcess.stderr.on('data', (data) => {
                        const message = data.toString().trim();
                        // 忽略某些不重要的警告消息
                        if (!message.includes('WARNING') && !message.includes('INFO')) {
                            logger_1.default.error(`[Python] ${message}`);
                        }
                        else {
                            logger_1.default.debug(`[Python] ${message}`);
                        }
                    });
                }
                // 监听进程关闭
                this.pythonProcess.on('close', (code) => {
                    logger_1.default.info(`Python向量服务关闭，退出码: ${code}`);
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
                    logger_1.default.error('Python向量服务启动错误:', err);
                    this.ready = false;
                    if (this.startPromise) {
                        reject(err);
                        this.startPromise = null;
                    }
                });
                // 等待服务准备就绪
                this.waitForReady()
                    .then(() => {
                    logger_1.default.info('向量数据库服务已启动并就绪');
                    this.ready = true;
                    this.startPromise = null;
                    resolve(true);
                })
                    .catch((err) => {
                    const error = err instanceof Error ? err : new Error(String(err));
                    logger_1.default.error('等待向量服务就绪失败:', error);
                    this.stopPythonProcess();
                    this.ready = false;
                    this.startPromise = null;
                    reject(error);
                });
            }
            catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                logger_1.default.error('启动向量数据库服务失败:', err);
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
            }
            catch (error) {
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
                    }
                    else {
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
                const pid = this.pythonProcess.pid;
                logger_1.default.info(`正在终止Python进程，PID: ${pid}`);
                if (process.platform === 'win32') {
                    try {
                        // 先尝试直接终止进程
                        this.pythonProcess.kill();
                        logger_1.default.info(`已发送终止信号到进程 ${pid}`);
                        // 设置一个标志，表示进程已被请求终止
                        this.pythonProcess._terminationRequested = true;
                        // 等待一段时间让进程自然退出
                        setTimeout(() => {
                            // 检查进程是否还存在
                            this.forceKillProcess(pid);
                        }, 2000);
                    }
                    catch (killError) {
                        const err = killError instanceof Error ? killError : new Error(String(killError));
                        logger_1.default.warn(`直接终止进程失败: ${err.message}`);
                        // 如果直接kill失败，立即尝试强制终止
                        this.forceKillProcess(pid);
                    }
                    // 检查端口占用，使用更可靠的方式
                    setTimeout(() => {
                        this.checkAndCleanPort(this.actualPort);
                    }, 3000);
                }
                else {
                    // Unix平台可以直接kill
                    try {
                        // @ts-ignore - 忽略类型检查问题
                        this.pythonProcess.kill('SIGTERM');
                    }
                    catch (e) {
                        // 忽略错误，可能是因为进程已经退出
                    }
                    // 给进程一些时间来优雅地退出
                    setTimeout(() => {
                        try {
                            // 检查进程是否还在运行
                            const proc = this.pythonProcess;
                            if (proc && proc.exitCode === null && !proc._terminationRequested) {
                                logger_1.default.warn('进程未响应SIGTERM，尝试SIGKILL...');
                                try {
                                    // @ts-ignore - 忽略类型检查问题
                                    proc.kill('SIGKILL');
                                }
                                catch (e) {
                                    // 忽略错误，可能是因为进程已经退出
                                    logger_1.default.debug('进程可能已经退出');
                                }
                            }
                        }
                        catch (e) {
                            const err = e instanceof Error ? e : new Error(String(e));
                            logger_1.default.debug('进程可能已经退出');
                        }
                    }, 1000);
                }
            }
            catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                logger_1.default.error('停止Python进程失败:', err);
            }
            // 无论成功与否，都将引用置空
            this.pythonProcess = null;
        }
    }
    /**
     * 强制终止进程
     * @param pid 进程ID
     */
    forceKillProcess(pid) {
        if (!pid)
            return;
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
                    logger_1.default.info(`进程 ${pid} 已经不存在，无需强制终止`);
                    return;
                }
                logger_1.default.info(`进程 ${pid} 仍在运行，执行强制终止`);
            }
            catch (checkError) {
                // tasklist命令可能失败，继续尝试终止
                logger_1.default.debug(`检查进程状态失败，继续尝试终止进程 ${pid}`);
            }
            // 使用taskkill强制终止进程
            try {
                const killResult = execSync(`taskkill /pid ${pid} /f /t`, {
                    encoding: 'buffer',
                    windowsHide: true,
                    timeout: 5000
                });
                const killOutput = this.decodeWindowsOutput(killResult);
                logger_1.default.info(`强制终止进程成功: ${killOutput.trim()}`);
            }
            catch (taskKillError) {
                // 转换错误输出
                const errorOutput = this.decodeWindowsOutput(taskKillError.stdout || Buffer.alloc(0));
                const errorStderr = this.decodeWindowsOutput(taskKillError.stderr || Buffer.alloc(0));
                // 如果进程已经不存在，这是正常的
                if (taskKillError.status === 128 ||
                    errorOutput.includes('没有找到该进程') ||
                    errorStderr.includes('没有找到该进程')) {
                    logger_1.default.info(`进程 ${pid} 已经终止`);
                }
                else {
                    logger_1.default.warn(`强制终止进程失败 (退出码: ${taskKillError.status}): ${taskKillError.message}`);
                    if (errorOutput.trim()) {
                        logger_1.default.warn(`taskkill stdout: ${errorOutput.trim()}`);
                    }
                    if (errorStderr.trim()) {
                        logger_1.default.warn(`taskkill stderr: ${errorStderr.trim()}`);
                    }
                }
            }
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger_1.default.error(`强制终止进程 ${pid} 失败:`, err);
        }
    }
    /**
     * 解码Windows命令输出，处理中文编码问题
     * @param buffer 命令输出的Buffer
     * @returns 解码后的字符串
     */
    decodeWindowsOutput(buffer) {
        if (!buffer || buffer.length === 0)
            return '';
        try {
            // 尝试使用 GBK 编码解码（Windows中文系统默认编码）
            const iconv = require('iconv-lite');
            if (iconv.encodingExists('gbk')) {
                return iconv.decode(buffer, 'gbk');
            }
        }
        catch (error) {
            // 如果iconv-lite不可用，fallback到其他方法
            logger_1.default.debug('iconv-lite不可用，使用fallback解码方法');
        }
        try {
            // 尝试使用cp936编码（GBK的别名）
            return buffer.toString('binary');
        }
        catch (error) {
            // 最后fallback到UTF-8
            return buffer.toString('utf8');
        }
    }
    /**
     * 检查端口占用并清理
     * 使用更可靠的方式检查和清理端口
     */
    checkAndCleanPort(port) {
        if (!port)
            return;
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
                    logger_1.default.warn(`端口 ${port} 仍被占用，尝试进一步清理...`);
                    // 提取PID并尝试杀死进程
                    const lines = stdout.split('\n').filter((line) => line.includes(`:${port}`));
                    for (const line of lines) {
                        const pidMatch = line.match(/\s+(\d+)\s*$/);
                        if (pidMatch && pidMatch[1]) {
                            const remainingPid = parseInt(pidMatch[1].trim(), 10);
                            // 检查PID是否为系统进程，避免杀死重要系统进程
                            if (remainingPid <= 4 || remainingPid === 0) {
                                logger_1.default.warn(`检测到系统关键进程 PID: ${remainingPid}，跳过终止操作`);
                                continue;
                            }
                            logger_1.default.warn(`尝试杀死占用端口的进程，PID: ${remainingPid}`);
                            try {
                                const killResultBuffer = execSync(`taskkill /F /PID ${remainingPid} /T`, {
                                    encoding: 'buffer',
                                    windowsHide: true,
                                    timeout: 3000
                                });
                                const killResult = this.decodeWindowsOutput(killResultBuffer);
                                logger_1.default.info(`已杀死残留进程: ${killResult.trim()}`);
                            }
                            catch (err) {
                                const errorOutput = this.decodeWindowsOutput(err.stdout || Buffer.alloc(0));
                                const errorStderr = this.decodeWindowsOutput(err.stderr || Buffer.alloc(0));
                                if (err.status === 128 ||
                                    errorOutput.includes('没有找到该进程') ||
                                    errorStderr.includes('没有找到该进程')) {
                                    logger_1.default.info(`进程 ${remainingPid} 已经终止`);
                                }
                                else {
                                    logger_1.default.error(`杀死残留进程失败: ${err.message}`);
                                    if (errorOutput.trim())
                                        logger_1.default.error(`stdout: ${errorOutput.trim()}`);
                                    if (errorStderr.trim())
                                        logger_1.default.error(`stderr: ${errorStderr.trim()}`);
                                }
                            }
                        }
                    }
                }
                else {
                    logger_1.default.info(`端口 ${port} 已释放`);
                }
            }
            catch (error) {
                // netstat命令可能失败，这不是严重错误
                if (error.status !== 1) { // 状态码1通常表示没有找到匹配项，这是正常的
                    logger_1.default.debug(`检查端口占用出错: ${error.message}`);
                }
                else {
                    logger_1.default.info(`端口 ${port} 未被占用或已释放`);
                }
            }
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger_1.default.error('检查端口占用失败:', err);
        }
    }
    /**
     * 停止服务
     */
    async stop() {
        this.stopPythonProcess();
        this.ready = false;
        this.startPromise = null;
        // 等待一段时间确保进程完全退出
        await new Promise(resolve => setTimeout(resolve, 1000));
        // 额外检查：确保端口已释放
        this.checkAndCleanPort(this.actualPort);
        logger_1.default.info('向量数据库服务已停止');
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
        }
        catch (error) {
            logger_1.default.error('列出collections失败:', error);
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
    async createEmbedding(id, text, metadata = {}, collectionName = 'default', embedding) {
        await this.ensureReady();
        try {
            const data = {
                id,
                text,
                metadata,
                embedding // 传递向量数据（如果有）
            };
            await this.httpRequest(`/embed?collection_name=${collectionName}`, 'POST', data);
        }
        catch (error) {
            logger_1.default.error('创建向量嵌入失败:', error);
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
    async createEmbeddingBatch(ids, texts, metadatas = [], collectionName = 'default', embeddings) {
        await this.ensureReady();
        try {
            const data = {
                ids,
                texts,
                metadatas: metadatas.length > 0 ? metadatas : undefined,
                embeddings // 传递向量数据数组（如果有）
            };
            await this.httpRequest(`/embed_batch?collection_name=${collectionName}`, 'POST', data);
        }
        catch (error) {
            logger_1.default.error('批量创建向量嵌入失败:', error);
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
    async querySimilar(queryText, filter = {}, limit = 5, collectionName = 'default') {
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
        }
        catch (error) {
            logger_1.default.error('查询相似向量失败:', error);
            throw error;
        }
    }
    /**
     * 删除向量
     *
     * @param ids 要删除的ID数组
     * @param collectionName 集合名称
     */
    async deleteByIds(ids, collectionName = 'default') {
        await this.ensureReady();
        try {
            const data = { ids };
            await this.httpRequest(`/delete?collection_name=${collectionName}`, 'POST', data);
        }
        catch (error) {
            logger_1.default.error('删除向量失败:', error);
            throw error;
        }
    }
    /**
     * 按条件删除向量
     *
     * @param where 过滤条件
     * @param collectionName 集合名称
     */
    async deleteByFilter(where, collectionName = 'default') {
        await this.ensureReady();
        try {
            const data = { where };
            await this.httpRequest(`/delete?collection_name=${collectionName}`, 'POST', data);
        }
        catch (error) {
            logger_1.default.error('按条件删除向量失败:', error);
            throw error;
        }
    }
    /**
     * 删除集合
     *
     * @param collectionName 集合名称
     */
    async deleteCollection(collectionName) {
        await this.ensureReady();
        try {
            await this.httpRequest(`/collection/${collectionName}`, 'DELETE');
        }
        catch (error) {
            logger_1.default.error('删除集合失败:', error);
            throw error;
        }
    }
}
exports.VectorService = VectorService;
// 添加CommonJS兼容的导出，确保可以通过require正确导入
// 这样在JavaScript文件中可以通过require('./vector-service').VectorService使用
module.exports = { VectorService };
//# sourceMappingURL=vector-service.js.map