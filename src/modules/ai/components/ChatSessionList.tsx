import React, { useState } from 'react';
import { List, Button, Dropdown, Menu, Input, Modal, message } from 'antd';
import { 
  PlusOutlined, 
  MessageOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  MoreOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { ChatSession } from '../types';
import { chatService } from '../services/chat-service';

interface ChatSessionListProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionCreate: () => void;
  onSessionsUpdate: () => void;
}

/**
 * 聊天会话列表组件
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
          
          // 如果删除的是当前会话，创建一个新会话
          if (isCurrentSession) {
            // 先更新会话列表，然后再创建新会话，避免重复创建
            onSessionsUpdate();
          } else {
            // 否则只更新会话列表
            onSessionsUpdate();
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
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={onSessionCreate}
          style={{ width: '100%' }}
        >
          新建会话
        </Button>
      </div>
      
      <div style={{ flex: 1, overflow: 'auto' }}>
        <List
          itemLayout="horizontal"
          dataSource={sessions}
          renderItem={session => (
            <List.Item
              key={session.id}
              style={{ 
                cursor: 'pointer',
                backgroundColor: currentSessionId === session.id ? '#e6f7ff' : 'transparent',
                padding: '8px 12px',
                borderRadius: '4px'
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
                >
                  <Button 
                    type="text" 
                    icon={<MoreOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              ]}
            >
              <List.Item.Meta
                avatar={<MessageOutlined />}
                title={session.title}
                description={formatDate(session.updatedAt)}
              />
            </List.Item>
          )}
        />
      </div>
      
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
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default ChatSessionList; 