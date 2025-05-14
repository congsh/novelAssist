/**
 * 清空时间线数据脚本
 * 
 * 此脚本用于清空SQLite数据库中的时间线数据
 * 同时会清除相关的关联关系
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 获取用户数据路径
const userDataPath = process.env.APPDATA || 
  (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.config");
// 数据库路径
const dbPath = path.join(userDataPath, 'novel-assist', 'novelassist.db');

console.log(`数据库路径: ${dbPath}`);

// 检查数据库文件是否存在
if (!fs.existsSync(dbPath)) {
  console.error('数据库文件不存在!');
  process.exit(1);
}

// 连接数据库
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接数据库失败:', err.message);
    process.exit(1);
  }
  console.log('已连接到数据库');
  
  // 启用外键约束
  db.run('PRAGMA foreign_keys = ON', (err) => {
    if (err) {
      console.error('启用外键约束失败:', err.message);
      closeAndExit(1);
    }
    
    // 开始事务
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        console.error('开始事务失败:', err.message);
        closeAndExit(1);
      }
      
      // 1. 删除时间线相关的关联关系
      db.run(`DELETE FROM relationships WHERE 
        (entity1_type = 'timeline_event') OR (entity2_type = 'timeline_event')`, (err) => {
        if (err) {
          console.error('删除时间线关联关系失败:', err.message);
          rollbackAndExit(1);
        }
        
        console.log('已删除时间线关联关系');
        
        // 2. 删除所有时间线数据
        db.run('DELETE FROM timeline_events', (err) => {
          if (err) {
            console.error('删除时间线数据失败:', err.message);
            rollbackAndExit(1);
          }
          
          console.log('已删除所有时间线数据');
          
          // 提交事务
          db.run('COMMIT', (err) => {
            if (err) {
              console.error('提交事务失败:', err.message);
              rollbackAndExit(1);
            }
            
            console.log('清空时间线数据完成');
            closeAndExit(0);
          });
        });
      });
    });
  });
});

// 回滚事务并退出
function rollbackAndExit(code) {
  db.run('ROLLBACK', () => {
    closeAndExit(code);
  });
}

// 关闭数据库连接并退出
function closeAndExit(code) {
  db.close((err) => {
    if (err) {
      console.error('关闭数据库连接失败:', err.message);
    }
    process.exit(code);
  });
} 