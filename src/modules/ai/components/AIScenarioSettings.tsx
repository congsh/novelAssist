import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Form, 
  Select, 
  Switch, 
  Input, 
  InputNumber, 
  Button, 
  Tabs, 
  message, 
  Tooltip, 
  Space, 
  Slider,
  Collapse,
  Typography
} from 'antd';
import { 
  SaveOutlined, 
  ApiOutlined, 
  RobotOutlined, 
  SettingOutlined,
  DollarOutlined,
  MessageOutlined,
  BookOutlined,
  FileSearchOutlined,
  PartitionOutlined
} from '@ant-design/icons';
import { 
  AIProvider, 
  AIScenario, 
  AIScenarioConfig, 
  AISettings,
  AIModel
} from '../types';
import { aiServiceManager } from '../services';
import { AISettingsService } from '../services/ai-settings-service';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Title, Paragraph } = Typography;

// 场景图标映射
const scenarioIcons = {
  [AIScenario.CHAT]: <MessageOutlined />,
  [AIScenario.NOVEL_COLLABORATION]: <BookOutlined />,
  [AIScenario.CONTEXT_ENHANCEMENT]: <PartitionOutlined />,
  [AIScenario.NOVEL_ANALYSIS]: <FileSearchOutlined />
};

// 场景名称映射
const scenarioNames = {
  [AIScenario.CHAT]: '对话聊天',
  [AIScenario.NOVEL_COLLABORATION]: '小说协作',
  [AIScenario.CONTEXT_ENHANCEMENT]: '上下文补充',
  [AIScenario.NOVEL_ANALYSIS]: '小说拆解分析'
};

// 场景描述映射
const scenarioDescriptions = {
  [AIScenario.CHAT]: '用于一般性对话和创作咨询，适合使用通用模型。',
  [AIScenario.NOVEL_COLLABORATION]: '用于小说内容生成和修改，需要较强的创意能力，适合使用功能强大的模型。',
  [AIScenario.CONTEXT_ENHANCEMENT]: '用于补充小说背景和细节，需要较大的上下文窗口，适合使用支持长文本的模型。',
  [AIScenario.NOVEL_ANALYSIS]: '用于分析小说结构和内容，需要较强的理解能力，适合使用高级分析模型。'
};

// 默认系统提示词
const defaultSystemPrompts = {
  [AIScenario.CHAT]: '你是一位专业的小说创作顾问，可以为作者提供创作建议和灵感。',
  [AIScenario.NOVEL_COLLABORATION]: '你是一位专业的小说创作助手，帮助作者生成高质量的小说内容，包括情节、对话和描写。',
  [AIScenario.CONTEXT_ENHANCEMENT]: '你是一位小说世界观构建专家，帮助作者丰富小说的背景设定和细节描写。',
  [AIScenario.NOVEL_ANALYSIS]: '你是一位文学分析专家，擅长分析小说的结构、人物、主题和写作技巧。'
};

/**
 * AI场景设置组件
 */
const AIScenarioSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeScenario, setActiveScenario] = useState<AIScenario>(AIScenario.CHAT);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [models, setModels] = useState<Record<AIProvider, AIModel[]>>({} as Record<AIProvider, AIModel[]>);
  
  // 在组件顶层为每个场景创建独立的 useWatch
  const chatProviderId = Form.useWatch(`${AIScenario.CHAT}_providerId`, form) as AIProvider | undefined;
  const novelCollaborationProviderId = Form.useWatch(`${AIScenario.NOVEL_COLLABORATION}_providerId`, form) as AIProvider | undefined;
  const contextEnhancementProviderId = Form.useWatch(`${AIScenario.CONTEXT_ENHANCEMENT}_providerId`, form) as AIProvider | undefined;
  const novelAnalysisProviderId = Form.useWatch(`${AIScenario.NOVEL_ANALYSIS}_providerId`, form) as AIProvider | undefined;
  
  const aiSettingsService = AISettingsService.getInstance();
  
  // 加载设置
  useEffect(() => {
    loadSettings();
  }, []);
  
  // 加载设置
  const loadSettings = async () => {
    try {
      const settings = await aiSettingsService.loadSettings();
      setSettings(settings);
      
      // 提取所有可用的提供商
      const availableProviders = Object.values(AIProvider);
      setProviders(availableProviders);
      
      // 获取所有模型
      const modelsByProvider: Record<AIProvider, AIModel[]> = {} as Record<AIProvider, AIModel[]>;
      settings.models.forEach((model: AIModel) => {
        if (!modelsByProvider[model.provider]) {
          modelsByProvider[model.provider] = [];
        }
        modelsByProvider[model.provider].push(model);
      });
      setModels(modelsByProvider);
      
      // 设置表单初始值
      initFormValues(settings);
    } catch (error) {
      console.error('加载设置失败:', error);
      message.error('加载设置失败');
    }
  };
  
  // 初始化表单值
  const initFormValues = (settings: AISettings) => {
    const formValues: any = {};
    
    // 为每个场景设置表单值
    Object.values(AIScenario).forEach(scenario => {
      const config = settings.scenarioConfigs?.[scenario] || createDefaultConfig(settings, scenario);
      
      formValues[`${scenario}_enabled`] = config.enabled;
      formValues[`${scenario}_providerId`] = config.providerId;
      formValues[`${scenario}_modelId`] = config.modelId;
      formValues[`${scenario}_temperature`] = config.temperature !== undefined ? config.temperature : settings.temperature;
      formValues[`${scenario}_maxTokens`] = config.maxTokens !== undefined ? config.maxTokens : settings.maxTokens;
      formValues[`${scenario}_systemPrompt`] = config.systemPrompt || defaultSystemPrompts[scenario];
      formValues[`${scenario}_costLimit`] = config.costLimit || 0;
    });
    
    form.setFieldsValue(formValues);
  };
  
  // 创建默认配置
  const createDefaultConfig = (settings: AISettings, scenario: AIScenario): AIScenarioConfig => {
    return {
      enabled: false,
      providerId: settings.provider,
      modelId: settings.defaultModel,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      systemPrompt: defaultSystemPrompts[scenario],
      costLimit: 0
    };
  };
  
  // 保存设置
  const handleSave = async () => {
    try {
      setLoading(true);
      
      const values = await form.validateFields();
      
      if (!settings) {
        message.error('设置未加载');
        return;
      }
      
      // 更新场景配置
      const scenarioConfigs: Record<AIScenario, AIScenarioConfig> = {} as Record<AIScenario, AIScenarioConfig>;
      
      Object.values(AIScenario).forEach(scenario => {
        scenarioConfigs[scenario] = {
          enabled: values[`${scenario}_enabled`],
          providerId: values[`${scenario}_providerId`],
          modelId: values[`${scenario}_modelId`],
          temperature: values[`${scenario}_temperature`],
          maxTokens: values[`${scenario}_maxTokens`],
          systemPrompt: values[`${scenario}_systemPrompt`],
          costLimit: values[`${scenario}_costLimit`]
        };
      });
      
      // 更新设置
      const updatedSettings: AISettings = {
        ...settings,
        scenarioConfigs
      };
      
      await aiSettingsService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      
      message.success('场景设置已保存');
    } catch (error) {
      console.error('保存设置失败:', error);
      message.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 测试连接
  const handleTestConnection = async () => {
    try {
      setTesting(true);
      
      const values = await form.validateFields([
        `${activeScenario}_enabled`,
        `${activeScenario}_providerId`,
        `${activeScenario}_modelId`
      ]);
      
      if (!settings) {
        message.error('设置未加载');
        return;
      }
      
      // 获取当前场景的提供商
      const providerId = values[`${activeScenario}_enabled`] ? 
        values[`${activeScenario}_providerId`] : 
        settings.provider;
      
      // 获取对应的服务
      const service = aiServiceManager.getService(providerId);
      
      if (!service) {
        message.error(`未找到提供商 ${providerId} 的服务`);
        return;
      }
      
      // 测试连接
      const success = await service.testConnection();
      
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

  // 使用useMemo创建scenarioProviders对象，不在里面调用hooks
  const scenarioProviders = useMemo(() => {
    return {
      [AIScenario.CHAT]: chatProviderId,
      [AIScenario.NOVEL_COLLABORATION]: novelCollaborationProviderId,
      [AIScenario.CONTEXT_ENHANCEMENT]: contextEnhancementProviderId,
      [AIScenario.NOVEL_ANALYSIS]: novelAnalysisProviderId
    };
  }, [chatProviderId, novelCollaborationProviderId, contextEnhancementProviderId, novelAnalysisProviderId]);
  
  return (
    <div style={{ height: '100%' }}>
      <Tabs 
        activeKey={activeScenario} 
        onChange={(key) => setActiveScenario(key as AIScenario)}
        tabPosition="left"
        destroyInactiveTabPane={false}
        style={{ height: '100%' }}
      >
        {Object.values(AIScenario).map(scenario => (
          <TabPane 
            tab={
              <span>
                {scenarioIcons[scenario]} {scenarioNames[scenario]}
              </span>
            } 
            key={scenario}
            forceRender={true}
          >
            <div style={{ height: 'calc(100vh - 230px)', overflowY: 'auto', padding: '8px' }}>
              <Card 
                title={scenarioNames[scenario]}
                style={{ marginBottom: '60px' }}
                extra={
                  <Space>
                    <Button 
                      icon={<ApiOutlined />} 
                      onClick={handleTestConnection} 
                      loading={testing}
                    >
                      测试连接
                    </Button>
                    <Button 
                      type="primary" 
                      icon={<SaveOutlined />} 
                      onClick={handleSave}
                      loading={loading}
                    >
                      保存设置
                    </Button>
                  </Space>
                }
              >
                <Paragraph>{scenarioDescriptions[scenario]}</Paragraph>
                
                <Form
                  form={form}
                  layout="vertical"
                  preserve={true}
                >
                  <Form.Item
                    label="启用此场景"
                    name={`${scenario}_enabled`}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  
                  <Form.Item
                    label="使用AI提供商"
                    name={`${scenario}_providerId`}
                    rules={[{ required: true, message: '请选择AI提供商' }]}
                  >
                    <Select placeholder="选择AI提供商">
                      {providers.map(provider => (
                        <Option key={provider} value={provider}>{provider}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    label="使用模型"
                    name={`${scenario}_modelId`}
                    rules={[{ required: true, message: '请选择模型' }]}
                  >
                    <Select placeholder="选择模型">
                      {scenarioProviders[scenario] && 
                        models[scenarioProviders[scenario] as AIProvider]?.map((model: AIModel) => (
                          <Option key={model.id} value={model.name}>{model.name}</Option>
                        ))}
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    label={
                      <Tooltip title="较高的值会使输出更加随机，较低的值会使其更加集中和确定">
                        温度 (Temperature)
                      </Tooltip>
                    }
                    name={`${scenario}_temperature`}
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
                    name={`${scenario}_maxTokens`}
                  >
                    <InputNumber min={1} max={100000} style={{ width: '100%' }} />
                  </Form.Item>
                  
                  <Form.Item
                    label={
                      <Tooltip title="系统提示词用于指导AI的行为和回答方式">
                        系统提示词
                      </Tooltip>
                    }
                    name={`${scenario}_systemPrompt`}
                  >
                    <TextArea 
                      rows={4}
                      placeholder="输入系统提示词"
                    />
                  </Form.Item>
                  
                  <Form.Item
                    label={
                      <Tooltip title="设置此场景的成本限制（0表示无限制）">
                        成本限制 (美元)
                      </Tooltip>
                    }
                    name={`${scenario}_costLimit`}
                  >
                    <InputNumber 
                      min={0} 
                      step={0.1}
                      style={{ width: '100%' }}
                      prefix={<DollarOutlined />}
                    />
                  </Form.Item>
                </Form>
              </Card>
            </div>
          </TabPane>
        ))}
      </Tabs>
    </div>
  );
};

export default AIScenarioSettings; 