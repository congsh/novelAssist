/**
 * 向量服务测试脚本
 * 用于测试向量服务的启动、停止和进程管理功能
 */

const path = require('path');

// 设置模拟的Electron app对象
const mockApp = {
  isPackaged: false,
  getAppPath: () => path.join(__dirname, '..'),
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(__dirname, '..', 'dev_data');
    }
    return path.join(__dirname, '..', 'dev_data');
  }
};

// 模拟electron模块
const mockElectron = {
  app: mockApp
};

// 添加模块解析路径
require.cache[require.resolve('electron')] = {
  exports: mockElectron
};

// 导入向量服务
const { VectorService } = require('../src/main/database/vector/vector-service.js');

async function testVectorService() {
  console.log('开始测试向量服务...');
  
  const vectorService = new VectorService(8766); // 使用不同的端口避免冲突
  
  try {
    console.log('1. 启动向量服务...');
    const started = await vectorService.start();
    console.log(`启动结果: ${started}`);
    
    if (started) {
      console.log('2. 等待5秒...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('3. 停止向量服务...');
      await vectorService.stop();
      console.log('向量服务已停止');
      
      console.log('4. 等待5秒确认进程已清理...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('测试完成！请检查日志中是否还有乱码或进程终止错误。');
    } else {
      console.error('向量服务启动失败');
    }
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
  
  // 强制退出
  process.exit(0);
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 运行测试
testVectorService(); 