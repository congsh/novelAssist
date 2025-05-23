const { ipcMain } = require('electron');
const dbManager = require('../database/db-manager');

/**
 * 注册向量化相关的IPC处理器
 */
function registerVectorHandlers() {
  // 获取小说的实体数据
  ipcMain.handle('get-characters-by-novel', async (event, novelId) => {
    try {
      const sql = 'SELECT * FROM characters WHERE novel_id = ? ORDER BY created_at ASC';
      return await dbManager.query(sql, [novelId]);
    } catch (error) {
      console.error('获取小说人物失败:', error);
      throw error;
    }
  });

  ipcMain.handle('get-locations-by-novel', async (event, novelId) => {
    try {
      const sql = 'SELECT * FROM locations WHERE novel_id = ? ORDER BY created_at ASC';
      return await dbManager.query(sql, [novelId]);
    } catch (error) {
      console.error('获取小说地点失败:', error);
      throw error;
    }
  });

  ipcMain.handle('get-outlines-by-novel', async (event, novelId) => {
    try {
      const sql = 'SELECT * FROM outlines WHERE novel_id = ? ORDER BY sort_order ASC';
      return await dbManager.query(sql, [novelId]);
    } catch (error) {
      console.error('获取小说大纲失败:', error);
      throw error;
    }
  });

  ipcMain.handle('get-timeline-by-novel', async (event, novelId) => {
    try {
      const sql = 'SELECT * FROM timeline_events WHERE novel_id = ? ORDER BY event_date ASC';
      return await dbManager.query(sql, [novelId]);
    } catch (error) {
      console.error('获取小说时间线失败:', error);
      throw error;
    }
  });

  // 向量化数据管理
  ipcMain.handle('get-vectorized-entities', async (event, filters = {}) => {
    try {
      // 首先确保表存在
      await createVectorizedEntitiesTable();
      
      let sql = `
        SELECT 
          ve.*,
          CASE 
            WHEN ve.entity_type = 'character' THEN c.name
            WHEN ve.entity_type = 'location' THEN l.name  
            WHEN ve.entity_type = 'outline' THEN o.title
            WHEN ve.entity_type = 'timeline' THEN t.title
          END as entity_name,
          n.title as novel_title
        FROM vectorized_entities ve
        LEFT JOIN characters c ON ve.entity_id = c.id AND ve.entity_type = 'character'
        LEFT JOIN locations l ON ve.entity_id = l.id AND ve.entity_type = 'location'
        LEFT JOIN outlines o ON ve.entity_id = o.id AND ve.entity_type = 'outline'
        LEFT JOIN timeline_events t ON ve.entity_id = t.id AND ve.entity_type = 'timeline'
        LEFT JOIN novels n ON ve.novel_id = n.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (filters.novelId && filters.novelId !== 'all') {
        sql += ' AND ve.novel_id = ?';
        params.push(filters.novelId);
      }
      
      if (filters.entityType && filters.entityType !== 'all') {
        sql += ' AND ve.entity_type = ?';
        params.push(filters.entityType);
      }
      
      if (filters.status) {
        sql += ' AND ve.status = ?';
        params.push(filters.status);
      }
      
      sql += ' ORDER BY ve.updated_at DESC';
      
      return await dbManager.query(sql, params);
    } catch (error) {
      console.error('获取向量化实体失败:', error);
      // 如果表不存在，创建表并返回空数组
      if (error.message.includes('no such table')) {
        try {
          await createVectorizedEntitiesTable();
          return [];
        } catch (createError) {
          console.error('创建向量化实体表失败:', createError);
          return [];
        }
      }
      return [];
    }
  });

  ipcMain.handle('save-vectorized-entity', async (event, entityData) => {
    try {
      // 确保表存在
      await createVectorizedEntitiesTable();
      
      const sql = `
        INSERT OR REPLACE INTO vectorized_entities 
        (id, entity_id, entity_type, novel_id, status, vector_id, model_used, created_at, updated_at, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        entityData.id,
        entityData.entityId,
        entityData.entityType,
        entityData.novelId,
        entityData.status,
        entityData.vectorId || null,
        entityData.modelUsed,
        entityData.createdAt,
        entityData.updatedAt,
        entityData.error || null
      ];
      
      await dbManager.run(sql, params);
      return { success: true };
    } catch (error) {
      console.error('保存向量化实体失败:', error);
      throw error;
    }
  });

  ipcMain.handle('delete-vectorized-entity', async (event, entityId) => {
    try {
      const sql = 'DELETE FROM vectorized_entities WHERE id = ?';
      await dbManager.run(sql, [entityId]);
      return { success: true };
    } catch (error) {
      console.error('删除向量化实体失败:', error);
      throw error;
    }
  });

  // 批量保存向量化实体
  ipcMain.handle('save-vectorized-entities-batch', async (event, entitiesData) => {
    try {
      // 确保表存在
      await createVectorizedEntitiesTable();
      
      const sql = `
        INSERT OR REPLACE INTO vectorized_entities 
        (id, entity_id, entity_type, novel_id, status, vector_id, model_used, created_at, updated_at, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      // 批量插入
      for (const entityData of entitiesData) {
        const params = [
          entityData.id,
          entityData.entityId,
          entityData.entityType,
          entityData.novelId,
          entityData.status,
          entityData.vectorId || null,
          entityData.modelUsed,
          entityData.createdAt,
          entityData.updatedAt,
          entityData.error || null
        ];
        await dbManager.run(sql, params);
      }
      
      return { success: true, count: entitiesData.length };
    } catch (error) {
      console.error('批量保存向量化实体失败:', error);
      throw error;
    }
  });
  
  console.log('向量化IPC处理器已注册');
}

/**
 * 创建向量化实体表
 */
async function createVectorizedEntitiesTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS vectorized_entities (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        novel_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'processing',
        vector_id TEXT,
        model_used TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        error_message TEXT,
        FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
      )
    `;
    
    await dbManager.run(sql);
    
    // 创建索引
    const indexSqls = [
      'CREATE INDEX IF NOT EXISTS idx_vectorized_entities_novel_id ON vectorized_entities(novel_id)',
      'CREATE INDEX IF NOT EXISTS idx_vectorized_entities_entity_type ON vectorized_entities(entity_type)',
      'CREATE INDEX IF NOT EXISTS idx_vectorized_entities_status ON vectorized_entities(status)',
      'CREATE INDEX IF NOT EXISTS idx_vectorized_entities_entity_id ON vectorized_entities(entity_id)'
    ];
    
    for (const indexSql of indexSqls) {
      try {
        await dbManager.run(indexSql);
      } catch (error) {
        // 索引可能已存在，忽略错误
        if (!error.message.includes('already exists')) {
          console.warn('创建索引警告:', error.message);
        }
      }
    }
    
    console.log('向量化实体表初始化完成');
  } catch (error) {
    console.error('创建向量化实体表失败:', error);
    throw error;
  }
}

module.exports = {
  registerVectorHandlers
}; 