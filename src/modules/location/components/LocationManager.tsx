import React, { useState } from 'react';
import { Tabs, Card, Drawer } from 'antd';
import LocationList from './LocationList';
import LocationMap from './LocationMap';
import LocationForm from './LocationForm';
import { Location } from '../../../shared/types/location';

const { TabPane } = Tabs;

interface LocationManagerProps {
  novelId: string;
}

/**
 * 地点管理器组件
 */
const LocationManager: React.FC<LocationManagerProps> = ({ novelId }) => {
  const [activeKey, setActiveKey] = useState<string>('list');
  const [formVisible, setFormVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  
  // 处理添加地点
  const handleAddLocation = () => {
    setCurrentLocation(null);
    setFormVisible(true);
  };
  
  // 处理编辑地点
  const handleEditLocation = (location: Location) => {
    setCurrentLocation(location);
    setFormVisible(true);
  };
  
  // 处理表单成功提交
  const handleFormSuccess = () => {
    setFormVisible(false);
  };
  
  // 处理表单取消
  const handleFormCancel = () => {
    setFormVisible(false);
  };

  return (
    <Card>
      <Tabs activeKey={activeKey} onChange={setActiveKey}>
        <TabPane tab="地点列表" key="list">
          <LocationList 
            novelId={novelId}
            onAddLocation={handleAddLocation}
            onEditLocation={handleEditLocation}
          />
        </TabPane>
        <TabPane tab="地点地图" key="map">
          <LocationMap novelId={novelId} />
        </TabPane>
      </Tabs>
      
      <Drawer
        title={currentLocation ? '编辑地点' : '添加地点'}
        placement="right"
        width={520}
        onClose={handleFormCancel}
        open={formVisible}
        destroyOnClose
      >
        <LocationForm
          novelId={novelId}
          location={currentLocation}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Drawer>
    </Card>
  );
};

export default LocationManager; 