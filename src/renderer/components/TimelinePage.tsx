import React from 'react';
import { Typography, Card, Alert, Button } from 'antd';
import { FieldTimeOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/**
 * 时间线页面
 */
const TimelinePage: React.FC = () => {
  return (
    <div>
      <Title level={2}>时间线</Title>
      <Paragraph>在这里管理您小说中的时间线和事件顺序</Paragraph>
      
      <Card style={{ marginBottom: 16 }}>
        <Alert
          message="功能开发中"
          description="时间线功能正在开发中，敬请期待！"
          type="info"
          showIcon
          icon={<FieldTimeOutlined />}
          style={{ marginBottom: 16 }}
        />
        <Paragraph>
          时间线功能将支持：
        </Paragraph>
        <ul>
          <li>创建和管理故事时间线</li>
          <li>添加和组织关键事件</li>
          <li>可视化时间轴展示</li>
          <li>关联人物和地点</li>
          <li>检测时间冲突</li>
        </ul>
        <Button type="primary" disabled>开始创建时间线</Button>
      </Card>
    </div>
  );
};

export default TimelinePage; 