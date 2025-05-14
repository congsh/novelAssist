import React, { useState, useEffect } from 'react';
import { Tabs, Card, message, Alert, App } from 'antd';
import { EnvironmentOutlined, OrderedListOutlined, UserOutlined } from '@ant-design/icons';
import LocationManager from '../../modules/location/components/LocationManager';
import OutlineManager from '../../modules/outline/components/OutlineManager';
import '../../modules/location/components/LocationStyles.css';
import '../../modules/outline/components/OutlineStyles.css';

interface CreativeToolsProps {
  novelId?: string;
}

/**
 * 创作工具页面组件，整合人物、地点和大纲管理
 */
const CreativeTools: React.FC<CreativeToolsProps> = ({ novelId }) => {
  const [activeTab, setActiveTab] = useState('locations');
  const [currentNovelId, setCurrentNovelId] = useState<string>('');
  const { message: appMessage } = App.useApp();
  
  // 功能完成状态
  const completedFeatures = {
    characters: false, // 人物管理未完成
    locations: true,   // 地点管理已完成
    outlines: true     // 大纲管理已完成
  };
  
  // 检查是否有小说ID
  useEffect(() => {
    if (!novelId) {
      appMessage.warning('请先选择一个小说');
    } else {
      setCurrentNovelId(novelId);
    }
  }, [novelId]);
  
  // 处理标签页切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // 定义Tab项
  const tabItems = [
    {
      key: 'characters',
      label: (
        <span>
          <UserOutlined />
          人物管理
        </span>
      ),
      disabled: !completedFeatures.characters,
      children: completedFeatures.characters ? (
        <div>人物管理组件将在此显示</div>
      ) : (
        <Alert
          message="功能开发中"
          description="人物管理功能正在开发中，敬请期待！"
          type="info"
          showIcon
          icon={<UserOutlined />}
        />
      )
    },
    {
      key: 'locations',
      label: (
        <span>
          <EnvironmentOutlined />
          地点管理
        </span>
      ),
      disabled: !completedFeatures.locations,
      children: <LocationManager novelId={currentNovelId} />
    },
    {
      key: 'outlines',
      label: (
        <span>
          <OrderedListOutlined />
          大纲管理
        </span>
      ),
      disabled: !completedFeatures.outlines,
      children: <OutlineManager novelId={currentNovelId} />
    }
  ];
  
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
            items={tabItems}
          />
        )}
      </Card>
    </div>
  );
};

export default CreativeTools; 