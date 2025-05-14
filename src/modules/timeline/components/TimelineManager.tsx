import React, { useState } from 'react';
import { Row, Col, Drawer } from 'antd';
import TimelineList from './TimelineList';
import TimelineForm from './TimelineForm';
import { TimelineEvent } from '../../../shared/types/timeline';

interface TimelineManagerProps {
  novelId: string;
}

/**
 * 时间线管理页面组件
 */
const TimelineManager: React.FC<TimelineManagerProps> = ({ novelId }) => {
  const [formVisible, setFormVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<TimelineEvent | null>(null);
  
  // 处理添加事件
  const handleAddEvent = () => {
    setCurrentEvent(null);
    setFormVisible(true);
  };
  
  // 处理编辑事件
  const handleEditEvent = (event: TimelineEvent) => {
    setCurrentEvent(event);
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
    <div className="timeline-manager">
      <Row>
        <Col span={24}>
          <TimelineList 
            novelId={novelId}
            onAddEvent={handleAddEvent}
            onEditEvent={handleEditEvent}
          />
        </Col>
      </Row>
      
      <Drawer
        title={currentEvent ? '编辑事件' : '添加事件'}
        placement="right"
        width={520}
        onClose={handleFormCancel}
        open={formVisible}
        destroyOnClose
      >
        <TimelineForm
          novelId={novelId}
          event={currentEvent}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Drawer>
    </div>
  );
};

export default TimelineManager; 