console.log('开始调试IPC处理器...');

// 模拟ipcMain
const mockIpcMain = {
  handlers: {},
  handle: function(channel, handler) {
    this.handlers[channel] = handler;
    console.log(`✅ 注册处理器: ${channel}`);
  }
};

// 替换全局ipcMain
global.ipcMain = mockIpcMain;

// 模拟app对象（某些处理器可能需要）
global.app = {
  getPath: (name) => './dev_data',
  getAppPath: () => './dev_data'
};

// 模拟process.env
process.env.NODE_ENV = 'development';

try {
  console.log('\n1. 测试novel-handler...');
  const { registerNovelHandlers } = require('./src/main/ipc/novel-handler');
  registerNovelHandlers();
  console.log('✅ novel-handler成功');
} catch (error) {
  console.error('❌ novel-handler失败:', error.message);
}

try {
  console.log('\n2. 测试character-handlers...');
  const { registerCharacterHandlers } = require('./src/main/ipc/character-handlers');
  registerCharacterHandlers();
  console.log('✅ character-handlers成功');
} catch (error) {
  console.error('❌ character-handlers失败:', error.message);
}

try {
  console.log('\n3. 测试location-handlers...');
  const { registerLocationHandlers } = require('./src/main/ipc/location-handlers');
  registerLocationHandlers();
  console.log('✅ location-handlers成功');
} catch (error) {
  console.error('❌ location-handlers失败:', error.message);
}

try {
  console.log('\n4. 测试outline-handler...');
  const { initOutlineHandlers } = require('./src/main/ipc/outline-handler');
  initOutlineHandlers();
  console.log('✅ outline-handler成功');
} catch (error) {
  console.error('❌ outline-handler失败:', error.message);
}

try {
  console.log('\n5. 测试timeline-handler...');
  const { initTimelineHandlers } = require('./src/main/ipc/timeline-handler');
  initTimelineHandlers();
  console.log('✅ timeline-handler成功');
} catch (error) {
  console.error('❌ timeline-handler失败:', error.message);
}

try {
  console.log('\n6. 测试statistics-handler...');
  const { initStatisticsHandlers } = require('./src/main/ipc/statistics-handler');
  initStatisticsHandlers();
  console.log('✅ statistics-handler成功');
} catch (error) {
  console.error('❌ statistics-handler失败:', error.message);
}

try {
  console.log('\n7. 测试vector-handler...');
  const { registerVectorHandlers } = require('./src/main/ipc/vector-handler');
  registerVectorHandlers();
  console.log('✅ vector-handler成功');
} catch (error) {
  console.error('❌ vector-handler失败:', error.message);
}

try {
  console.log('\n8. 测试ai-handler...');
  const { registerAIHandlers } = require('./src/main/ipc/ai-handler');
  registerAIHandlers();
  console.log('✅ ai-handler成功');
} catch (error) {
  console.error('❌ ai-handler失败:', error.message);
}

try {
  console.log('\n9. 测试settings-handler...');
  const { registerSettingsHandlers } = require('./src/main/ipc/settings-handler');
  registerSettingsHandlers();
  console.log('✅ settings-handler成功');
} catch (error) {
  console.error('❌ settings-handler失败:', error.message);
}

console.log('\n=== 注册的处理器总数:', Object.keys(mockIpcMain.handlers).length);
console.log('=== 注册的处理器列表:');
Object.keys(mockIpcMain.handlers).forEach(channel => {
  console.log(`  - ${channel}`);
});

console.log('\n调试完成。'); 