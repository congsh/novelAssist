import React, { useState } from 'react';
import { Typography, Card, Divider } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import LocationManager from '../../modules/location/components/LocationManager';
import '../../modules/location/components/LocationStyles.css';

const { Title, Paragraph } = Typography;

/**
 * 地点管理页面
 */
const LocationsPage: React.FC = () => {
  // 使用临时ID，实际使用时应该从当前选择的小说中获取
  const [selectedNovelId, setSelectedNovelId] = useState<string>('demo_novel_id');

  return (
    <div>
      <Title level={2}>地点管理</Title>
      <Paragraph>在这里管理您小说中的所有地点场景</Paragraph>
      
      <Divider />
      
      <Card>
        <LocationManager novelId={selectedNovelId} />
      </Card>
    </div>
  );
};

export default LocationsPage; 