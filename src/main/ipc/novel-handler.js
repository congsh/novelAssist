const { ipcMain, dialog } = require('electron');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../database/db-manager');
const fs = require('fs');
const path = require('path');

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
          SET sort_order = ?, parent_id = ?
          WHERE id = ? AND novel_id = ?
        `, [item.order, item.parent_id, item.id, novelId]);
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

  // 导出小说
  ipcMain.handle('export-novel', async (event, { id, format }) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      // 获取小说信息
      const novel = await dbManager.get(`
        SELECT id, title, author, description, genre, cover_path, 
               word_count, created_at, updated_at, status, settings, metadata
        FROM novels
        WHERE id = ?
      `, [id]);
      
      if (!novel) {
        return { success: false, error: '小说不存在' };
      }
      
      // 获取章节信息
      const chapters = await dbManager.query(`
        SELECT id, title, content, sort_order, parent_id, status, created_at, updated_at
        FROM chapters
        WHERE novel_id = ?
        ORDER BY sort_order ASC
      `, [id]);
      
      // 构建导出数据
      const exportData = {
        novel: {
          title: novel.title,
          author: novel.author,
          description: novel.description,
          genre: novel.genre,
          status: novel.status,
          created_at: novel.created_at,
          updated_at: novel.updated_at,
          settings: novel.settings ? JSON.parse(novel.settings) : null,
          metadata: novel.metadata ? JSON.parse(novel.metadata) : null
        },
        chapters: chapters.map(chapter => ({
          title: chapter.title,
          content: chapter.content,
          sort_order: chapter.sort_order,
          parent_id: chapter.parent_id,
          status: chapter.status,
          created_at: chapter.created_at,
          updated_at: chapter.updated_at
        }))
      };
      
      // 打开保存对话框
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: `导出小说 - ${novel.title}`,
        defaultPath: `${novel.title}.${format === 'txt' ? 'txt' : 'json'}`,
        filters: format === 'txt' 
          ? [{ name: '文本文件', extensions: ['txt'] }]
          : [{ name: 'JSON文件', extensions: ['json'] }]
      });
      
      if (canceled || !filePath) {
        return { success: false, error: '导出已取消' };
      }
      
      // 根据格式导出
      if (format === 'txt') {
        // 纯文本格式导出
        let content = `《${novel.title}》\n`;
        content += `作者: ${novel.author}\n\n`;
        
        if (novel.description) {
          content += `【简介】\n${novel.description}\n\n`;
        }
        
        // 添加章节内容
        for (const chapter of chapters) {
          content += `\n\n${chapter.title}\n\n`;
          content += `${chapter.content}\n`;
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
      } else {
        // JSON格式导出
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');
      }
      
      return { success: true, filePath };
    } catch (error) {
      console.error('导出小说失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 导入小说
  ipcMain.handle('import-novel', async (event, { format }) => {
    try {
      // 打开文件选择对话框
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: '导入小说',
        filters: format === 'txt' 
          ? [{ name: '文本文件', extensions: ['txt'] }]
          : [{ name: 'JSON文件', extensions: ['json'] }],
        properties: ['openFile']
      });
      
      if (canceled || filePaths.length === 0) {
        return { success: false, error: '导入已取消' };
      }
      
      const filePath = filePaths[0];
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // 开始事务
      await dbManager.run('BEGIN TRANSACTION');
      
      try {
        let novelId;
        let novelData;
        
        if (format === 'txt') {
          // 解析TXT文件
          // 简单解析，假设第一行是标题，第二行是作者
          const lines = fileContent.split('\n');
          let title = path.basename(filePath, '.txt');
          let author = '未知';
          let content = fileContent;
          
          // 尝试从内容中提取标题和作者
          if (lines.length > 0) {
            const titleMatch = lines[0].match(/《(.+?)》/);
            if (titleMatch) {
              title = titleMatch[1];
              lines.shift();
            }
            
            const authorMatch = lines[0].match(/作者[:：\s]*(.+)/i);
            if (authorMatch) {
              author = authorMatch[1];
              lines.shift();
            }
            
            content = lines.join('\n');
          }
          
          // 创建新小说
          const id = uuidv4();
          const now = new Date().toISOString();
          
          await dbManager.run(`
            INSERT INTO novels (
              id, title, author, description, genre, 
              created_at, updated_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            id,
            title,
            author,
            '',
            '未分类',
            now,
            now,
            'in_progress'
          ]);
          
          // 创建单个章节
          const chapterId = uuidv4();
          await dbManager.run(`
            INSERT INTO chapters (
              id, novel_id, title, content, sort_order, 
              created_at, updated_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            chapterId,
            id,
            '第一章',
            content,
            0,
            now,
            now,
            'draft'
          ]);
          
          novelId = id;
          novelData = {
            id,
            title,
            author,
            created_at: now,
            updated_at: now
          };
        } else {
          // 解析JSON文件
          const importData = JSON.parse(fileContent);
          
          if (!importData.novel || !importData.chapters) {
            throw new Error('JSON格式不正确，缺少必要的小说或章节数据');
          }
          
          // 创建新小说
          const id = uuidv4();
          const now = new Date().toISOString();
          
          await dbManager.run(`
            INSERT INTO novels (
              id, title, author, description, genre, 
              created_at, updated_at, status, settings, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            id,
            importData.novel.title,
            importData.novel.author,
            importData.novel.description || '',
            importData.novel.genre || '未分类',
            now,
            now,
            importData.novel.status || 'in_progress',
            importData.novel.settings ? JSON.stringify(importData.novel.settings) : null,
            importData.novel.metadata ? JSON.stringify(importData.novel.metadata) : null
          ]);
          
          // 创建章节
          const parentMap = new Map(); // 用于映射原始parent_id到新的parent_id
          
          for (let i = 0; i < importData.chapters.length; i++) {
            const chapter = importData.chapters[i];
            const chapterId = uuidv4();
            
            // 记录原始ID到新ID的映射
            parentMap.set(i, chapterId);
            
            await dbManager.run(`
              INSERT INTO chapters (
                id, novel_id, title, content, sort_order, 
                created_at, updated_at, status, parent_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              chapterId,
              id,
              chapter.title,
              chapter.content || '',
              chapter.sort_order || i,
              now,
              now,
              chapter.status || 'draft',
              null // 先设为null，后面再更新父子关系
            ]);
          }
          
          // 更新章节的父子关系
          for (let i = 0; i < importData.chapters.length; i++) {
            const chapter = importData.chapters[i];
            if (chapter.parent_id !== null && chapter.parent_id !== undefined) {
              const parentIndex = parseInt(chapter.parent_id);
              if (!isNaN(parentIndex) && parentMap.has(parentIndex)) {
                const newParentId = parentMap.get(parentIndex);
                await dbManager.run(`
                  UPDATE chapters
                  SET parent_id = ?
                  WHERE id = ?
                `, [newParentId, parentMap.get(i)]);
              }
            }
          }
          
          novelId = id;
          novelData = {
            id,
            title: importData.novel.title,
            author: importData.novel.author,
            created_at: now,
            updated_at: now
          };
        }
        
        // 提交事务
        await dbManager.run('COMMIT');
        
        return { success: true, data: novelData };
      } catch (error) {
        // 回滚事务
        await dbManager.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('导入小说失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 合并章节
  ipcMain.handle('merge-chapters', async (event, { novelId, sourceId, targetId }) => {
    try {
      // 开始事务
      await dbManager.run('BEGIN TRANSACTION');
      
      // 获取源章节和目标章节
      const sourceChapter = await dbManager.get('SELECT * FROM chapters WHERE id = ? AND novel_id = ?', [sourceId, novelId]);
      const targetChapter = await dbManager.get('SELECT * FROM chapters WHERE id = ? AND novel_id = ?', [targetId, novelId]);
      
      if (!sourceChapter || !targetChapter) {
        await dbManager.run('ROLLBACK');
        return { success: false, error: '章节不存在' };
      }
      
      // 合并内容
      const mergedContent = targetChapter.content + '\n\n' + sourceChapter.content;
      const mergedWordCount = (targetChapter.word_count || 0) + (sourceChapter.word_count || 0);
      const now = new Date().toISOString();
      
      // 更新目标章节
      await dbManager.run(`
        UPDATE chapters
        SET content = ?, word_count = ?, updated_at = ?
        WHERE id = ?
      `, [mergedContent, mergedWordCount, now, targetId]);
      
      // 将源章节的子章节移动到目标章节下
      await dbManager.run(`
        UPDATE chapters
        SET parent_id = ?
        WHERE parent_id = ?
      `, [targetId, sourceId]);
      
      // 删除源章节
      await dbManager.run('DELETE FROM chapters WHERE id = ?', [sourceId]);
      
      // 更新小说的更新时间
      await dbManager.run(`
        UPDATE novels
        SET updated_at = ?
        WHERE id = ?
      `, [now, novelId]);
      
      // 提交事务
      await dbManager.run('COMMIT');
      
      return { 
        success: true, 
        data: {
          id: targetId,
          content: mergedContent,
          word_count: mergedWordCount,
          updated_at: now
        }
      };
    } catch (error) {
      // 回滚事务
      await dbManager.run('ROLLBACK');
      console.error('合并章节失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 拆分章节
  ipcMain.handle('split-chapter', async (event, { novelId, chapterId, splitPosition, newTitle }) => {
    try {
      // 开始事务
      await dbManager.run('BEGIN TRANSACTION');
      
      // 获取要拆分的章节
      const chapter = await dbManager.get('SELECT * FROM chapters WHERE id = ? AND novel_id = ?', [chapterId, novelId]);
      
      if (!chapter) {
        await dbManager.run('ROLLBACK');
        return { success: false, error: '章节不存在' };
      }
      
      // 拆分内容
      const content = chapter.content || '';
      if (splitPosition <= 0 || splitPosition >= content.length) {
        await dbManager.run('ROLLBACK');
        return { success: false, error: '拆分位置无效' };
      }
      
      const firstPart = content.substring(0, splitPosition);
      const secondPart = content.substring(splitPosition);
      
      // 更新原章节
      const now = new Date().toISOString();
      await dbManager.run(`
        UPDATE chapters
        SET content = ?, word_count = ?, updated_at = ?
        WHERE id = ?
      `, [firstPart, firstPart.length, now, chapterId]);
      
      // 创建新章节
      const newChapterId = uuidv4();
      
      // 获取当前最大的排序值
      const maxSortOrder = await dbManager.get(`
        SELECT MAX(sort_order) as max_sort
        FROM chapters
        WHERE novel_id = ? AND (parent_id IS NULL OR parent_id = ?)
      `, [novelId, chapter.parent_id || null]);
      
      const sortOrder = (maxSortOrder && maxSortOrder.max_sort !== null) 
        ? maxSortOrder.max_sort + 1 
        : 0;
      
      // 插入新章节
      await dbManager.run(`
        INSERT INTO chapters (
          id, novel_id, title, content, sort_order, 
          created_at, updated_at, status, parent_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newChapterId,
        novelId,
        newTitle || `${chapter.title} (续)`,
        secondPart,
        sortOrder,
        now,
        now,
        chapter.status,
        chapter.parent_id
      ]);
      
      // 更新小说的更新时间
      await dbManager.run(`
        UPDATE novels
        SET updated_at = ?
        WHERE id = ?
      `, [now, novelId]);
      
      // 提交事务
      await dbManager.run('COMMIT');
      
      return { 
        success: true, 
        data: {
          originalChapter: {
            id: chapterId,
            content: firstPart,
            word_count: firstPart.length,
            updated_at: now
          },
          newChapter: {
            id: newChapterId,
            title: newTitle || `${chapter.title} (续)`,
            content: secondPart,
            word_count: secondPart.length,
            sort_order: sortOrder,
            created_at: now,
            updated_at: now,
            status: chapter.status,
            parent_id: chapter.parent_id
          }
        }
      };
    } catch (error) {
      // 回滚事务
      await dbManager.run('ROLLBACK');
      console.error('拆分章节失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取所有分类
  ipcMain.handle('get-categories', async () => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      const categories = await dbManager.query(`
        SELECT id, name, description, color, icon, created_at, updated_at
        FROM categories
        ORDER BY name ASC
      `);
      return { success: true, data: categories };
    } catch (error) {
      console.error('获取分类列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建新分类
  ipcMain.handle('create-category', async (event, categoryData) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await dbManager.run(`
        INSERT INTO categories (
          id, name, description, color, icon, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        categoryData.name,
        categoryData.description || '',
        categoryData.color || '#1890ff',
        categoryData.icon || 'folder',
        now,
        now
      ]);
      
      return { 
        success: true, 
        data: { 
          id, 
          ...categoryData, 
          created_at: now, 
          updated_at: now 
        } 
      };
    } catch (error) {
      console.error('创建分类失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新分类
  ipcMain.handle('update-category', async (event, { id, ...updateData }) => {
    try {
      const category = await dbManager.get('SELECT * FROM categories WHERE id = ?', [id]);
      
      if (!category) {
        return { success: false, error: '分类不存在' };
      }
      
      const now = new Date().toISOString();
      const updates = [];
      const params = [];
      
      // 构建动态更新语句
      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && key !== 'created_at') {
          updates.push(`${key} = ?`);
          params.push(updateData[key]);
        }
      });
      
      updates.push('updated_at = ?');
      params.push(now);
      params.push(id);
      
      await dbManager.run(`
        UPDATE categories
        SET ${updates.join(', ')}
        WHERE id = ?
      `, params);
      
      return { 
        success: true, 
        data: { 
          id, 
          ...category, 
          ...updateData, 
          updated_at: now 
        } 
      };
    } catch (error) {
      console.error('更新分类失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除分类
  ipcMain.handle('delete-category', async (event, { id }) => {
    try {
      const category = await dbManager.get('SELECT * FROM categories WHERE id = ?', [id]);
      
      if (!category) {
        return { success: false, error: '分类不存在' };
      }
      
      // 开始事务
      await dbManager.run('BEGIN TRANSACTION');
      
      // 将使用此分类的小说的category_id设为null
      await dbManager.run(`
        UPDATE novels
        SET category_id = NULL
        WHERE category_id = ?
      `, [id]);
      
      // 删除分类
      await dbManager.run('DELETE FROM categories WHERE id = ?', [id]);
      
      // 提交事务
      await dbManager.run('COMMIT');
      
      return { success: true };
    } catch (error) {
      // 回滚事务
      await dbManager.run('ROLLBACK');
      console.error('删除分类失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取所有标签
  ipcMain.handle('get-tags', async () => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      const tags = await dbManager.query(`
        SELECT id, name, description, color, created_at, updated_at
        FROM tags
        ORDER BY name ASC
      `);
      return { success: true, data: tags };
    } catch (error) {
      console.error('获取标签列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建新标签
  ipcMain.handle('create-tag', async (event, tagData) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await dbManager.run(`
        INSERT INTO tags (
          id, name, description, color, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        id,
        tagData.name,
        tagData.description || '',
        tagData.color || '#1890ff',
        now,
        now
      ]);
      
      return { 
        success: true, 
        data: { 
          id, 
          ...tagData, 
          created_at: now, 
          updated_at: now 
        } 
      };
    } catch (error) {
      console.error('创建标签失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新标签
  ipcMain.handle('update-tag', async (event, { id, ...updateData }) => {
    try {
      const tag = await dbManager.get('SELECT * FROM tags WHERE id = ?', [id]);
      
      if (!tag) {
        return { success: false, error: '标签不存在' };
      }
      
      const now = new Date().toISOString();
      const updates = [];
      const params = [];
      
      // 构建动态更新语句
      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && key !== 'created_at') {
          updates.push(`${key} = ?`);
          params.push(updateData[key]);
        }
      });
      
      updates.push('updated_at = ?');
      params.push(now);
      params.push(id);
      
      await dbManager.run(`
        UPDATE tags
        SET ${updates.join(', ')}
        WHERE id = ?
      `, params);
      
      return { 
        success: true, 
        data: { 
          id, 
          ...tag, 
          ...updateData, 
          updated_at: now 
        } 
      };
    } catch (error) {
      console.error('更新标签失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除标签
  ipcMain.handle('delete-tag', async (event, { id }) => {
    try {
      const tag = await dbManager.get('SELECT * FROM tags WHERE id = ?', [id]);
      
      if (!tag) {
        return { success: false, error: '标签不存在' };
      }
      
      // 开始事务
      await dbManager.run('BEGIN TRANSACTION');
      
      // 删除小说-标签关联
      await dbManager.run('DELETE FROM novel_tags WHERE tag_id = ?', [id]);
      
      // 删除标签
      await dbManager.run('DELETE FROM tags WHERE id = ?', [id]);
      
      // 提交事务
      await dbManager.run('COMMIT');
      
      return { success: true };
    } catch (error) {
      // 回滚事务
      await dbManager.run('ROLLBACK');
      console.error('删除标签失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取小说的标签
  ipcMain.handle('get-novel-tags', async (event, { novelId }) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      const tags = await dbManager.query(`
        SELECT t.id, t.name, t.description, t.color, t.created_at, t.updated_at
        FROM tags t
        JOIN novel_tags nt ON t.id = nt.tag_id
        WHERE nt.novel_id = ?
        ORDER BY t.name ASC
      `, [novelId]);
      
      return { success: true, data: tags };
    } catch (error) {
      console.error('获取小说标签失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 为小说添加标签
  ipcMain.handle('add-novel-tag', async (event, { novelId, tagId }) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      // 检查小说和标签是否存在
      const novel = await dbManager.get('SELECT * FROM novels WHERE id = ?', [novelId]);
      const tag = await dbManager.get('SELECT * FROM tags WHERE id = ?', [tagId]);
      
      if (!novel) {
        return { success: false, error: '小说不存在' };
      }
      
      if (!tag) {
        return { success: false, error: '标签不存在' };
      }
      
      // 检查关联是否已存在
      const existingRelation = await dbManager.get(
        'SELECT * FROM novel_tags WHERE novel_id = ? AND tag_id = ?',
        [novelId, tagId]
      );
      
      if (existingRelation) {
        return { success: true, data: tag }; // 关联已存在，直接返回成功
      }
      
      const now = new Date().toISOString();
      
      // 添加关联
      await dbManager.run(`
        INSERT INTO novel_tags (novel_id, tag_id, created_at)
        VALUES (?, ?, ?)
      `, [novelId, tagId, now]);
      
      // 更新小说的更新时间
      await dbManager.run(`
        UPDATE novels
        SET updated_at = ?
        WHERE id = ?
      `, [now, novelId]);
      
      return { success: true, data: tag };
    } catch (error) {
      console.error('为小说添加标签失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 从小说移除标签
  ipcMain.handle('remove-novel-tag', async (event, { novelId, tagId }) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      // 检查小说是否存在
      const novel = await dbManager.get('SELECT * FROM novels WHERE id = ?', [novelId]);
      
      if (!novel) {
        return { success: false, error: '小说不存在' };
      }
      
      // 删除关联
      await dbManager.run(
        'DELETE FROM novel_tags WHERE novel_id = ? AND tag_id = ?',
        [novelId, tagId]
      );
      
      // 更新小说的更新时间
      const now = new Date().toISOString();
      await dbManager.run(`
        UPDATE novels
        SET updated_at = ?
        WHERE id = ?
      `, [now, novelId]);
      
      return { success: true };
    } catch (error) {
      console.error('从小说移除标签失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 设置小说分类
  ipcMain.handle('set-novel-category', async (event, { novelId, categoryId }) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      // 检查小说是否存在
      const novel = await dbManager.get('SELECT * FROM novels WHERE id = ?', [novelId]);
      
      if (!novel) {
        return { success: false, error: '小说不存在' };
      }
      
      // 如果提供了分类ID，检查分类是否存在
      if (categoryId) {
        const category = await dbManager.get('SELECT * FROM categories WHERE id = ?', [categoryId]);
        if (!category) {
          return { success: false, error: '分类不存在' };
        }
      }
      
      // 更新小说的分类
      const now = new Date().toISOString();
      await dbManager.run(`
        UPDATE novels
        SET category_id = ?, updated_at = ?
        WHERE id = ?
      `, [categoryId || null, now, novelId]);
      
      return { 
        success: true, 
        data: { 
          ...novel, 
          category_id: categoryId, 
          updated_at: now 
        } 
      };
    } catch (error) {
      console.error('设置小说分类失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取小说分类
  ipcMain.handle('get-novel-category', async (event, { novelId }) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      // 获取小说
      const novel = await dbManager.get('SELECT * FROM novels WHERE id = ?', [novelId]);
      
      if (!novel) {
        return { success: false, error: '小说不存在' };
      }
      
      // 如果小说没有分类，返回null
      if (!novel.category_id) {
        return { success: true, data: null };
      }
      
      // 获取分类信息
      const category = await dbManager.get('SELECT * FROM categories WHERE id = ?', [novel.category_id]);
      
      if (!category) {
        // 分类不存在，清除小说的分类ID
        await dbManager.run(`
          UPDATE novels
          SET category_id = NULL
          WHERE id = ?
        `, [novelId]);
        return { success: true, data: null };
      }
      
      return { success: true, data: category };
    } catch (error) {
      console.error('获取小说分类失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 保存版本历史
  ipcMain.handle('save-version-history', async (event, versionData) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      const result = await dbManager.run(`
        INSERT INTO version_history (
          id, entity_id, entity_type, content, created_at, user_comment
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        versionData.id,
        versionData.entity_id,
        versionData.entity_type,
        versionData.content,
        new Date().toISOString(),
        versionData.user_comment || ''
      ]);
      
      return { success: true, data: versionData };
    } catch (error) {
      console.error('保存版本历史失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取版本历史列表
  ipcMain.handle('get-version-history', async (event, { entity_id, entity_type }) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      const versions = await dbManager.query(`
        SELECT id, entity_id, entity_type, content, created_at, user_comment
        FROM version_history
        WHERE entity_id = ? AND entity_type = ?
        ORDER BY created_at DESC
      `, [entity_id, entity_type]);
      
      return { success: true, data: versions };
    } catch (error) {
      console.error('获取版本历史失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 恢复版本
  ipcMain.handle('restore-version', async (event, { version_id }) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      // 获取版本信息
      const version = await dbManager.get(`
        SELECT entity_id, entity_type, content
        FROM version_history
        WHERE id = ?
      `, [version_id]);
      
      if (!version) {
        return { success: false, error: '版本不存在' };
      }
      
      // 如果是章节类型，更新章节内容
      if (version.entity_type === 'chapter') {
        const now = new Date().toISOString();
        
        // 更新章节内容
        await dbManager.run(`
          UPDATE chapters
          SET content = ?, updated_at = ?
          WHERE id = ?
        `, [version.content, now, version.entity_id]);
        
        // 获取更新后的章节
        const chapter = await dbManager.get(`
          SELECT * FROM chapters WHERE id = ?
        `, [version.entity_id]);
        
        return { success: true, data: chapter };
      }
      
      return { success: false, error: '不支持的实体类型' };
    } catch (error) {
      console.error('恢复版本失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除版本
  ipcMain.handle('delete-version', async (event, { id }) => {
    try {
      // 确保数据库已初始化
      await dbManager.waitForInitialization();
      
      // 检查版本是否存在
      const version = await dbManager.get('SELECT * FROM version_history WHERE id = ?', [id]);
      
      if (!version) {
        return { success: false, error: '版本不存在' };
      }
      
      // 删除版本
      await dbManager.run('DELETE FROM version_history WHERE id = ?', [id]);
      
      return { success: true };
    } catch (error) {
      console.error('删除版本失败:', error);
      return { success: false, error: error.message };
    }
  });
}

// 立即注册所有处理器
registerNovelHandlers();

module.exports = {
  // 导出函数以便需要时重新注册
  registerNovelHandlers
}; 