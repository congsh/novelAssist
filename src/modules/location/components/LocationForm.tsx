import React, { useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  Upload, 
  message, 
  Space, 
  Card,
  Typography
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useLocationStore } from '../store/locationStore';
import { Location, LocationImportance, LocationCreateParams, LocationUpdateParams } from '../../../shared/types/location';

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

interface LocationFormProps {
  novelId: string;
  location?: Location | null;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * 地点编辑表单组件
 */
const LocationForm: React.FC<LocationFormProps> = ({ 
  novelId, 
  location, 
  onSuccess, 
  onCancel 
}) => {
  const [form] = Form.useForm();
  const { createLocation, updateLocation, loading } = useLocationStore();
  
  // 表单初始化
  useEffect(() => {
    if (location) {
      form.setFieldsValue({
        name: location.name,
        description: location.description,
        importance: location.importance,
        image_path: location.image_path,
        coordinates: location.coordinates,
        metadata: location.metadata
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        importance: LocationImportance.MINOR
      });
    }
  }, [location, form]);
  
  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      if (location) {
        // 更新地点
        const params: LocationUpdateParams = {
          id: location.id,
          name: values.name,
          description: values.description,
          importance: values.importance,
          image_path: values.image_path,
          coordinates: values.coordinates,
          metadata: values.metadata
        };
        
        await updateLocation(params);
        message.success('地点更新成功');
      } else {
        // 创建地点
        const params: LocationCreateParams = {
          novel_id: novelId,
          name: values.name,
          description: values.description,
          importance: values.importance,
          image_path: values.image_path,
          coordinates: values.coordinates,
          metadata: values.metadata
        };
        
        await createLocation(params);
        message.success('地点创建成功');
      }
      
      onSuccess();
    } catch (error) {
      message.error('操作失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };
  
  // 处理图片上传
  const handleImageUpload = (info: any) => {
    if (info.file.status === 'done') {
      const imagePath = info.file.response.path;
      form.setFieldsValue({ image_path: imagePath });
      message.success(`${info.file.name} 上传成功`);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} 上传失败`);
    }
  };
  
  return (
    <Card className="location-form-card">
      <Title level={4}>{location ? '编辑地点' : '添加地点'}</Title>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ importance: LocationImportance.MINOR }}
      >
        <Form.Item
          name="name"
          label="地点名称"
          rules={[{ required: true, message: '请输入地点名称' }]}
        >
          <Input placeholder="请输入地点名称" />
        </Form.Item>
        
        <Form.Item
          name="description"
          label="地点描述"
        >
          <TextArea 
            placeholder="请输入地点描述" 
            rows={4}
            showCount
            maxLength={1000}
          />
        </Form.Item>
        
        <Form.Item
          name="importance"
          label="重要性"
          rules={[{ required: true, message: '请选择地点重要性' }]}
        >
          <Select placeholder="请选择地点重要性">
            <Option value={LocationImportance.CRITICAL}>关键地点</Option>
            <Option value={LocationImportance.MAJOR}>主要地点</Option>
            <Option value={LocationImportance.MINOR}>次要地点</Option>
            <Option value={LocationImportance.BACKGROUND}>背景地点</Option>
          </Select>
        </Form.Item>
        
        <Form.Item
          name="image_path"
          label="地点图片"
        >
          <Input placeholder="地点图片路径" />
        </Form.Item>
        
        <Form.Item
          name="coordinates"
          label="坐标信息"
        >
          <Input placeholder="坐标信息 (JSON格式)" />
        </Form.Item>
        
        <Form.Item
          name="metadata"
          label="额外信息"
        >
          <TextArea 
            placeholder="额外信息 (JSON格式)" 
            rows={3}
          />
        </Form.Item>
        
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {location ? '更新' : '创建'}
            </Button>
            <Button onClick={onCancel}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default LocationForm;