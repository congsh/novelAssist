import React, { useEffect, useState } from 'react';
import { 
  List, 
  Card, 
  Button, 
  Space, 
  Input, 
  Select, 
  Popconfirm, 
  Typography, 
  Empty, 
  Spin, 
  message 
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useLocationStore } from '../store/locationStore';
import { Location, LocationImportance } from '../../../shared/types/location';

const { Title, Text } = Typography;
const { Option } = Select;

interface LocationListProps {
  novelId: string;
  onAddLocation: () => void;
  onEditLocation: (location: Location) => void;
}

/**
 * 地点列表组件
 */
const LocationList: React.FC<LocationListProps> = ({ novelId, onAddLocation, onEditLocation }) => {
  const { 
    locations, 
    loading, 
    error, 
    fetchLocations, 
    deleteLocation,
    setCurrentLocation
  } = useLocationStore();
  
  const [searchName, setSearchName] = useState('');
  const [filterImportance, setFilterImportance] = useState<string | undefined>(undefined);
  
  // 加载地点列表
  useEffect(() => {
    if (novelId) {
      fetchLocations(novelId);
    }
  }, [novelId, fetchLocations]);
  
  // 处理搜索
  const handleSearch = () => {
    fetchLocations(novelId);
  };
  
  // 处理删除
  const handleDelete = async (id: string) => {
    try {
      await deleteLocation(id);
      message.success('地点删除成功');
    } catch (error) {
      message.error('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };
  
  // 处理编辑
  const handleEdit = (location: Location) => {
    setCurrentLocation(location);
    onEditLocation(location);
  };
  
  // 处理添加
  const handleAdd = () => {
    setCurrentLocation(null);
    onAddLocation();
  };
  
  // 过滤地点列表
  const filteredLocations = locations.filter(location => {
    let match = true;
    
    if (searchName) {
      match = match && location.name.toLowerCase().includes(searchName.toLowerCase());
    }
    
    if (filterImportance) {
      match = match && location.importance === filterImportance;
    }
    
    return match;
  });
  
  return (
    <div className="location-list">
      <div className="location-list-header">
        <Title level={4}>地点管理</Title>
        <Space direction="horizontal" style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索地点名称"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
            onPressEnter={handleSearch}
          />
          <Select
            placeholder="按重要性筛选"
            style={{ width: 150 }}
            allowClear
            value={filterImportance}
            onChange={value => setFilterImportance(value)}
          >
            <Option value={LocationImportance.CRITICAL}>关键地点</Option>
            <Option value={LocationImportance.MAJOR}>主要地点</Option>
            <Option value={LocationImportance.MINOR}>次要地点</Option>
            <Option value={LocationImportance.BACKGROUND}>背景地点</Option>
          </Select>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
          >
            添加地点
          </Button>
        </Space>
      </div>
      
      <Spin spinning={loading}>
        {error && <Text type="danger">{error}</Text>}
        
        {!loading && filteredLocations.length === 0 ? (
          <Empty description="暂无地点数据" />
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4, xxl: 4 }}
            dataSource={filteredLocations}
            renderItem={item => (
              <List.Item>
                <Card
                  hoverable
                  cover={item.image_path && <img alt={item.name} src={item.image_path} style={{ height: 150, objectFit: 'cover' }} />}
                  actions={[
                    <Button 
                      key="edit" 
                      type="text" 
                      icon={<EditOutlined />} 
                      onClick={() => handleEdit(item)}
                    >
                      编辑
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确定要删除这个地点吗？"
                      onConfirm={() => handleDelete(item.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />}
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <Card.Meta
                    title={item.name}
                    description={
                      <>
                        <div className="location-importance">
                          {item.importance === LocationImportance.CRITICAL && <Text type="danger">关键地点</Text>}
                          {item.importance === LocationImportance.MAJOR && <Text type="warning">主要地点</Text>}
                          {item.importance === LocationImportance.MINOR && <Text type="secondary">次要地点</Text>}
                          {item.importance === LocationImportance.BACKGROUND && <Text>背景地点</Text>}
                        </div>
                        <div className="location-description">
                          {item.description.length > 50 
                            ? `${item.description.substring(0, 50)}...` 
                            : item.description}
                        </div>
                      </>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        )}
      </Spin>
    </div>
  );
};

export default LocationList; 