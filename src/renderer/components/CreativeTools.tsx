import React, { useState, useEffect } from 'react';
import { Tabs, Card, message, Alert } from 'antd';
import { EnvironmentOutlined, OrderedListOutlined, UserOutlined } from '@ant-design/icons';
import LocationManager from '../../modules/location/components/LocationManager';
import OutlineManager from '../../modules/outline/components/OutlineManager';
import '../../modules/location/components/LocationStyles.css';
import '../../modules/outline/components/OutlineStyles.css';

const { TabPane } = Tabs;

interface CreativeToolsProps {
  novelId?: string;
}

/**
 * 创作工具页面组件，整合人物、地点和大纲管理
 */
const CreativeTools: React.FC<CreativeToolsProps> = ({ novelId }) => {
  const [activeTab, setActiveTab] = useState('locations');
  const [currentNovelId, setCurrentNovelId] = useState<string>('');
  
  // 功能完成状态
  const completedFeatures = {
    characters: false, // 人物管理未完成
    locations: true,   // 地点管理已完成
    outlines: true     // 大纲管理已完成
  };
  
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
                  <UserOutlined />
                  人物管理
                </span>
              } 
              key="characters"
              disabled={!completedFeatures.characters}
            >
              {completedFeatures.characters ? (
                <div>人物管理组件将在此显示</div>
              ) : (
                <Alert
                  message="功能开发中"
                  description="人物管理功能正在开发中，敬请期待！"
                  type="info"
                  showIcon
                  icon={<UserOutlined />}
                />
              )}
            </TabPane>
            <TabPane 
              tab={
                <span>
                  <EnvironmentOutlined />
                  地点管理
                </span>
              } 
              key="locations"
              disabled={!completedFeatures.locations}
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
              disabled={!completedFeatures.outlines}
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