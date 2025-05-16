import React, { useState } from 'react';
import { List, Button, Dropdown, Input, Modal, message, Empty, Tooltip, Typography } from 'antd';
import { 
  PlusOutlined, 
  MessageOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  MoreOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { ChatSession } from '../types';
import { chatService } from '../services/chat-service';

const { Text } = Typography;

interface ChatSessionListProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionCreate: () => void;
  onSessionsUpdate: () => void;
}

/**
 * 聊天会话列表组件 - 优化版
 */
const ChatSessionList: React.FC<ChatSessionListProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionCreate,
  onSessionsUpdate
}) => {
  const [editingSession, setEditingSession] = useState<ChatSession | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // 重命名会话
  const handleRename = (session: ChatSession) => {
    setEditingSession(session);
    setNewTitle(session.title);
  };

  // 保存重命名
  const handleSaveRename = async () => {
    if (!editingSession || !newTitle.trim()) return;
    
    try {
      await chatService.updateSessionTitle(editingSession.id, newTitle);
      message.success('会话已重命名');
      setEditingSession(null);
      onSessionsUpdate();
    } catch (error) {
      console.error('重命名会话失败:', error);
      message.error('重命名会话失败');
    }
  };

  // 删除会话
  const handleDelete = (session: ChatSession) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除会话 "${session.title}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const isCurrentSession = currentSessionId === session.id;
          await chatService.deleteSession(session.id);
          message.success('会话已删除');
          
          onSessionsUpdate();
          
          // 如果删除的是当前会话，创建一个新会话
          if (isCurrentSession) {
            onSessionCreate();
          }
        } catch (error) {
          console.error('删除会话失败:', error);
          message.error('删除会话失败');
        }
      }
    });
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    
    // 如果是今天
    if (now.toDateString() === date.toDateString()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 如果是昨天
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === date.toDateString()) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // 如果是今年
    if (now.getFullYear() === date.getFullYear()) {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + 
             ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 其他日期
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit'
    });
  };

  // 获取会话预览内容
  const getSessionPreview = (session: ChatSession) => {
    if (!session.messages || session.messages.length === 0) {
      return '空会话';
    }
    
    const lastMessage = session.messages[session.messages.length - 1];
    const content = lastMessage.content.trim();
    
    // 截取前30个字符
    return content.length > 30 ? content.substring(0, 30) + '...' : content;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {sessions.length === 0 ? (
        <Empty 
          description="暂无会话记录" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: '40px 0' }}
        />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={sessions}
          className="chat-session-list"
          style={{ flex: 1, overflow: 'auto' }}
          renderItem={session => (
            <List.Item
              key={session.id}
              style={{ 
                cursor: 'pointer',
                backgroundColor: currentSessionId === session.id ? '#e6f7ff' : 'transparent',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '4px',
                transition: 'background-color 0.3s'
              }}
              onClick={() => onSessionSelect(session.id)}
              actions={[
                <Dropdown 
                  menu={{
                    items: [
                      {
                        key: "rename",
                        icon: <EditOutlined />,
                        label: "重命名",
                        onClick: (e) => {
                          e.domEvent.stopPropagation();
                          handleRename(session);
                        }
                      },
                      {
                        key: "delete",
                        icon: <DeleteOutlined />,
                        label: "删除",
                        danger: true,
                        onClick: (e) => {
                          e.domEvent.stopPropagation();
                          handleDelete(session);
                        }
                      }
                    ]
                  }}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <Button 
                    type="text" 
                    size="small"
                    icon={<MoreOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <MessageOutlined style={{ 
                    color: currentSessionId === session.id ? '#1890ff' : '#8c8c8c',
                    fontSize: '16px' 
                  }} />
                }
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text 
                      strong={currentSessionId === session.id}
                      ellipsis={{ tooltip: session.title }}
                      style={{ maxWidth: '70%' }}
                    >
                      {session.title}
                    </Text>
                    <Tooltip title={new Date(session.updatedAt).toLocaleString('zh-CN')}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <ClockCircleOutlined style={{ marginRight: '4px', fontSize: '10px' }} />
                        {formatDate(session.updatedAt)}
                      </Text>
                    </Tooltip>
                  </div>
                }
                description={
                  <Text type="secondary" ellipsis style={{ fontSize: '12px' }}>
                    {getSessionPreview(session)}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
      
      <Modal
        title="重命名会话"
        open={!!editingSession}
        onOk={handleSaveRename}
        onCancel={() => setEditingSession(null)}
        okText="保存"
        cancelText="取消"
      >
        <Input
          placeholder="输入新的会话标题"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          maxLength={50}
          showCount
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default ChatSessionList; 