import React, { useState } from 'react';
import { Typography, Card, Divider } from 'antd';
import { OrderedListOutlined } from '@ant-design/icons';
import OutlineManager from '../../modules/outline/components/OutlineManager';
import '../../modules/outline/components/OutlineStyles.css';

const { Title, Paragraph } = Typography;

/**
 * 大纲管理页面
 */
const OutlinesPage: React.FC = () => {
  // 使用临时ID，实际使用时应该从当前选择的小说中获取
  const [selectedNovelId, setSelectedNovelId] = useState<string>('demo_novel_id');

  return (
    <div>
      <Title level={2}>大纲管理</Title>
      <Paragraph>在这里管理您小说的故事大纲和结构</Paragraph>
      
      <Divider />
      
      <Card>
        <OutlineManager novelId={selectedNovelId} />
      </Card>
    </div>
  );
};

export default OutlinesPage; 