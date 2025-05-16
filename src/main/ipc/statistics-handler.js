const { ipcMain } = require('electron');
const dbManager = require('../database/db-manager');

/**
 * 初始化统计分析相关的IPC处理器
 */
function initStatisticsHandlers() {
  console.log('开始注册统计分析IPC处理器...');
  
  /**
   * 获取总体统计数据
   * 包括总字数、小说数量、章节数量等
   */
  ipcMain.handle('get-overall-statistics', async () => {
    console.log('处理get-overall-statistics请求');
    try {
      await dbManager.waitForInitialization();
      
      // 获取小说总数
      const novelCountResult = await dbManager.get('SELECT COUNT(*) as count FROM novels');
      const novelCount = novelCountResult ? novelCountResult.count : 0;
      
      // 获取章节总数
      const chapterCountResult = await dbManager.get('SELECT COUNT(*) as count FROM chapters');
      const chapterCount = chapterCountResult ? chapterCountResult.count : 0;
      
      // 获取总字数
      const wordCountResult = await dbManager.get('SELECT SUM(word_count) as total FROM chapters');
      const totalWordCount = wordCountResult && wordCountResult.total ? wordCountResult.total : 0;
      
      // 获取人物总数
      const characterCountResult = await dbManager.get('SELECT COUNT(*) as count FROM characters');
      const characterCount = characterCountResult ? characterCountResult.count : 0;
      
      // 获取地点总数
      const locationCountResult = await dbManager.get('SELECT COUNT(*) as count FROM locations');
      const locationCount = locationCountResult ? locationCountResult.count : 0;
      
      // 获取大纲项总数
      const outlineCountResult = await dbManager.get('SELECT COUNT(*) as count FROM outlines');
      const outlineCount = outlineCountResult ? outlineCountResult.count : 0;
      
      // 获取时间线事件总数
      const timelineCountResult = await dbManager.get('SELECT COUNT(*) as count FROM timeline_events');
      const timelineCount = timelineCountResult ? timelineCountResult.count : 0;
      
      console.log('成功获取统计数据:', {
        novelCount,
        chapterCount,
        totalWordCount,
        characterCount,
        locationCount,
        outlineCount,
        timelineCount
      });
      
      return {
        success: true,
        data: {
          novelCount,
          chapterCount,
          totalWordCount,
          characterCount,
          locationCount,
          outlineCount,
          timelineCount
        }
      };
    } catch (error) {
      console.error('获取统计数据失败:', error);
      return { 
        success: false, 
        error: `获取统计数据失败: ${error.message}` 
      };
    }
  });

  /**
   * 获取小说写作进度统计
   * 返回每个小说的完成情况
   */
  ipcMain.handle('get-novel-progress', async () => {
    console.log('处理get-novel-progress请求');
    try {
      await dbManager.waitForInitialization();
      
      // 获取所有小说的基本信息和章节数量
      const query = `
        SELECT 
          n.id, 
          n.title, 
          n.word_count AS target_word_count,
          n.status,
          COUNT(c.id) AS chapter_count,
          SUM(c.word_count) AS current_word_count
        FROM 
          novels n
        LEFT JOIN 
          chapters c ON n.id = c.novel_id
        GROUP BY 
          n.id
        ORDER BY 
          n.updated_at DESC
      `;
      
      const novels = await dbManager.query(query);
      
      // 计算每个小说的完成百分比
      const novelsWithProgress = novels.map(novel => {
        const targetWordCount = novel.target_word_count || 50000; // 默认目标字数
        const currentWordCount = novel.current_word_count || 0;
        const progressPercentage = Math.min(100, Math.round((currentWordCount / targetWordCount) * 100));
        
        return {
          id: novel.id,
          title: novel.title,
          targetWordCount,
          currentWordCount,
          chapterCount: novel.chapter_count,
          status: novel.status,
          progressPercentage
        };
      });
      
      console.log(`成功获取${novelsWithProgress.length}部小说的进度数据`);
      return {
        success: true,
        data: novelsWithProgress
      };
    } catch (error) {
      console.error('获取小说进度统计失败:', error);
      return { 
        success: false, 
        error: `获取小说进度统计失败: ${error.message}` 
      };
    }
  });

  /**
   * 获取所有小说的统计信息
   * 用于首页展示
   */
  ipcMain.handle('get-novels-statistics', async () => {
    console.log('处理get-novels-statistics请求');
    try {
      await dbManager.waitForInitialization();
      
      // 获取所有小说的基本信息和章节数量
      const query = `
        SELECT 
          n.id, 
          n.title, 
          n.word_count AS target_word_count,
          n.status,
          COUNT(c.id) AS chapter_count,
          SUM(c.word_count) AS current_word_count
        FROM 
          novels n
        LEFT JOIN 
          chapters c ON n.id = c.novel_id
        GROUP BY 
          n.id
        ORDER BY 
          n.updated_at DESC
      `;
      
      const novels = await dbManager.query(query);
      
      // 计算每个小说的统计信息
      const novelsStatistics = novels.map(novel => {
        const targetWordCount = novel.target_word_count || 50000; // 默认目标字数
        const currentWordCount = novel.current_word_count || 0;
        const progressPercentage = Math.min(100, Math.round((currentWordCount / targetWordCount) * 100));
        
        return {
          id: novel.id,
          title: novel.title,
          targetWordCount,
          currentWordCount,
          chapterCount: novel.chapter_count,
          status: novel.status,
          progressPercentage
        };
      });
      
      console.log(`成功获取${novelsStatistics.length}部小说的统计数据`);
      return {
        success: true,
        data: novelsStatistics
      };
    } catch (error) {
      console.error('获取小说统计数据失败:', error);
      return { 
        success: false, 
        error: `获取小说统计数据失败: ${error.message}` 
      };
    }
  });

  /**
   * 获取写作活动统计
   * 返回过去30天每天的写作字数
   */
  ipcMain.handle('get-writing-activity', async () => {
    console.log('处理get-writing-activity请求');
    try {
      await dbManager.waitForInitialization();
      
      // 获取过去30天的日期
      const dates = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        dates.push(dateString);
      }
      
      // 查询每天的写作字数
      const query = `
        SELECT 
          DATE(updated_at) AS date,
          SUM(word_count) AS daily_words
        FROM 
          chapters
        WHERE 
          updated_at >= DATE('now', '-30 days')
        GROUP BY 
          DATE(updated_at)
        ORDER BY 
          date ASC
      `;
      
      const activityData = await dbManager.query(query);
      
      // 将数据转换为日期映射
      const activityMap = {};
      activityData.forEach(item => {
        activityMap[item.date] = item.daily_words;
      });
      
      // 生成完整的30天数据
      const dailyActivity = dates.map(date => ({
        date,
        wordCount: activityMap[date] || 0
      }));
      
      console.log(`成功获取过去30天的写作活动数据`);
      return {
        success: true,
        data: dailyActivity
      };
    } catch (error) {
      console.error('获取写作活动统计失败:', error);
      return { 
        success: false, 
        error: `获取写作活动统计失败: ${error.message}` 
      };
    }
  });

  /**
   * 获取单个小说的详细统计
   */
  ipcMain.handle('get-novel-statistics', async (event, { novelId }) => {
    console.log('处理get-novel-statistics请求, novelId:', novelId);
    try {
      if (!novelId) {
        return { success: false, error: '小说ID不能为空' };
      }
      
      await dbManager.waitForInitialization();
      
      // 获取小说基本信息
      const novel = await dbManager.get('SELECT * FROM novels WHERE id = ?', [novelId]);
      if (!novel) {
        return { success: false, error: '找不到指定的小说' };
      }
      
      // 获取章节统计
      const chapterStats = await dbManager.get(`
        SELECT 
          COUNT(*) AS chapter_count,
          SUM(word_count) AS total_words,
          AVG(word_count) AS avg_words_per_chapter,
          MAX(word_count) AS max_chapter_words,
          MIN(word_count) AS min_chapter_words
        FROM 
          chapters
        WHERE 
          novel_id = ?
      `, [novelId]);
      
      // 获取人物数量
      const characterCount = await dbManager.get(`
        SELECT COUNT(*) AS count
        FROM characters
        WHERE novel_id = ?
      `, [novelId]);
      
      // 获取地点数量
      const locationCount = await dbManager.get(`
        SELECT COUNT(*) AS count
        FROM locations
        WHERE novel_id = ?
      `, [novelId]);
      
      // 获取大纲项数量
      const outlineCount = await dbManager.get(`
        SELECT COUNT(*) AS count
        FROM outlines
        WHERE novel_id = ?
      `, [novelId]);
      
      // 获取时间线事件数量
      const timelineCount = await dbManager.get(`
        SELECT COUNT(*) AS count
        FROM timeline_events
        WHERE novel_id = ?
      `, [novelId]);
      
      // 计算写作进度
      const targetWordCount = novel.word_count || 50000;
      const currentWordCount = chapterStats.total_words || 0;
      const progressPercentage = Math.min(100, Math.round((currentWordCount / targetWordCount) * 100));
      
      console.log(`成功获取小说"${novel.title}"的统计数据`);
      return {
        success: true,
        data: {
          novel: {
            id: novel.id,
            title: novel.title,
            author: novel.author,
            genre: novel.genre,
            status: novel.status,
            createdAt: novel.created_at,
            updatedAt: novel.updated_at
          },
          statistics: {
            targetWordCount,
            currentWordCount,
            progressPercentage,
            chapterCount: chapterStats.chapter_count || 0,
            avgWordsPerChapter: Math.round(chapterStats.avg_words_per_chapter) || 0,
            maxChapterWords: chapterStats.max_chapter_words || 0,
            minChapterWords: chapterStats.min_chapter_words || 0,
            characterCount: characterCount.count || 0,
            locationCount: locationCount.count || 0,
            outlineCount: outlineCount.count || 0,
            timelineCount: timelineCount.count || 0
          }
        }
      };
    } catch (error) {
      console.error('获取小说统计数据失败:', error);
      return { 
        success: false, 
        error: `获取小说统计数据失败: ${error.message}` 
      };
    }
  });

  console.log('统计分析IPC处理器已注册完成');
}

module.exports = { initStatisticsHandlers }; 