import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, InputNumber, Tag, message, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { AIModel, AIProviderType } from '../types';
import { aiServiceManager } from '../services';
import { AISettingsService } from '../services/ai-settings-service';

const { Option } = Select;
const { Text } = Typography;

/**
 * AI模型管理组件
 */
const AIModelManager: React.FC = () => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  
  const aiSettingsService = AISettingsService.getInstance();

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await aiSettingsService.loadSettings();
      setProviders(settings.providers || []);
      setActiveProviderId(settings.activeProviderId || null);
      
      // 加载所有模型
      if (settings.models) {
        setModels(settings.models);
      }
    };
    
    loadSettings();
  }, []);

  // 从API获取OpenAI兼容模型
  const fetchCompatibleModels = async () => {
    try {
      if (!activeProviderId) {
        message.error('请先选择一个供应商');
        return;
      }
      
      const activeProvider = providers.find(p => p.id === activeProviderId);
      if (!activeProvider) {
        message.error('未找到当前供应商');
        return;
      }
      
      if (activeProvider.type !== AIProviderType.OPENAI_COMPATIBLE) {
        message.error('只有OpenAI兼容API才能自动获取模型列表');
        return;
      }
      
      setLoadingModels(true);
      const settings = await aiSettingsService.loadSettings();
      
      try {
        // 临时切换到当前供应商
        const tempSettings = {
          ...settings,
          activeProviderId: activeProviderId
        };
        
        // 确保服务初始化成功
        const initialized = await aiServiceManager.initialize(tempSettings);
        if (!initialized) {
          message.error('无法连接到API，请检查设置');
          setLoadingModels(false);
          return;
        }
        
        // 获取兼容模型
        const fetchedModels = await aiServiceManager.getAvailableModels();
        
        if (fetchedModels && fetchedModels.length > 0) {
          // 过滤已存在的模型
          const existingModelIds = models.filter(m => m.providerId === activeProviderId).map(m => m.id);
          const newModels = fetchedModels
            .filter(m => !existingModelIds.includes(m.id))
            .map(m => ({
              ...m,
              providerId: activeProviderId
            }));
          
          // 添加新模型
          if (newModels.length > 0) {
            const updatedModels = [...models, ...newModels];
            await aiSettingsService.saveModels(newModels, activeProviderId);
            setModels(updatedModels);
            message.success(`成功添加${newModels.length}个模型`);
          } else {
            message.info('没有发现新模型');
          }
        } else {
          message.info('无法获取模型列表，请检查API设置');
        }
      } catch (error) {
        console.error('获取兼容模型失败:', error);
        message.error(`获取模型失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error('获取兼容模型失败:', error);
      message.error('获取兼容模型失败');
    } finally {
      setLoadingModels(false);
    }
  };

  // 保存模型
  const saveModel = async (model: AIModel) => {
    try {
      setLoading(true);
      
      if (!activeProviderId) {
        message.error('请先选择一个供应商');
        setLoading(false);
        return;
      }
      
      // 确保模型有providerId
      const modelWithProvider = {
        ...model,
        providerId: model.providerId || activeProviderId
      };
      
      // 保存模型
      await aiSettingsService.saveModel(modelWithProvider);
      
      // 更新模型列表
      if (editingModel) {
        // 编辑现有模型
        setModels(models.map(m => m.id === model.id ? modelWithProvider : m));
      } else {
        // 添加新模型
        setModels([...models, modelWithProvider]);
      }
      
      message.success(editingModel ? '模型已更新' : '模型已添加');
      setModalVisible(false);
      form.resetFields();
      setEditingModel(null);
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
      const { id, name, providerId, description, maxTokens, contextWindow, capabilities } = values;
      
      const modelData: AIModel = {
        id: id || uuidv4(),
        name,
        providerId: providerId || activeProviderId || '',
        description,
        maxTokens,
        contextWindow,
        capabilities: capabilities || []
      };
      
      saveModel(modelData);
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
      onOk: async () => {
        try {
          setLoading(true);
          await aiSettingsService.deleteModel(model.id);
          setModels(models.filter(m => m.id !== model.id));
          message.success('模型已删除');
        } catch (error) {
          console.error('删除模型失败:', error);
          message.error('删除模型失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // 打开添加模型模态框
  const showAddModal = () => {
    if (!activeProviderId) {
      message.error('请先选择一个供应商');
      return;
    }
    
    setEditingModel(null);
    form.resetFields();
    form.setFieldsValue({
      providerId: activeProviderId
    });
    setModalVisible(true);
  };

  // 打开编辑模型模态框
  const showEditModal = (model: AIModel) => {
    setEditingModel(model);
    form.setFieldsValue({
      id: model.id,
      name: model.name,
      providerId: model.providerId,
      description: model.description || '',
      maxTokens: model.maxTokens,
      contextWindow: model.contextWindow,
      capabilities: model.capabilities || []
    });
    setModalVisible(true);
  };
  
  // 切换供应商
  const handleProviderChange = (providerId: string) => {
    setActiveProviderId(providerId);
  };

  // 表格列定义
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '供应商',
      dataIndex: 'providerId',
      key: 'providerId',
      render: (providerId: string) => {
        const provider = providers.find(p => p.id === providerId);
        return provider ? provider.name : providerId;
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
  
  // 过滤当前供应商的模型
  const filteredModels = activeProviderId 
    ? models.filter(model => model.providerId === activeProviderId)
    : models;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <Select
            placeholder="选择供应商"
            style={{ width: 200 }}
            value={activeProviderId || undefined}
            onChange={handleProviderChange}
          >
            {providers.map(provider => (
              <Option key={provider.id} value={provider.id}>{provider.name}</Option>
            ))}
          </Select>
          
          <div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showAddModal}
              style={{ marginRight: 8 }}
              disabled={!activeProviderId}
            >
              添加模型
            </Button>
            
            <Button
              icon={<SyncOutlined />}
              onClick={fetchCompatibleModels}
              loading={loadingModels}
              disabled={!activeProviderId || providers.find(p => p.id === activeProviderId)?.type !== AIProviderType.OPENAI_COMPATIBLE}
            >
              从API获取模型
            </Button>
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeProviderId ? (
          <Table
            dataSource={filteredModels}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={false}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Text>请先选择一个供应商</Text>
          </div>
        )}
      </div>
      
      <Modal
        title={editingModel ? '编辑模型' : '添加模型'}
        open={modalVisible}
        onOk={handleAddOrEditModel}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
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
            name="providerId"
            label="所属供应商"
            rules={[{ required: true, message: '请选择所属供应商' }]}
          >
            <Select placeholder="选择所属供应商">
              {providers.map(provider => (
                <Option key={provider.id} value={provider.id}>{provider.name}</Option>
              ))}
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
    </div>
  );
};

export default AIModelManager; 