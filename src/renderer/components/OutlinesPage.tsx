import React from 'react';
import { Typography, Card, Alert, Button } from 'antd';
import { OrderedListOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/**
 * 大纲管理页面
 */
const OutlinesPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>大纲管理</Title>
      <Paragraph>在这里管理您小说的故事大纲和结构</Paragraph>
      
      <Card style={{ marginBottom: 16 }}>
        <Alert
          message="功能开发中"
          description="大纲管理功能正在开发中，敬请期待！"
          type="info"
          showIcon
          icon={<OrderedListOutlined />}
          style={{ marginBottom: 16 }}
        />
        <Paragraph>
          大纲管理功能将支持：
        </Paragraph>
        <ul>
          <li>创建和管理故事大纲</li>
          <li>树形结构组织故事情节</li>
          <li>设置情节点、转折点和关键事件</li>
          <li>关联人物和地点</li>
          <li>多种大纲模板</li>
        </ul>
        <Button type="primary" disabled>开始创建大纲</Button>
      </Card>
    </div>
  );
};

export default OutlinesPage; 