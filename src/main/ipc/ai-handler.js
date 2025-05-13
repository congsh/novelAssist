const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../database/db-manager');
const OpenAI = require('openai');

let openai = null;

/**
 * 初始化OpenAI客户端
 * @param {string} apiKey - OpenAI API密钥
 */
function initializeOpenAI(apiKey) {
  try {
    openai = new OpenAI({
      apiKey: apiKey
    });
    return true;
  } catch (error) {
    console.error('初始化OpenAI客户端失败:', error);
    return false;
  }
}

/**
 * 注册AI相关的IPC处理器
 */
function registerAIHandlers() {
  // 初始化AI服务
  ipcMain.handle('initialize-ai', async (event, { apiKey }) => {
    try {
      const success = initializeOpenAI(apiKey);
      return { success };
    } catch (error) {
      console.error('初始化AI服务失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 生成内容
  ipcMain.handle('generate-content', async (event, { prompt, model = 'gpt-3.5-turbo', temperature = 0.7, maxTokens = 1000 }) => {
    try {
      if (!openai) {
        return { success: false, error: 'AI服务未初始化' };
      }

      const response = await openai.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature,
        max_tokens: maxTokens
      });

      return { 
        success: true, 
        data: {
          content: response.choices[0].message.content,
          usage: response.usage
        } 
      };
    } catch (error) {
      console.error('生成内容失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取AI提示模板列表
  ipcMain.handle('get-ai-prompts', async (event, { category }) => {
    try {
      let query = `
        SELECT id, title, content, category, is_system, created_at, updated_at
        FROM ai_prompts
      `;
      
      const params = [];
      
      if (category) {
        query += ' WHERE category = ?';
        params.push(category);
      }
      
      query += ' ORDER BY is_system DESC, title ASC';
      
      const prompts = await dbManager.query(query, params);
      return { success: true, data: prompts };
    } catch (error) {
      console.error('获取AI提示模板列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取单个AI提示模板
  ipcMain.handle('get-ai-prompt', async (event, { id }) => {
    try {
      const prompt = await dbManager.get(`
        SELECT id, title, content, category, is_system, created_at, updated_at, metadata
        FROM ai_prompts
        WHERE id = ?
      `, [id]);
      
      if (!prompt) {
        return { success: false, error: '提示模板不存在' };
      }
      
      return { success: true, data: prompt };
    } catch (error) {
      console.error('获取AI提示模板失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 创建AI提示模板
  ipcMain.handle('create-ai-prompt', async (event, promptData) => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const result = await dbManager.run(`
        INSERT INTO ai_prompts (
          id, title, content, category, is_system, created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        promptData.title,
        promptData.content,
        promptData.category,
        promptData.is_system ? 1 : 0,
        now,
        now,
        promptData.metadata ? JSON.stringify(promptData.metadata) : null
      ]);
      
      return { 
        success: true, 
        data: { 
          id, 
          ...promptData, 
          created_at: now, 
          updated_at: now
        } 
      };
    } catch (error) {
      console.error('创建AI提示模板失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新AI提示模板
  ipcMain.handle('update-ai-prompt', async (event, { id, ...updateData }) => {
    try {
      const prompt = await dbManager.get('SELECT * FROM ai_prompts WHERE id = ?', [id]);
      
      if (!prompt) {
        return { success: false, error: '提示模板不存在' };
      }
      
      // 系统模板不允许修改
      if (prompt.is_system && !updateData.is_system) {
        return { success: false, error: '系统模板不允许修改' };
      }
      
      const now = new Date().toISOString();
      const updates = [];
      const params = [];
      
      // 构建动态更新语句
      Object.keys(updateData).forEach(key => {
        if (key === 'metadata') {
          updates.push(`${key} = ?`);
          params.push(updateData[key] ? JSON.stringify(updateData[key]) : null);
        } else if (key === 'is_system') {
          updates.push(`${key} = ?`);
          params.push(updateData[key] ? 1 : 0);
        } else if (key !== 'id' && key !== 'created_at') {
          updates.push(`${key} = ?`);
          params.push(updateData[key]);
        }
      });
      
      updates.push('updated_at = ?');
      params.push(now);
      params.push(id);
      
      await dbManager.run(`
        UPDATE ai_prompts
        SET ${updates.join(', ')}
        WHERE id = ?
      `, params);
      
      return { 
        success: true, 
        data: { 
          id, 
          ...prompt, 
          ...updateData, 
          updated_at: now 
        } 
      };
    } catch (error) {
      console.error('更新AI提示模板失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除AI提示模板
  ipcMain.handle('delete-ai-prompt', async (event, { id }) => {
    try {
      const prompt = await dbManager.get('SELECT * FROM ai_prompts WHERE id = ?', [id]);
      
      if (!prompt) {
        return { success: false, error: '提示模板不存在' };
      }
      
      // 系统模板不允许删除
      if (prompt.is_system) {
        return { success: false, error: '系统模板不允许删除' };
      }
      
      await dbManager.run('DELETE FROM ai_prompts WHERE id = ?', [id]);
      
      return { success: true };
    } catch (error) {
      console.error('删除AI提示模板失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 分析文本（提取人物、地点等）
  ipcMain.handle('analyze-text', async (event, { text, novelId, analysisType }) => {
    try {
      if (!openai) {
        return { success: false, error: 'AI服务未初始化' };
      }

      let prompt = '';
      
      switch (analysisType) {
        case 'characters':
          prompt = `从以下文本中提取所有人物信息，包括姓名、性格特点、外貌描述等。以JSON格式返回，格式为：[{"name": "姓名", "traits": ["特点1", "特点2"], "appearance": "外貌描述"}]。文本内容：\n\n${text}`;
          break;
        case 'locations':
          prompt = `从以下文本中提取所有地点信息，包括名称、描述等。以JSON格式返回，格式为：[{"name": "地点名称", "description": "地点描述"}]。文本内容：\n\n${text}`;
          break;
        case 'outline':
          prompt = `为以下文本生成一个详细的大纲，包括主要情节点。以JSON格式返回，格式为：[{"title": "标题", "content": "内容描述"}]。文本内容：\n\n${text}`;
          break;
        case 'timeline':
          prompt = `从以下文本中提取时间线事件，按时间顺序排列。以JSON格式返回，格式为：[{"title": "事件标题", "description": "事件描述", "date": "事件日期/时间"}]。文本内容：\n\n${text}`;
          break;
        default:
          return { success: false, error: '不支持的分析类型' };
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      let parsedData = [];
      
      try {
        // 尝试解析返回的JSON
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          parsedData = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('解析AI返回的JSON失败:', parseError);
        return { 
          success: true, 
          data: {
            raw: content,
            parsed: false
          } 
        };
      }

      return { 
        success: true, 
        data: {
          results: parsedData,
          raw: content,
          parsed: true,
          usage: response.usage
        } 
      };
    } catch (error) {
      console.error('分析文本失败:', error);
      return { success: false, error: error.message };
    }
  });
}

// 注册所有处理器
registerAIHandlers();

module.exports = {
  registerAIHandlers,
  initializeOpenAI
}; 