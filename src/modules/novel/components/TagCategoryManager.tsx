import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  Button, 
  Table, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Popconfirm, 
  App, 
  Spin,
  ColorPicker,
  Select
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import type { TabsProps } from 'antd';
import type { Color } from 'antd/es/color-picker';

interface Tag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 标签和分类管理组件
 */
const TagCategoryManager: React.FC = () => {
  // 标签状态
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagLoading, setTagLoading] = useState<boolean>(true);
  const [tagModalVisible, setTagModalVisible] = useState<boolean>(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagForm] = Form.useForm();

  // 分类状态
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryLoading, setCategoryLoading] = useState<boolean>(true);
  const [categoryModalVisible, setCategoryModalVisible] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm] = Form.useForm();
  
  // 使用App组件的message
  const { message } = App.useApp();

  // 加载标签
  const loadTags = async () => {
    setTagLoading(true);
    try {
      const response = await window.electron.invoke('get-tags');
      if (response.success) {
        setTags(response.data);
      } else {
        message.error(response.error || '获取标签列表失败');
      }
    } catch (error) {
      console.error('获取标签列表失败:', error);
      message.error('获取标签列表失败');
    } finally {
      setTagLoading(false);
    }
  };

  // 加载分类
  const loadCategories = async () => {
    setCategoryLoading(true);
    try {
      const response = await window.electron.invoke('get-categories');
      if (response.success) {
        setCategories(response.data);
      } else {
        message.error(response.error || '获取分类列表失败');
      }
    } catch (error) {
      console.error('获取分类列表失败:', error);
      message.error('获取分类列表失败');
    } finally {
      setCategoryLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadTags();
    loadCategories();
  }, []);

  // 打开创建标签对话框
  const showCreateTagModal = () => {
    setEditingTag(null);
    tagForm.resetFields();
    tagForm.setFieldsValue({
      color: '#1890ff'
    });
    setTagModalVisible(true);
  };

  // 打开编辑标签对话框
  const showEditTagModal = (tag: Tag) => {
    setEditingTag(tag);
    tagForm.setFieldsValue({
      name: tag.name,
      description: tag.description,
      color: tag.color || '#1890ff'
    });
    setTagModalVisible(true);
  };

  // 处理标签对话框确认
  const handleTagOk = async () => {
    try {
      const values = await tagForm.validateFields();
      
      if (editingTag) {
        // 更新标签
        const response = await window.electron.invoke('update-tag', {
          id: editingTag.id,
          ...values
        });
        
        if (response.success) {
          message.success('标签更新成功');
          setTagModalVisible(false);
          loadTags();
        } else {
          message.error(response.error || '标签更新失败');
        }
      } else {
        // 创建标签
        const response = await window.electron.invoke('create-tag', values);
        
        if (response.success) {
          message.success('标签创建成功');
          setTagModalVisible(false);
          loadTags();
        } else {
          message.error(response.error || '标签创建失败');
        }
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理标签对话框取消
  const handleTagCancel = () => {
    setTagModalVisible(false);
  };

  // 删除标签
  const handleDeleteTag = async (id: string) => {
    try {
      const response = await window.electron.invoke('delete-tag', { id });
      
      if (response.success) {
        message.success('标签删除成功');
        loadTags();
      } else {
        message.error(response.error || '标签删除失败');
      }
    } catch (error) {
      console.error('删除标签失败:', error);
      message.error('删除标签失败');
    }
  };

  // 打开创建分类对话框
  const showCreateCategoryModal = () => {
    setEditingCategory(null);
    categoryForm.resetFields();
    categoryForm.setFieldsValue({
      color: '#1890ff',
      icon: 'folder'
    });
    setCategoryModalVisible(true);
  };

  // 打开编辑分类对话框
  const showEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    categoryForm.setFieldsValue({
      name: category.name,
      description: category.description,
      color: category.color || '#1890ff',
      icon: category.icon || 'folder'
    });
    setCategoryModalVisible(true);
  };

  // 处理分类对话框确认
  const handleCategoryOk = async () => {
    try {
      const values = await categoryForm.validateFields();
      
      if (editingCategory) {
        // 更新分类
        const response = await window.electron.invoke('update-category', {
          id: editingCategory.id,
          ...values
        });
        
        if (response.success) {
          message.success('分类更新成功');
          setCategoryModalVisible(false);
          loadCategories();
        } else {
          message.error(response.error || '分类更新失败');
        }
      } else {
        // 创建分类
        const response = await window.electron.invoke('create-category', values);
        
        if (response.success) {
          message.success('分类创建成功');
          setCategoryModalVisible(false);
          loadCategories();
        } else {
          message.error(response.error || '分类创建失败');
        }
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理分类对话框取消
  const handleCategoryCancel = () => {
    setCategoryModalVisible(false);
  };

  // 删除分类
  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await window.electron.invoke('delete-category', { id });
      
      if (response.success) {
        message.success('分类删除成功');
        loadCategories();
      } else {
        message.error(response.error || '分类删除失败');
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      message.error('删除分类失败');
    }
  };

  // 标签表格列
  const tagColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-'
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      render: (color: string) => (
        <div 
          style={{ 
            width: '20px', 
            height: '20px', 
            backgroundColor: color || '#1890ff',
            borderRadius: '4px'
          }} 
        />
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Tag) => (
        <Space size="middle">
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => showEditTagModal(record)}
          />
          <Popconfirm
            title="删除标签"
            description="确定要删除这个标签吗？删除后将无法恢复。"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleDeleteTag(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 分类表格列
  const categoryColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-'
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      render: (color: string) => (
        <div 
          style={{ 
            width: '20px', 
            height: '20px', 
            backgroundColor: color || '#1890ff',
            borderRadius: '4px'
          }} 
        />
      )
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      render: (text: string) => text || 'folder'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Category) => (
        <Space size="middle">
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => showEditCategoryModal(record)}
          />
          <Popconfirm
            title="删除分类"
            description="确定要删除这个分类吗？删除后将无法恢复。"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleDeleteCategory(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: '标签管理',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={showCreateTagModal}
            >
              新建标签
            </Button>
          </div>
          <Table 
            columns={tagColumns} 
            dataSource={tags} 
            rowKey="id" 
            loading={tagLoading}
            pagination={{ pageSize: 10 }}
          />
        </div>
      ),
    },
    {
      key: '2',
      label: '分类管理',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={showCreateCategoryModal}
            >
              新建分类
            </Button>
          </div>
          <Table 
            columns={categoryColumns} 
            dataSource={categories} 
            rowKey="id" 
            loading={categoryLoading}
            pagination={{ pageSize: 10 }}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card title="标签与分类管理">
        <Tabs defaultActiveKey="1" items={items} />
      </Card>

      {/* 标签表单对话框 */}
      <Modal
        title={editingTag ? "编辑标签" : "新建标签"}
        open={tagModalVisible}
        onOk={handleTagOk}
        onCancel={handleTagCancel}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={tagForm}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="标签名称"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input placeholder="请输入标签名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="标签描述"
          >
            <Input.TextArea rows={3} placeholder="请输入标签描述" />
          </Form.Item>
          
          <Form.Item
            name="color"
            label="标签颜色"
          >
            <ColorPicker />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分类表单对话框 */}
      <Modal
        title={editingCategory ? "编辑分类" : "新建分类"}
        open={categoryModalVisible}
        onOk={handleCategoryOk}
        onCancel={handleCategoryCancel}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={categoryForm}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="分类描述"
          >
            <Input.TextArea rows={3} placeholder="请输入分类描述" />
          </Form.Item>
          
          <Form.Item
            name="color"
            label="分类颜色"
          >
            <ColorPicker />
          </Form.Item>

          <Form.Item
            name="icon"
            label="分类图标"
          >
            <Select defaultValue="folder">
              <Select.Option value="folder">文件夹</Select.Option>
              <Select.Option value="book">书籍</Select.Option>
              <Select.Option value="file">文档</Select.Option>
              <Select.Option value="star">星星</Select.Option>
              <Select.Option value="heart">心形</Select.Option>
              <Select.Option value="tag">标签</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TagCategoryManager; 