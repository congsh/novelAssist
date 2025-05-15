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
  Modal
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
  DeleteOutlined
} from '@ant-design/icons';
import { AIProviderType, AIProvider } from '../types';
import { AISettingsService } from '../services/ai-settings-service';
import { aiServiceManager } from '../services';
import AIModelManager from './AIModelManager';
import AIScenarioSettings from './AIScenarioSettings';
import { v4 as uuidv4 } from 'uuid';

const { Option } = Select;
const { TabPane } = Tabs;

/**
 * AI设置组件
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
      
      // 创建临时供应商对象
      const testProvider: AIProvider = {
        ...values,
        id: activeProviderId || 'temp-provider'
      };
      
      // 创建临时设置对象
      const testSettings = {
        ...settings,
        activeProviderId: testProvider.id,
        providers: [testProvider]
      };
      
      const success = await aiServiceManager.initialize(testSettings);
      
      if (success) {
        message.success('连接成功');
      } else {
        message.error('连接失败，请检查设置');
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      message.error('连接失败，请检查设置');
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
          
          // 更新settings
          const updatedSettings = {
            ...settings,
            providers: updatedProviders
          };
          
          setSettings(updatedSettings);
        } catch (error) {
          console.error('保存当前表单数据失败:', error);
        }
      }
      
      // 设置新的活动供应商
      setActiveProviderId(providerId);
      
      // 更新settings中的activeProviderId
      const updatedSettings = {
        ...settings,
        activeProviderId: providerId
      };
      
      await aiSettingsService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      
      // 加载新供应商的数据
      const provider = providers.find(p => p.id === providerId);
      if (provider) {
        form.setFieldsValue({
          ...provider,
          apiKey: provider.apiKey ? '********' : '', // 隐藏API密钥
        });
      }
    } catch (error) {
      console.error('切换供应商失败:', error);
      message.error('切换供应商失败');
    }
  };
  
  // 打开创建供应商对话框
  const showCreateProviderModal = () => {
    setEditingProvider(null);
    form.resetFields();
    setModalVisible(true);
  };
  
  // 创建新供应商
  const handleCreateProvider = async () => {
    try {
      const values = await form.validateFields();
      
      const newProvider: AIProvider = {
        ...values,
        id: uuidv4(),
        defaultModel: values.defaultModel || 'gpt-3.5-turbo',
        temperature: values.temperature || 0.7,
        maxTokens: values.maxTokens || 1000
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
      
      // 重新加载表单数据
      form.setFieldsValue({
        ...newProvider,
        apiKey: newProvider.apiKey ? '********' : '', // 隐藏API密钥
      });
      
      message.success('创建供应商成功');
    } catch (error) {
      console.error('创建供应商失败:', error);
      message.error('创建供应商失败');
    }
  };
  
  // 删除供应商
  const handleDeleteProvider = async (providerId: string) => {
    try {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除此供应商吗？相关的模型和配置也将被删除。',
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          // 更新providers列表
          const updatedProviders = providers.filter(p => p.id !== providerId);
          
          // 如果删除的是当前活动供应商，切换到第一个供应商
          let newActiveProviderId = activeProviderId;
          if (providerId === activeProviderId) {
            newActiveProviderId = updatedProviders.length > 0 ? updatedProviders[0].id : null;
          }
          
          // 更新settings
          const updatedSettings = {
            ...settings,
            providers: updatedProviders,
            activeProviderId: newActiveProviderId,
            // 过滤掉该供应商的模型
            models: settings.models.filter((m: any) => m.providerId !== providerId)
          };
          
          await aiSettingsService.saveSettings(updatedSettings);
          
          setProviders(updatedProviders);
          setSettings(updatedSettings);
          setActiveProviderId(newActiveProviderId);
          
          // 如果有新的活动供应商，加载其数据
          if (newActiveProviderId) {
            const provider = updatedProviders.find(p => p.id === newActiveProviderId);
            if (provider) {
              form.setFieldsValue({
                ...provider,
                apiKey: provider.apiKey ? '********' : '', // 隐藏API密钥
              });
            }
          } else {
            form.resetFields();
          }
          
          message.success('删除供应商成功');
        }
      });
    } catch (error) {
      console.error('删除供应商失败:', error);
      message.error('删除供应商失败');
    }
  };
  
  // 根据提供商类型显示不同的表单项
  const renderProviderTypeSpecificFields = () => {
    const type = form.getFieldValue('type');
    
    switch (type) {
      case AIProviderType.OPENAI:
        return (
          <>
            <Form.Item
              label="API密钥"
              name="apiKey"
              rules={[{ required: true, message: '请输入OpenAI API密钥' }]}
            >
              <Input.Password 
                prefix={<KeyOutlined />} 
                placeholder="sk-..." 
              />
            </Form.Item>
            
            <Form.Item
              label="API基础URL"
              name="baseUrl"
              tooltip="可选，用于自定义API端点或使用代理"
            >
              <Input 
                prefix={<GlobalOutlined />} 
                placeholder="https://api.openai.com/v1" 
              />
            </Form.Item>
          </>
        );
        
      case AIProviderType.DEEPSEEK:
        return (
          <>
            <Form.Item
              label="API密钥"
              name="apiKey"
              rules={[{ required: true, message: '请输入DeepSeek API密钥' }]}
            >
              <Input.Password 
                prefix={<KeyOutlined />} 
                placeholder="sk-..." 
              />
            </Form.Item>
            
            <Form.Item
              label="API基础URL"
              name="baseUrl"
              tooltip="DeepSeek API基础URL"
            >
              <Input 
                prefix={<GlobalOutlined />} 
                placeholder="https://api.deepseek.com/v1" 
              />
            </Form.Item>
          </>
        );
        
      case AIProviderType.OPENAI_COMPATIBLE:
        return (
          <>
            <Form.Item
              label="API基础URL"
              name="baseUrl"
              rules={[{ required: true, message: '请输入API基础URL' }]}
              tooltip="兼容OpenAI API的服务地址，如Azure OpenAI、自托管服务等"
            >
              <Input 
                prefix={<GlobalOutlined />} 
                placeholder="https://your-api-endpoint.com/v1" 
              />
            </Form.Item>
            
            <Form.Item
              label="API密钥"
              name="apiKey"
              tooltip="某些兼容服务可能不需要API密钥"
            >
              <Input.Password 
                prefix={<KeyOutlined />} 
                placeholder="API密钥（如需要）" 
              />
            </Form.Item>
          </>
        );
        
      case AIProviderType.OLLAMA:
        return (
          <>
            <Form.Item
              label="服务器URL"
              name="localServerUrl"
              rules={[{ required: true, message: '请输入Ollama服务器URL' }]}
              initialValue="http://localhost:11434"
            >
              <Input 
                prefix={<LinkOutlined />} 
                placeholder="http://localhost:11434" 
              />
            </Form.Item>
          </>
        );
        
      case AIProviderType.LMSTUDIO:
        return (
          <>
            <Form.Item
              label="服务器URL"
              name="localServerUrl"
              rules={[{ required: true, message: '请输入LMStudio服务器URL' }]}
              initialValue="http://localhost:1234/v1"
            >
              <Input 
                prefix={<LinkOutlined />} 
                placeholder="http://localhost:1234/v1" 
              />
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
          const typeLabels: Record<AIProviderType, string> = {
            [AIProviderType.OPENAI]: 'OpenAI',
            [AIProviderType.DEEPSEEK]: 'DeepSeek',
            [AIProviderType.OLLAMA]: 'Ollama',
            [AIProviderType.LMSTUDIO]: 'LM Studio',
            [AIProviderType.OPENAI_COMPATIBLE]: 'OpenAI兼容'
          };
          
          return typeLabels[type] || type;
        }
      },
      {
        title: '操作',
        key: 'action',
        render: (_: any, record: AIProvider) => (
          <Space>
            <Button
              type={record.id === activeProviderId ? 'primary' : 'default'}
              size="small"
              onClick={() => handleProviderChange(record.id)}
            >
              {record.id === activeProviderId ? '当前使用' : '使用'}
            </Button>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleDeleteProvider(record.id)}
              disabled={providers.length <= 1} // 禁止删除最后一个供应商
            >
              删除
            </Button>
          </Space>
        ),
      },
    ];
    
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3>供应商列表</h3>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showCreateProviderModal}
          >
            添加供应商
          </Button>
        </div>
        <Table
          dataSource={providers}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </div>
    );
  };
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs 
        defaultActiveKey="basic" 
        destroyInactiveTabPane={false}
        style={{ height: '100%' }}
      >
        <TabPane 
          tab={<><SettingOutlined /> 基本设置</>} 
          key="basic"
          forceRender={true}
        >
          <div style={{ height: 'calc(100vh - 180px)', overflowY: 'auto', padding: '8px' }}>
            <Card bordered={false} style={{ marginBottom: '60px' }}>
              {renderProviderList()}
              
              {activeProviderId && (
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSave}
                  initialValues={{
                    type: AIProviderType.OPENAI,
                    temperature: 0.7,
                    maxTokens: 1000,
                    name: '新供应商'
                  }}
                  preserve={true}
                >
                  <Form.Item
                    label="供应商名称"
                    name="name"
                    rules={[{ required: true, message: '请输入供应商名称' }]}
                    tooltip="用于区分不同的API配置"
                  >
                    <Input 
                      placeholder="如：OpenAI官方API、Azure OpenAI等" 
                    />
                  </Form.Item>
                  
                  <Form.Item
                    label="供应商类型"
                    name="type"
                    rules={[{ required: true, message: '请选择供应商类型' }]}
                  >
                    <Select
                      placeholder="选择供应商类型"
                      onChange={() => form.resetFields(['apiKey', 'baseUrl', 'localServerUrl'])}
                    >
                      <Option value={AIProviderType.OPENAI}>OpenAI</Option>
                      <Option value={AIProviderType.DEEPSEEK}>DeepSeek</Option>
                      <Option value={AIProviderType.OPENAI_COMPATIBLE}>OpenAI兼容API</Option>
                      <Option value={AIProviderType.OLLAMA}>Ollama (本地)</Option>
                      <Option value={AIProviderType.LMSTUDIO}>LM Studio (本地)</Option>
                    </Select>
                  </Form.Item>
                  
                  {renderProviderTypeSpecificFields()}
                  
                  <Form.Item
                    label="默认模型"
                    name="defaultModel"
                    rules={[{ required: true, message: '请输入默认模型名称' }]}
                  >
                    <Input placeholder="输入默认模型名称，如gpt-3.5-turbo" />
                  </Form.Item>
                  
                  <Divider orientation="left">生成参数</Divider>
                  
                  <Form.Item
                    label={
                      <Tooltip title="较高的值会使输出更加随机，较低的值会使其更加集中和确定">
                        温度 (Temperature)
                      </Tooltip>
                    }
                    name="temperature"
                  >
                    <Slider
                      min={0}
                      max={1}
                      step={0.01}
                      marks={{
                        0: '精确',
                        0.5: '平衡',
                        1: '创意'
                      }}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    label={
                      <Tooltip title="生成文本的最大长度">
                        最大Token数
                      </Tooltip>
                    }
                    name="maxTokens"
                  >
                    <InputNumber min={1} max={100000} style={{ width: '100%' }} />
                  </Form.Item>
                  
                  <Form.Item>
                    <Space>
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        icon={<SaveOutlined />} 
                        loading={loading}
                      >
                        保存设置
                      </Button>
                      <Button 
                        icon={<ApiOutlined />} 
                        onClick={handleTestConnection} 
                        loading={testing}
                      >
                        测试连接
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              )}
              
              {!activeProviderId && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>请先创建一个供应商</p>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={showCreateProviderModal}
                  >
                    添加供应商
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </TabPane>
        
        <TabPane 
          tab={<><AppstoreOutlined /> 模型管理</>} 
          key="models"
        >
          <div style={{ height: 'calc(100vh - 180px)', overflowY: 'auto', padding: '8px' }}>
            <div style={{ marginBottom: '60px' }}>
              <AIModelManager />
            </div>
          </div>
        </TabPane>

        <TabPane 
          tab={<><SlidersOutlined /> 场景设置</>} 
          key="scenarios"
        >
          <div style={{ height: 'calc(100vh - 180px)', overflowY: 'auto', padding: '8px' }}>
            <div style={{ marginBottom: '60px' }}>
              <AIScenarioSettings />
            </div>
          </div>
        </TabPane>
      </Tabs>
      
      {/* 创建供应商对话框 */}
      <Modal
        title="添加供应商"
        open={modalVisible}
        onOk={handleCreateProvider}
        onCancel={() => setModalVisible(false)}
        okText="添加"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="供应商名称"
            name="name"
            rules={[{ required: true, message: '请输入供应商名称' }]}
          >
            <Input placeholder="如：OpenAI官方API、Azure OpenAI等" />
          </Form.Item>
          
          <Form.Item
            label="供应商类型"
            name="type"
            rules={[{ required: true, message: '请选择供应商类型' }]}
            initialValue={AIProviderType.OPENAI}
          >
            <Select
              placeholder="选择供应商类型"
              onChange={() => form.resetFields(['apiKey', 'baseUrl', 'localServerUrl'])}
            >
              <Option value={AIProviderType.OPENAI}>OpenAI</Option>
              <Option value={AIProviderType.DEEPSEEK}>DeepSeek</Option>
              <Option value={AIProviderType.OPENAI_COMPATIBLE}>OpenAI兼容API</Option>
              <Option value={AIProviderType.OLLAMA}>Ollama (本地)</Option>
              <Option value={AIProviderType.LMSTUDIO}>LM Studio (本地)</Option>
            </Select>
          </Form.Item>
          
          {renderProviderTypeSpecificFields()}
          
          <Form.Item
            label="默认模型"
            name="defaultModel"
            initialValue="gpt-3.5-turbo"
          >
            <Input placeholder="输入默认模型名称，如gpt-3.5-turbo" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AISettings; 