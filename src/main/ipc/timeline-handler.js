const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../database/db-manager');

/**
 * 初始化时间线相关的IPC处理器
 */
function initTimelineHandlers() {
  /**
   * 获取时间线事件列表
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，可包含novel_id、title等过滤条件
   * @returns {Promise<Object>} - 包含时间线事件列表的响应对象
   */
  ipcMain.handle('get-timeline-events', async (event, data = {}) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      let sql = 'SELECT * FROM timeline_events WHERE 1=1';
      const params = [];
      
      // 添加过滤条件
      if (data.novel_id) {
        sql += ' AND novel_id = ?';
        params.push(data.novel_id);
      }
      
      if (data.title) {
        sql += ' AND title LIKE ?';
        params.push(`%${data.title}%`);
      }
      
      if (data.importance) {
        sql += ' AND importance = ?';
        params.push(data.importance);
      }
      
      if (data.character_id) {
        sql += " AND character_ids LIKE ?";
        params.push(`%${data.character_id}%`);
      }
      
      if (data.location_id) {
        sql += ' AND location_id = ?';
        params.push(data.location_id);
      }
      
      if (data.date_from) {
        sql += ' AND event_date >= ?';
        params.push(data.date_from);
      }
      
      if (data.date_to) {
        sql += ' AND event_date <= ?';
        params.push(data.date_to);
      }
      
      // 添加排序
      sql += ' ORDER BY event_date ASC';
      
      const events = await dbManager.query(sql, params);
      return { success: true, data: events };
    } catch (error) {
      console.error('获取时间线事件列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取单个时间线事件详情
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含事件id
   * @returns {Promise<Object>} - 包含事件详情的响应对象
   */
  ipcMain.handle('get-timeline-event', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.id) {
        return { success: false, error: '事件ID不能为空' };
      }
      
      const timelineEvent = await dbManager.get('SELECT * FROM timeline_events WHERE id = ?', [data.id]);
      
      if (!timelineEvent) {
        return { success: false, error: '事件不存在' };
      }
      
      return { success: true, data: timelineEvent };
    } catch (error) {
      console.error('获取时间线事件详情失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 创建时间线事件
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 事件数据
   * @returns {Promise<Object>} - 包含创建结果的响应对象
   */
  ipcMain.handle('create-timeline-event', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novel_id) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      if (!data.title) {
        return { success: false, error: '事件标题不能为空' };
      }
      
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await dbManager.run(
        `INSERT INTO timeline_events (
          id, novel_id, title, description, event_date, importance,
          created_at, updated_at, character_ids, location_id, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          data.novel_id, 
          data.title, 
          data.description || '', 
          data.event_date || null, 
          data.importance || 'minor',
          now, 
          now, 
          data.character_ids || null, 
          data.location_id || null,
          data.metadata || null
        ]
      );
      
      const timelineEvent = await dbManager.get('SELECT * FROM timeline_events WHERE id = ?', [id]);
      return { success: true, data: timelineEvent };
    } catch (error) {
      console.error('创建时间线事件失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 更新时间线事件
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 更新的事件数据
   * @returns {Promise<Object>} - 包含更新结果的响应对象
   */
  ipcMain.handle('update-timeline-event', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.id) {
        return { success: false, error: '事件ID不能为空' };
      }
      
      // 检查事件是否存在
      const timelineEvent = await dbManager.get('SELECT * FROM timeline_events WHERE id = ?', [data.id]);
      
      if (!timelineEvent) {
        return { success: false, error: '事件不存在' };
      }
      
      const now = new Date().toISOString();
      const fields = [];
      const params = [];
      
      // 构建更新字段
      if (data.title !== undefined) {
        fields.push('title = ?');
        params.push(data.title);
      }
      
      if (data.description !== undefined) {
        fields.push('description = ?');
        params.push(data.description);
      }
      
      if (data.event_date !== undefined) {
        fields.push('event_date = ?');
        params.push(data.event_date);
      }
      
      if (data.importance !== undefined) {
        fields.push('importance = ?');
        params.push(data.importance);
      }
      
      if (data.character_ids !== undefined) {
        fields.push('character_ids = ?');
        params.push(data.character_ids);
      }
      
      if (data.location_id !== undefined) {
        fields.push('location_id = ?');
        params.push(data.location_id);
      }
      
      if (data.metadata !== undefined) {
        fields.push('metadata = ?');
        params.push(data.metadata);
      }
      
      // 添加更新时间
      fields.push('updated_at = ?');
      params.push(now);
      
      // 添加ID作为WHERE条件
      params.push(data.id);
      
      // 执行更新
      if (fields.length > 0) {
        await dbManager.run(
          `UPDATE timeline_events SET ${fields.join(', ')} WHERE id = ?`,
          params
        );
      }
      
      // 获取更新后的事件数据
      const updatedEvent = await dbManager.get('SELECT * FROM timeline_events WHERE id = ?', [data.id]);
      return { success: true, data: updatedEvent };
    } catch (error) {
      console.error('更新时间线事件失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 删除时间线事件
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含事件id
   * @returns {Promise<Object>} - 包含删除结果的响应对象
   */
  ipcMain.handle('delete-timeline-event', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.id) {
        return { success: false, error: '事件ID不能为空' };
      }
      
      // 检查事件是否存在
      const timelineEvent = await dbManager.get('SELECT * FROM timeline_events WHERE id = ?', [data.id]);
      
      if (!timelineEvent) {
        return { success: false, error: '事件不存在' };
      }
      
      // 执行删除
      await dbManager.run('DELETE FROM timeline_events WHERE id = ?', [data.id]);
      
      return { success: true, data: { id: data.id } };
    } catch (error) {
      console.error('删除时间线事件失败:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  initTimelineHandlers
}; 