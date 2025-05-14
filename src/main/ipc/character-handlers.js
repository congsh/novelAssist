const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../database/db-manager');

/**
 * 注册人物相关的IPC处理函数
 */
function registerCharacterHandlers() {
  /**
   * 获取人物列表
   */
  ipcMain.handle('get-characters', async (event, params = {}) => {
    try {
      let query = 'SELECT * FROM characters';
      const queryParams = [];
      
      // 构建查询条件
      const conditions = [];
      
      if (params.novel_id) {
        conditions.push('novel_id = ?');
        queryParams.push(params.novel_id);
      }
      
      if (params.name) {
        conditions.push('name LIKE ?');
        queryParams.push(`%${params.name}%`);
      }
      
      if (params.role) {
        conditions.push('role = ?');
        queryParams.push(params.role);
      }
      
      // 添加查询条件
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      // 添加排序
      query += ' ORDER BY name ASC';
      
      const characters = await dbManager.query(query, queryParams);
      
      return {
        success: true,
        data: characters
      };
    } catch (error) {
      console.error('获取人物列表失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 获取单个人物详情
   */
  ipcMain.handle('get-character', async (event, { id }) => {
    try {
      const character = await dbManager.get(
        'SELECT * FROM characters WHERE id = ?',
        [id]
      );
      
      if (!character) {
        throw new Error('人物不存在');
      }
      
      return {
        success: true,
        data: character
      };
    } catch (error) {
      console.error('获取人物详情失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 创建人物
   */
  ipcMain.handle('create-character', async (event, params) => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const result = await dbManager.run(
        `INSERT INTO characters (
          id, novel_id, name, role, description, background, personality, appearance,
          created_at, updated_at, image_path, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          params.novel_id,
          params.name,
          params.role || null,
          params.description || null,
          params.background || null,
          params.personality || null,
          params.appearance || null,
          now,
          now,
          params.image_path || null,
          params.metadata || null
        ]
      );
      
      const character = await dbManager.get(
        'SELECT * FROM characters WHERE id = ?',
        [id]
      );
      
      return {
        success: true,
        data: character
      };
    } catch (error) {
      console.error('创建人物失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 更新人物
   */
  ipcMain.handle('update-character', async (event, params) => {
    try {
      const { id, ...updateData } = params;
      
      // 检查人物是否存在
      const character = await dbManager.get(
        'SELECT * FROM characters WHERE id = ?',
        [id]
      );
      
      if (!character) {
        throw new Error('人物不存在');
      }
      
      // 构建更新语句
      const updateFields = [];
      const updateParams = [];
      
      // 遍历更新数据
      for (const [key, value] of Object.entries(updateData)) {
        if (key !== 'id' && key !== 'novel_id' && key !== 'created_at') {
          updateFields.push(`${key} = ?`);
          updateParams.push(value);
        }
      }
      
      // 添加更新时间
      updateFields.push('updated_at = ?');
      updateParams.push(new Date().toISOString());
      
      // 添加ID作为WHERE条件
      updateParams.push(id);
      
      // 执行更新
      await dbManager.run(
        `UPDATE characters SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );
      
      // 获取更新后的数据
      const updatedCharacter = await dbManager.get(
        'SELECT * FROM characters WHERE id = ?',
        [id]
      );
      
      return {
        success: true,
        data: updatedCharacter
      };
    } catch (error) {
      console.error('更新人物失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 删除人物
   */
  ipcMain.handle('delete-character', async (event, { id }) => {
    try {
      // 检查人物是否存在
      const character = await dbManager.get(
        'SELECT * FROM characters WHERE id = ?',
        [id]
      );
      
      if (!character) {
        throw new Error('人物不存在');
      }
      
      // 执行删除
      await dbManager.run('DELETE FROM characters WHERE id = ?', [id]);
      
      return {
        success: true,
        data: { id }
      };
    } catch (error) {
      console.error('删除人物失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * 获取人物关系
   */
  ipcMain.handle('get-character-relationships', async (event, { novelId }) => {
    try {
      // 获取小说中的所有人物
      const characters = await dbManager.query(
        'SELECT id, name, role FROM characters WHERE novel_id = ?',
        [novelId]
      );
      
      // 获取人物之间的关系
      const relationships = await dbManager.query(
        `SELECT * FROM relationships 
         WHERE novel_id = ? 
         AND ((entity1_type = 'character' AND entity2_type = 'character'))`,
        [novelId]
      );
      
      // 构建图数据
      const nodes = characters.map(character => ({
        id: character.id,
        name: character.name,
        role: character.role,
        group: character.role || 'other'
      }));
      
      const links = relationships.map(rel => ({
        source: rel.entity1_id,
        target: rel.entity2_id,
        type: rel.relationship_type,
        description: rel.description
      }));
      
      return {
        success: true,
        data: { nodes, links }
      };
    } catch (error) {
      console.error('获取人物关系失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
}

module.exports = { registerCharacterHandlers }; 