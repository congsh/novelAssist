import { v4 as uuidv4 } from 'uuid';
import { 
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatMessage, 
  ChatMessageRole, 
  ChatSession 
} from '../types';
import { aiServiceManager } from './index';
import { AISettingsService } from './ai-settings-service';

/**
 * 聊天服务
 * 负责管理聊天会话和发送消息
 */
export class ChatService {
  private static instance: ChatService;
  private aiSettingsService: AISettingsService;
  private currentSession: ChatSession | null = null;
  private isStreaming: boolean = false;
  
  /**
   * 获取单例实例
   */
  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }
  
  private constructor() {
    this.aiSettingsService = AISettingsService.getInstance();
  }
  
  /**
   * 初始化聊天服务
   */
  async initialize(): Promise<boolean> {
    try {
      const settings = await this.aiSettingsService.loadSettings();
      const result = await aiServiceManager.initialize(settings);
      return result;
    } catch (error) {
      console.error('初始化聊天服务失败:', error);
      return false;
    }
  }
  
  /**
   * 创建新的聊天会话
   * @param title 会话标题
   * @param novelId 关联的小说ID
   */
  async createNewSession(title: string = '新对话', novelId?: string): Promise<ChatSession> {
    const settings = await this.aiSettingsService.loadSettings();
    
    const session: ChatSession = {
      id: uuidv4(),
      title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelId: settings.defaultModel,
      novelId
    };
    
    this.currentSession = session;
    await this.saveSession(session);
    
    return session;
  }
  
  /**
   * 加载聊天会话
   * @param sessionId 会话ID
   */
  async loadSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const session = await window.electron.invoke('ai:load-chat-session', sessionId);
      if (session) {
        this.currentSession = session;
      }
      return session;
    } catch (error) {
      console.error('加载聊天会话失败:', error);
      return null;
    }
  }
  
  /**
   * 保存聊天会话
   * @param session 要保存的会话
   */
  async saveSession(session: ChatSession): Promise<boolean> {
    try {
      await window.electron.invoke('ai:save-chat-session', session);
      return true;
    } catch (error) {
      console.error('保存聊天会话失败:', error);
      return false;
    }
  }
  
  /**
   * 获取所有聊天会话
   */
  async getAllSessions(): Promise<ChatSession[]> {
    try {
      return await window.electron.invoke('ai:get-all-chat-sessions');
    } catch (error) {
      console.error('获取所有聊天会话失败:', error);
      return [];
    }
  }
  
  /**
   * 删除聊天会话
   * @param sessionId 会话ID
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      if (this.currentSession?.id === sessionId) {
        this.currentSession = null;
      }
      
      await window.electron.invoke('ai:delete-chat-session', sessionId);
      return true;
    } catch (error) {
      console.error('删除聊天会话失败:', error);
      return false;
    }
  }
  
  /**
   * 添加用户消息
   * @param content 消息内容
   */
  async addUserMessage(content: string): Promise<ChatMessage> {
    if (!this.currentSession) {
      throw new Error('没有活动的聊天会话');
    }
    
    const message: ChatMessage = {
      id: uuidv4(),
      role: ChatMessageRole.USER,
      content,
      timestamp: Date.now(),
    };
    
    this.currentSession.messages.push(message);
    this.currentSession.updatedAt = Date.now();
    
    await this.saveSession(this.currentSession);
    
    return message;
  }
  
  /**
   * 添加系统消息
   * @param content 消息内容
   */
  async addSystemMessage(content: string): Promise<ChatMessage> {
    if (!this.currentSession) {
      throw new Error('没有活动的聊天会话');
    }
    
    const message: ChatMessage = {
      id: uuidv4(),
      role: ChatMessageRole.SYSTEM,
      content,
      timestamp: Date.now(),
    };
    
    this.currentSession.messages.push(message);
    this.currentSession.updatedAt = Date.now();
    
    await this.saveSession(this.currentSession);
    
    return message;
  }
  
  /**
   * 添加助手消息
   * @param content 消息内容
   */
  async addAssistantMessage(content: string): Promise<ChatMessage> {
    if (!this.currentSession) {
      throw new Error('没有活动的聊天会话');
    }
    
    const message: ChatMessage = {
      id: uuidv4(),
      role: ChatMessageRole.ASSISTANT,
      content,
      timestamp: Date.now(),
    };
    
    this.currentSession.messages.push(message);
    this.currentSession.updatedAt = Date.now();
    
    await this.saveSession(this.currentSession);
    
    return message;
  }
  
  /**
   * 发送消息到AI并获取响应
   * @param content 用户消息内容
   * @param onUpdate 流式响应更新回调
   */
  async sendMessage(
    content: string, 
    onUpdate?: (message: ChatMessage) => void
  ): Promise<ChatCompletionResponse> {
    if (this.isStreaming) {
      throw new Error('已有正在进行的消息流传输');
    }
    
    if (!this.currentSession) {
      await this.createNewSession();
    }
    
    // 添加用户消息
    await this.addUserMessage(content);
    
    const settings = await this.aiSettingsService.loadSettings();
    
    // 创建请求
    const request: ChatCompletionRequest = {
      modelId: this.currentSession!.modelId || settings.defaultModel,
      messages: this.currentSession!.messages,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
    };
    
    let response: ChatCompletionResponse;
    
    try {
      this.isStreaming = true;
      
      if (onUpdate) {
        // 流式响应
        response = await aiServiceManager.createChatCompletionStream(
          request,
          (partialResponse) => {
            onUpdate(partialResponse);
          }
        );
      } else {
        // 普通响应
        response = await aiServiceManager.createChatCompletion(request);
      }
      
      // 将AI响应添加到会话
      this.currentSession!.messages.push(response.message);
      this.currentSession!.updatedAt = Date.now();
      
      await this.saveSession(this.currentSession!);
      
      return response;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    } finally {
      this.isStreaming = false;
    }
  }
  
  /**
   * 取消正在进行的请求
   */
  cancelRequest(): void {
    if (this.isStreaming) {
      aiServiceManager.cancelRequest();
      this.isStreaming = false;
    }
  }
  
  /**
   * 获取当前会话
   */
  getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }
  
  /**
   * 更新会话标题
   * @param sessionId 会话ID
   * @param title 新标题
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<boolean> {
    try {
      if (this.currentSession?.id === sessionId) {
        this.currentSession.title = title;
        this.currentSession.updatedAt = Date.now();
        await this.saveSession(this.currentSession);
      } else {
        const session = await this.loadSession(sessionId);
        if (session) {
          session.title = title;
          session.updatedAt = Date.now();
          await this.saveSession(session);
        }
      }
      return true;
    } catch (error) {
      console.error('更新会话标题失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const chatService = ChatService.getInstance(); 