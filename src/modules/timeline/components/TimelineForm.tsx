import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, DatePicker, message } from 'antd';
import { FieldTimeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { 
  TimelineEvent, 
  TimelineEventImportance 
} from '../../../shared/types/timeline';
import { timelineService } from '../services/timelineService';
import { characterService } from '../../character/services/characterService';
import { locationService } from '../../location/services/locationService';
import { Character } from '../../../shared/types/character';
import { Location } from '../../../shared/types/location';
import './TimelineStyles.css';

const { Option } = Select;
const { TextArea } = Input;

interface TimelineFormProps {
  novelId: string;
  event: TimelineEvent | null;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * 时间线事件表单组件
 */
const TimelineForm: React.FC<TimelineFormProps> = ({
  novelId,
  event,
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  // 获取人物和地点数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取人物列表
        const charactersData = await characterService.getCharacters({ novel_id: novelId });
        setCharacters(charactersData);
        
        // 获取地点列表
        const locationsData = await locationService.getLocations({ novel_id: novelId });
        setLocations(locationsData);
      } catch (error: any) {
        message.error(`加载数据失败: ${error.message}`);
      }
    };
    
    fetchData();
  }, [novelId]);
  
  // 表单初始值
  useEffect(() => {
    if (event) {
      const characterIds = event.character_ids ? JSON.parse(event.character_ids) : [];
      form.setFieldsValue({
        title: event.title,
        description: event.description,
        event_date: event.event_date ? dayjs(event.event_date) : undefined,
        importance: event.importance,
        character_ids: characterIds,
        location_id: event.location_id
      });
    }
  }, [event, form]);
  
  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // 转换日期格式
      const eventDate = values.event_date ? values.event_date.format('YYYY-MM-DD HH:mm:ss') : null;
      
      // 转换角色ID数组为JSON字符串
      const characterIds = values.character_ids ? JSON.stringify(values.character_ids) : null;
      
      const params = {
        ...values,
        novel_id: novelId,
        event_date: eventDate,
        character_ids: characterIds
      };
      
      if (event) {
        // 更新事件
        await timelineService.updateTimelineEvent({
          id: event.id,
          ...params
        });
        message.success('事件更新成功');
      } else {
        // 创建事件
        await timelineService.createTimelineEvent(params);
        message.success('事件创建成功');
      }
      
      onSuccess();
    } catch (error: any) {
      message.error(`操作失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
    >
      <Form.Item
        name="title"
        label="事件标题"
        rules={[{ required: true, message: '请输入事件标题' }]}
        className="timeline-form-item"
      >
        <Input prefix={<FieldTimeOutlined />} placeholder="输入事件标题" />
      </Form.Item>
      
      <Form.Item
        name="event_date"
        label="事件日期"
        className="timeline-form-item"
      >
        <DatePicker 
          showTime 
          format="YYYY-MM-DD HH:mm:ss" 
          placeholder="选择事件发生的日期和时间" 
          style={{ width: '100%' }}
        />
      </Form.Item>
      
      <Form.Item
        name="importance"
        label="事件重要性"
        className="timeline-form-item"
      >
        <Select placeholder="选择事件重要性">
          <Option value={TimelineEventImportance.CRITICAL}>关键事件</Option>
          <Option value={TimelineEventImportance.MAJOR}>主要事件</Option>
          <Option value={TimelineEventImportance.MINOR}>次要事件</Option>
          <Option value={TimelineEventImportance.BACKGROUND}>背景事件</Option>
        </Select>
      </Form.Item>
      
      <Form.Item
        name="description"
        label="事件描述"
        className="timeline-form-item"
      >
        <TextArea rows={4} placeholder="描述事件的详细内容" />
      </Form.Item>
      
      <Form.Item
        name="character_ids"
        label="相关人物"
        className="timeline-form-item"
      >
        <Select 
          mode="multiple" 
          placeholder="选择与事件相关的人物" 
          optionFilterProp="children"
        >
          {characters.map(character => (
            <Option key={character.id} value={character.id}>{character.name}</Option>
          ))}
        </Select>
      </Form.Item>
      
      <Form.Item
        name="location_id"
        label="事件地点"
        className="timeline-form-item"
      >
        <Select 
          placeholder="选择事件发生的地点" 
          allowClear
          optionFilterProp="children"
        >
          {locations.map(location => (
            <Option key={location.id} value={location.id}>{location.name}</Option>
          ))}
        </Select>
      </Form.Item>
      
      <div className="timeline-form-buttons">
        <Button onClick={onCancel}>取消</Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          {event ? '更新' : '创建'}
        </Button>
      </div>
    </Form>
  );
};

export default TimelineForm; 