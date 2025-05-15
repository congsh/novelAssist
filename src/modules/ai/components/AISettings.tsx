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
  Tabs
} from 'antd';
import { 
  ApiOutlined, 
  KeyOutlined, 
  SaveOutlined, 
  SettingOutlined,
  LinkOutlined,
  GlobalOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { AIProvider } from '../types';
import type { AISettings } from '../types';
import { AISettingsService } from '../services/ai-settings-service';
import { aiServiceManager } from '../services';
import AIModelManager from './AIModelManager';

const { Option } = Select;
const { TabPane } = Tabs;

/**
 * AI设置组件
 */
const AISettings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<AISettings | null>(null);
  const aiSettingsService = AISettingsService.getInstance();
  
  // 获取当前选择的提供商
  const provider = Form.useWatch('provider', form);

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await aiSettingsService.loadSettings();
      setSettings(settings);
      form.setFieldsValue({
        ...settings,
        apiKey: settings.apiKey ? '********' : '', // 隐藏API密钥
      });
    };
    
    loadSettings();
  }, [form]);
  
  // 保存设置
  const handleSave = async (values: any) => {
    setLoading(true);
    
    try {
      // 如果API密钥是星号，则保留原来的密钥
      if (values.apiKey === '********' && settings?.apiKey) {
        values.apiKey = settings.apiKey;
      }
      
      const newSettings: AISettings = {
        ...values,
        models: settings?.models || []
      };
      
      await aiSettingsService.saveSettings(newSettings);
      setSettings(newSettings);
      
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
      if (values.apiKey === '********' && settings?.apiKey) {
        values.apiKey = settings.apiKey;
      }
      
      const testSettings: AISettings = {
        ...values,
        models: settings?.models || []
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
  
  // 根据提供商显示不同的表单项
  const renderProviderSpecificFields = () => {
    const provider = form.getFieldValue('provider');
    
    switch (provider) {
      case AIProvider.OPENAI:
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
        
      case AIProvider.DEEPSEEK:
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
        
      case AIProvider.OPENAI_COMPATIBLE:
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
            
            <Form.Item
              label="默认模型名称"
              name="defaultModel"
              rules={[{ required: true, message: '请输入默认模型名称' }]}
              tooltip="服务提供的模型名称，如gpt-3.5-turbo、gpt-4等"
            >
              <Input 
                placeholder="输入模型名称" 
              />
            </Form.Item>
          </>
        );
        
      case AIProvider.OLLAMA:
        return (
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
        );
        
      case AIProvider.LMSTUDIO:
        return (
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
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Tabs defaultActiveKey="basic">
      <TabPane tab={<><SettingOutlined /> 基本设置</>} key="basic">
        <Card bordered={false}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{
              provider: AIProvider.OPENAI,
              temperature: 0.7,
              maxTokens: 1000,
              defaultModel: 'gpt-3.5-turbo'
            }}
          >
            <Form.Item
              label="AI提供商"
              name="provider"
              rules={[{ required: true, message: '请选择AI提供商' }]}
            >
              <Select
                placeholder="选择AI提供商"
                onChange={() => form.resetFields(['apiKey', 'baseUrl', 'localServerUrl'])}
              >
                <Option value={AIProvider.OPENAI}>OpenAI</Option>
                <Option value={AIProvider.DEEPSEEK}>DeepSeek</Option>
                <Option value={AIProvider.OPENAI_COMPATIBLE}>OpenAI兼容API</Option>
                <Option value={AIProvider.OLLAMA}>Ollama (本地)</Option>
                <Option value={AIProvider.LMSTUDIO}>LM Studio (本地)</Option>
              </Select>
            </Form.Item>
            
            {renderProviderSpecificFields()}
            
            {provider !== AIProvider.OPENAI_COMPATIBLE && (
              <Form.Item
                label="默认模型"
                name="defaultModel"
                rules={[{ required: true, message: '请选择默认模型' }]}
              >
                <Input placeholder="输入默认模型名称" />
              </Form.Item>
            )}
            
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
        </Card>
      </TabPane>
      
      <TabPane tab={<><AppstoreOutlined /> 模型管理</>} key="models">
        <AIModelManager />
      </TabPane>
    </Tabs>
  );
};

export default AISettings; 