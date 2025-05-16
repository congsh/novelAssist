import { ChatMessage, ChatMessageRole } from '../types';

/**
 * 聊天上下文管理器
 * 负责管理和优化AI聊天的上下文，减少token使用量并保持对话连贯性
 */
export class ChatContextManager {
  // 默认最大token数限制
  private maxTokens = 4000;
  private tokenEstimateRatio = 4; // 估算每个字符约占0.25个token
  
  /**
   * 设置最大token数
   * @param tokens 最大token数
   */
  setMaxTokens(tokens: number): void {
    this.maxTokens = tokens;
  }
  
  /**
   * 压缩历史消息以适应token限制
   * @param messages 消息列表
   * @returns 压缩后的消息列表
   */
  compressHistory(messages: ChatMessage[]): ChatMessage[] {
    if (messages.length <= 2) return messages;
    
    // 计算当前token估算值
    const currentTokens = this.estimateTokens(messages);
    
    // 如果未超过限制，直接返回
    if (currentTokens <= this.maxTokens) {
      return messages;
    }
    
    // 保留系统消息和最近的N条消息
    const lastN = Math.min(6, Math.floor(messages.length / 2));
    if (messages.length <= lastN + 2) { // +2是考虑可能存在的系统消息
      return messages;
    }
    
    // 查找系统消息
    let systemMessage: ChatMessage | null = null;
    const conversationMessages = messages.filter((msg, index) => {
      if (msg.role === ChatMessageRole.SYSTEM) {
        // 只保留第一条系统消息
        if (!systemMessage) {
          systemMessage = msg;
          return false;
        }
        return false;
      }
      return true;
    });
    
    // 计算需要压缩的部分
    const messagesWithoutSystem = systemMessage ? conversationMessages : messages;
    const startKeep = 0;
    const middleStart = startKeep;
    const middleEnd = messagesWithoutSystem.length - lastN;
    
    // 提取需要压缩的中间部分消息
    const middleMessages = messagesWithoutSystem.slice(middleStart, middleEnd);
    
    // 创建摘要
    const summary = this.createSummary(middleMessages);
    
    // 构建压缩后的消息列表
    const compressedMessages: ChatMessage[] = [];
    
    // 添加系统消息
    if (systemMessage) {
      compressedMessages.push(systemMessage);
    }
    
    // 添加摘要消息
    compressedMessages.push({
      id: `summary-${Date.now()}`,
      role: ChatMessageRole.SYSTEM,
      content: summary,
      timestamp: Date.now()
    });
    
    // 添加最近的消息
    compressedMessages.push(...messagesWithoutSystem.slice(-lastN));
    
    // 如果压缩后仍然超过限制，递归压缩
    const compressedTokens = this.estimateTokens(compressedMessages);
    if (compressedTokens > this.maxTokens && compressedMessages.length > 4) {
      // 进一步压缩，保留更少的消息
      return this.compressHistory(compressedMessages);
    }
    
    return compressedMessages;
  }
  
  /**
   * 创建对话摘要
   * @param messages 需要摘要的消息列表
   * @returns 摘要文本
   */
  private createSummary(messages: ChatMessage[]): string {
    if (messages.length === 0) return "无历史对话";
    
    // 提取用户和助手的发言次数
    let userMessages = 0;
    let assistantMessages = 0;
    messages.forEach(msg => {
      if (msg.role === ChatMessageRole.USER) userMessages++;
      if (msg.role === ChatMessageRole.ASSISTANT) assistantMessages++;
    });
    
    // 提取关键词和主题
    const allText = messages.map(msg => msg.content).join(" ");
    const keywords = this.extractKeywords(allText);
    const topics = this.identifyTopics(allText);
    
    // 构建摘要
    return `[对话历史摘要] 这是之前的对话摘要：在之前的 ${messages.length} 条消息中，用户发言 ${userMessages} 次，助手回复 ${assistantMessages} 次。主要讨论了 ${topics.join("、")} 等话题，涉及到 ${keywords.join("、")} 等关键内容。请基于此摘要和后续对话继续回答用户问题。`;
  }
  
  /**
   * 简单实现的关键词提取
   * @param text 文本内容
   * @returns 关键词列表
   */
  private extractKeywords(text: string): string[] {
    // 简化版关键词提取，实际情况可能需要更复杂的算法
    const words = text.split(/\s+/);
    const wordCount: Record<string, number> = {};
    
    // 统计词频
    words.forEach(word => {
      if (word.length >= 2) {
        const normalized = word.toLowerCase().replace(/[.,?!;:'"()\[\]{}]/g, '');
        if (normalized.length >= 2) {
          wordCount[normalized] = (wordCount[normalized] || 0) + 1;
        }
      }
    });
    
    // 排序并返回前5个高频词
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }
  
  /**
   * 简单实现的主题识别
   * @param text 文本内容
   * @returns 主题列表
   */
  private identifyTopics(text: string): string[] {
    // 当前简化实现，实际应考虑使用更先进的NLP技术
    const possibleTopics = [
      { name: "创作", keywords: ["写作", "小说", "故事", "情节", "角色", "创作"] },
      { name: "人物设计", keywords: ["人物", "角色", "形象", "性格", "背景"] },
      { name: "场景描写", keywords: ["场景", "环境", "描写", "地点", "氛围"] },
      { name: "对话创作", keywords: ["对话", "对白", "交流", "说话", "交谈"] },
      { name: "情节构思", keywords: ["情节", "剧情", "发展", "转折", "矛盾"] },
      { name: "文本润色", keywords: ["润色", "修改", "优化", "改进", "提升"] }
    ];
    
    // 计算每个主题的相关度
    const topicScores = possibleTopics.map(topic => {
      let score = 0;
      topic.keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
        }
      });
      return { name: topic.name, score };
    });
    
    // 排序并返回前3个相关主题
    return topicScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter(topic => topic.score > 0)
      .map(topic => topic.name);
  }
  
  /**
   * 估算消息中的token数量
   * @param messages 消息列表
   * @returns 估算的token数量
   */
  private estimateTokens(messages: ChatMessage[]): number {
    // 简化的token估算
    // 实际应用中可能需要更精确的方法，例如使用特定模型的分词器
    let totalChars = 0;
    
    messages.forEach(msg => {
      // 角色标识约占10个token
      totalChars += 10;
      
      // 内容字符计数
      totalChars += msg.content.length;
    });
    
    // 估算token数 (每4个字符≈1个token)
    return Math.ceil(totalChars / this.tokenEstimateRatio);
  }
  
  /**
   * 优化提示内容，确保不超过token限制
   * @param prompt 提示内容
   * @param reservedTokens 预留的token数量
   * @returns 优化后的提示内容
   */
  optimizePrompt(prompt: string, reservedTokens: number = 800): string {
    const promptTokens = Math.ceil(prompt.length / this.tokenEstimateRatio);
    const availableTokens = this.maxTokens - reservedTokens;
    
    if (promptTokens <= availableTokens) {
      return prompt;
    }
    
    // 如果提示太长，截断它
    const maxChars = availableTokens * this.tokenEstimateRatio;
    return prompt.substring(0, maxChars) + 
      "... [提示内容过长已截断，请尽量使用简洁明了的提示]";
  }
}

// 导出单例实例
export const chatContextManager = new ChatContextManager();
export default chatContextManager; 