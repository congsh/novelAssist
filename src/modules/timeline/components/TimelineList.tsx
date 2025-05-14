import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Button, Empty, Spin, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, QuestionCircleOutlined, FieldTimeOutlined, UserOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { TimelineEvent, TimelineEventImportance } from '../../../shared/types/timeline';
import { timelineService } from '../services/timelineService';
import { characterService } from '../../character/services/characterService';
import { locationService } from '../../location/services/locationService';
import { Character } from '../../../shared/types/character';
import { Location } from '../../../shared/types/location';
import dayjs from 'dayjs';
import './TimelineStyles.css';

const { Title, Paragraph } = Typography;

interface TimelineListProps {
  novelId: string;
  onAddEvent: () => void;
  onEditEvent: (event: TimelineEvent) => void;
}

/**
 * 时间线事件列表组件
 */
const TimelineList: React.FC<TimelineListProps> = ({
  novelId,
  onAddEvent,
  onEditEvent
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [characters, setCharacters] = useState<Record<string, Character>>({});
  const [locations, setLocations] = useState<Record<string, Location>>({});
  
  // 获取事件列表和关联数据
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 获取事件列表
      const eventsData = await timelineService.getTimelineEvents({ novel_id: novelId });
      setEvents(eventsData);
      
      // 获取人物列表并转换为字典
      const charactersData = await characterService.getCharacters({ novel_id: novelId });
      const charactersMap: Record<string, Character> = {};
      charactersData.forEach(character => {
        charactersMap[character.id] = character;
      });
      setCharacters(charactersMap);
      
      // 获取地点列表并转换为字典
      const locationsData = await locationService.getLocations({ novel_id: novelId });
      const locationsMap: Record<string, Location> = {};
      locationsData.forEach(location => {
        locationsMap[location.id] = location;
      });
      setLocations(locationsMap);
    } catch (error: any) {
      message.error(`获取时间线数据失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加载
  useEffect(() => {
    fetchData();
  }, [novelId]);
  
  // 处理删除事件
  const handleDeleteEvent = async (id: string) => {
    try {
      await timelineService.deleteTimelineEvent(id);
      message.success('事件删除成功');
      fetchData();
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`);
    }
  };
  
  // 获取事件重要性标签颜色
  const getImportanceTagColor = (importance: string) => {
    switch (importance) {
      case TimelineEventImportance.CRITICAL:
        return 'red';
      case TimelineEventImportance.MAJOR:
        return 'orange';
      case TimelineEventImportance.MINOR:
        return 'blue';
      case TimelineEventImportance.BACKGROUND:
        return 'default';
      default:
        return 'default';
    }
  };
  
  // 获取事件重要性中文名称
  const getImportanceName = (importance: string) => {
    switch (importance) {
      case TimelineEventImportance.CRITICAL:
        return '关键事件';
      case TimelineEventImportance.MAJOR:
        return '主要事件';
      case TimelineEventImportance.MINOR:
        return '次要事件';
      case TimelineEventImportance.BACKGROUND:
        return '背景事件';
      default:
        return '其他';
    }
  };
  
  // 格式化日期显示
  const formatDate = (dateString: string) => {
    if (!dateString) return '未设置日期';
    return dayjs(dateString).format('YYYY-MM-DD HH:mm');
  };
  
  // 获取事件关联的人物列表
  const getEventCharacters = (event: TimelineEvent) => {
    if (!event.character_ids) return [];
    try {
      const characterIds = JSON.parse(event.character_ids);
      return characterIds.map((id: string) => characters[id]).filter(Boolean);
    } catch {
      return [];
    }
  };
  
  // 获取事件关联的地点
  const getEventLocation = (event: TimelineEvent) => {
    if (!event.location_id) return null;
    return locations[event.location_id];
  };
  
  // 按日期排序事件
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.event_date) return 1;
    if (!b.event_date) return -1;
    return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
  });
  
  return (
    <div className="timeline-list">
      <div className="timeline-list-header">
        <Title level={4} className="timeline-list-title">事件列表</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={onAddEvent}
        >
          添加事件
        </Button>
      </div>
      
      <Spin spinning={loading}>
        {sortedEvents.length > 0 ? (
          <Row gutter={[16, 16]}>
            {sortedEvents.map(event => {
              const eventCharacters = getEventCharacters(event);
              const eventLocation = getEventLocation(event);
              
              return (
                <Col xs={24} sm={12} key={event.id}>
                  <Card
                    className="timeline-event-card"
                    title={
                      <div className="timeline-event-meta">
                        <Tag color={getImportanceTagColor(event.importance)}>
                          {getImportanceName(event.importance)}
                        </Tag>
                        <span className="timeline-event-date">
                          <FieldTimeOutlined /> {formatDate(event.event_date)}
                        </span>
                      </div>
                    }
                    actions={[
                      <EditOutlined key="edit" onClick={() => onEditEvent(event)} />,
                      <Popconfirm
                        title="确定要删除这个事件吗？"
                        description="删除后无法恢复"
                        icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                        onConfirm={() => handleDeleteEvent(event.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <DeleteOutlined key="delete" />
                      </Popconfirm>
                    ]}
                  >
                    <Title level={5} className="timeline-event-title">{event.title}</Title>
                    <Paragraph className="timeline-event-description">
                      {event.description || '暂无描述'}
                    </Paragraph>
                    
                    <div className="timeline-event-footer">
                      <div className="timeline-event-relations">
                        {eventCharacters.length > 0 && (
                          <div style={{ marginRight: 16 }}>
                            <UserOutlined /> 
                            {eventCharacters.map((char: Character) => char.name).join(', ')}
                          </div>
                        )}
                        
                        {eventLocation && (
                          <div>
                            <EnvironmentOutlined /> {eventLocation.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        ) : (
          <Empty 
            description="暂无事件，点击添加事件按钮创建" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Spin>
    </div>
  );
};

export default TimelineList; 