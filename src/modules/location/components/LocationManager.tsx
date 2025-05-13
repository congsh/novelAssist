import React, { useState } from 'react';
import { Row, Col, Drawer } from 'antd';
import LocationList from './LocationList';
import LocationForm from './LocationForm';
import { Location } from '../../../shared/types/location';

interface LocationManagerProps {
  novelId: string;
}

/**
 * 地点管理页面组件
 */
const LocationManager: React.FC<LocationManagerProps> = ({ novelId }) => {
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
    <div className="location-manager">
      <Row>
        <Col span={24}>
          <LocationList 
            novelId={novelId}
            onAddLocation={handleAddLocation}
            onEditLocation={handleEditLocation}
          />
        </Col>
      </Row>
      
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
    </div>
  );
};

export default LocationManager; 