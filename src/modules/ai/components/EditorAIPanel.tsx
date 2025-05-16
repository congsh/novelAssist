import React, { useState, useEffect } from 'react';
import { 
  Tabs, 
  Button, 
  Input, 
  Space, 
  Divider, 
  Select, 
  Typography, 
  Spin, 
  notification,
  Tooltip,
  Alert,
  Card,
  Empty
} from 'antd';
import {
  RobotOutlined,
  EditOutlined,
  FileTextOutlined,
  UserOutlined,
  EnvironmentOutlined,
  OrderedListOutlined,
  FieldTimeOutlined,
  CheckOutlined,
  CloseOutlined,
  UndoOutlined,
  SettingOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { aiEditorService } from '../index';
import { 
  EditorAIRequest, 
  EditorAIResponse, 
  EditorAIActionType,
  TextDiff
} from '../types';
import TextDiffViewer from './TextDiffViewer';
import { useNavigate } from 'react-router-dom';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface EditorAIPanelProps {
  chapterId: string;
  novelId: string;
  content: string;
  selection?: string;
  cursorPosition?: number;
  title?: string;
  onApplyChanges: (newContent: string) => void;
  onCreateCharacter?: (characterData: any) => void;
  onCreateLocation?: (locationData: any) => void;
  onUpdateOutline?: (outlineData: any) => void;
  onAddTimeline?: (timelineData: any) => void;
  characters?: any[];
  locations?: any[];
  outline?: any;
}

/**
 * 编辑器AI面板组件 - 优化版
 */
const EditorAIPanel: React.FC<EditorAIPanelProps> = ({
  chapterId,
  novelId,
  content,
  selection,
  cursorPosition,
  title,
  onApplyChanges,
  onCreateCharacter,
  onCreateLocation,
  onUpdateOutline,
  onAddTimeline,
  characters,
  locations,
  outline
}) => {
  const [activeTab, setActiveTab] = useState<string>('polish');
  const [loading, setLoading] = useState<boolean>(false);
  const [instructions, setInstructions] = useState<string>('');
  const [response, setResponse] = useState<EditorAIResponse | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 加载历史记录
  useEffect(() => {
    if (chapterId) {
      const editorHistory = aiEditorService.getEditHistory(chapterId);
      setHistory(editorHistory);
    }
  }, [chapterId]);

  // 处理AI操作
  const handleAIAction = async (actionType: EditorAIActionType) => {
    // 验证必要的内容
    if (!content && actionType !== EditorAIActionType.CONTINUE) {
      notification.warning({
        message: '内容为空',
        description: '请先输入或选择内容后再使用AI功能'
      });
      return;
    }
    
    // 对于需要选择文本的操作，验证是否有选择
    if ((actionType === EditorAIActionType.POLISH || 
         actionType === EditorAIActionType.EXTRACT_CHARACTER || 
         actionType === EditorAIActionType.EXTRACT_LOCATION) && 
        !selection) {
      notification.warning({
        message: '未选择文本',
        description: '请先选择要处理的文本段落'
      });
      return;
    }
    
    // 对于续写操作，验证是否有光标位置
    if (actionType === EditorAIActionType.CONTINUE && cursorPosition === undefined) {
      notification.warning({
        message: '未设置光标位置',
        description: '请先将光标放置在要续写的位置'
      });
      return;
    }

    setLoading(true);
    setServiceError(null);
    try {
      const request: EditorAIRequest = {
        actionType,
        content,
        selection,
        cursorPosition,
        chapterId,
        novelId,
        instructions: instructions || undefined,
        context: {
          title,
          characters,
          locations,
          outline
        }
      };

      const result = await aiEditorService.executeAction(request);
      
      // 检查是否有服务初始化错误
      if (result.status === 'error' && result.error?.includes('AI服务未初始化')) {
        setServiceError(result.error);
        return;
      }
      
      setResponse(result);

      // 如果成功，保存到历史记录
      if (result.status === 'success') {
        const historyItem = {
          id: `${Date.now()}-${actionType}`,
          chapterId,
          novelId,
          actionType,
          originalContent: content,
          modifiedContent: result.modifiedContent || content,
          timestamp: Date.now(),
          status: 'pending'
        };
        aiEditorService.saveEditHistory(historyItem);
        
        // 刷新历史记录
        setHistory(aiEditorService.getEditHistory(chapterId));
      }
    } catch (error) {
      console.error('AI操作失败:', error);
      notification.error({
        message: 'AI操作失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  };

  // 应用修改
  const handleApplyChanges = () => {
    if (response?.modifiedContent) {
      onApplyChanges(response.modifiedContent);
      
      // 更新历史记录状态
      const lastHistoryItem = history[0];
      if (lastHistoryItem) {
        const updatedItem = { ...lastHistoryItem, status: 'applied' };
        aiEditorService.saveEditHistory(updatedItem);
        setHistory(aiEditorService.getEditHistory(chapterId));
      }
      
      // 清除响应
      setResponse(null);
      
      notification.success({
        message: '已应用修改',
        description: '内容已更新'
      });
    }
  };

  // 拒绝修改
  const handleRejectChanges = () => {
    // 更新历史记录状态
    const lastHistoryItem = history[0];
    if (lastHistoryItem) {
      const updatedItem = { ...lastHistoryItem, status: 'rejected' };
      aiEditorService.saveEditHistory(updatedItem);
      setHistory(aiEditorService.getEditHistory(chapterId));
    }
    
    // 清除响应
    setResponse(null);
  };

  // 创建角色
  const handleCreateCharacter = () => {
    if (response?.extractedData && onCreateCharacter) {
      onCreateCharacter(response.extractedData);
      notification.success({
        message: '已创建角色',
        description: `角色 "${response.extractedData.name}" 已创建`
      });
      setResponse(null);
    }
  };

  // 创建地点
  const handleCreateLocation = () => {
    if (response?.extractedData && onCreateLocation) {
      onCreateLocation(response.extractedData);
      notification.success({
        message: '已创建地点',
        description: `地点 "${response.extractedData.name}" 已创建`
      });
      setResponse(null);
    }
  };

  // 更新大纲
  const handleUpdateOutline = () => {
    if (response?.extractedData && onUpdateOutline) {
      onUpdateOutline(response.extractedData);
      notification.success({
        message: '已更新大纲',
        description: '章节大纲已更新'
      });
      setResponse(null);
    }
  };

  // 添加时间线
  const handleAddTimeline = () => {
    if (response?.extractedData && onAddTimeline) {
      onAddTimeline(response.extractedData);
      notification.success({
        message: '已添加时间线事件',
        description: `时间线事件 "${response.extractedData.title}" 已添加`
      });
      setResponse(null);
    }
  };

  // 前往AI设置
  const goToAISettings = () => {
    navigate('/ai-assistant?tab=settings');
  };

  // 渲染响应内容
  const renderResponse = () => {
    if (!response) return null;
    
    if (response.status === 'error') {
      return (
        <Alert
          message="操作失败"
          description={response.error || '未知错误'}
          type="error"
          showIcon
        />
      );
    }

    switch (response.actionType) {
      case EditorAIActionType.POLISH:
      case EditorAIActionType.CONTINUE:
        return (
          <Card size="small" title="AI修改建议" style={{ marginTop: 16 }}>
            <TextDiffViewer 
              original={response.originalContent} 
              modified={response.modifiedContent || ''}
              diffs={response.diff || []} 
            />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Space>
                <Button icon={<CloseOutlined />} onClick={handleRejectChanges}>
                拒绝
              </Button>
                <Button type="primary" icon={<CheckOutlined />} onClick={handleApplyChanges}>
                  应用
                </Button>
            </Space>
          </div>
          </Card>
        );
      
      case EditorAIActionType.EXTRACT_CHARACTER:
        if (!response.extractedData) return null;
        return (
          <Card size="small" title="提取的角色信息" style={{ marginTop: 16 }}>
          <div>
              <p><strong>名称:</strong> {response.extractedData.name}</p>
              <p><strong>描述:</strong> {response.extractedData.description}</p>
              {response.extractedData.traits && (
                <p><strong>特点:</strong> {response.extractedData.traits.join(', ')}</p>
              )}
              {response.extractedData.background && (
                <p><strong>背景:</strong> {response.extractedData.background}</p>
              )}
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button icon={<CloseOutlined />} onClick={() => setResponse(null)}>
                  取消
                </Button>
                <Button 
                  type="primary" 
                  icon={<UserOutlined />} 
                  onClick={handleCreateCharacter}
                  disabled={!onCreateCharacter}
                >
                  创建角色
                </Button>
              </Space>
              </div>
          </Card>
        );
      
      case EditorAIActionType.EXTRACT_LOCATION:
        if (!response.extractedData) return null;
        return (
          <Card size="small" title="提取的地点信息" style={{ marginTop: 16 }}>
          <div>
              <p><strong>名称:</strong> {response.extractedData.name}</p>
              <p><strong>描述:</strong> {response.extractedData.description}</p>
              {response.extractedData.features && (
                <p><strong>特点:</strong> {response.extractedData.features.join(', ')}</p>
              )}
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button icon={<CloseOutlined />} onClick={() => setResponse(null)}>
                  取消
                </Button>
                <Button 
                  type="primary" 
                  icon={<EnvironmentOutlined />} 
                  onClick={handleCreateLocation}
                  disabled={!onCreateLocation}
                >
                  创建地点
                </Button>
              </Space>
              </div>
          </Card>
        );
      
      case EditorAIActionType.UPDATE_OUTLINE:
        if (!response.extractedData) return null;
        return (
          <Card size="small" title="提取的大纲信息" style={{ marginTop: 16 }}>
          <div>
              <p><strong>摘要:</strong> {response.extractedData.summary}</p>
              {response.extractedData.keyPoints && (
                <>
                  <p><strong>要点:</strong></p>
                  <ul>
                    {response.extractedData.keyPoints.map((point: string, index: number) => (
                          <li key={index}>{point}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button icon={<CloseOutlined />} onClick={() => setResponse(null)}>
                  取消
                </Button>
                <Button 
                  type="primary" 
                  icon={<OrderedListOutlined />} 
                  onClick={handleUpdateOutline}
                  disabled={!onUpdateOutline}
                >
                  更新大纲
                </Button>
              </Space>
              </div>
          </Card>
        );
      
      case EditorAIActionType.ADD_TIMELINE:
        if (!response.extractedData) return null;
        return (
          <Card size="small" title="提取的时间线事件" style={{ marginTop: 16 }}>
          <div>
              <p><strong>标题:</strong> {response.extractedData.title}</p>
              <p><strong>描述:</strong> {response.extractedData.description}</p>
              {response.extractedData.date && (
                <p><strong>时间:</strong> {response.extractedData.date}</p>
              )}
              {response.extractedData.characters && (
                <p><strong>相关角色:</strong> {response.extractedData.characters.join(', ')}</p>
              )}
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button icon={<CloseOutlined />} onClick={() => setResponse(null)}>
                  取消
                </Button>
                <Button 
                  type="primary" 
                  icon={<FieldTimeOutlined />} 
                  onClick={handleAddTimeline}
                  disabled={!onAddTimeline}
                >
                  添加事件
                </Button>
              </Space>
              </div>
          </Card>
        );
      
      default:
        return null;
    }
  };

  // 渲染服务错误信息
  const renderServiceError = () => {
    if (!serviceError) return null;
    
    return (
        <Alert
          message="AI服务未初始化"
          description={
            <div>
              <p>{serviceError}</p>
            <Button type="primary" onClick={goToAISettings}>
              前往设置
            </Button>
          </div>
        }
        type="warning"
        showIcon
      />
    );
  };

  // 渲染操作说明
  const renderActionDescription = (actionType: EditorAIActionType) => {
    switch (actionType) {
      case EditorAIActionType.POLISH:
        return '选择文本后，AI将帮您润色和改进文字表达';
      case EditorAIActionType.CONTINUE:
        return '将光标放在需要续写的位置，AI将为您生成后续内容';
      case EditorAIActionType.EXTRACT_CHARACTER:
        return '选择包含角色描述的文本，AI将提取角色信息';
      case EditorAIActionType.EXTRACT_LOCATION:
        return '选择包含地点描述的文本，AI将提取地点信息';
      case EditorAIActionType.UPDATE_OUTLINE:
        return 'AI将分析当前章节内容，提取关键信息更新大纲';
      case EditorAIActionType.ADD_TIMELINE:
        return '选择包含事件描述的文本，AI将提取并创建时间线事件';
      default:
        return '';
  }
  };

  return (
    <div className="editor-ai-panel">
      {serviceError ? (
        renderServiceError()
      ) : (
        <>
          <Tabs activeKey={activeTab} onChange={setActiveTab} size="small">
        <TabPane 
              tab={<Tooltip title="润色文本"><EditOutlined /> 润色</Tooltip>} 
          key="polish"
        >
              <Paragraph type="secondary" style={{ fontSize: '12px', marginBottom: 8 }}>
                {renderActionDescription(EditorAIActionType.POLISH)}
            </Paragraph>
            <Button 
              type="primary" 
              onClick={() => handleAIAction(EditorAIActionType.POLISH)}
              loading={loading && activeTab === 'polish'}
                disabled={!selection}
                block
            >
                润色选中文本
            </Button>
        </TabPane>
        
        <TabPane 
              tab={<Tooltip title="续写内容"><FileTextOutlined /> 续写</Tooltip>} 
          key="continue"
        >
              <Paragraph type="secondary" style={{ fontSize: '12px', marginBottom: 8 }}>
                {renderActionDescription(EditorAIActionType.CONTINUE)}
            </Paragraph>
            <Button 
              type="primary" 
              onClick={() => handleAIAction(EditorAIActionType.CONTINUE)}
              loading={loading && activeTab === 'continue'}
                disabled={cursorPosition === undefined}
                block
            >
                从光标处续写
            </Button>
        </TabPane>
        
        <TabPane 
              tab={<Tooltip title="提取角色"><UserOutlined /> 角色</Tooltip>} 
          key="character"
        >
              <Paragraph type="secondary" style={{ fontSize: '12px', marginBottom: 8 }}>
                {renderActionDescription(EditorAIActionType.EXTRACT_CHARACTER)}
            </Paragraph>
            <Button 
              type="primary" 
              onClick={() => handleAIAction(EditorAIActionType.EXTRACT_CHARACTER)}
              loading={loading && activeTab === 'character'}
                disabled={!selection}
                block
            >
                提取角色信息
            </Button>
        </TabPane>
        
        <TabPane 
              tab={<Tooltip title="提取地点"><EnvironmentOutlined /> 地点</Tooltip>} 
          key="location"
        >
              <Paragraph type="secondary" style={{ fontSize: '12px', marginBottom: 8 }}>
                {renderActionDescription(EditorAIActionType.EXTRACT_LOCATION)}
            </Paragraph>
            <Button 
              type="primary" 
              onClick={() => handleAIAction(EditorAIActionType.EXTRACT_LOCATION)}
              loading={loading && activeTab === 'location'}
                disabled={!selection}
                block
            >
                提取地点信息
            </Button>
        </TabPane>
        
        <TabPane 
              tab={<Tooltip title="更新大纲"><OrderedListOutlined /> 大纲</Tooltip>} 
          key="outline"
        >
              <Paragraph type="secondary" style={{ fontSize: '12px', marginBottom: 8 }}>
                {renderActionDescription(EditorAIActionType.UPDATE_OUTLINE)}
            </Paragraph>
            <Button 
              type="primary" 
              onClick={() => handleAIAction(EditorAIActionType.UPDATE_OUTLINE)}
              loading={loading && activeTab === 'outline'}
                disabled={!content}
                block
            >
                生成章节大纲
            </Button>
        </TabPane>
        
        <TabPane 
              tab={<Tooltip title="添加时间线"><FieldTimeOutlined /> 时间线</Tooltip>} 
          key="timeline"
        >
              <Paragraph type="secondary" style={{ fontSize: '12px', marginBottom: 8 }}>
                {renderActionDescription(EditorAIActionType.ADD_TIMELINE)}
            </Paragraph>
            <Button 
              type="primary" 
              onClick={() => handleAIAction(EditorAIActionType.ADD_TIMELINE)}
              loading={loading && activeTab === 'timeline'}
                disabled={!selection}
                block
            >
                提取时间线事件
            </Button>
        </TabPane>
      </Tabs>
      
          <div style={{ marginTop: 12 }}>
            <TextArea
              placeholder="可选：添加特定指令或要求..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 4 }}
              disabled={loading}
              style={{ marginBottom: 8 }}
            />
          </div>
          
          {loading && (
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
              <p style={{ marginTop: 8 }}>AI正在处理中...</p>
        </div>
          )}
          
          {renderResponse()}
        </>
      )}
    </div>
  );
};

export default EditorAIPanel; 