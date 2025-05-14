import React, { useState } from 'react';
import { Typography } from 'antd';
import TimelineManager from '../../modules/timeline/components/TimelineManager';

const { Title, Paragraph } = Typography;

/**
 * 时间线页面
 */
const TimelinePage: React.FC = () => {
  const [activeNovelId, setActiveNovelId] = useState<string>('default-novel-id'); // 实际应从全局状态或路由参数获取
  
  return (
    <div>
      <Title level={2}>时间线</Title>
      <Paragraph>在这里管理您小说中的时间线和事件顺序</Paragraph>
      
      <TimelineManager novelId={activeNovelId} />
    </div>
  );
};

export default TimelinePage; 