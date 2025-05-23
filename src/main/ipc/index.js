const { registerNovelHandlers } = require('./novel-handler');
const { registerCharacterHandlers } = require('./character-handlers');
const { registerLocationHandlers } = require('./location-handlers');
const { initOutlineHandlers } = require('./outline-handler');
const { initTimelineHandlers } = require('./timeline-handler');
const { initStatisticsHandlers } = require('./statistics-handler');
const { registerVectorHandlers } = require('./vector-handler');
const { registerAIHandlers } = require('./ai-handler');
const { registerSettingsHandlers } = require('./settings-handler');
const { initBackupHandlers } = require('./backup-handler');
const { initNovelAssociationHandlers } = require('./novel-association-handler');
const { registerAppHandlers } = require('./app-handler');

/**
 * 注册所有IPC处理器
 */
function registerIpcHandlers() {
  console.log('开始注册IPC处理器...');
  
  try {
    // 注册各个模块的处理器
    registerNovelHandlers();           // 小说相关处理器
    registerCharacterHandlers();       // 人物相关处理器
    registerLocationHandlers();        // 地点相关处理器
    initOutlineHandlers();             // 大纲相关处理器
    initTimelineHandlers();            // 时间线相关处理器
    initStatisticsHandlers();          // 统计相关处理器
    registerVectorHandlers();          // 向量相关处理器
    registerAIHandlers();              // AI相关处理器
    registerSettingsHandlers();        // 设置相关处理器
    initBackupHandlers();              // 备份相关处理器
    initNovelAssociationHandlers();    // 小说关联相关处理器
    registerAppHandlers();             // 应用相关处理器
    
    console.log('所有IPC处理器注册完成');
  } catch (error) {
    console.error('注册IPC处理器失败:', error);
  }
}

module.exports = {
  registerIpcHandlers
}; 