const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../database/db-manager');

/**
 * 初始化大纲相关的IPC处理器
 */
function initOutlineHandlers() {
  /**
   * 获取大纲列表
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，可包含novel_id、parent_id等过滤条件
   * @returns {Promise<Object>} - 包含大纲列表的响应对象
   */
  ipcMain.handle('get-outlines', async (event, data = {}) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      let sql = 'SELECT * FROM outlines WHERE 1=1';
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
      
      if (data.parent_id !== undefined) {
        if (data.parent_id === null) {
          sql += ' AND parent_id IS NULL';
        } else {
          sql += ' AND parent_id = ?';
          params.push(data.parent_id);
        }
      }
      
      if (data.status) {
        sql += ' AND status = ?';
        params.push(data.status);
      }
      
      // 添加排序
      sql += ' ORDER BY sort_order ASC';
      
      const outlines = await dbManager.query(sql, params);
      return { success: true, data: outlines };
    } catch (error) {
      console.error('获取大纲列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取单个大纲项目详情
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含大纲id
   * @returns {Promise<Object>} - 包含大纲详情的响应对象
   */
  ipcMain.handle('get-outline', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.id) {
        return { success: false, error: '大纲ID不能为空' };
      }
      
      const outline = await dbManager.get('SELECT * FROM outlines WHERE id = ?', [data.id]);
      
      if (!outline) {
        return { success: false, error: '大纲不存在' };
      }
      
      return { success: true, data: outline };
    } catch (error) {
      console.error('获取大纲详情失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 创建大纲项目
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 大纲数据
   * @returns {Promise<Object>} - 包含创建结果的响应对象
   */
  ipcMain.handle('create-outline', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novel_id) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      if (!data.title) {
        return { success: false, error: '大纲标题不能为空' };
      }
      
      // 获取同级大纲项目的最大排序值
      let maxSortOrder = 0;
      let maxOrderResult;
      
      if (data.parent_id) {
        // 有父节点的情况
        maxOrderResult = await dbManager.get(
          'SELECT MAX(sort_order) as max_order FROM outlines WHERE novel_id = ? AND parent_id = ?',
          [data.novel_id, data.parent_id]
        );
      } else {
        // 没有父节点的情况
        maxOrderResult = await dbManager.get(
          'SELECT MAX(sort_order) as max_order FROM outlines WHERE novel_id = ? AND parent_id IS NULL',
          [data.novel_id]
        );
      }
      
      if (maxOrderResult && maxOrderResult.max_order !== null) {
        maxSortOrder = maxOrderResult.max_order;
      }
      
      const id = uuidv4();
      const now = new Date().toISOString();
      const sort_order = data.sort_order !== undefined ? data.sort_order : maxSortOrder + 1;
      
      await dbManager.run(
        `INSERT INTO outlines (
          id, novel_id, title, content, sort_order, parent_id,
          created_at, updated_at, status, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          data.novel_id, 
          data.title, 
          data.content || '', 
          sort_order,
          data.parent_id || null,
          now, 
          now, 
          data.status || 'active', 
          data.metadata || null
        ]
      );
      
      const outline = await dbManager.get('SELECT * FROM outlines WHERE id = ?', [id]);
      return { success: true, data: outline };
    } catch (error) {
      console.error('创建大纲失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 更新大纲项目
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 更新的大纲数据
   * @returns {Promise<Object>} - 包含更新结果的响应对象
   */
  ipcMain.handle('update-outline', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.id) {
        return { success: false, error: '大纲ID不能为空' };
      }
      
      // 检查大纲是否存在
      const outline = await dbManager.get('SELECT * FROM outlines WHERE id = ?', [data.id]);
      
      if (!outline) {
        return { success: false, error: '大纲不存在' };
      }
      
      const now = new Date().toISOString();
      const fields = [];
      const params = [];
      
      // 构建更新字段
      if (data.title !== undefined) {
        fields.push('title = ?');
        params.push(data.title);
      }
      
      if (data.content !== undefined) {
        fields.push('content = ?');
        params.push(data.content);
      }
      
      if (data.sort_order !== undefined) {
        fields.push('sort_order = ?');
        params.push(data.sort_order);
      }
      
      if (data.parent_id !== undefined) {
        fields.push('parent_id = ?');
        params.push(data.parent_id);
      }
      
      if (data.status !== undefined) {
        fields.push('status = ?');
        params.push(data.status);
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
        `UPDATE outlines SET ${fields.join(', ')} WHERE id = ?`,
        params
      );
      
      // 获取更新后的大纲数据
      const updatedOutline = await dbManager.get('SELECT * FROM outlines WHERE id = ?', [data.id]);
      return { success: true, data: updatedOutline };
    } catch (error) {
      console.error('更新大纲失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 删除大纲项目
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含大纲id
   * @returns {Promise<Object>} - 包含删除结果的响应对象
   */
  ipcMain.handle('delete-outline', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.id) {
        return { success: false, error: '大纲ID不能为空' };
      }
      
      // 检查大纲是否存在
      const outline = await dbManager.get('SELECT * FROM outlines WHERE id = ?', [data.id]);
      
      if (!outline) {
        return { success: false, error: '大纲不存在' };
      }
      
      // 检查是否有子大纲
      const childrenCount = await dbManager.get(
        'SELECT COUNT(*) as count FROM outlines WHERE parent_id = ?',
        [data.id]
      );
      
      if (childrenCount && childrenCount.count > 0) {
        // 递归删除子大纲
        if (data.recursive) {
          // 获取所有子大纲
          const children = await dbManager.query(
            'SELECT id FROM outlines WHERE parent_id = ?',
            [data.id]
          );
          
          // 递归删除每个子大纲
          for (const child of children) {
            await ipcMain.handlers['delete-outline'][0](event, { id: child.id, recursive: true });
          }
        } else {
          return { 
            success: false, 
            error: '该大纲包含子项目，无法删除。如需删除，请设置recursive=true以递归删除所有子项目。' 
          };
        }
      }
      
      // 执行删除
      await dbManager.run('DELETE FROM outlines WHERE id = ?', [data.id]);
      
      return { success: true, data: { id: data.id } };
    } catch (error) {
      console.error('删除大纲失败:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 获取大纲树结构
   * @param {Object} event - IPC事件对象
   * @param {Object} data - 请求参数，包含novel_id
   * @returns {Promise<Object>} - 包含大纲树结构的响应对象
   */
  ipcMain.handle('get-outline-tree', async (event, data) => {
    try {
      // 等待数据库初始化完成
      await dbManager.waitForInitialization();
      
      if (!data.novel_id) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      // 获取所有大纲项目
      const outlines = await dbManager.query(
        'SELECT * FROM outlines WHERE novel_id = ? ORDER BY sort_order ASC',
        [data.novel_id]
      );
      
      // 构建树结构
      const outlineMap = {};
      const rootOutlines = [];
      
      // 首先将所有大纲项目放入映射表
      outlines.forEach(outline => {
        outline.children = [];
        outlineMap[outline.id] = outline;
      });
      
      // 然后构建树结构
      outlines.forEach(outline => {
        if (outline.parent_id) {
          const parent = outlineMap[outline.parent_id];
          if (parent) {
            parent.children.push(outline);
          } else {
            // 如果找不到父节点，则作为根节点处理
            rootOutlines.push(outline);
          }
        } else {
          rootOutlines.push(outline);
        }
      });
      
      return { success: true, data: rootOutlines };
    } catch (error) {
      console.error('获取大纲树结构失败:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  initOutlineHandlers
}; 