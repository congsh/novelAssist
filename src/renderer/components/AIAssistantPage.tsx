import React, { useState, useEffect, useRef } from 'react';
import { Typography, Card, Input, Button, List, Avatar, Divider, Tabs, Spin, message, Row, Col, Empty } from 'antd';
import { 
  RobotOutlined, 
  SendOutlined, 
  UserOutlined, 
  SettingOutlined, 
  MessageOutlined,
  StopOutlined,
  PlusOutlined,
  LoadingOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { chatService } from '../../modules/ai/services/chat-service';
import AISettings from '../../modules/ai/components/AISettings';
import ChatSessionList from '../../modules/ai/components/ChatSessionList';
import CreativePrompts from '../../modules/ai/components/CreativePrompts';
import { ChatMessage, ChatMessageRole, ChatSession, AIScenario } from '../../modules/ai/types';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

/**
 * AI助手页面 - 优化版
 */
const AIAssistantPage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const inputRef = useRef<any>(null);

  // 初始化聊天服务
  useEffect(() => {
    const initialize = async () => {
      try {
        // 先检查AI是否已配置
        const aiSettingsService = (await import('../../modules/ai/services/ai-settings-service')).AISettingsService.getInstance();
        const settings = await aiSettingsService.loadSettings();
        const isConfigured = await aiSettingsService.hasConfiguredAI(settings);
        
        if (!isConfigured) {
          // 如果未配置，直接显示设置页面
          console.log('AI服务未配置，显示设置页面');
          message.info('请先配置AI设置', 3);
          setActiveTab('settings');
          setInitializing(false);
          return;
        }
        
        // 如果已配置，初始化聊天服务
        const initResult = await chatService.initialize();
        if (!initResult) {
          console.warn('聊天服务初始化失败，显示设置页面');
          message.warning('AI服务初始化失败，请检查设置', 3);
          setActiveTab('settings');
          setInitializing(false);
          return;
        }
        
        await loadAllSessions();
      } catch (error) {
        console.error('初始化聊天服务失败:', error);
        
        // 检查是否是API密钥缺失错误
        if (error instanceof Error && 
            (error.message.includes('缺少OpenAI API密钥') || 
             error.message.includes('AI服务未配置') ||
             error.message.includes('未找到提供商'))) {
          message.info('请先配置AI设置', 3);
          // 切换到设置标签页
          setActiveTab('settings');
        } else {
          message.error('初始化聊天服务失败');
        }
      } finally {
        setInitializing(false);
      }
    };
    
    initialize();
  }, []);

  // 加载所有会话
  const loadAllSessions = async () => {
    try {
      const allSessions = await chatService.getAllSessions();
      setSessions(allSessions || []);
      
      // 如果有会话，加载最近的一个
      if (allSessions && allSessions.length > 0) {
        const latestSession = allSessions.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        try {
          await loadSession(latestSession.id);
        } catch (error) {
          console.error('加载最新会话失败，创建新会话:', error);
          await createNewSession();
        }
      } else {
        // 否则创建新会话
        if (!currentSession) {
          await createNewSession();
        }
      }
    } catch (error) {
      console.error('加载会话失败，创建新会话:', error);
      setSessions([]);
      // 创建新会话而不是显示错误
      if (!currentSession) {
        await createNewSession();
      }
    }
  };

  // 滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 创建新会话
  const createNewSession = async () => {
    try {
      const newSession = await chatService.createNewSession();
      if (newSession) {
        setCurrentSession(newSession);
        setMessages([]);
        setSessions(prev => [newSession, ...prev]);
        // 聚焦输入框
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
        return newSession;
      } else {
        // 如果无法创建会话，至少提供一个空的会话体验
        const emptySession = {
          id: 'local-' + Date.now(),
          title: '新对话',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          modelId: 'local',
          providerId: 'local'
        };
        setCurrentSession(emptySession);
        setMessages([]);
        return emptySession;
      }
    } catch (error) {
      console.error('创建新会话失败，使用临时会话:', error);
      // 创建一个本地临时会话，这样即使创建失败也能有基本UI
      const emptySession = {
        id: 'local-' + Date.now(),
        title: '新对话',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelId: 'local',
        providerId: 'local'
      };
      setCurrentSession(emptySession);
      setMessages([]);
      return emptySession;
    }
  };

  // 加载会话
  const loadSession = async (sessionId: string) => {
    try {
      const session = await chatService.loadSession(sessionId);
      if (session) {
        setCurrentSession(session);
        setMessages(session.messages);
      }
      return session;
    } catch (error) {
      console.error('加载会话失败:', error);
      message.error('加载会话失败');
      return null;
    }
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;
    
    try {
      setLoading(true);
      
      // 保存当前输入值，然后清空输入框
      const messageContent = inputValue;
      setInputValue('');
      
      // 添加用户消息到界面
      const userMessage: ChatMessage = {
        id: '',
        role: ChatMessageRole.USER,
        content: messageContent,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // 发送消息到AI并获取响应，使用CHAT场景
      await chatService.sendMessage(
        messageContent,
        (partialResponse) => {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === ChatMessageRole.ASSISTANT) {
              return [...prev.slice(0, -1), partialResponse];
            } else {
              return [...prev, partialResponse];
            }
          });
        },
        AIScenario.CHAT
      );
      
      // 更新会话列表
      const updatedSession = chatService.getCurrentSession();
      if (updatedSession) {
        setCurrentSession(updatedSession);
        setSessions(prev => 
          prev.map(s => s.id === updatedSession.id ? updatedSession : s)
        );
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败');
    } finally {
      setLoading(false);
      // 聚焦输入框，方便继续输入
      inputRef.current?.focus();
    }
  };

  // 使用提示词
  const usePrompt = (promptText: string) => {
    setInputValue(promptText);
    // 切换到聊天标签页
    setActiveTab('chat');
    // 聚焦输入框
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // 取消生成
  const handleCancel = () => {
    chatService.cancelRequest();
    setLoading(false);
  };

  // 处理按键事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 渲染消息列表
  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description="开始一个新的对话吧" 
          style={{ margin: '100px 0' }}
        />
      );
    }
    
    return (
      <List
        itemLayout="horizontal"
        dataSource={messages}
        renderItem={message => (
          <List.Item style={{ padding: '12px 0' }}>
            <List.Item.Meta
              avatar={
                <Avatar 
                  icon={message.role === ChatMessageRole.USER ? <UserOutlined /> : <RobotOutlined />} 
                  style={{ 
                    backgroundColor: message.role === ChatMessageRole.USER ? '#1890ff' : '#52c41a'
                  }}
                />
              }
              title={message.role === ChatMessageRole.USER ? '你' : 'AI助手'}
              description={
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  // Tabs配置
  const tabItems = [
    {
      key: 'chat',
      label: <><MessageOutlined /> 聊天</>,
      children: (
        <Row gutter={16} style={{ height: 'calc(100vh - 180px)', overflow: 'hidden' }}>
          <Col xs={24} sm={24} md={6} lg={6} xl={5} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>会话列表</span>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    size="small"
                    onClick={createNewSession}
                  >
                    新会话
                  </Button>
                </div>
              } 
              size="small" 
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              bodyStyle={{ flex: 1, overflow: 'auto', padding: '8px' }}
            >
              <ChatSessionList 
                sessions={sessions}
                currentSessionId={currentSession?.id || null}
                onSessionSelect={loadSession}
                onSessionCreate={createNewSession}
                onSessionsUpdate={loadAllSessions}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={24} md={18} lg={18} xl={19} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Card 
              title={currentSession?.title || '新对话'} 
              bordered={false}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              bodyStyle={{ flex: 1, overflow: 'auto', padding: '8px 16px' }}
            >
              {initializing ? (
                <div style={{ textAlign: 'center', margin: '100px 0' }}>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                  <p style={{ marginTop: 16 }}>正在初始化AI服务...</p>
                  </div>
                ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, overflow: 'auto', paddingBottom: '16px' }}>
                    {renderMessages()}
                <div ref={messagesEndRef} />
              </div>
              
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-end' }}>
                <TextArea
                      ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="输入消息，按Enter发送，Shift+Enter换行"
                      autoSize={{ minRows: 1, maxRows: 6 }}
                      style={{ flex: 1 }}
                      disabled={loading || initializing}
                />
                    <div style={{ marginLeft: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {loading ? (
                    <Button 
                      danger
                      icon={<StopOutlined />} 
                      onClick={handleCancel}
                    >
                          停止
                    </Button>
                      ) : (
                  <Button 
                    type="primary" 
                    icon={<SendOutlined />} 
                    onClick={handleSend}
                          disabled={!inputValue.trim() || initializing}
                  >
                    发送
                  </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'prompts',
      label: <><FileTextOutlined /> 提示词</>,
      children: <CreativePrompts onUsePrompt={usePrompt} />
    },
    {
      key: 'settings',
      label: <><SettingOutlined /> 设置</>,
      children: <AISettings />
    }
  ];

  return (
    <div style={{ height: 'calc(100vh - 64px)', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        tabBarStyle={{ marginBottom: '8px' }}
          items={tabItems} 
        />
    </div>
  );
};

export default AIAssistantPage; 