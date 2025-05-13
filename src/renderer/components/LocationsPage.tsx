import React from 'react';
import { Typography, Card, Alert, Button } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/**
 * 地点管理页面
 */
const LocationsPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>地点管理</Title>
      <Paragraph>在这里管理您小说中的所有地点场景</Paragraph>
      
      <Card style={{ marginBottom: 16 }}>
        <Alert
          message="功能开发中"
          description="地点管理功能正在开发中，敬请期待！"
          type="info"
          showIcon
          icon={<EnvironmentOutlined />}
          style={{ marginBottom: 16 }}
        />
        <Paragraph>
          地点管理功能将支持：
        </Paragraph>
        <ul>
          <li>创建和管理地点档案</li>
          <li>设置地点描述、重要性、相关信息等</li>
          <li>上传地点图片</li>
          <li>可视化地图功能（可选）</li>
          <li>跟踪地点在各章节中的出现</li>
        </ul>
        <Button type="primary" disabled>开始创建地点</Button>
      </Card>
    </div>
  );
};

export default LocationsPage; 