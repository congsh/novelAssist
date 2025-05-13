import React from 'react';
import { Typography, Card, Alert, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/**
 * 人物管理页面
 */
const CharactersPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>人物管理</Title>
      <Paragraph>在这里管理您小说中的所有人物角色</Paragraph>
      
      <Card style={{ marginBottom: 16 }}>
        <Alert
          message="功能开发中"
          description="人物管理功能正在开发中，敬请期待！"
          type="info"
          showIcon
          icon={<UserOutlined />}
          style={{ marginBottom: 16 }}
        />
        <Paragraph>
          人物管理功能将支持：
        </Paragraph>
        <ul>
          <li>创建和管理人物档案</li>
          <li>设置人物基本信息、性格、背景故事等</li>
          <li>上传人物形象</li>
          <li>建立人物关系图谱</li>
          <li>跟踪人物在各章节中的出现</li>
        </ul>
        <Button type="primary" disabled>开始创建人物</Button>
      </Card>
    </div>
  );
};

export default CharactersPage; 