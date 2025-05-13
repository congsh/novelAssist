const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../database/db-manager');

/**
 * 注册小说相关的IPC处理器
 */
function registerNovelHandlers() {
  // 获取所有小说列表
  ipcMain.handle('get-novels', async () => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      const novels = await dbManager.query(`
        SELECT id, title, author, description, genre, cover_path, 
               word_count, created_at, updated_at, status
        FROM novels
        ORDER BY updated_at DESC
      `);
      return { success: true, data: novels };
    } catch (error) {
      console.error('获取小说列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取单个小说详情
  ipcMain.handle('get-novel', async (event, { id }) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      const novel = await dbManager.get(`
        SELECT id, title, author, description, genre, cover_path, 
               word_count, created_at, updated_at, status, settings, metadata
        FROM novels
        WHERE id = ?
      `, [id]);
      
      if (!novel) {
        return { success: false, error: '小说不存在' };
      }
      
      return { success: true, data: novel };
    } catch (error) {
      console.error('获取小说详情失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建新小说
  ipcMain.handle('create-novel', async (event, novelData) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const result = await dbManager.run(`
        INSERT INTO novels (
          id, title, author, description, genre, cover_path, 
          created_at, updated_at, status, settings, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        novelData.title,
        novelData.author,
        novelData.description || '',
        novelData.genre || '',
        novelData.cover_path || '',
        now,
        now,
        novelData.status || 'in_progress',
        novelData.settings ? JSON.stringify(novelData.settings) : null,
        novelData.metadata ? JSON.stringify(novelData.metadata) : null
      ]);
      
      return { 
        success: true, 
        data: { 
          id, 
          ...novelData, 
          created_at: now, 
          updated_at: now,
          word_count: 0
        } 
      };
    } catch (error) {
      console.error('创建小说失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新小说信息
  ipcMain.handle('update-novel', async (event, { id, ...updateData }) => {
    try {
      const novel = await dbManager.get('SELECT * FROM novels WHERE id = ?', [id]);
      
      if (!novel) {
        return { success: false, error: '小说不存在' };
      }
      
      const now = new Date().toISOString();
      const updates = [];
      const params = [];
      
      // 构建动态更新语句
      Object.keys(updateData).forEach(key => {
        if (key === 'settings' || key === 'metadata') {
          updates.push(`${key} = ?`);
          params.push(updateData[key] ? JSON.stringify(updateData[key]) : null);
        } else if (key !== 'id' && key !== 'created_at') {
          updates.push(`${key} = ?`);
          params.push(updateData[key]);
        }
      });
      
      updates.push('updated_at = ?');
      params.push(now);
      params.push(id);
      
      await dbManager.run(`
        UPDATE novels
        SET ${updates.join(', ')}
        WHERE id = ?
      `, params);
      
      return { 
        success: true, 
        data: { 
          id, 
          ...novel, 
          ...updateData, 
          updated_at: now 
        } 
      };
    } catch (error) {
      console.error('更新小说失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除小说
  ipcMain.handle('delete-novel', async (event, { id }) => {
    try {
      const novel = await dbManager.get('SELECT * FROM novels WHERE id = ?', [id]);
      
      if (!novel) {
        return { success: false, error: '小说不存在' };
      }
      
      await dbManager.run('DELETE FROM novels WHERE id = ?', [id]);
      
      return { success: true };
    } catch (error) {
      console.error('删除小说失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取小说章节列表
  ipcMain.handle('get-chapters', async (event, { novelId }) => {
    try {
      const chapters = await dbManager.query(`
        SELECT id, novel_id, title, sort_order, word_count, 
               created_at, updated_at, status, parent_id
        FROM chapters
        WHERE novel_id = ?
        ORDER BY sort_order ASC
      `, [novelId]);
      
      return { success: true, data: chapters };
    } catch (error) {
      console.error('获取章节列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取单个章节详情
  ipcMain.handle('get-chapter', async (event, { id }) => {
    try {
      const chapter = await dbManager.get(`
        SELECT id, novel_id, title, content, sort_order, 
               word_count, created_at, updated_at, status, parent_id, metadata
        FROM chapters
        WHERE id = ?
      `, [id]);
      
      if (!chapter) {
        return { success: false, error: '章节不存在' };
      }
      
      return { success: true, data: chapter };
    } catch (error) {
      console.error('获取章节详情失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建新章节
  ipcMain.handle('create-chapter', async (event, chapterData) => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      // 获取当前最大的排序值
      const maxSortOrder = await dbManager.get(`
        SELECT MAX(sort_order) as max_sort
        FROM chapters
        WHERE novel_id = ? AND (parent_id IS NULL OR parent_id = ?)
      `, [chapterData.novel_id, chapterData.parent_id || null]);
      
      const sortOrder = (maxSortOrder && maxSortOrder.max_sort !== null) 
        ? maxSortOrder.max_sort + 1 
        : 0;
      
      const result = await dbManager.run(`
        INSERT INTO chapters (
          id, novel_id, title, content, sort_order, 
          created_at, updated_at, status, parent_id, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        chapterData.novel_id,
        chapterData.title,
        chapterData.content || '',
        sortOrder,
        now,
        now,
        chapterData.status || 'draft',
        chapterData.parent_id || null,
        chapterData.metadata ? JSON.stringify(chapterData.metadata) : null
      ]);
      
      // 更新小说的更新时间
      await dbManager.run(`
        UPDATE novels
        SET updated_at = ?
        WHERE id = ?
      `, [now, chapterData.novel_id]);
      
      return { 
        success: true, 
        data: { 
          id, 
          ...chapterData, 
          sort_order: sortOrder,
          created_at: now, 
          updated_at: now,
          word_count: 0
        } 
      };
    } catch (error) {
      console.error('创建章节失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新章节信息
  ipcMain.handle('update-chapter', async (event, { id, ...updateData }) => {
    try {
      const chapter = await dbManager.get('SELECT * FROM chapters WHERE id = ?', [id]);
      
      if (!chapter) {
        return { success: false, error: '章节不存在' };
      }
      
      const now = new Date().toISOString();
      const updates = [];
      const params = [];
      
      // 构建动态更新语句
      Object.keys(updateData).forEach(key => {
        if (key === 'metadata') {
          updates.push(`${key} = ?`);
          params.push(updateData[key] ? JSON.stringify(updateData[key]) : null);
        } else if (key === 'content') {
          updates.push(`${key} = ?`);
          params.push(updateData[key]);
          
          // 更新字数统计
          const wordCount = updateData[key] ? updateData[key].length : 0;
          updates.push('word_count = ?');
          params.push(wordCount);
        } else if (key !== 'id' && key !== 'novel_id' && key !== 'created_at') {
          updates.push(`${key} = ?`);
          params.push(updateData[key]);
        }
      });
      
      updates.push('updated_at = ?');
      params.push(now);
      params.push(id);
      
      await dbManager.run(`
        UPDATE chapters
        SET ${updates.join(', ')}
        WHERE id = ?
      `, params);
      
      // 更新小说的更新时间
      await dbManager.run(`
        UPDATE novels
        SET updated_at = ?
        WHERE id = ?
      `, [now, chapter.novel_id]);
      
      return { 
        success: true, 
        data: { 
          id, 
          ...chapter, 
          ...updateData, 
          updated_at: now 
        } 
      };
    } catch (error) {
      console.error('更新章节失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除章节
  ipcMain.handle('delete-chapter', async (event, { id }) => {
    try {
      const chapter = await dbManager.get('SELECT * FROM chapters WHERE id = ?', [id]);
      
      if (!chapter) {
        return { success: false, error: '章节不存在' };
      }
      
      await dbManager.run('DELETE FROM chapters WHERE id = ?', [id]);
      
      // 更新小说的更新时间
      const now = new Date().toISOString();
      await dbManager.run(`
        UPDATE novels
        SET updated_at = ?
        WHERE id = ?
      `, [now, chapter.novel_id]);
      
      return { success: true };
    } catch (error) {
      console.error('删除章节失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 重新排序章节
  ipcMain.handle('reorder-chapters', async (event, { novelId, chapterOrders }) => {
    try {
      // 开始事务
      await dbManager.run('BEGIN TRANSACTION');
      
      for (const item of chapterOrders) {
        await dbManager.run(`
          UPDATE chapters
          SET sort_order = ?
          WHERE id = ? AND novel_id = ?
        `, [item.order, item.id, novelId]);
      }
      
      // 提交事务
      await dbManager.run('COMMIT');
      
      return { success: true };
    } catch (error) {
      // 回滚事务
      await dbManager.run('ROLLBACK');
      console.error('重新排序章节失败:', error);
      return { success: false, error: error.message };
    }
  });
}

// 注册所有处理器
registerNovelHandlers();

module.exports = {
  registerNovelHandlers
}; 