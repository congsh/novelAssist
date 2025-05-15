import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, InputNumber, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { AIModel, AIProvider } from '../types';
import { aiServiceManager } from '../services';

const { Option } = Select;

/**
 * AI模型管理组件
 */
const AIModelManager: React.FC = () => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 加载模型
  useEffect(() => {
    loadModels();
  }, []);

  // 从设置中加载模型
  const loadModels = async () => {
    try {
      const settings = aiServiceManager.getSettings();
      if (settings && settings.models) {
        setModels(settings.models);
      }
    } catch (error) {
      console.error('加载模型失败:', error);
      message.error('加载模型失败');
    }
  };

  // 保存模型
  const saveModels = async (updatedModels: AIModel[]) => {
    try {
      setLoading(true);
      
      const settings = aiServiceManager.getSettings();
      if (settings) {
        const newSettings = {
          ...settings,
          models: updatedModels
        };
        
        await aiServiceManager.initialize(newSettings);
        message.success('模型已保存');
        setModels(updatedModels);
      }
    } catch (error) {
      console.error('保存模型失败:', error);
      message.error('保存模型失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加或编辑模型
  const handleAddOrEditModel = () => {
    form.validateFields().then(values => {
      const { id, name, provider, description, maxTokens, contextWindow, capabilities } = values;
      
      const modelData: AIModel = {
        id: id || uuidv4(),
        name,
        provider,
        description,
        maxTokens,
        contextWindow,
        capabilities: capabilities || []
      };
      
      let updatedModels: AIModel[];
      
      if (editingModel) {
        // 编辑现有模型
        updatedModels = models.map(m => 
          m.id === editingModel.id ? modelData : m
        );
        message.success('模型已更新');
      } else {
        // 添加新模型
        updatedModels = [...models, modelData];
        message.success('模型已添加');
      }
      
      saveModels(updatedModels);
      setModalVisible(false);
      form.resetFields();
      setEditingModel(null);
    });
  };

  // 删除模型
  const handleDeleteModel = (model: AIModel) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除模型 "${model.name}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const updatedModels = models.filter(m => m.id !== model.id);
        saveModels(updatedModels);
      }
    });
  };

  // 打开添加模型模态框
  const showAddModal = () => {
    setEditingModel(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 打开编辑模型模态框
  const showEditModal = (model: AIModel) => {
    setEditingModel(model);
    form.setFieldsValue({
      id: model.id,
      name: model.name,
      provider: model.provider,
      description: model.description || '',
      maxTokens: model.maxTokens,
      contextWindow: model.contextWindow,
      capabilities: model.capabilities || []
    });
    setModalVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider: AIProvider) => {
        const providerLabels: Record<AIProvider, string> = {
          [AIProvider.OPENAI]: 'OpenAI',
          [AIProvider.DEEPSEEK]: 'DeepSeek',
          [AIProvider.OLLAMA]: 'Ollama',
          [AIProvider.LMSTUDIO]: 'LM Studio',
          [AIProvider.OPENAI_COMPATIBLE]: 'OpenAI兼容'
        };
        
        return providerLabels[provider] || provider;
      }
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '最大Token',
      dataIndex: 'maxTokens',
      key: 'maxTokens',
    },
    {
      title: '上下文窗口',
      dataIndex: 'contextWindow',
      key: 'contextWindow',
    },
    {
      title: '功能',
      dataIndex: 'capabilities',
      key: 'capabilities',
      render: (capabilities: string[]) => (
        <>
          {capabilities && capabilities.map(cap => (
            <Tag key={cap} color="blue">{cap}</Tag>
          ))}
        </>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: AIModel) => (
        <span>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            style={{ marginRight: 8 }}
          >
            编辑
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteModel(record)}
          >
            删除
          </Button>
        </span>
      ),
    },
  ];

  // 预设的模型功能
  const modelCapabilities = [
    '文本生成',
    '对话',
    '代码生成',
    '内容总结',
    '文本分类',
    '情感分析',
    '翻译',
    '创意写作'
  ];

  return (
    <Card title="AI模型管理">
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={showAddModal}
        style={{ marginBottom: 16 }}
      >
        添加模型
      </Button>
      
      <Table
        dataSource={models}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
      />
      
      <Modal
        title={editingModel ? '编辑模型' : '添加模型'}
        open={modalVisible}
        onOk={handleAddOrEditModel}
        onCancel={() => {
          setModalVisible(false);
          setEditingModel(null);
        }}
        okText={editingModel ? '保存' : '添加'}
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          {editingModel && (
            <Form.Item name="id" hidden>
              <Input />
            </Form.Item>
          )}
          
          <Form.Item
            name="name"
            label="模型名称"
            rules={[{ required: true, message: '请输入模型名称' }]}
          >
            <Input placeholder="输入模型名称，如gpt-3.5-turbo" />
          </Form.Item>
          
          <Form.Item
            name="provider"
            label="AI提供商"
            rules={[{ required: true, message: '请选择AI提供商' }]}
          >
            <Select placeholder="选择AI提供商">
              <Option value={AIProvider.OPENAI}>OpenAI</Option>
              <Option value={AIProvider.DEEPSEEK}>DeepSeek</Option>
              <Option value={AIProvider.OLLAMA}>Ollama</Option>
              <Option value={AIProvider.LMSTUDIO}>LM Studio</Option>
              <Option value={AIProvider.OPENAI_COMPATIBLE}>OpenAI兼容API</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="输入模型描述" />
          </Form.Item>
          
          <Form.Item
            name="maxTokens"
            label="最大Token数"
            tooltip="模型可以生成的最大标记数量"
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="如: 4096" />
          </Form.Item>
          
          <Form.Item
            name="contextWindow"
            label="上下文窗口大小"
            tooltip="模型可以处理的上下文窗口大小（Token数）"
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="如: 8192" />
          </Form.Item>
          
          <Form.Item
            name="capabilities"
            label="模型功能"
            tooltip="模型支持的功能"
          >
            <Select mode="multiple" placeholder="选择模型支持的功能">
              {modelCapabilities.map(cap => (
                <Option key={cap} value={cap}>{cap}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AIModelManager; 