/**
 * 数据库测试脚本
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 获取用户数据路径
const userDataPath = process.env.APPDATA || 
  (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.config");

// 可能的数据库路径
const possiblePaths = [
  path.join(userDataPath, 'novel-assist', 'novelassist.db'),
  path.join(userDataPath, 'novel-assistant', 'novel-assistant.sqlite'),
  path.join(userDataPath, 'novelassist', 'novelassist.db')
];

console.log('测试数据库连接...');

// 检查每个可能的路径
for (const dbPath of possiblePaths) {
  console.log(`检查路径: ${dbPath}`);
  
  if (fs.existsSync(dbPath)) {
    console.log(`找到数据库文件: ${dbPath}`);
    
    // 连接数据库
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error(`连接数据库失败: ${err.message}`);
        return;
      }
      
      console.log('成功连接到数据库');
      
      // 检查表结构
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
          console.error(`获取表结构失败: ${err.message}`);
          db.close();
          return;
        }
        
        console.log('数据库中的表:');
        tables.forEach(table => {
          console.log(`- ${table.name}`);
        });
        
        // 关闭数据库连接
        db.close(() => {
          console.log('数据库连接已关闭');
        });
      });
    });
    
    // 找到一个数据库后退出循环
    return;
  }
}

console.log('未找到任何数据库文件'); 