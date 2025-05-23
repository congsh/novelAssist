import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Typography, 
  Table, 
  Space, 
  Select, 
  Input, 
  Progress, 
  Tag, 
  message, 
  Modal, 
  Tabs, 
  Row, 
  Col,
  Statistic,
  Alert,
  Popconfirm,
  Tooltip
} from 'antd';
import { 
  RobotOutlined, 
  SearchOutlined, 
  DeleteOutlined, 
  ReloadOutlined, 
  PlayCircleOutlined,
  EyeOutlined,
  UserOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { vectorEmbeddingService } from '../../modules/ai/services';
import { EntityVectorService } from '../../modules/ai/services/entity-vector-service';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { Search } = Input;
const { TabPane } = Tabs;

interface VectorizedEntity {
  id: string;
  entityId: string;
  entityType: 'character' | 'location' | 'outline' | 'timeline';
  entityName: string;
  novelId: string;
  novelTitle?: string;
  status: 'success' | 'failed' | 'processing';
  vectorId?: string;
  modelUsed: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
  similarity?: number;
}

interface VectorizationProgress {
  total: number;
  completed: number;
  failed: number;
  processing: boolean;
  currentEntity?: string;
}

/**
 * 实体向量化管理组件
 */
export const EntityVectorManager: React.FC = () => {
  const [vectorizedEntities, setVectorizedEntities] = useState<VectorizedEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNovel, setSelectedNovel] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [progress, setProgress] = useState<VectorizationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    processing: false
  });
  const [novels, setNovels] = useState<Array<{id: string, title: string}>>([]);
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [vectorDetailModal, setVectorDetailModal] = useState<{
    visible: boolean;
    entity?: VectorizedEntity;
  }>({ visible: false });

  const entityVectorService = new EntityVectorService(vectorEmbeddingService);

  // 实体类型图标映射
  const entityTypeIcons = {
    character: <UserOutlined />,
    location: <EnvironmentOutlined />,
    outline: <FileTextOutlined />,
    timeline: <ClockCircleOutlined />
  };

  // 实体类型标签颜色
  const entityTypeColors = {
    character: 'blue',
    location: 'green',
    outline: 'orange',
    timeline: 'purple'
  };

  // 状态图标映射
  const statusIcons = {
    success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    failed: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
    processing: <LoadingOutlined style={{ color: '#1890ff' }} />
  };

  useEffect(() => {
    loadNovels();
    loadVectorizedEntities();
  }, []);

  /**
   * 加载小说列表
   */
  const loadNovels = async () => {
    try {
      const novelList = await window.electron.invoke('get-novels');
      setNovels(novelList || []);
    } catch (error) {
      console.error('加载小说列表失败:', error);
    }
  };

  /**
   * 加载已向量化的实体
   */
  const loadVectorizedEntities = async () => {
    setLoading(true);
    try {
      const filters = {
        novelId: selectedNovel,
        entityType: selectedEntityType
      };
      const entities = await window.electron.invoke('get-vectorized-entities', filters);
      setVectorizedEntities(entities || []);
    } catch (error) {
      console.error('加载向量化实体失败:', error);
      message.error('加载向量化数据失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 执行实体向量化
   */
  const handleVectorizeEntities = async (novelId: string, entityTypes: string[]) => {
    if (!novelId || novelId === 'all') {
      message.error('请选择要向量化的小说');
      return;
    }

    try {
      setProgress({ total: 0, completed: 0, failed: 0, processing: true });
      
      const modelName = selectedModel === 'auto' ? await getAvailableEmbeddingModel() : selectedModel;
      
      // 根据选择的实体类型获取实体数据
      const entitiesToVectorize = await getEntitiesForVectorization(novelId, entityTypes);
      
      setProgress(prev => ({ ...prev, total: entitiesToVectorize.length }));
      
      let completed = 0;
      let failed = 0;
      const vectorizedResults: VectorizedEntity[] = [];
      
      for (const entity of entitiesToVectorize) {
        try {
          setProgress(prev => ({ ...prev, currentEntity: entity.name }));
          
          // 先保存处理中状态
          const processingEntity: VectorizedEntity = {
            id: `vec-${Date.now()}-${Math.random()}`,
            entityId: entity.data.id,
            entityType: entity.type as 'character' | 'location' | 'outline' | 'timeline',
            entityName: entity.name,
            novelId: novelId,
            novelTitle: novels.find(n => n.id === novelId)?.title,
            status: 'processing',
            modelUsed: modelName,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          await window.electron.invoke('save-vectorized-entity', processingEntity);
          setVectorizedEntities(prev => [...prev.filter(e => e.entityId !== entity.data.id), processingEntity]);
          
          let result = null;
          switch (entity.type) {
            case 'character':
              result = await entityVectorService.vectorizeCharacter(entity.data, modelName);
              break;
            case 'location':
              result = await entityVectorService.vectorizeLocation(entity.data, modelName);
              break;
            case 'outline':
              result = await entityVectorService.vectorizeOutlineItem(entity.data, modelName);
              break;
            case 'timeline':
              result = await entityVectorService.vectorizeTimelineEvent(entity.data, modelName);
              break;
          }
          
          if (result) {
            completed++;
            // 更新为成功状态
            const successEntity: VectorizedEntity = {
              ...processingEntity,
              status: 'success',
              vectorId: result.id,
              updatedAt: Date.now()
            };
            
            await window.electron.invoke('save-vectorized-entity', successEntity);
            setVectorizedEntities(prev => [...prev.filter(e => e.entityId !== entity.data.id), successEntity]);
            vectorizedResults.push(successEntity);
          } else {
            failed++;
            // 更新为失败状态
            const failedEntity: VectorizedEntity = {
              ...processingEntity,
              status: 'failed',
              error: '向量化返回空结果',
              updatedAt: Date.now()
            };
            
            await window.electron.invoke('save-vectorized-entity', failedEntity);
            setVectorizedEntities(prev => [...prev.filter(e => e.entityId !== entity.data.id), failedEntity]);
          }
        } catch (error) {
          console.error(`向量化${entity.name}失败:`, error);
          failed++;
          
          // 记录失败的实体
          const failedVectorEntity: VectorizedEntity = {
            id: `vec-${Date.now()}-${Math.random()}`,
            entityId: entity.data.id,
            entityType: entity.type as 'character' | 'location' | 'outline' | 'timeline',
            entityName: entity.name,
            novelId: novelId,
            novelTitle: novels.find(n => n.id === novelId)?.title,
            status: 'failed',
            modelUsed: modelName,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            error: error instanceof Error ? error.message : '未知错误'
          };
          
          await window.electron.invoke('save-vectorized-entity', failedVectorEntity);
          setVectorizedEntities(prev => [...prev.filter(e => e.entityId !== entity.data.id), failedVectorEntity]);
        }
        
        setProgress(prev => ({ ...prev, completed: completed, failed: failed }));
        
        // 避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setProgress(prev => ({ ...prev, processing: false, currentEntity: undefined }));
      
      if (failed === 0) {
        message.success(`成功向量化 ${completed} 个实体`);
      } else {
        message.warning(`向量化完成：成功 ${completed} 个，失败 ${failed} 个`);
      }
      
    } catch (error) {
      console.error('批量向量化失败:', error);
      message.error('向量化过程出现错误');
      setProgress(prev => ({ ...prev, processing: false }));
    }
  };

  /**
   * 获取可用的embedding模型
   */
  const getAvailableEmbeddingModel = async (): Promise<string> => {
    try {
      // 确保VectorEmbeddingService已初始化
      let settings = vectorEmbeddingService.getSettings();
      
      // 如果设置为空，尝试手动初始化
      if (!settings) {
        console.log('[EntityVectorManager] VectorEmbeddingService未初始化，正在加载设置...');
        
        // 从AI设置服务加载设置
        const { aiSettingsService } = await import('../../modules/ai/services');
        const loadedSettings = await aiSettingsService.loadSettings();
        
        if (loadedSettings && loadedSettings.providers && loadedSettings.providers.length > 0) {
          // 初始化VectorEmbeddingService
          await vectorEmbeddingService.initialize(loadedSettings);
          settings = vectorEmbeddingService.getSettings();
          console.log('[EntityVectorManager] VectorEmbeddingService初始化成功');
        } else {
          console.warn('[EntityVectorManager] 未找到AI设置，将使用本地模型');
          return 'all-MiniLM-L6-v2';
        }
      }
      
      if (settings && settings.models && settings.activeProviderId) {
        const activeProvider = settings.providers.find(p => p.id === settings.activeProviderId);
        if (activeProvider) {
          // 优先查找标记为embedding的模型
          const embeddingModel = settings.models.find(model => 
            model.providerId === activeProvider.id && model.isEmbeddingModel
          );
          if (embeddingModel) {
            console.log('[EntityVectorManager] 使用配置的embedding模型:', embeddingModel.name);
            return embeddingModel.name;
          }
          
          // 如果没有专门的embedding模型，使用该提供商的第一个模型
          const providerModels = settings.models.filter(model => model.providerId === activeProvider.id);
          if (providerModels.length > 0) {
            console.log('[EntityVectorManager] 使用提供商的第一个模型:', providerModels[0].name);
            return providerModels[0].name;
          }
        }
      }
      
      console.log('[EntityVectorManager] 未找到合适的在线模型，回退到本地模型');
      return 'all-MiniLM-L6-v2'; // 回退到本地模型
    } catch (error) {
      console.error('[EntityVectorManager] 获取embedding模型失败:', error);
      return 'all-MiniLM-L6-v2';
    }
  };

  /**
   * 获取需要向量化的实体
   */
  const getEntitiesForVectorization = async (novelId: string, entityTypes: string[]) => {
    const entities: Array<{type: string, data: any, name: string}> = [];
    
    try {
      if (entityTypes.includes('character')) {
        const characters = await window.electron.invoke('get-characters-by-novel', novelId);
        characters.forEach((char: any) => {
          entities.push({
            type: 'character',
            data: char,
            name: char.name
          });
        });
      }
      
      if (entityTypes.includes('location')) {
        const locations = await window.electron.invoke('get-locations-by-novel', novelId);
        locations.forEach((loc: any) => {
          entities.push({
            type: 'location',
            data: loc,
            name: loc.name
          });
        });
      }
      
      if (entityTypes.includes('outline')) {
        const outlines = await window.electron.invoke('get-outlines-by-novel', novelId);
        outlines.forEach((outline: any) => {
          entities.push({
            type: 'outline',
            data: outline,
            name: outline.title
          });
        });
      }
      
      if (entityTypes.includes('timeline')) {
        const events = await window.electron.invoke('get-timeline-by-novel', novelId);
        events.forEach((event: any) => {
          entities.push({
            type: 'timeline',
            data: event,
            name: event.title
          });
        });
      }
    } catch (error) {
      console.error('获取实体数据失败:', error);
    }
    
    return entities;
  };

  /**
   * 删除向量化数据
   */
  const handleDeleteVector = async (entity: VectorizedEntity) => {
    try {
      // 从数据库删除记录
      await window.electron.invoke('delete-vectorized-entity', entity.id);
      
      // 如果有向量ID，也可以从向量存储中删除
      if (entity.vectorId) {
        try {
          // TODO: 调用删除向量的API
          // await vectorEmbeddingService.deleteFromVectorStore([entity.vectorId], collectionName);
          console.log('TODO: 从向量存储中删除向量', entity.vectorId);
        } catch (vectorError) {
          console.warn('从向量存储删除失败:', vectorError);
          // 不影响数据库记录的删除
        }
      }
      
      setVectorizedEntities(prev => prev.filter(e => e.id !== entity.id));
      message.success('删除成功');
    } catch (error) {
      console.error('删除向量失败:', error);
      message.error('删除失败');
    }
  };

  /**
   * 重新向量化
   */
  const handleReVectorize = async (entity: VectorizedEntity) => {
    try {
      // 先删除现有向量记录
      await window.electron.invoke('delete-vectorized-entity', entity.id);
      
      // 如果有向量ID，也从向量存储中删除
      if (entity.vectorId) {
        try {
          // TODO: 删除现有向量
          console.log('TODO: 删除现有向量', entity.vectorId);
        } catch (vectorError) {
          console.warn('删除现有向量失败:', vectorError);
        }
      }
      
      // 重新向量化
      await handleVectorizeEntities(entity.novelId, [entity.entityType]);
      
      message.success('重新向量化已开始');
    } catch (error) {
      console.error('重新向量化失败:', error);
      message.error('重新向量化失败');
    }
  };

  /**
   * 查看向量详情
   */
  const handleViewDetail = (entity: VectorizedEntity) => {
    setVectorDetailModal({ visible: true, entity });
  };

  // 过滤数据
  const filteredEntities = vectorizedEntities.filter(entity => {
    if (selectedNovel !== 'all' && entity.novelId !== selectedNovel) return false;
    if (selectedEntityType !== 'all' && entity.entityType !== selectedEntityType) return false;
    if (searchText && !entity.entityName.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  // 统计数据
  const statistics = {
    total: vectorizedEntities.length,
    success: vectorizedEntities.filter(e => e.status === 'success').length,
    failed: vectorizedEntities.filter(e => e.status === 'failed').length,
    processing: vectorizedEntities.filter(e => e.status === 'processing').length
  };

  // 表格列定义
  const columns = [
    {
      title: '实体名称',
      dataIndex: 'entityName',
      key: 'entityName',
      render: (text: string, record: VectorizedEntity) => (
        <Space>
          {entityTypeIcons[record.entityType]}
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'entityType',
      key: 'entityType',
      render: (type: string) => (
        <Tag color={entityTypeColors[type as keyof typeof entityTypeColors]}>
          {type === 'character' ? '人物' : 
           type === 'location' ? '地点' : 
           type === 'outline' ? '大纲' : '时间线'}
        </Tag>
      )
    },
    {
      title: '所属小说',
      dataIndex: 'novelTitle',
      key: 'novelTitle'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: VectorizedEntity) => (
        <Space>
          {statusIcons[status as keyof typeof statusIcons]}
          <Text type={status === 'failed' ? 'danger' : status === 'success' ? 'success' : undefined}>
            {status === 'success' ? '成功' : 
             status === 'failed' ? '失败' : '处理中'}
          </Text>
          {record.error && (
            <Tooltip title={record.error}>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '使用模型',
      dataIndex: 'modelUsed',
      key: 'modelUsed',
      render: (model: string) => <Text code>{model}</Text>
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (time: number) => new Date(time).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: VectorizedEntity) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="重新向量化">
            <Button 
              type="text" 
              icon={<ReloadOutlined />} 
              onClick={() => handleReVectorize(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此向量化数据吗？"
            onConfirm={() => handleDeleteVector(record)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <RobotOutlined /> 实体向量化管理
      </Title>
      
      <Paragraph>
        对小说中的人物、地点、大纲和时间线进行向量化处理，为AI功能提供语义检索基础。
      </Paragraph>

      <Tabs defaultActiveKey="vectorize">
        <TabPane tab="向量化工具" key="vectorize">
          <Card title="实体向量化管理">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 操作区域 */}
              <Card size="small" title="向量化操作">
                <Row gutter={16}>
                  <Col span={6}>
                    <Select
                      placeholder="选择小说"
                      value={selectedNovel}
                      onChange={setSelectedNovel}
                      style={{ width: '100%' }}
                    >
                      <Option value="all">所有小说</Option>
                      {novels.map(novel => (
                        <Option key={novel.id} value={novel.id}>{novel.title}</Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={6}>
                    <Select
                      placeholder="选择模型"
                      value={selectedModel}
                      onChange={setSelectedModel}
                      style={{ width: '100%' }}
                    >
                      <Option value="auto">自动选择</Option>
                      <Option value="BAAI/bge-m3">BAAI/bge-m3</Option>
                      <Option value="BAAI/bge-large-zh-v1.5">BAAI/bge-large-zh-v1.5</Option>
                      <Option value="all-MiniLM-L6-v2">all-MiniLM-L6-v2 (本地)</Option>
                    </Select>
                  </Col>
                  <Col span={12}>
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleVectorizeEntities(selectedNovel, ['character'])}
                        disabled={progress.processing || selectedNovel === 'all'}
                      >
                        向量化人物
                      </Button>
                      <Button
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleVectorizeEntities(selectedNovel, ['location'])}
                        disabled={progress.processing || selectedNovel === 'all'}
                      >
                        向量化地点
                      </Button>
                      <Button
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleVectorizeEntities(selectedNovel, ['outline'])}
                        disabled={progress.processing || selectedNovel === 'all'}
                      >
                        向量化大纲
                      </Button>
                      <Button
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleVectorizeEntities(selectedNovel, ['timeline'])}
                        disabled={progress.processing || selectedNovel === 'all'}
                      >
                        向量化时间线
                      </Button>
                      <Button
                        type="dashed"
                        onClick={() => handleVectorizeEntities(selectedNovel, ['character', 'location', 'outline', 'timeline'])}
                        disabled={progress.processing || selectedNovel === 'all'}
                      >
                        全部向量化
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Card>

              {/* 进度显示 */}
              <Card size="small" title="向量化进度">
                {progress.processing && (
                  <div style={{ marginBottom: 16 }}>
                    <Progress
                      percent={Math.round((progress.completed + progress.failed) / progress.total * 100)}
                      status={progress.processing ? 'active' : 'normal'}
                      format={() => `${progress.completed + progress.failed}/${progress.total}`}
                    />
                    {progress.currentEntity && (
                      <Text type="secondary">正在处理: {progress.currentEntity}</Text>
                    )}
                  </div>
                )}
              </Card>

              {/* 统计卡片 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card>
                    <Statistic title="总计" value={statistics.total} prefix={<RobotOutlined />} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic 
                      title="成功" 
                      value={statistics.success} 
                      valueStyle={{ color: '#3f8600' }}
                      prefix={<CheckCircleOutlined />} 
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic 
                      title="失败" 
                      value={statistics.failed} 
                      valueStyle={{ color: '#cf1322' }}
                      prefix={<ExclamationCircleOutlined />} 
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic 
                      title="处理中" 
                      value={statistics.processing} 
                      valueStyle={{ color: '#1890ff' }}
                      prefix={<LoadingOutlined />} 
                    />
                  </Card>
                </Col>
              </Row>

              {/* 筛选器 */}
              <Card style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="筛选小说"
                      value={selectedNovel}
                      onChange={setSelectedNovel}
                    >
                      <Option value="all">全部小说</Option>
                      {novels.map(novel => (
                        <Option key={novel.id} value={novel.id}>{novel.title}</Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={6}>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="筛选类型"
                      value={selectedEntityType}
                      onChange={setSelectedEntityType}
                    >
                      <Option value="all">全部类型</Option>
                      <Option value="character">人物</Option>
                      <Option value="location">地点</Option>
                      <Option value="outline">大纲</Option>
                      <Option value="timeline">时间线</Option>
                    </Select>
                  </Col>
                  <Col span={6}>
                    <Search
                      placeholder="搜索实体名称"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onSearch={setSearchText}
                    />
                  </Col>
                  <Col span={6}>
                    <Space>
                      <Button 
                        icon={<ReloadOutlined />} 
                        onClick={loadVectorizedEntities}
                        loading={loading}
                      >
                        刷新数据
                      </Button>
                      {process.env.NODE_ENV === 'development' && (
                        <Button 
                          type="dashed"
                          onClick={async () => {
                            try {
                              const model = await getAvailableEmbeddingModel();
                              message.success(`当前embedding模型: ${model}`);
                            } catch (error) {
                              message.error(`获取模型失败: ${(error as Error).message}`);
                            }
                          }}
                        >
                          测试模型选择
                        </Button>
                      )}
                    </Space>
                  </Col>
                </Row>
              </Card>

              {/* 数据表格 */}
              <Card>
                <Table
                  columns={columns}
                  dataSource={filteredEntities}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条记录`
                  }}
                />
              </Card>
            </Space>
          </Card>
        </TabPane>

        <TabPane tab="数据管理" key="data">
          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic title="总计" value={statistics.total} prefix={<RobotOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic 
                  title="成功" 
                  value={statistics.success} 
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />} 
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic 
                  title="失败" 
                  value={statistics.failed} 
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<ExclamationCircleOutlined />} 
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic 
                  title="处理中" 
                  value={statistics.processing} 
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<LoadingOutlined />} 
                />
              </Card>
            </Col>
          </Row>

          {/* 筛选器 */}
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="筛选小说"
                  value={selectedNovel}
                  onChange={setSelectedNovel}
                >
                  <Option value="all">全部小说</Option>
                  {novels.map(novel => (
                    <Option key={novel.id} value={novel.id}>{novel.title}</Option>
                  ))}
                </Select>
              </Col>
              <Col span={6}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="筛选类型"
                  value={selectedEntityType}
                  onChange={setSelectedEntityType}
                >
                  <Option value="all">全部类型</Option>
                  <Option value="character">人物</Option>
                  <Option value="location">地点</Option>
                  <Option value="outline">大纲</Option>
                  <Option value="timeline">时间线</Option>
                </Select>
              </Col>
              <Col span={6}>
                <Search
                  placeholder="搜索实体名称"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onSearch={setSearchText}
                />
              </Col>
              <Col span={6}>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadVectorizedEntities}
                  loading={loading}
                >
                  刷新
                </Button>
              </Col>
            </Row>
          </Card>

          {/* 数据表格 */}
          <Card>
            <Table
              columns={columns}
              dataSource={filteredEntities}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 向量详情模态框 */}
      <Modal
        title="向量化详情"
        open={vectorDetailModal.visible}
        onCancel={() => setVectorDetailModal({ visible: false })}
        footer={null}
        width={600}
      >
        {vectorDetailModal.entity && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>实体名称：</Text>
                <Text>{vectorDetailModal.entity.entityName}</Text>
              </Col>
              <Col span={12}>
                <Text strong>实体类型：</Text>
                <Tag color={entityTypeColors[vectorDetailModal.entity.entityType]}>
                  {vectorDetailModal.entity.entityType === 'character' ? '人物' : 
                   vectorDetailModal.entity.entityType === 'location' ? '地点' : 
                   vectorDetailModal.entity.entityType === 'outline' ? '大纲' : '时间线'}
                </Tag>
              </Col>
            </Row>
            <br />
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>所属小说：</Text>
                <Text>{vectorDetailModal.entity.novelTitle}</Text>
              </Col>
              <Col span={12}>
                <Text strong>状态：</Text>
                <Space>
                  {statusIcons[vectorDetailModal.entity.status]}
                  <Text>{vectorDetailModal.entity.status === 'success' ? '成功' : 
                         vectorDetailModal.entity.status === 'failed' ? '失败' : '处理中'}</Text>
                </Space>
              </Col>
            </Row>
            <br />
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>使用模型：</Text>
                <Text code>{vectorDetailModal.entity.modelUsed}</Text>
              </Col>
              <Col span={12}>
                <Text strong>向量ID：</Text>
                <Text code>{vectorDetailModal.entity.vectorId || '无'}</Text>
              </Col>
            </Row>
            <br />
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>创建时间：</Text>
                <Text>{new Date(vectorDetailModal.entity.createdAt).toLocaleString()}</Text>
              </Col>
              <Col span={12}>
                <Text strong>更新时间：</Text>
                <Text>{new Date(vectorDetailModal.entity.updatedAt).toLocaleString()}</Text>
              </Col>
            </Row>
            {vectorDetailModal.entity.error && (
              <>
                <br />
                <Alert
                  message="错误信息"
                  description={vectorDetailModal.entity.error}
                  type="error"
                  showIcon
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}; 