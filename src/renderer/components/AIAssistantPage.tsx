import React from 'react';
import { Typography, Card, Alert, Input, Button, List, Avatar, Divider } from 'antd';
import { RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * AI助手页面
 */
const AIAssistantPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>AI助手</Title>
      <Paragraph>AI助手可以帮助您进行创作，提供灵感和建议</Paragraph>
      
      <Alert
        message="功能开发中"
        description="AI助手功能正在开发中，敬请期待！"
        type="info"
        showIcon
        icon={<RobotOutlined />}
        style={{ marginBottom: 16 }}
      />
      
      <Card style={{ marginBottom: 16 }}>
        <div style={{ height: 400, overflow: 'auto', marginBottom: 16, padding: 10, background: '#f9f9f9', borderRadius: 4 }}>
          <List
            itemLayout="horizontal"
            dataSource={[
              {
                avatar: <UserOutlined />,
                title: '您',
                content: '你好，AI助手！',
                time: '刚刚',
                type: 'user'
              },
              {
                avatar: <RobotOutlined />,
                title: 'AI助手',
                content: '您好！我是您的AI创作助手。我可以帮助您进行小说创作，提供灵感、建议和内容生成。请告诉我您需要什么帮助？',
                time: '刚刚',
                type: 'ai'
              }
            ]}
            renderItem={(item) => (
              <List.Item style={{ 
                textAlign: item.type === 'user' ? 'right' : 'left',
                padding: '8px 0'
              }}>
                <List.Item.Meta
                  avatar={item.type === 'user' ? null : <Avatar icon={item.avatar} />}
                  title={<div style={{ color: item.type === 'user' ? '#1890ff' : '#000' }}>{item.title}</div>}
                  description={
                    <Card 
                      size="small" 
                      style={{ 
                        display: 'inline-block',
                        maxWidth: '80%',
                        background: item.type === 'user' ? '#e6f7ff' : '#fff'
                      }}
                    >
                      {item.content}
                    </Card>
                  }
                />
                {item.type === 'user' && <Avatar icon={item.avatar} style={{ marginLeft: 8 }} />}
              </List.Item>
            )}
          />
        </div>
        
        <Divider />
        
        <div>
          <TextArea
            placeholder="输入您的问题或请求..."
            autoSize={{ minRows: 2, maxRows: 6 }}
            style={{ marginBottom: 16 }}
            disabled
          />
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<SendOutlined />} disabled>
              发送
            </Button>
          </div>
        </div>
      </Card>
      
      <Card title="常用提示词" size="small">
        <Button style={{ margin: '0 8px 8px 0' }} disabled>生成人物描述</Button>
        <Button style={{ margin: '0 8px 8px 0' }} disabled>润色文本</Button>
        <Button style={{ margin: '0 8px 8px 0' }} disabled>扩展情节</Button>
        <Button style={{ margin: '0 8px 8px 0' }} disabled>创建对话</Button>
        <Button style={{ margin: '0 8px 8px 0' }} disabled>描述场景</Button>
      </Card>
    </div>
  );
};

export default AIAssistantPage; 