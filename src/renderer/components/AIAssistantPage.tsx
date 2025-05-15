import React, { useState, useEffect, useRef } from 'react';
import { Typography, Card, Input, Button, List, Avatar, Divider, Tabs, Spin, message, Row, Col } from 'antd';
import { 
  RobotOutlined, 
  SendOutlined, 
  UserOutlined, 
  SettingOutlined, 
  MessageOutlined,
  StopOutlined
} from '@ant-design/icons';
import { chatService } from '../../modules/ai/services/chat-service';
import AISettings from '../../modules/ai/components/AISettings';
import ChatSessionList from '../../modules/ai/components/ChatSessionList';
import CreativePrompts from '../../modules/ai/components/CreativePrompts';
import { ChatMessage, ChatMessageRole, ChatSession, AIScenario } from '../../modules/ai/types';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * AI助手页面
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

  // 初始化聊天服务
  useEffect(() => {
    const initialize = async () => {
      try {
        await chatService.initialize();
        await loadAllSessions();
      } catch (error) {
        console.error('初始化聊天服务失败:', error);
        
        // 检查是否是API密钥缺失错误
        if (error instanceof Error && error.message.includes('缺少OpenAI API密钥')) {
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
      setSessions(allSessions);
      
      // 如果有会话，加载最近的一个
      if (allSessions.length > 0) {
        const latestSession = allSessions.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        await loadSession(latestSession.id);
      } else {
        // 否则创建新会话
        if (!currentSession) {
          await createNewSession();
        }
      }
    } catch (error) {
      console.error('加载会话失败:', error);
      message.error('加载会话失败');
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
      setCurrentSession(newSession);
      setMessages([]);
      setSessions(prev => [newSession, ...prev]);
      return newSession;
    } catch (error) {
      console.error('创建新会话失败:', error);
      message.error('创建新会话失败');
      return null;
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
    }
  };

  // 使用提示词
  const usePrompt = (promptText: string) => {
    setInputValue(promptText);
    // 切换到聊天标签页
    setActiveTab('chat');
  };

  // 取消生成
  const handleCancel = () => {
    chatService.cancelRequest();
    setLoading(false);
  };

  // Tabs配置
  const tabItems = [
    {
      key: 'chat',
      label: <><MessageOutlined /> 聊天</>,
      children: (
        <Row gutter={16} style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
          <Col xs={24} sm={24} md={6} lg={6} xl={5} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Card title="会话列表" size="small" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
            <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflow: 'auto', marginBottom: 16, padding: 10, background: '#f9f9f9', borderRadius: 4 }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '100px 0', color: '#999' }}>
                    <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>您好！我是您的AI创作助手。我可以帮助您进行小说创作，提供灵感、建议和内容生成。</p>
                    <p>请在下方输入您的问题或请求。</p>
                  </div>
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={messages}
                    renderItem={(item) => {
                      const isUser = item.role === ChatMessageRole.USER;
                      return (
                        <List.Item style={{ 
                          textAlign: isUser ? 'right' : 'left',
                          padding: '8px 0'
                        }}>
                          <List.Item.Meta
                            avatar={!isUser && <Avatar icon={<RobotOutlined />} />}
                            title={<div style={{ color: isUser ? '#1890ff' : '#000' }}>
                              {isUser ? '您' : 'AI助手'}
                            </div>}
                            description={
                              <Card 
                                size="small" 
                                style={{ 
                                  display: 'inline-block',
                                  maxWidth: '80%',
                                  background: isUser ? '#e6f7ff' : '#fff'
                                }}
                              >
                                {item.content}
                              </Card>
                            }
                          />
                          {isUser && <Avatar icon={<UserOutlined />} style={{ marginLeft: 8 }} />}
                        </List.Item>
                      );
                    }}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <Divider style={{ margin: '8px 0' }} />
              
              <div>
                <TextArea
                  placeholder="输入您的问题或请求..."
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  style={{ marginBottom: 16 }}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading}
                />
                <div style={{ textAlign: 'right' }}>
                  {loading ? (
                    <Button 
                      danger
                      icon={<StopOutlined />} 
                      onClick={handleCancel}
                      style={{ marginRight: 8 }}
                    >
                      取消生成
                    </Button>
                  ) : null}
                  <Button 
                    type="primary" 
                    icon={<SendOutlined />} 
                    onClick={handleSend}
                    loading={loading}
                    disabled={!inputValue.trim()}
                  >
                    发送
                  </Button>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'prompts',
      label: '提示词库',
      children: <div style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}><CreativePrompts onUsePrompt={usePrompt} /></div>
    },
    {
      key: 'settings',
      label: <><SettingOutlined /> AI设置</>,
      children: <div style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}><AISettings /></div>
    }
  ];

  if (initializing) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>正在初始化AI助手...</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div>
        <Title level={2}>AI助手</Title>
        <Paragraph>AI助手可以帮助您进行创作，提供灵感和建议</Paragraph>
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={tabItems} 
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }} 
          className="ai-assistant-tabs"
        />
      </div>
    </div>
  );
};

export default AIAssistantPage; 