import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, Input, Modal, Form, Select, message, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { CreativePrompt } from '../types';

const { TextArea } = Input;
const { Option } = Select;

interface CreativePromptsProps {
  onUsePrompt: (promptText: string) => void;
}

/**
 * 创作提示词组件
 */
const CreativePrompts: React.FC<CreativePromptsProps> = ({ onUsePrompt }) => {
  const [prompts, setPrompts] = useState<CreativePrompt[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CreativePrompt | null>(null);
  const [form] = Form.useForm();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // 预设的提示词分类
  const categories = [
    '人物创建',
    '场景描写',
    '情节构思',
    '对话生成',
    '文本润色',
    '世界构建',
    '其他'
  ];
  
  // 预设的提示词标签
  const allTags = [
    '人物', '场景', '情节', '对话', '润色', '世界观', 
    '修改', '扩展', '简化', '细节', '创意', '风格'
  ];
  
  // 加载提示词
  useEffect(() => {
    loadPrompts();
  }, []);
  
  // 从本地存储加载提示词
  const loadPrompts = () => {
    try {
      const savedPrompts = localStorage.getItem('creativePrompts');
      if (savedPrompts) {
        setPrompts(JSON.parse(savedPrompts));
      } else {
        // 预设的提示词
        const defaultPrompts: CreativePrompt[] = [
          {
            id: uuidv4(),
            title: '人物描述生成',
            content: '请为我的小说创建一个详细的人物描述，包括外貌、性格、背景故事和动机。角色名称：[角色名]，年龄：[年龄]，职业：[职业]',
            category: '人物创建',
            tags: ['人物', '创意']
          },
          {
            id: uuidv4(),
            title: '场景细节描写',
            content: '请详细描述以下场景：[场景名称]，包括视觉、听觉、嗅觉等感官细节。时间：[时间]，天气：[天气]，重要物品：[物品]',
            category: '场景描写',
            tags: ['场景', '细节']
          },
          {
            id: uuidv4(),
            title: '对话生成',
            content: '请为我的小说创建一段对话，角色包括[角色A]和[角色B]，他们正在讨论[话题]。角色A的性格：[性格描述]，角色B的性格：[性格描述]',
            category: '对话生成',
            tags: ['对话', '人物']
          },
          {
            id: uuidv4(),
            title: '文本润色',
            content: '请帮我润色以下文本，使其更加生动、流畅：\n\n[在此粘贴您的文本]',
            category: '文本润色',
            tags: ['润色', '修改']
          },
          {
            id: uuidv4(),
            title: '情节扩展',
            content: '请基于以下情节概要，扩展并丰富它：\n\n[在此粘贴您的情节概要]',
            category: '情节构思',
            tags: ['情节', '扩展']
          }
        ];
        setPrompts(defaultPrompts);
        localStorage.setItem('creativePrompts', JSON.stringify(defaultPrompts));
      }
    } catch (error) {
      console.error('加载提示词失败:', error);
    }
  };
  
  // 保存提示词到本地存储
  const savePrompts = (updatedPrompts: CreativePrompt[]) => {
    try {
      localStorage.setItem('creativePrompts', JSON.stringify(updatedPrompts));
    } catch (error) {
      console.error('保存提示词失败:', error);
    }
  };
  
  // 添加或编辑提示词
  const handleAddOrEditPrompt = () => {
    form.validateFields().then(values => {
      const { title, content, category, tags } = values;
      
      let updatedPrompts: CreativePrompt[];
      
      if (editingPrompt) {
        // 编辑现有提示词
        updatedPrompts = prompts.map(p => 
          p.id === editingPrompt.id 
            ? { ...p, title, content, category, tags } 
            : p
        );
        message.success('提示词已更新');
      } else {
        // 添加新提示词
        const newPrompt: CreativePrompt = {
          id: uuidv4(),
          title,
          content,
          category,
          tags
        };
        updatedPrompts = [...prompts, newPrompt];
        message.success('提示词已添加');
      }
      
      setPrompts(updatedPrompts);
      savePrompts(updatedPrompts);
      setModalVisible(false);
      form.resetFields();
      setEditingPrompt(null);
    });
  };
  
  // 删除提示词
  const handleDeletePrompt = (prompt: CreativePrompt) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除提示词 "${prompt.title}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const updatedPrompts = prompts.filter(p => p.id !== prompt.id);
        setPrompts(updatedPrompts);
        savePrompts(updatedPrompts);
        message.success('提示词已删除');
      }
    });
  };
  
  // 打开添加提示词模态框
  const showAddModal = () => {
    setEditingPrompt(null);
    form.resetFields();
    setModalVisible(true);
  };
  
  // 打开编辑提示词模态框
  const showEditModal = (prompt: CreativePrompt) => {
    setEditingPrompt(prompt);
    form.setFieldsValue({
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags
    });
    setModalVisible(true);
  };
  
  // 过滤提示词
  const filteredPrompts = selectedCategory
    ? prompts.filter(p => p.category === selectedCategory)
    : prompts;
  
  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Select
          style={{ width: 200 }}
          placeholder="选择分类"
          allowClear
          onChange={value => setSelectedCategory(value)}
        >
          {categories.map(category => (
            <Option key={category} value={category}>{category}</Option>
          ))}
        </Select>
        
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={showAddModal}
        >
          添加提示词
        </Button>
      </div>
      
      {filteredPrompts.map(prompt => (
        <Card 
          key={prompt.id}
          size="small"
          style={{ marginBottom: 8 }}
          title={prompt.title}
          extra={
            <div>
              <Tooltip title="编辑">
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  onClick={() => showEditModal(prompt)}
                  style={{ marginRight: 8 }}
                />
              </Tooltip>
              <Tooltip title="删除">
                <Button 
                  type="text" 
                  danger
                  icon={<DeleteOutlined />} 
                  onClick={() => handleDeletePrompt(prompt)}
                />
              </Tooltip>
            </div>
          }
        >
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: '#666', marginBottom: 8 }}>
              分类: <Tag color="blue">{prompt.category}</Tag>
            </div>
            <div>
              {prompt.tags.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          </div>
          
          <div style={{ marginTop: 16 }}>
            <Button 
              type="primary" 
              onClick={() => onUsePrompt(prompt.content)}
            >
              使用此提示词
            </Button>
          </div>
        </Card>
      ))}
      
      <Modal
        title={editingPrompt ? '编辑提示词' : '添加提示词'}
        open={modalVisible}
        onOk={handleAddOrEditPrompt}
        onCancel={() => {
          setModalVisible(false);
          setEditingPrompt(null);
        }}
        okText={editingPrompt ? '保存' : '添加'}
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入提示词标题' }]}
          >
            <Input placeholder="输入提示词标题" />
          </Form.Item>
          
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入提示词内容' }]}
          >
            <TextArea 
              placeholder="输入提示词内容" 
              autoSize={{ minRows: 4, maxRows: 8 }}
            />
          </Form.Item>
          
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="选择分类">
              {categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
            rules={[{ required: true, message: '请选择至少一个标签' }]}
          >
            <Select 
              mode="multiple" 
              placeholder="选择标签" 
              allowClear
            >
              {allTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CreativePrompts; 