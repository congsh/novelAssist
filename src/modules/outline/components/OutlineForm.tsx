import React, { useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  Space, 
  Card,
  Typography,
  InputNumber
} from 'antd';
import { useOutlineStore } from '../store/outlineStore';
import { 
  OutlineItem, 
  OutlineStatus, 
  OutlineCreateParams, 
  OutlineUpdateParams 
} from '../../../shared/types/outline';

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

interface OutlineFormProps {
  novelId: string;
  outline?: OutlineItem | null;
  parentId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * 大纲编辑表单组件
 */
const OutlineForm: React.FC<OutlineFormProps> = ({ 
  novelId, 
  outline, 
  parentId,
  onSuccess, 
  onCancel 
}) => {
  const [form] = Form.useForm();
  const { 
    outlines,
    createOutline, 
    updateOutline, 
    loading,
    fetchOutlines
  } = useOutlineStore();
  
  // 加载大纲列表，用于选择父级大纲
  useEffect(() => {
    if (novelId) {
      fetchOutlines(novelId);
    }
  }, [novelId, fetchOutlines]);
  
  // 表单初始化
  useEffect(() => {
    if (outline) {
      form.setFieldsValue({
        title: outline.title,
        content: outline.content,
        parent_id: outline.parent_id,
        sort_order: outline.sort_order,
        status: outline.status,
        metadata: outline.metadata
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        parent_id: parentId || null,
        status: OutlineStatus.ACTIVE,
        sort_order: 1
      });
    }
  }, [outline, parentId, form]);
  
  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      if (outline) {
        // 更新大纲
        const params: OutlineUpdateParams = {
          id: outline.id,
          title: values.title,
          content: values.content,
          parent_id: values.parent_id,
          sort_order: values.sort_order,
          status: values.status,
          metadata: values.metadata
        };
        
        await updateOutline(params);
      } else {
        // 创建大纲
        const params: OutlineCreateParams = {
          novel_id: novelId,
          title: values.title,
          content: values.content,
          parent_id: values.parent_id,
          sort_order: values.sort_order,
          status: values.status,
          metadata: values.metadata
        };
        
        await createOutline(params);
      }
      
      onSuccess();
    } catch (error) {
      console.error('操作失败:', error);
    }
  };
  
  // 过滤可选的父级大纲（避免选择自己作为父级）
  const filteredOutlines = outlines.filter(item => {
    // 如果是编辑模式，不能选择自己或自己的子孙节点作为父级
    if (outline) {
      return item.id !== outline.id;
    }
    return true;
  });
  
  return (
    <Card className="outline-form-card">
      <Title level={4}>{outline ? '编辑大纲' : '添加大纲'}</Title>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ 
          status: OutlineStatus.ACTIVE,
          sort_order: 1
        }}
      >
        <Form.Item
          name="title"
          label="大纲标题"
          rules={[{ required: true, message: '请输入大纲标题' }]}
        >
          <Input placeholder="请输入大纲标题" />
        </Form.Item>
        
        <Form.Item
          name="content"
          label="大纲内容"
        >
          <TextArea 
            placeholder="请输入大纲内容" 
            rows={6}
            showCount
            maxLength={2000}
          />
        </Form.Item>
        
        <Form.Item
          name="parent_id"
          label="父级大纲"
        >
          <Select 
            placeholder="选择父级大纲" 
            allowClear
            showSearch
            optionFilterProp="children"
          >
            <Option value={null}>无父级（顶级大纲）</Option>
            {filteredOutlines.map(item => (
              <Option key={item.id} value={item.id}>{item.title}</Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          name="sort_order"
          label="排序顺序"
          rules={[{ required: true, message: '请输入排序顺序' }]}
        >
          <InputNumber min={1} placeholder="排序顺序" style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item
          name="status"
          label="状态"
          rules={[{ required: true, message: '请选择状态' }]}
        >
          <Select placeholder="请选择状态">
            <Option value={OutlineStatus.ACTIVE}>活跃</Option>
            <Option value={OutlineStatus.COMPLETED}>已完成</Option>
            <Option value={OutlineStatus.DRAFT}>草稿</Option>
            <Option value={OutlineStatus.ARCHIVED}>已归档</Option>
          </Select>
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
              {outline ? '更新' : '创建'}
            </Button>
            <Button onClick={onCancel}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default OutlineForm; 