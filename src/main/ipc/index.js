const { registerNovelHandlers } = require('./novel-handlers');
const { registerChapterHandlers } = require('./chapter-handlers');
const { registerCharacterHandlers } = require('./character-handlers');
const { registerLocationHandlers } = require('./location-handlers');
const { registerOutlineHandlers } = require('./outline-handlers');
const { registerTimelineHandlers } = require('./timeline-handlers');
const { registerStatisticsHandlers } = require('./statistics-handlers');

/**
 * 注册所有IPC处理函数
 */
function registerIpcHandlers() {
  registerNovelHandlers();
  registerChapterHandlers();
  registerCharacterHandlers();
  registerLocationHandlers();
  registerOutlineHandlers();
  registerTimelineHandlers();
  registerStatisticsHandlers();
}

module.exports = { registerIpcHandlers }; 