import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, Input, Modal, Form, Select, message, Tooltip, Empty, Row, Col, Divider, Space, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, SearchOutlined, CopyOutlined, SendOutlined, FilterOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { CreativePrompt } from '../types';

const { TextArea } = Input;
const { Option } = Select;
const { Search } = Input;
const { Text, Title } = Typography;

interface CreativePromptsProps {
  onUsePrompt: (promptText: string) => void;
}

/**
 * 创作提示词组件 - 增强版
 * 提供创作提示词的管理、搜索和使用功能
 */
const CreativePrompts: React.FC<CreativePromptsProps> = ({ onUsePrompt }) => {
  const [prompts, setPrompts] = useState<CreativePrompt[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CreativePrompt | null>(null);
  const [form] = Form.useForm();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [filterVisible, setFilterVisible] = useState(false);
  
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

  // 复制提示词到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        message.success('已复制到剪贴板');
      },
      () => {
        message.error('复制失败');
      }
    );
  };
  
  // 切换标签筛选
  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };
  
  // 清除所有筛选条件
  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedTags([]);
    setSearchText('');
    setFilterVisible(false);
  };
  
  // 过滤提示词
  const getFilteredPrompts = () => {
    let filtered = prompts;
    
    // 按分类过滤
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    // 按标签过滤
    if (selectedTags.length > 0) {
      filtered = filtered.filter(p => 
        selectedTags.some(tag => p.tags.includes(tag))
      );
    }
    
    // 按搜索文本过滤
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(lowerSearch) || 
        p.content.toLowerCase().includes(lowerSearch) ||
        p.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
      );
    }
    
    return filtered;
  };
  
  const filteredPrompts = getFilteredPrompts();
  
  // 获取所有标签及其使用次数
  const getTagCounts = () => {
    const tagCounts: Record<string, number> = {};
    prompts.forEach(prompt => {
      prompt.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return tagCounts;
  };
  
  const tagCounts = getTagCounts();
  
  // 渲染提示词卡片
  const renderPromptCard = (prompt: CreativePrompt) => (
    <Card 
      key={prompt.id}
      size="small"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tooltip title={prompt.title}>
            <span style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              maxWidth: '200px'
            }}>
              {prompt.title}
            </span>
          </Tooltip>
          <Tag color="blue">{prompt.category}</Tag>
        </div>
      }
      style={{ 
        marginBottom: 16, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        borderRadius: '8px',
        transition: 'all 0.3s'
      }}
      hoverable
      actions={[
        <Tooltip title="复制">
          <CopyOutlined key="copy" onClick={() => copyToClipboard(prompt.content)} />
        </Tooltip>,
        <Tooltip title="使用">
          <SendOutlined key="use" onClick={() => onUsePrompt(prompt.content)} />
        </Tooltip>,
        <Tooltip title="编辑">
          <EditOutlined key="edit" onClick={() => showEditModal(prompt)} />
        </Tooltip>,
        <Tooltip title="删除">
          <DeleteOutlined key="delete" onClick={() => handleDeletePrompt(prompt)} />
        </Tooltip>
      ]}
    >
      <div style={{ marginBottom: 12 }}>
        <div>
          {prompt.tags.map(tag => (
            <Tag 
              key={tag} 
              color="processing" 
              style={{ marginBottom: 4, cursor: 'pointer' }}
              onClick={() => toggleTagFilter(tag)}
          >
              {tag}
            </Tag>
          ))}
        </div>
      </div>
      
      <div style={{ 
        height: 80, 
        overflow: 'hidden', 
        textOverflow: 'ellipsis', 
        marginBottom: 12,
        fontSize: 13,
        color: '#595959',
        whiteSpace: 'pre-wrap',
        position: 'relative'
      }}>
        <Text style={{ wordBreak: 'break-word' }}>
          {prompt.content}
        </Text>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '30px',
          background: 'linear-gradient(transparent, white)'
        }} />
      </div>
    </Card>
  );
  
  // 渲染筛选器
  const renderFilters = () => (
          <Card 
            size="small"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>高级筛选</span>
          <Button type="link" onClick={clearAllFilters} size="small">
            清除筛选
          </Button>
              </div>
            }
      style={{ marginBottom: 16, display: filterVisible ? 'block' : 'none' }}
          >
      <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 8 }}>
          <Text strong>分类</Text>
              </div>
              <div>
          {categories.map(category => (
            <Tag 
              key={category}
              color={selectedCategory === category ? 'blue' : 'default'}
              style={{ marginBottom: 8, cursor: 'pointer' }}
              onClick={() => setSelectedCategory(prev => prev === category ? null : category)}
            >
              {category}
            </Tag>
                ))}
              </div>
            </div>
            
      <div>
        <div style={{ marginBottom: 8 }}>
          <Text strong>标签</Text>
        </div>
        <div>
          {Object.entries(tagCounts).map(([tag, count]) => (
            <Tag 
              key={tag}
              color={selectedTags.includes(tag) ? 'processing' : 'default'}
              style={{ marginBottom: 8, cursor: 'pointer' }}
              onClick={() => toggleTagFilter(tag)}
            >
              {tag} ({count})
            </Tag>
          ))}
        </div>
      </div>
    </Card>
  );
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 8px' }}>
      <div style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={16}>
            <Search
              placeholder="搜索提示词..."
              allowClear
              enterButton
              onSearch={value => setSearchText(value)}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} md={4}>
            <Button 
              icon={<FilterOutlined />} 
              onClick={() => setFilterVisible(!filterVisible)}
              style={{ width: '100%' }}
              type={filterVisible ? 'primary' : 'default'}
            >
              筛选
            </Button>
          </Col>
          <Col xs={12} md={4}>
              <Button 
                type="primary" 
              icon={<PlusOutlined />} 
              onClick={showAddModal}
              style={{ width: '100%' }}
              >
              添加
              </Button>
          </Col>
        </Row>
            </div>
      
      {renderFilters()}
      
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        paddingRight: 4 
      }}>
        {filteredPrompts.length > 0 ? (
          <Row gutter={[16, 16]}>
            {filteredPrompts.map(prompt => (
              <Col xs={24} sm={12} md={8} lg={8} xl={6} key={prompt.id}>
                {renderPromptCard(prompt)}
              </Col>
        ))}
          </Row>
        ) : (
          <Empty 
            description={
              <span>
                {searchText || selectedCategory || selectedTags.length > 0 
                  ? "没有找到匹配的提示词" 
                  : "暂无提示词"}
              </span>
            }
            style={{ margin: '40px 0' }}
          >
            <Button type="primary" onClick={showAddModal} icon={<PlusOutlined />}>
              添加提示词
            </Button>
          </Empty>
        )}
      </div>
      
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>{editingPrompt ? '编辑提示词' : '添加提示词'}</span>
            <Tooltip title="提示词可以包含[占位符]，用于标记需要替换的内容">
              <InfoCircleOutlined style={{ marginLeft: 8 }} />
            </Tooltip>
          </div>
        }
        open={modalVisible}
        onOk={handleAddOrEditPrompt}
        onCancel={() => setModalVisible(false)}
        okText={editingPrompt ? '保存' : '添加'}
        cancelText="取消"
        destroyOnClose
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入提示词标题' }]}
          >
            <Input placeholder="输入提示词标题" maxLength={50} />
          </Form.Item>
          
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入提示词内容' }]}
            tooltip="可以使用[占位符]表示需要替换的内容"
          >
            <TextArea 
              placeholder="输入提示词内容，可以使用[占位符]表示需要替换的内容" 
              rows={8}
              showCount
              maxLength={1000}
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
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
            </Col>
          
            <Col span={12}>
          <Form.Item
            name="tags"
            label="标签"
            rules={[{ required: true, message: '请选择至少一个标签' }]}
          >
            <Select 
              mode="multiple" 
              placeholder="选择标签" 
                  style={{ width: '100%' }}
              allowClear
            >
              {allTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default CreativePrompts; 