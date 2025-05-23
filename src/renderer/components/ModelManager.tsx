import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Alert, Space, List, Progress, Tag, Divider } from 'antd';
import { DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { vectorEmbeddingService } from '../../modules/ai/services';

const { Title, Paragraph, Text } = Typography;

interface ModelInfo {
  name: string;
  size: string;
  description: string;
  isLocal: boolean;
  downloadUrl?: string;
}

/**
 * AI模型管理组件
 */
export const ModelManager: React.FC = () => {
  const [models] = useState<ModelInfo[]>([
    {
      name: 'all-MiniLM-L6-v2',
      size: '79.3MB',
      description: 'Sentence Transformers 嵌入模型，用于生成文本向量。支持多语言，性能优秀。',
      isLocal: false,
      downloadUrl: 'https://chroma-onnx-models.s3.amazonaws.com/all-MiniLM-L6-v2/onnx.tar.gz'
    }
  ]);

  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [embeddingConfig, setEmbeddingConfig] = useState<{
    hasConfig: boolean;
    providerType?: string;
    modelName?: string;
    message: string;
  }>({ hasConfig: false, message: '检查中...' });

  /**
   * 检查embedding模型配置
   */
  const checkEmbeddingConfig = async () => {
    try {
      const settings = vectorEmbeddingService.getSettings();
      if (settings && settings.models && settings.activeProviderId) {
        const activeProvider = settings.providers.find(p => p.id === settings.activeProviderId);
        if (activeProvider) {
          // 查找embedding模型
          const embeddingModel = settings.models.find(model => 
            model.providerId === activeProvider.id && model.isEmbeddingModel
          );
          
          if (embeddingModel) {
            setEmbeddingConfig({
              hasConfig: true,
              providerType: activeProvider.type,
              modelName: embeddingModel.name,
              message: `已配置：${activeProvider.name} - ${embeddingModel.name}`
            });
            return;
          }
          
          // 检查是否有同一提供商的模型
          const providerModels = settings.models.filter(model => model.providerId === activeProvider.id);
          if (providerModels.length > 0) {
            setEmbeddingConfig({
              hasConfig: true,
              providerType: activeProvider.type,
              modelName: providerModels[0].name,
              message: `可用：${activeProvider.name} - ${providerModels[0].name}（通用模型）`
            });
            return;
          }
        }
      }
      
      setEmbeddingConfig({
        hasConfig: false,
        message: '未配置embedding模型，将使用本地模型'
      });
    } catch (error) {
      console.error('检查embedding配置失败:', error);
      setEmbeddingConfig({
        hasConfig: false,
        message: '配置检查失败'
      });
    }
  };

  /**
   * 检查模型是否已存在本地
   */
  const checkLocalModels = async () => {
    // TODO: 实现检查本地模型的逻辑
    // 可以通过IPC调用主进程检查模型文件是否存在
  };

  useEffect(() => {
    checkLocalModels();
    checkEmbeddingConfig();
  }, []);

  /**
   * 预下载模型
   */
  const handlePredownloadModel = async (modelName: string) => {
    const confirmed = await new Promise((resolve) => {
      window.electron.invoke('dialog:show', {
        type: 'question',
        title: '预下载模型',
        message: `确认预下载 ${modelName} 模型吗？\n\n这将：\n• 下载约79MB的模型文件\n• 可能需要几分钟时间\n• 需要稳定的网络连接\n\n下载完成后，使用向量化功能时将不再需要等待下载。`,
        buttons: ['取消', '开始下载']
      }).then((result: any) => {
        resolve(result.response === 1);
      });
    });

    if (!confirmed) return;

    setDownloading(prev => ({ ...prev, [modelName]: true }));
    setDownloadProgress(prev => ({ ...prev, [modelName]: 0 }));

    try {
      // 触发模型下载的方法
      // 这里可以通过调用向量化服务来触发下载
      console.log(`开始预下载模型: ${modelName}`);
      
      // 模拟下载进度（实际应用中需要真实的下载进度）
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const currentProgress = prev[modelName] || 0;
          if (currentProgress >= 100) {
            clearInterval(progressInterval);
            setDownloading(prevDownloading => ({ ...prevDownloading, [modelName]: false }));
            return prev;
          }
          return { ...prev, [modelName]: currentProgress + 10 };
        });
      }, 500);

    } catch (error) {
      console.error('模型下载失败:', error);
      setDownloading(prev => ({ ...prev, [modelName]: false }));
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <DownloadOutlined /> AI 模型管理
      </Title>
      
      <Paragraph>
        管理本地AI模型，预下载模型可以避免在使用时的等待时间。
      </Paragraph>

      <Alert
        message="当前Embedding模型配置"
        description={
          <div>
            <Text>{embeddingConfig.message}</Text>
            {!embeddingConfig.hasConfig && (
              <div style={{ marginTop: 8 }}>
                <Button 
                  type="link" 
                  icon={<SettingOutlined />} 
                  onClick={() => {
                    // 这里可以添加跳转到AI设置的逻辑
                    console.log('跳转到AI设置页面');
                  }}
                >
                  前往AI设置配置embedding模型
                </Button>
              </div>
            )}
          </div>
        }
        type={embeddingConfig.hasConfig ? 'success' : 'warning'}
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Alert
        message="关于模型下载"
        description="AI模型文件通常较大，建议在网络状况良好时进行预下载。模型文件将保存在本地缓存中，后续使用时无需重新下载。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card title="嵌入模型" style={{ marginBottom: 16 }}>
        <List
          dataSource={models}
          renderItem={(model) => (
            <List.Item
              actions={[
                model.isLocal ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    已安装
                  </Tag>
                ) : downloading[model.name] ? (
                  <Space direction="vertical" style={{ minWidth: 200 }}>
                    <Progress 
                      percent={downloadProgress[model.name] || 0}
                      size="small"
                      status="active"
                    />
                    <Text type="secondary">正在下载...</Text>
                  </Space>
                ) : (
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => handlePredownloadModel(model.name)}
                    size="small"
                  >
                    预下载
                  </Button>
                )
              ]}
            >
              <List.Item.Meta
                avatar={<InfoCircleOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                title={
                  <Space>
                    <Text strong>{model.name}</Text>
                    <Tag color="blue">{model.size}</Tag>
                  </Space>
                }
                description={model.description}
              />
            </List.Item>
          )}
        />
      </Card>

      <Divider />

      <Card title="使用说明">
        <Paragraph>
          <Text strong>嵌入模型用途：</Text>
        </Paragraph>
        <ul>
          <li><Text code>文本向量化</Text>：将文本转换为数值向量，用于相似度计算</li>
          <li><Text code>语义搜索</Text>：基于文本语义进行搜索和匹配</li>
          <li><Text code>实体关联</Text>：找出相似的人物、地点、情节等</li>
        </ul>
        
        <Paragraph style={{ marginTop: 16 }}>
          <Text strong>下载说明：</Text>
        </Paragraph>
        <ul>
          <li>模型文件将保存在系统缓存目录</li>
          <li>首次使用向量化功能时会自动下载</li>
          <li>预下载可以避免使用时的等待</li>
          <li>下载失败时会在使用时重新尝试</li>
        </ul>
      </Card>
    </div>
  );
}; 