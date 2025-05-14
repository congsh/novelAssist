const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../database/db-manager');

/**
 * 初始化小说关联关系的IPC处理器
 */
function initNovelAssociationHandlers() {
  /**
   * 关联人物到小说
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId和characterId
   * @returns {Promise<Object>} - 关联结果
   */
  ipcMain.handle('associate-character-novel', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      if (!data.characterId) {
        return { success: false, error: '人物ID不能为空' };
      }
      
      // 创建关联记录
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await dbManager.run(
        `INSERT INTO relationships (
          id, novel_id, entity1_id, entity1_type, entity2_id, entity2_type, 
          relationship_type, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.novelId,
          data.novelId,
          'novel',
          data.characterId,
          'character',
          'belongs_to',
          now,
          now
        ]
      );
      
      return { success: true, data: { id, novelId: data.novelId, characterId: data.characterId } };
    } catch (error) {
      console.error('关联人物到小说失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 解除人物与小说的关联
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId和characterId
   * @returns {Promise<Object>} - 解除关联结果
   */
  ipcMain.handle('disassociate-character-novel', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      if (!data.characterId) {
        return { success: false, error: '人物ID不能为空' };
      }
      
      // 删除关联记录
      await dbManager.run(
        `DELETE FROM relationships 
         WHERE novel_id = ? 
         AND ((entity1_id = ? AND entity1_type = 'novel' AND entity2_id = ? AND entity2_type = 'character')
         OR (entity1_id = ? AND entity1_type = 'character' AND entity2_id = ? AND entity2_type = 'novel'))`,
        [data.novelId, data.novelId, data.characterId, data.characterId, data.novelId]
      );
      
      return { success: true };
    } catch (error) {
      console.error('解除人物与小说的关联失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取小说关联的人物列表
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId
   * @returns {Promise<Object>} - 包含人物列表的响应对象
   */
  ipcMain.handle('get-novel-characters', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      // 查询小说关联的人物列表
      const characters = await dbManager.query(
        `SELECT c.* FROM characters c
         INNER JOIN relationships r ON 
         (r.entity1_type = 'novel' AND r.entity2_type = 'character' AND r.entity2_id = c.id)
         OR (r.entity1_type = 'character' AND r.entity2_type = 'novel' AND r.entity1_id = c.id)
         WHERE r.novel_id = ?`,
        [data.novelId]
      );
      
      return { success: true, data: characters };
    } catch (error) {
      console.error('获取小说关联的人物列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 关联地点到小说
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId和locationId
   * @returns {Promise<Object>} - 关联结果
   */
  ipcMain.handle('associate-location-novel', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      if (!data.locationId) {
        return { success: false, error: '地点ID不能为空' };
      }
      
      // 创建关联记录
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await dbManager.run(
        `INSERT INTO relationships (
          id, novel_id, entity1_id, entity1_type, entity2_id, entity2_type, 
          relationship_type, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.novelId,
          data.novelId,
          'novel',
          data.locationId,
          'location',
          'contains',
          now,
          now
        ]
      );
      
      return { success: true, data: { id, novelId: data.novelId, locationId: data.locationId } };
    } catch (error) {
      console.error('关联地点到小说失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 解除地点与小说的关联
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId和locationId
   * @returns {Promise<Object>} - 解除关联结果
   */
  ipcMain.handle('disassociate-location-novel', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      if (!data.locationId) {
        return { success: false, error: '地点ID不能为空' };
      }
      
      // 删除关联记录
      await dbManager.run(
        `DELETE FROM relationships 
         WHERE novel_id = ? 
         AND ((entity1_id = ? AND entity1_type = 'novel' AND entity2_id = ? AND entity2_type = 'location')
         OR (entity1_id = ? AND entity1_type = 'location' AND entity2_id = ? AND entity2_type = 'novel'))`,
        [data.novelId, data.novelId, data.locationId, data.locationId, data.novelId]
      );
      
      return { success: true };
    } catch (error) {
      console.error('解除地点与小说的关联失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取小说关联的地点列表
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId
   * @returns {Promise<Object>} - 包含地点列表的响应对象
   */
  ipcMain.handle('get-novel-locations', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      // 查询小说关联的地点列表
      const locations = await dbManager.query(
        `SELECT l.* FROM locations l
         INNER JOIN relationships r ON 
         (r.entity1_type = 'novel' AND r.entity2_type = 'location' AND r.entity2_id = l.id)
         OR (r.entity1_type = 'location' AND r.entity2_type = 'novel' AND r.entity1_id = l.id)
         WHERE r.novel_id = ?`,
        [data.novelId]
      );
      
      return { success: true, data: locations };
    } catch (error) {
      console.error('获取小说关联的地点列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取小说关联的大纲列表
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId
   * @returns {Promise<Object>} - 包含大纲列表的响应对象
   */
  ipcMain.handle('get-novel-outlines', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      // 查询小说的所有关联大纲列表（使用relationships表）
      const outlines = await dbManager.query(
        `SELECT o.* FROM outlines o 
         JOIN relationships r ON (r.entity2_id = o.id AND r.entity2_type = 'outline' AND r.entity1_id = ? AND r.entity1_type = 'novel')
         OR (r.entity1_id = o.id AND r.entity1_type = 'outline' AND r.entity2_id = ? AND r.entity2_type = 'novel')
         WHERE r.novel_id = ?
         ORDER BY o.sort_order ASC`,
        [data.novelId, data.novelId, data.novelId]
      );
      
      // 构建大纲树结构
      const buildOutlineTree = (items, parentId = null) => {
        return items
          .filter(item => item.parent_id === parentId)
          .map(item => ({
            ...item,
            children: buildOutlineTree(items, item.id)
          }));
      };
      
      // 转换为树形结构
      const outlineTree = buildOutlineTree(outlines);
      
      return { success: true, data: outlineTree };
    } catch (error) {
      console.error('获取小说关联的大纲列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取小说关联的时间线事件列表
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId
   * @returns {Promise<Object>} - 包含时间线事件列表的响应对象
   */
  ipcMain.handle('get-novel-timeline-events', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      // 查询小说的时间线事件列表（使用relationships表）
      const events = await dbManager.query(
        `SELECT e.* FROM timeline_events e 
         JOIN relationships r ON (r.entity2_id = e.id AND r.entity2_type = 'timeline_event' AND r.entity1_id = ? AND r.entity1_type = 'novel')
         OR (r.entity1_id = e.id AND r.entity1_type = 'timeline_event' AND r.entity2_id = ? AND r.entity2_type = 'novel')
         WHERE r.novel_id = ?
         ORDER BY e.event_date ASC`,
        [data.novelId, data.novelId, data.novelId]
      );
      
      return { success: true, data: events };
    } catch (error) {
      console.error('获取小说关联的时间线事件列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 关联大纲到小说
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId和outlineId
   * @returns {Promise<Object>} - 关联结果
   */
  ipcMain.handle('associate-outline-novel', async (event, data) => {
    try {
      console.log('关联大纲到小说处理器被调用:', data);
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      if (!data.outlineId) {
        return { success: false, error: '大纲ID不能为空' };
      }
      
      // 创建关联记录而不是直接修改大纲的novel_id字段
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await dbManager.run(
        `INSERT INTO relationships (
          id, novel_id, entity1_id, entity1_type, entity2_id, entity2_type, 
          relationship_type, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.novelId,
          data.novelId,
          'novel',
          data.outlineId,
          'outline',
          'contains',
          now,
          now
        ]
      );
      
      return { success: true, data: { novelId: data.novelId, outlineId: data.outlineId } };
    } catch (error) {
      console.error('关联大纲到小说失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 解除大纲与小说的关联
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId和outlineId
   * @returns {Promise<Object>} - 解除关联结果
   */
  ipcMain.handle('disassociate-outline-novel', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      if (!data.outlineId) {
        return { success: false, error: '大纲ID不能为空' };
      }
      
      // 删除关联记录而不是修改大纲的novel_id字段
      await dbManager.run(
        `DELETE FROM relationships 
         WHERE novel_id = ? 
         AND ((entity1_id = ? AND entity1_type = 'novel' AND entity2_id = ? AND entity2_type = 'outline')
         OR (entity1_id = ? AND entity1_type = 'outline' AND entity2_id = ? AND entity2_type = 'novel'))`,
        [data.novelId, data.novelId, data.outlineId, data.outlineId, data.novelId]
      );
      
      return { success: true };
    } catch (error) {
      console.error('解除大纲与小说的关联失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 关联时间线事件到小说
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId和timelineEventId
   * @returns {Promise<Object>} - 关联结果
   */
  ipcMain.handle('associate-timeline-event-novel', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      if (!data.timelineEventId) {
        return { success: false, error: '时间线事件ID不能为空' };
      }
      
      // 创建关联记录而不是直接修改时间线事件的novel_id字段
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await dbManager.run(
        `INSERT INTO relationships (
          id, novel_id, entity1_id, entity1_type, entity2_id, entity2_type, 
          relationship_type, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.novelId,
          data.novelId,
          'novel',
          data.timelineEventId,
          'timeline_event',
          'contains',
          now,
          now
        ]
      );
      
      return { success: true, data: { novelId: data.novelId, timelineEventId: data.timelineEventId } };
    } catch (error) {
      console.error('关联时间线事件到小说失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 解除时间线事件与小说的关联
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId和timelineEventId
   * @returns {Promise<Object>} - 解除关联结果
   */
  ipcMain.handle('disassociate-timeline-event-novel', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      if (!data.timelineEventId) {
        return { success: false, error: '时间线事件ID不能为空' };
      }
      
      // 删除关联记录而不是修改时间线事件的novel_id字段
      await dbManager.run(
        `DELETE FROM relationships 
         WHERE novel_id = ? 
         AND ((entity1_id = ? AND entity1_type = 'novel' AND entity2_id = ? AND entity2_type = 'timeline_event')
         OR (entity1_id = ? AND entity1_type = 'timeline_event' AND entity2_id = ? AND entity2_type = 'novel'))`,
        [data.novelId, data.novelId, data.timelineEventId, data.timelineEventId, data.novelId]
      );
      
      return { success: true };
    } catch (error) {
      console.error('解除时间线事件与小说的关联失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取可关联到小说的大纲列表（排除已关联的）
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId
   * @returns {Promise<Object>} - 包含可关联大纲列表的响应对象
   */
  ipcMain.handle('get-available-outlines', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      // 查询所有大纲，排除已关联到该小说的大纲
      const outlines = await dbManager.query(
        `SELECT * FROM outlines WHERE id NOT IN (
          SELECT o.id FROM outlines o
          JOIN relationships r ON (r.entity2_id = o.id AND r.entity2_type = 'outline' AND r.entity1_id = ? AND r.entity1_type = 'novel')
          OR (r.entity1_id = o.id AND r.entity1_type = 'outline' AND r.entity2_id = ? AND r.entity2_type = 'novel')
          WHERE r.novel_id = ?
        )
        ORDER BY title ASC`,
        [data.novelId, data.novelId, data.novelId]
      );
      
      return { success: true, data: outlines };
    } catch (error) {
      console.error('获取可关联的大纲列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取可关联到小说的时间线事件列表（排除已关联的）
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novelId
   * @returns {Promise<Object>} - 包含可关联时间线事件列表的响应对象
   */
  ipcMain.handle('get-available-timeline-events', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      // 查询所有时间线事件，排除已关联到该小说的事件
      const events = await dbManager.query(
        `SELECT * FROM timeline_events WHERE id NOT IN (
          SELECT e.id FROM timeline_events e
          JOIN relationships r ON (r.entity2_id = e.id AND r.entity2_type = 'timeline_event' AND r.entity1_id = ? AND r.entity1_type = 'novel')
          OR (r.entity1_id = e.id AND r.entity1_type = 'timeline_event' AND r.entity2_id = ? AND r.entity2_type = 'novel')
          WHERE r.novel_id = ?
        )
        ORDER BY event_date ASC, title ASC`,
        [data.novelId, data.novelId, data.novelId]
      );
      
      return { success: true, data: events };
    } catch (error) {
      console.error('获取可关联的时间线事件列表失败:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  initNovelAssociationHandlers
}; 