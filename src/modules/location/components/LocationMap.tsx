import React, { useEffect, useState } from 'react';
import { Spin, Empty, Card, List, Avatar, Tag } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { locationService } from '../services/locationService';
import './LocationStyles.css';

// 添加内联样式
const styles = {
  container: {
    width: '100%',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  loading: {
    width: '100%',
    height: '400px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  error: {
    width: '100%',
    textAlign: 'center' as 'center',
    padding: '20px'
  },
  note: {
    marginBottom: '16px',
    padding: '8px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    borderLeft: '4px solid #1890ff',
    color: '#666'
  }
};

interface LocationMapProps {
  novelId: string;
}

interface LocationMapData {
  id: string;
  name: string;
  description: string;
  importance: string;
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  image_path: string | null;
}

/**
 * 地点地图可视化组件（简化版）
 */
const LocationMap: React.FC<LocationMapProps> = ({ novelId }) => {
  const [mapData, setMapData] = useState<LocationMapData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 获取地点数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await locationService.getLocationMapData(novelId);
        setMapData(data);
        setError(null);
      } catch (err: any) {
        console.error('获取地点地图数据失败:', err);
        setError(err.message || '获取地点地图数据失败');
      } finally {
        setLoading(false);
      }
    };

    if (novelId) {
      fetchData();
    }
  }, [novelId]);

  // 获取有效的地点数据（有坐标的地点）
  const validLocations = mapData.filter(location => location.coordinates !== null);
  
  // 获取地点重要性对应的标签颜色
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical':
        return 'red';
      case 'major':
        return 'blue';
      case 'minor':
        return 'green';
      case 'background':
        return 'default';
      default:
        return 'blue';
    }
  };
  
  // 获取地点重要性对应的中文名称
  const getImportanceName = (importance: string) => {
    switch (importance) {
      case 'critical':
        return '关键地点';
      case 'major':
        return '主要地点';
      case 'minor':
        return '次要地点';
      case 'background':
        return '背景地点';
      default:
        return '其他地点';
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <Spin tip="加载中..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card style={styles.error}>
        <p>加载失败: {error}</p>
      </Card>
    );
  }

  if (validLocations.length === 0) {
    return (
      <Empty 
        description="暂无地点坐标数据" 
        image={Empty.PRESENTED_IMAGE_SIMPLE} 
      />
    );
  }

  return (
    <div style={styles.container}>
      <Card title="地点地图视图">
        <p style={styles.note}>
          注意：完整的地图可视化功能需要配置Leaflet地图，当前显示简化版地点列表。
        </p>
        <List
          itemLayout="horizontal"
          dataSource={validLocations}
          renderItem={location => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<EnvironmentOutlined />} />}
                title={
                  <div>
                    {location.name}
                    <Tag color={getImportanceColor(location.importance)} style={{ marginLeft: 8 }}>
                      {getImportanceName(location.importance)}
                    </Tag>
                  </div>
                }
                description={
                  <div>
                    <p>{location.description || '暂无描述'}</p>
                    <p>
                      <small>
                        坐标: {location.coordinates?.lat.toFixed(6)}, {location.coordinates?.lng.toFixed(6)}
                      </small>
                    </p>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default LocationMap; 