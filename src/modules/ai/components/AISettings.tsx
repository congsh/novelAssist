import React, { useEffect, useState } from 'react';
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Card, 
  Slider, 
  InputNumber, 
  Space, 
  message,
  Divider,
  Tooltip,
  Tabs,
  Table,
  Modal,
  Row,
  Col
} from 'antd';
import { 
  ApiOutlined, 
  KeyOutlined, 
  SaveOutlined, 
  SettingOutlined,
  LinkOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  SlidersOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { AIProviderType, AIProvider } from '../types';
import { AISettingsService } from '../services/ai-settings-service';
import { aiServiceManager } from '../services';
import AIModelManager from './AIModelManager';
import AIScenarioSettings from './AIScenarioSettings';
import { ModelManager } from '../../../renderer/components/ModelManager';
import { v4 as uuidv4 } from 'uuid';

const { Option } = Select;
const { TabPane } = Tabs;

/**
 * AI设置组件 - 简化版
 */
const AISettings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  
  const aiSettingsService = AISettingsService.getInstance();
  
  // 获取当前选择的提供商类型
  const providerType = Form.useWatch('type', form);

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await aiSettingsService.loadSettings();
      
      setSettings(settings);
      setProviders(settings.providers || []);
      setActiveProviderId(settings.activeProviderId || null);
      
      // 如果有活动提供商，加载其数据
      if (settings.activeProviderId) {
        const activeProvider = settings.providers.find(p => p.id === settings.activeProviderId);
        if (activeProvider) {
          form.setFieldsValue({
            ...activeProvider,
            apiKey: activeProvider.apiKey ? '********' : '', // 隐藏API密钥
          });
        }
      }
    };
    
    loadSettings();
  }, [form]);
  
  // 保存设置
  const handleSave = async (values: any) => {
    setLoading(true);
    
    try {
      if (!activeProviderId) {
        message.error('请先选择或创建一个供应商');
        setLoading(false);
        return;
      }
      
      // 如果API密钥是星号，则保留原来的密钥
      if (values.apiKey === '********') {
        const currentProvider = providers.find(p => p.id === activeProviderId);
        if (currentProvider && currentProvider.apiKey) {
          values.apiKey = currentProvider.apiKey;
        }
      }
      
      // 更新供应商信息
      const updatedProvider: AIProvider = {
        ...values,
        id: activeProviderId
      };
      
      // 更新providers列表
      const updatedProviders = providers.map(p => 
        p.id === activeProviderId ? updatedProvider : p
      );
      
      // 更新settings
      const updatedSettings = {
        ...settings,
        providers: updatedProviders,
        activeProviderId
      };
      
      await aiSettingsService.saveSettings(updatedSettings);
      setProviders(updatedProviders);
      setSettings(updatedSettings);
      
      message.success('设置已保存');
    } catch (error) {
      console.error('保存设置失败:', error);
      message.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 测试连接
  const handleTestConnection = async () => {
    setTesting(true);
    
    try {
      const values = await form.validateFields();
      
      // 如果API密钥是星号，则保留原来的密钥
      if (values.apiKey === '********' && activeProviderId) {
        const currentProvider = providers.find(p => p.id === activeProviderId);
        if (currentProvider && currentProvider.apiKey) {
          values.apiKey = currentProvider.apiKey;
        }
      }
      
      // 检查是否有有效的API密钥
      if (!values.apiKey && [AIProviderType.OPENAI, AIProviderType.DEEPSEEK, AIProviderType.OPENAI_COMPATIBLE].includes(values.type)) {
        message.error('请输入API密钥');
        setTesting(false);
        return;
      }
      
      // 创建临时供应商对象，确保ID不是default-openai
      const testProviderId = activeProviderId || `temp-provider-${Date.now()}`;
        
      const testProvider: AIProvider = {
        ...values,
        id: testProviderId
      };
      
      // 创建临时设置对象
      const testSettings = {
        ...settings,
        activeProviderId: testProviderId,
        providers: [testProvider]
      };
      
      // 检查AI是否已配置
      const isConfigured = await aiSettingsService.hasConfiguredAI(testSettings);
      if (!isConfigured) {
        message.error('配置不完整，请确保填写了所有必要字段');
        setTesting(false);
        return;
      }
      
      const success = await aiServiceManager.initialize(testSettings);
      
      if (success) {
        message.success('连接成功');
      } else {
        message.error('连接失败，请检查设置');
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      message.error(`连接失败: ${error instanceof Error ? error.message : '请检查设置'}`);
    } finally {
      setTesting(false);
    }
  };
  
  // 切换供应商
  const handleProviderChange = async (providerId: string) => {
    try {
      // 保存当前表单数据
      if (activeProviderId) {
        try {
          const values = await form.validateFields();
          
          // 如果API密钥是星号，则保留原来的密钥
          if (values.apiKey === '********') {
            const currentProvider = providers.find(p => p.id === activeProviderId);
            if (currentProvider && currentProvider.apiKey) {
              values.apiKey = currentProvider.apiKey;
            }
          }
          
          // 更新供应商信息
          const updatedProvider: AIProvider = {
            ...values,
            id: activeProviderId
          };
          
          // 更新providers列表
          const updatedProviders = providers.map(p => 
            p.id === activeProviderId ? updatedProvider : p
          );
          
          setProviders(updatedProviders);
        } catch (error) {
          console.error('保存当前供应商失败:', error);
        }
      }
      
      // 加载选择的供应商
      const selectedProvider = providers.find(p => p.id === providerId);
      if (selectedProvider) {
      setActiveProviderId(providerId);
        form.setFieldsValue({
          ...selectedProvider,
          apiKey: selectedProvider.apiKey ? '********' : '', // 隐藏API密钥
        });
      }
    } catch (error) {
      console.error('切换供应商失败:', error);
      message.error('切换供应商失败');
    }
  };
  
  // 创建新供应商
  const showCreateProviderModal = () => {
    setEditingProvider(null);
    setModalVisible(true);
    form.resetFields();
  };
  
  // 处理创建供应商
  const handleCreateProvider = async () => {
    try {
      const values = await form.validateFields();
      
      // 创建新供应商
      const newProvider: AIProvider = {
        ...values,
        id: uuidv4()
      };
      
      // 更新providers列表
      const updatedProviders = [...providers, newProvider];
      
      // 更新settings
      const updatedSettings = {
        ...settings,
        providers: updatedProviders,
        activeProviderId: newProvider.id
      };
      
      await aiSettingsService.saveSettings(updatedSettings);
      setProviders(updatedProviders);
      setSettings(updatedSettings);
      setActiveProviderId(newProvider.id);
      setModalVisible(false);
      
      message.success('供应商创建成功');
    } catch (error) {
      console.error('创建供应商失败:', error);
      message.error('创建供应商失败');
    }
  };
  
  // 删除供应商
  const handleDeleteProvider = async (providerId: string) => {
    try {
      // 过滤掉要删除的供应商
          const updatedProviders = providers.filter(p => p.id !== providerId);
          
      // 如果删除的是当前活动的供应商，则需要重新选择一个
          let newActiveProviderId = activeProviderId;
          if (providerId === activeProviderId) {
            newActiveProviderId = updatedProviders.length > 0 ? updatedProviders[0].id : null;
          }
          
          // 更新settings
          const updatedSettings = {
            ...settings,
            providers: updatedProviders,
        activeProviderId: newActiveProviderId
          };
          
          await aiSettingsService.saveSettings(updatedSettings);
          setProviders(updatedProviders);
          setSettings(updatedSettings);
          setActiveProviderId(newActiveProviderId);
          
      // 如果有新的活动提供商，加载其数据
          if (newActiveProviderId) {
        const activeProvider = updatedProviders.find(p => p.id === newActiveProviderId);
        if (activeProvider) {
              form.setFieldsValue({
            ...activeProvider,
            apiKey: activeProvider.apiKey ? '********' : '', // 隐藏API密钥
              });
            }
          } else {
            form.resetFields();
          }
          
      message.success('供应商删除成功');
    } catch (error) {
      console.error('删除供应商失败:', error);
      message.error('删除供应商失败');
    }
  };
  
  // 渲染提供商类型特定字段
  const renderProviderTypeSpecificFields = () => {
    if (!providerType) return null;
    
    switch (providerType) {
      case AIProviderType.OPENAI:
        return (
          <>
            <Form.Item
              name="baseUrl"
              label="API基础URL"
              tooltip="OpenAI API的基础URL，默认为https://api.openai.com"
              rules={[{ type: 'url', message: '请输入有效的URL' }]}
            >
              <Input placeholder="https://api.openai.com" addonBefore={<GlobalOutlined />} />
            </Form.Item>
          </>
        );
      case AIProviderType.DEEPSEEK:
        return (
          <>
            <Form.Item
              name="baseUrl"
              label="API基础URL"
              tooltip="DeepSeek API的基础URL"
              rules={[{ type: 'url', message: '请输入有效的URL' }]}
            >
              <Input placeholder="https://api.deepseek.com" addonBefore={<GlobalOutlined />} />
            </Form.Item>
          </>
        );
      case AIProviderType.OLLAMA:
        return (
          <>
            <Form.Item
              name="baseUrl"
              label="Ollama服务URL"
              tooltip="本地Ollama服务的URL，通常为http://localhost:11434"
              rules={[{ type: 'url', message: '请输入有效的URL' }]}
            >
              <Input placeholder="http://localhost:11434" addonBefore={<GlobalOutlined />} />
            </Form.Item>
          </>
        );
      case AIProviderType.LMSTUDIO:
        return (
          <>
            <Form.Item
              name="baseUrl"
              label="LM Studio服务URL"
              tooltip="本地LM Studio服务的URL，通常为http://localhost:1234"
              rules={[{ type: 'url', message: '请输入有效的URL' }]}
            >
              <Input placeholder="http://localhost:1234" addonBefore={<GlobalOutlined />} />
            </Form.Item>
          </>
        );
      case AIProviderType.OPENAI_COMPATIBLE:
        return (
          <>
            <Form.Item
              name="baseUrl"
              label="API基础URL"
              tooltip="兼容OpenAI的API基础URL"
              rules={[{ required: true, type: 'url', message: '请输入有效的URL' }]}
            >
              <Input placeholder="https://api.example.com" addonBefore={<GlobalOutlined />} />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };
  
  // 渲染供应商列表
  const renderProviderList = () => {
    const columns = [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        render: (type: AIProviderType) => {
          switch (type) {
            case AIProviderType.OPENAI: return 'OpenAI';
            case AIProviderType.DEEPSEEK: return 'DeepSeek';
            case AIProviderType.OLLAMA: return 'Ollama';
            case AIProviderType.LMSTUDIO: return 'LM Studio';
            case AIProviderType.OPENAI_COMPATIBLE: return 'OpenAI兼容';
            default: return type;
          }
        }
      },
      {
        title: '操作',
        key: 'action',
        render: (_: any, record: AIProvider) => (
          <Space size="small">
            <Button
              type={record.id === activeProviderId ? "primary" : "default"}
              size="small"
              onClick={() => handleProviderChange(record.id)}
            >
              {record.id === activeProviderId ? '当前' : '选择'}
            </Button>
            <Button
              danger
              size="small"
              onClick={() => handleDeleteProvider(record.id)}
              disabled={providers.length <= 1}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ];
    
    return (
      <Card title="AI服务提供商" extra={<Button type="primary" icon={<PlusOutlined />} onClick={showCreateProviderModal}>添加</Button>}>
        <Table
          dataSource={providers}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    );
  };
  
  return (
    <div className="ai-settings">
      <Row gutter={[16, 16]}>
        <Col span={24}>
              {renderProviderList()}
        </Col>
              
        <Col span={24}>
          <Card title="当前服务设置">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSave}
                  initialValues={{
                    type: AIProviderType.OPENAI,
                baseUrl: 'https://api.openai.com',
                    temperature: 0.7,
                maxTokens: 2000
                  }}
                >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="名称"
                    rules={[{ required: true, message: '请输入供应商名称' }]}
                  >
                    <Input placeholder="例如：我的OpenAI" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="type"
                    label="类型"
                    rules={[{ required: true, message: '请选择供应商类型' }]}
                  >
                    <Select>
                      <Option value={AIProviderType.OPENAI}>OpenAI</Option>
                      <Option value={AIProviderType.DEEPSEEK}>DeepSeek</Option>
                      <Option value={AIProviderType.OLLAMA}>Ollama</Option>
                      <Option value={AIProviderType.LMSTUDIO}>LM Studio</Option>
                      <Option value={AIProviderType.OPENAI_COMPATIBLE}>OpenAI兼容</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
                  
                  <Form.Item
                name="apiKey"
                label="API密钥"
                tooltip="您的API密钥，将安全存储在本地"
                rules={[{ required: providerType !== AIProviderType.OLLAMA && providerType !== AIProviderType.LMSTUDIO, message: '请输入API密钥' }]}
                  >
                <Input.Password placeholder="sk-..." addonBefore={<KeyOutlined />} />
                  </Form.Item>
                  
              {renderProviderTypeSpecificFields()}
                  
                  <Form.Item>
                    <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                        保存设置
                      </Button>
                  <Button onClick={handleTestConnection} icon={<ApiOutlined />} loading={testing}>
                        测试连接
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
            </Card>
        </Col>
      </Row>
        
      <Tabs defaultActiveKey="models" style={{ marginTop: 16 }}>
        <TabPane tab={<span><AppstoreOutlined /> 对话模型</span>} key="models">
              <AIModelManager />
        </TabPane>
        <TabPane tab={<span><DownloadOutlined /> 嵌入模型</span>} key="embeddings">
              <ModelManager />
        </TabPane>
        <TabPane tab={<span><SlidersOutlined /> 场景设置</span>} key="scenarios">
              <AIScenarioSettings />
        </TabPane>
      </Tabs>
      
      <Modal
        title="添加AI服务提供商"
        open={modalVisible}
        onOk={handleCreateProvider}
        onCancel={() => setModalVisible(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: AIProviderType.OPENAI,
            baseUrl: 'https://api.openai.com',
            temperature: 0.7,
            maxTokens: 2000
          }}
        >
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入供应商名称' }]}
          >
            <Input placeholder="例如：我的OpenAI" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择供应商类型' }]}
          >
            <Select>
              <Option value={AIProviderType.OPENAI}>OpenAI</Option>
              <Option value={AIProviderType.DEEPSEEK}>DeepSeek</Option>
              <Option value={AIProviderType.OLLAMA}>Ollama</Option>
              <Option value={AIProviderType.LMSTUDIO}>LM Studio</Option>
              <Option value={AIProviderType.OPENAI_COMPATIBLE}>OpenAI兼容</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="apiKey"
            label="API密钥"
            tooltip="您的API密钥，将安全存储在本地"
            rules={[{ required: providerType !== AIProviderType.OLLAMA && providerType !== AIProviderType.LMSTUDIO, message: '请输入API密钥' }]}
          >
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          
          {renderProviderTypeSpecificFields()}
        </Form>
      </Modal>
    </div>
  );
};

export default AISettings; 