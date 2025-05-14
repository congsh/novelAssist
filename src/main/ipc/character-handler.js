const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../database/db-manager');

/**
 * 初始化人物相关的IPC处理器
 */
function initCharacterHandlers() {
  /**
   * 获取人物列表
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，可包含novel_id、name等过滤条件
   * @returns {Promise<Object>} - 包含人物列表的响应对象
   */
  ipcMain.handle('get-characters', async (event, data = {}) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      let sql = 'SELECT * FROM characters WHERE 1=1';
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
      
      if (data.role) {
        sql += ' AND role = ?';
        params.push(data.role);
      }
      
      // 添加排序
      sql += ' ORDER BY name ASC';
      
      const characters = await dbManager.query(sql, params);
      return { success: true, data: characters };
    } catch (error) {
      console.error('获取人物列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取单个人物详情
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含人物id
   * @returns {Promise<Object>} - 包含人物详情的响应对象
   */
  ipcMain.handle('get-character', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.id) {
        return { success: false, error: '人物ID不能为空' };
      }
      
      const character = await dbManager.get('SELECT * FROM characters WHERE id = ?', [data.id]);
      
      if (!character) {
        return { success: false, error: '人物不存在' };
      }
      
      return { success: true, data: character };
    } catch (error) {
      console.error('获取人物详情失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 创建人物
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 人物数据
   * @returns {Promise<Object>} - 包含创建结果的响应对象
   */
  ipcMain.handle('create-character', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novel_id) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      if (!data.name) {
        return { success: false, error: '人物名称不能为空' };
      }
      
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await dbManager.run(
        `INSERT INTO characters (
          id, novel_id, name, role, description, background, 
          personality, appearance, created_at, updated_at, image_path, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          data.novel_id, 
          data.name, 
          data.role || 'supporting', 
          data.description || '', 
          data.background || '',
          data.personality || '',
          data.appearance || '',
          now, 
          now, 
          data.image_path || null, 
          data.metadata || null
        ]
      );
      
      const character = await dbManager.get('SELECT * FROM characters WHERE id = ?', [id]);
      return { success: true, data: character };
    } catch (error) {
      console.error('创建人物失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 更新人物
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 更新的人物数据
   * @returns {Promise<Object>} - 包含更新结果的响应对象
   */
  ipcMain.handle('update-character', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.id) {
        return { success: false, error: '人物ID不能为空' };
      }
      
      // 检查人物是否存在
      const character = await dbManager.get('SELECT * FROM characters WHERE id = ?', [data.id]);
      
      if (!character) {
        return { success: false, error: '人物不存在' };
      }
      
      const now = new Date().toISOString();
      const fields = [];
      const params = [];
      
      // 构建更新字段
      if (data.name !== undefined) {
        fields.push('name = ?');
        params.push(data.name);
      }
      
      if (data.role !== undefined) {
        fields.push('role = ?');
        params.push(data.role);
      }
      
      if (data.description !== undefined) {
        fields.push('description = ?');
        params.push(data.description);
      }
      
      if (data.background !== undefined) {
        fields.push('background = ?');
        params.push(data.background);
      }
      
      if (data.personality !== undefined) {
        fields.push('personality = ?');
        params.push(data.personality);
      }
      
      if (data.appearance !== undefined) {
        fields.push('appearance = ?');
        params.push(data.appearance);
      }
      
      if (data.image_path !== undefined) {
        fields.push('image_path = ?');
        params.push(data.image_path);
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
          `UPDATE characters SET ${fields.join(', ')} WHERE id = ?`,
          params
        );
      }
      
      // 获取更新后的人物数据
      const updatedCharacter = await dbManager.get('SELECT * FROM characters WHERE id = ?', [data.id]);
      return { success: true, data: updatedCharacter };
    } catch (error) {
      console.error('更新人物失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 删除人物
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含人物id
   * @returns {Promise<Object>} - 包含删除结果的响应对象
   */
  ipcMain.handle('delete-character', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.id) {
        return { success: false, error: '人物ID不能为空' };
      }
      
      // 检查人物是否存在
      const character = await dbManager.get('SELECT * FROM characters WHERE id = ?', [data.id]);
      
      if (!character) {
        return { success: false, error: '人物不存在' };
      }
      
      // 执行删除
      await dbManager.run('DELETE FROM characters WHERE id = ?', [data.id]);
      
      return { success: true, data: { id: data.id } };
    } catch (error) {
      console.error('删除人物失败:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  initCharacterHandlers
}; 