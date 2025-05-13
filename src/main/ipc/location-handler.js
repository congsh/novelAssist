const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../database/db-manager');

/**
 * 初始化地点相关的IPC处理器
 */
function initLocationHandlers() {
  /**
   * 获取地点列表
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，可包含novel_id、name等过滤条件
   * @returns {Promise<Object>} - 包含地点列表的响应对象
   */
  ipcMain.handle('get-locations', async (event, data = {}) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      let sql = 'SELECT * FROM locations WHERE 1=1';
      const params = [];
      
      // 添加过滤条件
      if (data.novel_id) {
        sql += ' AND novel_id = ?';
        params.push(data.novel_id);
      }
      
      if (data.name) {
        sql += ' AND name LIKE ?';
        params.push(`%${data.name}%`);
      }
      
      if (data.importance) {
        sql += ' AND importance = ?';
        params.push(data.importance);
      }
      
      // 添加排序
      sql += ' ORDER BY name ASC';
      
      const locations = await dbManager.query(sql, params);
      return { success: true, data: locations };
    } catch (error) {
      console.error('获取地点列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取单个地点详情
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含地点id
   * @returns {Promise<Object>} - 包含地点详情的响应对象
   */
  ipcMain.handle('get-location', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.id) {
        return { success: false, error: '地点ID不能为空' };
      }
      
      const location = await dbManager.get('SELECT * FROM locations WHERE id = ?', [data.id]);
      
      if (!location) {
        return { success: false, error: '地点不存在' };
      }
      
      return { success: true, data: location };
    } catch (error) {
      console.error('获取地点详情失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 创建地点
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 地点数据
   * @returns {Promise<Object>} - 包含创建结果的响应对象
   */
  ipcMain.handle('create-location', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novel_id) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      if (!data.name) {
        return { success: false, error: '地点名称不能为空' };
      }
      
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await dbManager.run(
        `INSERT INTO locations (
          id, novel_id, name, description, importance, 
          created_at, updated_at, image_path, coordinates, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          data.novel_id, 
          data.name, 
          data.description || '', 
          data.importance || 'minor',
          now, 
          now, 
          data.image_path || null, 
          data.coordinates || null, 
          data.metadata || null
        ]
      );
      
      const location = await dbManager.get('SELECT * FROM locations WHERE id = ?', [id]);
      return { success: true, data: location };
    } catch (error) {
      console.error('创建地点失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 更新地点
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 更新的地点数据
   * @returns {Promise<Object>} - 包含更新结果的响应对象
   */
  ipcMain.handle('update-location', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.id) {
        return { success: false, error: '地点ID不能为空' };
      }
      
      // 检查地点是否存在
      const location = await dbManager.get('SELECT * FROM locations WHERE id = ?', [data.id]);
      
      if (!location) {
        return { success: false, error: '地点不存在' };
      }
      
      const now = new Date().toISOString();
      const fields = [];
      const params = [];
      
      // 构建更新字段
      if (data.name !== undefined) {
        fields.push('name = ?');
        params.push(data.name);
      }
      
      if (data.description !== undefined) {
        fields.push('description = ?');
        params.push(data.description);
      }
      
      if (data.importance !== undefined) {
        fields.push('importance = ?');
        params.push(data.importance);
      }
      
      if (data.image_path !== undefined) {
        fields.push('image_path = ?');
        params.push(data.image_path);
      }
      
      if (data.coordinates !== undefined) {
        fields.push('coordinates = ?');
        params.push(data.coordinates);
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
      await dbManager.run(
        `UPDATE locations SET ${fields.join(', ')} WHERE id = ?`,
        params
      );
      
      // 获取更新后的地点数据
      const updatedLocation = await dbManager.get('SELECT * FROM locations WHERE id = ?', [data.id]);
      return { success: true, data: updatedLocation };
    } catch (error) {
      console.error('更新地点失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 删除地点
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含地点id
   * @returns {Promise<Object>} - 包含删除结果的响应对象
   */
  ipcMain.handle('delete-location', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.id) {
        return { success: false, error: '地点ID不能为空' };
      }
      
      // 检查地点是否存在
      const location = await dbManager.get('SELECT * FROM locations WHERE id = ?', [data.id]);
      
      if (!location) {
        return { success: false, error: '地点不存在' };
      }
      
      // 执行删除
      await dbManager.run('DELETE FROM locations WHERE id = ?', [data.id]);
      
      return { success: true, data: { id: data.id } };
    } catch (error) {
      console.error('删除地点失败:', error);
      return { success: false, error: error.message };
    }
  });
}

// 初始化处理器
initLocationHandlers();

module.exports = {
  initLocationHandlers
}; 