import React, { useState, useEffect } from 'react';
import { Tabs, Card, message } from 'antd';
import { EnvironmentOutlined, OrderedListOutlined } from '@ant-design/icons';
import LocationManager from '../../modules/location/components/LocationManager';
import OutlineManager from '../../modules/outline/components/OutlineManager';
import '../../modules/location/components/LocationStyles.css';
import '../../modules/outline/components/OutlineStyles.css';

const { TabPane } = Tabs;

interface CreativeToolsProps {
  novelId?: string;
}

/**
 * 创作工具页面组件，整合地点和大纲管理
 */
const CreativeTools: React.FC<CreativeToolsProps> = ({ novelId }) => {
  const [activeTab, setActiveTab] = useState('locations');
  const [currentNovelId, setCurrentNovelId] = useState<string>('');
  
  // 检查是否有小说ID
  useEffect(() => {
    if (!novelId) {
      message.warning('请先选择一个小说');
    } else {
      setCurrentNovelId(novelId);
    }
  }, [novelId]);
  
  // 处理标签页切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };
  
  return (
    <div className="creative-tools">
      <Card title="创作辅助工具" bordered={false}>
        {!currentNovelId ? (
          <div className="no-novel-selected">
            <p>请先选择一个小说进行管理</p>
          </div>
        ) : (
          <Tabs 
            activeKey={activeTab} 
            onChange={handleTabChange}
            type="card"
          >
            <TabPane 
              tab={
                <span>
                  <EnvironmentOutlined />
                  地点管理
                </span>
              } 
              key="locations"
            >
              <LocationManager novelId={currentNovelId} />
            </TabPane>
            <TabPane 
              tab={
                <span>
                  <OrderedListOutlined />
                  大纲管理
                </span>
              } 
              key="outlines"
            >
              <OutlineManager novelId={currentNovelId} />
            </TabPane>
          </Tabs>
        )}
      </Card>
    </div>
  );
};

export default CreativeTools; 