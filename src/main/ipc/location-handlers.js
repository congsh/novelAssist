const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../database/db-manager');

/**
 * 注册地点相关的IPC处理函数
 */
function registerLocationHandlers() {
  /**
   * 获取地点列表
   */
  ipcMain.handle('get-locations', async (event, params = {}) => {
    try {
      let query = 'SELECT * FROM locations';
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
      
      if (params.importance) {
        conditions.push('importance = ?');
        queryParams.push(params.importance);
      }
      
      // 添加查询条件
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      // 添加排序
      query += ' ORDER BY created_at DESC';
      
      const locations = await dbManager.query(query, queryParams);
      return { success: true, data: locations };
    } catch (error) {
      console.error('获取地点列表失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * 获取单个地点详情
   */
  ipcMain.handle('get-location', async (event, { id }) => {
    try {
      const location = await dbManager.get('SELECT * FROM locations WHERE id = ?', [id]);
      if (!location) {
        throw new Error('地点不存在');
      }
      return { success: true, data: location };
    } catch (error) {
      console.error('获取地点详情失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * 创建地点
   */
  ipcMain.handle('create-location', async (event, params) => {
    try {
      const { 
        novel_id, 
        name, 
        description = '', 
        importance = 'minor', 
        coordinates = null,
        image_path = null 
      } = params;
      
      // 验证必填字段
      if (!novel_id || !name) {
        throw new Error('小说ID和地点名称为必填项');
      }
      
      const id = uuidv4();
      const now = new Date().toISOString();
      
      // 处理坐标数据
      let coordinatesJson = null;
      if (coordinates) {
        coordinatesJson = JSON.stringify(coordinates);
      }
      
      await dbManager.run(
        `INSERT INTO locations (id, novel_id, name, description, importance, coordinates, image_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, novel_id, name, description, importance, coordinatesJson, image_path, now, now]
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
   */
  ipcMain.handle('update-location', async (event, params) => {
    try {
      const { 
        id, 
        name, 
        description, 
        importance,
        coordinates,
        image_path 
      } = params;
      
      // 验证ID
      if (!id) {
        throw new Error('地点ID为必填项');
      }
      
      // 检查地点是否存在
      const existingLocation = await dbManager.get('SELECT * FROM locations WHERE id = ?', [id]);
      if (!existingLocation) {
        throw new Error('地点不存在');
      }
      
      const updateFields = [];
      const updateParams = [];
      
      // 更新字段
      if (name !== undefined) {
        updateFields.push('name = ?');
        updateParams.push(name);
      }
      
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateParams.push(description);
      }
      
      if (importance !== undefined) {
        updateFields.push('importance = ?');
        updateParams.push(importance);
      }
      
      if (coordinates !== undefined) {
        updateFields.push('coordinates = ?');
        updateParams.push(coordinates ? JSON.stringify(coordinates) : null);
      }
      
      if (image_path !== undefined) {
        updateFields.push('image_path = ?');
        updateParams.push(image_path);
      }
      
      // 更新时间
      updateFields.push('updated_at = ?');
      updateParams.push(new Date().toISOString());
      
      // 添加ID到参数数组
      updateParams.push(id);
      
      // 执行更新
      await dbManager.run(
        `UPDATE locations SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );
      
      const updatedLocation = await dbManager.get('SELECT * FROM locations WHERE id = ?', [id]);
      return { success: true, data: updatedLocation };
    } catch (error) {
      console.error('更新地点失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  /**
   * 删除地点
   */
  ipcMain.handle('delete-location', async (event, { id }) => {
    try {
      // 验证ID
      if (!id) {
        throw new Error('地点ID为必填项');
      }
      
      // 检查地点是否存在
      const existingLocation = await dbManager.get('SELECT * FROM locations WHERE id = ?', [id]);
      if (!existingLocation) {
        throw new Error('地点不存在');
      }
      
      // 执行删除
      await dbManager.run('DELETE FROM locations WHERE id = ?', [id]);
      
      return { success: true, data: { id } };
    } catch (error) {
      console.error('删除地点失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取地点地图数据
   */
  ipcMain.handle('get-location-map-data', async (event, { novelId }) => {
    try {
      if (!novelId) {
        throw new Error('小说ID为必填项');
      }

      // 获取指定小说的所有地点
      const locations = await dbManager.query(
        'SELECT * FROM locations WHERE novel_id = ? ORDER BY importance ASC',
        [novelId]
      );

      // 处理坐标数据
      const processedLocations = locations.map(location => {
        let coordinates = null;
        
        if (location.coordinates) {
          try {
            coordinates = JSON.parse(location.coordinates);
          } catch (e) {
            console.error('解析地点坐标失败:', e);
          }
        }

        return {
          ...location,
          coordinates
        };
      });

      return { success: true, data: processedLocations };
    } catch (error) {
      console.error('获取地点地图数据失败:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerLocationHandlers }; 