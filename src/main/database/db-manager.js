const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { getDatabasePath } = require('../main');

/**
 * 数据库管理器类
 * 负责数据库的初始化、连接和基本操作
 */
class DbManager {
  constructor() {
    this.db = null;
    this.dbPath = getDatabasePath();
    this.isInitialized = false;
    this.init();
  }

  /**
   * 初始化数据库
   */
  init() {
    const dbExists = fs.existsSync(this.dbPath);
    
    // 创建数据库目录（如果不存在）
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 连接数据库
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('数据库连接失败:', err.message);
        return;
      }
      console.log('已连接到SQLite数据库，路径:', this.dbPath);
      
      // 如果数据库文件不存在，创建表结构
      if (!dbExists) {
        this.createTables();
      } else {
        // 检查表是否存在
        this.checkTables();
      }
    });
  }

  /**
   * 检查数据库表是否存在
   */
  checkTables() {
    this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='novels'", (err, row) => {
      if (err) {
        console.error('检查表结构失败:', err.message);
        return;
      }
      
      if (!row) {
        console.log('数据库表不存在，正在创建...');
        this.createTables();
      } else {
        console.log('数据库表已存在，检查是否需要更新表结构...');
        this.updateTables();
      }
    });
  }

  /**
   * 更新数据库表结构
   */
  updateTables() {
    console.log('正在检查数据库表结构更新...');
    
    // 检查timeline_events表是否存在importance列
    this.db.get("PRAGMA table_info(timeline_events)", (err, rows) => {
      if (err) {
        console.error('检查timeline_events表结构失败:', err.message);
        this.isInitialized = true;
        return;
      }
      
      // 检查timeline_events表是否需要更新
      this.updateTimelineEventsTable(() => {
        // 检查novels表是否需要更新
        this.updateNovelsTable(() => {
          // 检查标签和分类表是否存在
          this.updateTagsAndCategoriesTables(() => {
            console.log('数据库表结构检查完成');
            
            // 确保索引存在
            this.createIndexes(() => {
              console.log('数据库索引检查完成');
              this.isInitialized = true;
            });
          });
        });
      });
    });
  }

  /**
   * 更新timeline_events表结构
   * @param {Function} callback - 更新完成后的回调函数
   */
  updateTimelineEventsTable(callback) {
    // 检查表中是否有importance列
    this.db.get("PRAGMA table_info(timeline_events)", (err, rows) => {
      if (err) {
        console.error('检查timeline_events表结构失败:', err.message);
        callback();
        return;
      }
      
      // 获取所有列信息
      this.db.all("PRAGMA table_info(timeline_events)", (err, rows) => {
        if (err) {
          console.error('获取timeline_events表结构失败:', err.message);
          callback();
          return;
        }
        
        // 检查是否有importance列
        const hasImportanceColumn = rows.some(row => row.name === 'importance');
        // 检查列名是否需要更新
        const hasRelatedCharacters = rows.some(row => row.name === 'related_characters');
        const hasRelatedLocations = rows.some(row => row.name === 'related_locations');
        
        if (!hasImportanceColumn || hasRelatedCharacters || hasRelatedLocations) {
          console.log('需要更新timeline_events表结构...');
          
          // 创建新表
          this.db.run(`
            CREATE TABLE IF NOT EXISTS timeline_events_new (
              id TEXT PRIMARY KEY,
              novel_id TEXT NOT NULL,
              title TEXT NOT NULL,
              description TEXT,
              event_date TEXT,
              importance TEXT DEFAULT 'minor',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              character_ids TEXT,
              location_id TEXT,
              metadata TEXT,
              FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE
            )
          `, (err) => {
            if (err) {
              console.error('创建新timeline_events表失败:', err.message);
              callback();
              return;
            }
            
            // 复制数据
            this.db.run(`
              INSERT INTO timeline_events_new (
                id, novel_id, title, description, event_date, 
                importance,
                created_at, updated_at, 
                character_ids, location_id, metadata
              )
              SELECT 
                id, novel_id, title, description, event_date, 
                'minor' AS importance,
                created_at, updated_at, 
                related_characters, related_locations, metadata
              FROM timeline_events
            `, (err) => {
              if (err) {
                console.error('复制timeline_events数据失败:', err.message);
                callback();
                return;
              }
              
              // 删除旧表
              this.db.run(`DROP TABLE timeline_events`, (err) => {
                if (err) {
                  console.error('删除旧timeline_events表失败:', err.message);
                  callback();
                  return;
                }
                
                // 重命名新表
                this.db.run(`ALTER TABLE timeline_events_new RENAME TO timeline_events`, (err) => {
                  if (err) {
                    console.error('重命名新timeline_events表失败:', err.message);
                    callback();
                    return;
                  }
                  
                  console.log('timeline_events表结构更新成功');
                  
                  // 重新创建索引
                  this.createIndexes(callback);
                });
              });
            });
          });
        } else {
          console.log('timeline_events表结构已是最新');
          callback();
        }
      });
    });
  }

  /**
   * 更新novels表结构，添加category_id字段
   * @param {Function} callback - 更新完成后的回调函数
   */
  updateNovelsTable(callback) {
    // 检查表中是否有category_id列
    this.db.all("PRAGMA table_info(novels)", (err, rows) => {
      if (err) {
        console.error('检查novels表结构失败:', err.message);
        callback();
        return;
      }
      
      // 检查是否有category_id列
      const hasCategoryIdColumn = rows.some(row => row.name === 'category_id');
      
      if (!hasCategoryIdColumn) {
        console.log('需要更新novels表结构，添加category_id字段...');
        
        // 添加category_id列
        this.db.run(`
          ALTER TABLE novels ADD COLUMN category_id TEXT REFERENCES categories(id) ON DELETE SET NULL
        `, (err) => {
          if (err) {
            console.error('添加category_id列失败:', err.message);
          } else {
            console.log('novels表结构更新成功，添加了category_id列');
          }
          callback();
        });
      } else {
        console.log('novels表结构已是最新');
        callback();
      }
    });
  }

  /**
   * 更新标签和分类表结构
   * @param {Function} callback - 更新完成后的回调函数
   */
  updateTagsAndCategoriesTables(callback) {
    // 检查分类表是否存在
    this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'", (err, row) => {
      if (err) {
        console.error('检查categories表失败:', err.message);
        callback();
        return;
      }
      
      if (!row) {
        console.log('创建categories表...');
        this.db.run(`
          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            color TEXT,
            icon TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('创建categories表失败:', err.message);
            callback();
            return;
          }
          
          console.log('categories表创建成功');
          
          // 继续检查tags表
          this.checkTagsTable(callback);
        });
      } else {
        // 分类表已存在，继续检查tags表
        this.checkTagsTable(callback);
      }
    });
  }
  
  /**
   * 检查标签表是否存在
   * @param {Function} callback - 检查完成后的回调函数
   */
  checkTagsTable(callback) {
    this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='tags'", (err, row) => {
      if (err) {
        console.error('检查tags表失败:', err.message);
        callback();
        return;
      }
      
      if (!row) {
        console.log('创建tags表...');
        this.db.run(`
          CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            color TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('创建tags表失败:', err.message);
            callback();
            return;
          }
          
          console.log('tags表创建成功');
          
          // 继续检查novel_tags表
          this.checkNovelTagsTable(callback);
        });
      } else {
        // 标签表已存在，继续检查novel_tags表
        this.checkNovelTagsTable(callback);
      }
    });
  }
  
  /**
   * 检查小说-标签关联表是否存在
   * @param {Function} callback - 检查完成后的回调函数
   */
  checkNovelTagsTable(callback) {
    this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='novel_tags'", (err, row) => {
      if (err) {
        console.error('检查novel_tags表失败:', err.message);
        callback();
        return;
      }
      
      if (!row) {
        console.log('创建novel_tags表...');
        this.db.run(`
          CREATE TABLE IF NOT EXISTS novel_tags (
            novel_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (novel_id, tag_id),
            FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('创建novel_tags表失败:', err.message);
          } else {
            console.log('novel_tags表创建成功');
          }
          callback();
        });
      } else {
        console.log('novel_tags表已存在');
        callback();
      }
    });
  }

  /**
   * 创建数据库表
   */
  createTables() {
    console.log('正在创建数据库表...');
    
    // 启用外键约束
    this.db.run('PRAGMA foreign_keys = ON');
    
    // 创建迁移表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建小说表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS novels (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        description TEXT,
        genre TEXT,
        cover_path TEXT,
        word_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'in_progress',
        settings TEXT,
        metadata TEXT
      )
    `, (err) => {
      if (err) {
        console.error('创建小说表失败:', err.message);
      } else {
        console.log('小说表创建成功');
      }
    });

    // 创建章节表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        sort_order INTEGER NOT NULL,
        word_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'draft',
        parent_id TEXT,
        metadata TEXT,
        FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES chapters (id) ON DELETE SET NULL
      )
    `);

    // 创建人物表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT,
        description TEXT,
        background TEXT,
        personality TEXT,
        appearance TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        image_path TEXT,
        metadata TEXT,
        FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE
      )
    `);

    // 创建地点表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        importance TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        image_path TEXT,
        coordinates TEXT,
        metadata TEXT,
        FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE
      )
    `);

    // 创建大纲表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS outlines (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        sort_order INTEGER NOT NULL,
        parent_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active',
        metadata TEXT,
        FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES outlines (id) ON DELETE SET NULL
      )
    `);

    // 创建时间线事件表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS timeline_events (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        event_date TEXT,
        importance TEXT DEFAULT 'minor',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        character_ids TEXT,
        location_id TEXT,
        metadata TEXT,
        FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE
      )
    `);

    // 创建笔记表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        category TEXT,
        tags TEXT,
        metadata TEXT,
        FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE
      )
    `);

    // 创建关系表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS relationships (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        entity1_id TEXT NOT NULL,
        entity1_type TEXT NOT NULL,
        entity2_id TEXT NOT NULL,
        entity2_type TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE
      )
    `);

    // 创建统计数据表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS statistics (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        date DATE NOT NULL,
        word_count INTEGER DEFAULT 0,
        writing_time INTEGER DEFAULT 0,
        chapter_count INTEGER DEFAULT 0,
        metadata TEXT,
        FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE
      )
    `);

    // 创建分类表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT,
        icon TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建标签表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建小说-标签关联表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS novel_tags (
        novel_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (novel_id, tag_id),
        FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
      )
    `);

    // 创建AI提示模板表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ai_prompts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        is_system BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `);

    // 创建版本历史表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS version_history (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_comment TEXT,
        metadata TEXT
      )
    `, (err) => {
      if (err) {
        console.error('创建版本历史表失败:', err.message);
        this.isInitialized = true;
      } else {
        console.log('所有数据库表创建完成');
        
        // 创建索引
        this.createIndexes(() => {
          console.log('数据库初始化完成');
          this.isInitialized = true;
        });
      }
    });
  }

  /**
   * 等待数据库初始化完成
   * @returns {Promise} 初始化完成的Promise
   */
  waitForInitialization() {
    return new Promise((resolve) => {
      const checkInitialized = () => {
        if (this.isInitialized) {
          resolve();
        } else {
          setTimeout(checkInitialized, 100);
        }
      };
      checkInitialized();
    });
  }

  /**
   * 创建索引
   * @param {Function} [callback] - 创建完成后的回调函数
   */
  createIndexes(callback) {
    console.log('正在创建/检查数据库索引...');
    
    // 小说相关索引
    this.db.run('CREATE INDEX IF NOT EXISTS idx_novels_title ON novels(title)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_novels_updated_at ON novels(updated_at)');

    // 章节相关索引
    this.db.run('CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_chapters_sort_order ON chapters(novel_id, sort_order)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_chapters_parent_id ON chapters(parent_id)');

    // 人物相关索引
    this.db.run('CREATE INDEX IF NOT EXISTS idx_characters_novel_id ON characters(novel_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(novel_id, name)');

    // 地点相关索引
    this.db.run('CREATE INDEX IF NOT EXISTS idx_locations_novel_id ON locations(novel_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(novel_id, name)');

    // 大纲相关索引
    this.db.run('CREATE INDEX IF NOT EXISTS idx_outlines_novel_id ON outlines(novel_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_outlines_sort_order ON outlines(novel_id, sort_order)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_outlines_parent_id ON outlines(parent_id)');

    // 时间线相关索引
    this.db.run('CREATE INDEX IF NOT EXISTS idx_timeline_events_novel_id ON timeline_events(novel_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_timeline_events_event_date ON timeline_events(novel_id, event_date)', (err) => {
      if (err) {
        console.error('创建时间线索引失败:', err.message);
      } else {
        console.log('数据库索引创建/检查完成');
      }
      
      // 如果有回调函数，执行回调
      if (typeof callback === 'function') {
        callback();
      }
    });

    // 笔记相关索引
    this.db.run('CREATE INDEX IF NOT EXISTS idx_notes_novel_id ON notes(novel_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(novel_id, category)');

    // 关系相关索引
    this.db.run('CREATE INDEX IF NOT EXISTS idx_relationships_novel_id ON relationships(novel_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_relationships_entity1 ON relationships(entity1_id, entity1_type)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_relationships_entity2 ON relationships(entity2_id, entity2_type)');

    // 统计数据相关索引
    this.db.run('CREATE INDEX IF NOT EXISTS idx_statistics_novel_id_date ON statistics(novel_id, date)');

    // 版本历史相关索引
    this.db.run('CREATE INDEX IF NOT EXISTS idx_version_history_entity ON version_history(entity_id, entity_type)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_version_history_created_at ON version_history(created_at)');

    // 分类和标签相关索引
    this.db.run('CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_novel_tags_novel_id ON novel_tags(novel_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_novel_tags_tag_id ON novel_tags(tag_id)');
  }

  /**
   * 执行SQL查询（Promise包装）
   * @param {string} sql - SQL语句
   * @param {Array} params - 查询参数
   * @returns {Promise} 返回查询结果的Promise
   */
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * 执行单行SQL查询（Promise包装）
   * @param {string} sql - SQL语句
   * @param {Array} params - 查询参数
   * @returns {Promise} 返回查询结果的Promise
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  /**
   * 执行SQL运行（Promise包装）
   * @param {string} sql - SQL语句
   * @param {Array} params - 查询参数
   * @returns {Promise} 返回运行结果的Promise
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * 关闭数据库连接
   */
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('关闭数据库连接失败:', err.message);
            reject(err);
            return;
          }
          console.log('数据库连接已关闭');
          this.db = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// 创建单例并导出
const dbManagerInstance = new DbManager();
module.exports = dbManagerInstance; 