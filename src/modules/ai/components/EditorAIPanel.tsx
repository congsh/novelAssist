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
  Alert
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
  SettingOutlined
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
 * 编辑器AI面板组件
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
    if (!content) {
      notification.warning({
        message: '内容为空',
        description: '请先输入或选择内容后再使用AI功能'
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
        description: `角色 ${response.extractedData.name || '未命名'} 已创建`
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
        description: `地点 ${response.extractedData.name || '未命名'} 已创建`
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
        description: `事件 ${response.extractedData.title || '未命名'} 已添加到时间线`
      });
      setResponse(null);
    }
  };

  // 跳转到AI设置页面
  const goToAISettings = () => {
    navigate('/ai-settings');
  };

  // 渲染响应内容
  const renderResponse = () => {
    if (!response) return null;

    switch (response.actionType) {
      case EditorAIActionType.POLISH:
      case EditorAIActionType.CONTINUE:
        return (
          <div>
            <Title level={5}>修改预览</Title>
            <TextDiffViewer 
              original={response.originalContent} 
              modified={response.modifiedContent || response.originalContent} 
              diffs={response.diff || []} 
            />
            <Divider />
            <Space>
              <Button 
                type="primary" 
                icon={<CheckOutlined />} 
                onClick={handleApplyChanges}
              >
                应用修改
              </Button>
              <Button 
                danger 
                icon={<CloseOutlined />} 
                onClick={handleRejectChanges}
              >
                拒绝
              </Button>
            </Space>
          </div>
        );
      
      case EditorAIActionType.EXTRACT_CHARACTER:
        return (
          <div>
            <Title level={5}>提取的角色信息</Title>
            {response.extractedData ? (
              <div>
                <Paragraph>
                  <Text strong>姓名：</Text> {response.extractedData.name || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>性别：</Text> {response.extractedData.gender || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>年龄：</Text> {response.extractedData.age || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>外貌：</Text> {response.extractedData.appearance || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>性格：</Text> {response.extractedData.personality || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>背景：</Text> {response.extractedData.background || '未知'}
                </Paragraph>
                <Divider />
                <Button 
                  type="primary" 
                  icon={<UserOutlined />} 
                  onClick={handleCreateCharacter}
                >
                  创建角色
                </Button>
              </div>
            ) : (
              <Text type="danger">无法提取角色信息</Text>
            )}
          </div>
        );
      
      case EditorAIActionType.EXTRACT_LOCATION:
        return (
          <div>
            <Title level={5}>提取的地点信息</Title>
            {response.extractedData ? (
              <div>
                <Paragraph>
                  <Text strong>名称：</Text> {response.extractedData.name || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>描述：</Text> {response.extractedData.description || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>特点：</Text> {response.extractedData.features || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>重要性：</Text> {response.extractedData.importance || '未知'}
                </Paragraph>
                <Divider />
                <Button 
                  type="primary" 
                  icon={<EnvironmentOutlined />} 
                  onClick={handleCreateLocation}
                >
                  创建地点
                </Button>
              </div>
            ) : (
              <Text type="danger">无法提取地点信息</Text>
            )}
          </div>
        );
      
      case EditorAIActionType.UPDATE_OUTLINE:
        return (
          <div>
            <Title level={5}>更新的大纲信息</Title>
            {response.extractedData ? (
              <div>
                <Paragraph>
                  <Text strong>标题：</Text> {response.extractedData.title || title || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>摘要：</Text> {response.extractedData.summary || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>关键点：</Text>
                  <ul>
                    {response.extractedData.keyPoints ? 
                      (Array.isArray(response.extractedData.keyPoints) ? 
                        response.extractedData.keyPoints.map((point: string, index: number) => (
                          <li key={index}>{point}</li>
                        )) : 
                        <li>{response.extractedData.keyPoints}</li>
                      ) : 
                      <li>无关键点</li>
                    }
                  </ul>
                </Paragraph>
                <Paragraph>
                  <Text strong>涉及角色：</Text>
                  <ul>
                    {response.extractedData.characters ? 
                      (Array.isArray(response.extractedData.characters) ? 
                        response.extractedData.characters.map((char: string, index: number) => (
                          <li key={index}>{char}</li>
                        )) : 
                        <li>{response.extractedData.characters}</li>
                      ) : 
                      <li>无涉及角色</li>
                    }
                  </ul>
                </Paragraph>
                <Paragraph>
                  <Text strong>涉及地点：</Text>
                  <ul>
                    {response.extractedData.locations ? 
                      (Array.isArray(response.extractedData.locations) ? 
                        response.extractedData.locations.map((loc: string, index: number) => (
                          <li key={index}>{loc}</li>
                        )) : 
                        <li>{response.extractedData.locations}</li>
                      ) : 
                      <li>无涉及地点</li>
                    }
                  </ul>
                </Paragraph>
                <Divider />
                <Button 
                  type="primary" 
                  icon={<OrderedListOutlined />} 
                  onClick={handleUpdateOutline}
                >
                  更新大纲
                </Button>
              </div>
            ) : (
              <Text type="danger">无法更新大纲信息</Text>
            )}
          </div>
        );
      
      case EditorAIActionType.ADD_TIMELINE:
        return (
          <div>
            <Title level={5}>提取的时间线事件</Title>
            {response.extractedData ? (
              <div>
                <Paragraph>
                  <Text strong>事件名称：</Text> {response.extractedData.title || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>时间：</Text> {response.extractedData.time || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>描述：</Text> {response.extractedData.description || '未知'}
                </Paragraph>
                <Paragraph>
                  <Text strong>相关人物：</Text>
                  {response.extractedData.characters ? 
                    (Array.isArray(response.extractedData.characters) ? 
                      response.extractedData.characters.join(', ') : 
                      response.extractedData.characters
                    ) : 
                    '无'
                  }
                </Paragraph>
                <Paragraph>
                  <Text strong>地点：</Text> {response.extractedData.location || '未知'}
                </Paragraph>
                <Divider />
                <Button 
                  type="primary" 
                  icon={<FieldTimeOutlined />} 
                  onClick={handleAddTimeline}
                >
                  添加到时间线
                </Button>
              </div>
            ) : (
              <Text type="danger">无法提取时间线事件</Text>
            )}
          </div>
        );
      
      default:
        return (
          <Text type="warning">未知的AI操作类型</Text>
        );
    }
  };

  // 如果有服务错误，显示错误提示
  if (serviceError) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="AI服务未初始化"
          description={
            <div>
              <p>{serviceError}</p>
              <p>请先配置AI服务后再使用AI助手功能。</p>
            </div>
          }
          type="error"
          showIcon
          action={
            <Button 
              type="primary" 
              icon={<SettingOutlined />} 
              onClick={goToAISettings}
            >
              前往设置
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="editor-ai-panel">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane 
          tab={
            <Tooltip title="润色文本">
              <span><EditOutlined /> 润色</span>
            </Tooltip>
          } 
          key="polish"
        >
          <div style={{ marginBottom: 16 }}>
            <Paragraph>
              使用AI润色文本，使其更加流畅生动。
              {selection ? <Text type="success"> 已选择{selection.length}个字符</Text> : <Text type="warning"> 未选择文本将润色全文</Text>}
            </Paragraph>
            <TextArea
              placeholder="输入特定指令，例如：'使语言更加优美'"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              style={{ marginBottom: 8 }}
            />
            <Button 
              type="primary" 
              onClick={() => handleAIAction(EditorAIActionType.POLISH)}
              loading={loading && activeTab === 'polish'}
              icon={<RobotOutlined />}
            >
              润色文本
            </Button>
          </div>
        </TabPane>
        
        <TabPane 
          tab={
            <Tooltip title="续写内容">
              <span><FileTextOutlined /> 续写</span>
            </Tooltip>
          } 
          key="continue"
        >
          <div style={{ marginBottom: 16 }}>
            <Paragraph>
              在当前光标位置续写内容。
            </Paragraph>
            <TextArea
              placeholder="输入特定指令，例如：'描写角色的内心活动'"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              style={{ marginBottom: 8 }}
            />
            <Button 
              type="primary" 
              onClick={() => handleAIAction(EditorAIActionType.CONTINUE)}
              loading={loading && activeTab === 'continue'}
              icon={<RobotOutlined />}
            >
              续写内容
            </Button>
          </div>
        </TabPane>
        
        <TabPane 
          tab={
            <Tooltip title="提取角色">
              <span><UserOutlined /> 角色</span>
            </Tooltip>
          } 
          key="character"
        >
          <div style={{ marginBottom: 16 }}>
            <Paragraph>
              从文本中提取角色信息并创建角色。
              {selection ? <Text type="success"> 已选择{selection.length}个字符</Text> : <Text type="warning"> 未选择文本将分析全文</Text>}
            </Paragraph>
            <Button 
              type="primary" 
              onClick={() => handleAIAction(EditorAIActionType.EXTRACT_CHARACTER)}
              loading={loading && activeTab === 'character'}
              icon={<RobotOutlined />}
            >
              提取角色
            </Button>
          </div>
        </TabPane>
        
        <TabPane 
          tab={
            <Tooltip title="提取地点">
              <span><EnvironmentOutlined /> 地点</span>
            </Tooltip>
          } 
          key="location"
        >
          <div style={{ marginBottom: 16 }}>
            <Paragraph>
              从文本中提取地点信息并创建地点。
              {selection ? <Text type="success"> 已选择{selection.length}个字符</Text> : <Text type="warning"> 未选择文本将分析全文</Text>}
            </Paragraph>
            <Button 
              type="primary" 
              onClick={() => handleAIAction(EditorAIActionType.EXTRACT_LOCATION)}
              loading={loading && activeTab === 'location'}
              icon={<RobotOutlined />}
            >
              提取地点
            </Button>
          </div>
        </TabPane>
        
        <TabPane 
          tab={
            <Tooltip title="更新大纲">
              <span><OrderedListOutlined /> 大纲</span>
            </Tooltip>
          } 
          key="outline"
        >
          <div style={{ marginBottom: 16 }}>
            <Paragraph>
              分析当前章节内容，更新或创建大纲。
            </Paragraph>
            <Button 
              type="primary" 
              onClick={() => handleAIAction(EditorAIActionType.UPDATE_OUTLINE)}
              loading={loading && activeTab === 'outline'}
              icon={<RobotOutlined />}
            >
              更新大纲
            </Button>
          </div>
        </TabPane>
        
        <TabPane 
          tab={
            <Tooltip title="添加时间线">
              <span><FieldTimeOutlined /> 时间线</span>
            </Tooltip>
          } 
          key="timeline"
        >
          <div style={{ marginBottom: 16 }}>
            <Paragraph>
              从文本中提取事件信息并添加到时间线。
              {selection ? <Text type="success"> 已选择{selection.length}个字符</Text> : <Text type="warning"> 未选择文本将分析全文</Text>}
            </Paragraph>
            <Button 
              type="primary" 
              onClick={() => handleAIAction(EditorAIActionType.ADD_TIMELINE)}
              loading={loading && activeTab === 'timeline'}
              icon={<RobotOutlined />}
            >
              提取事件
            </Button>
          </div>
        </TabPane>
      </Tabs>
      
      <Divider />
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            正在处理，请稍候...
          </div>
        </div>
      ) : response ? (
        <div className="ai-response">
          {renderResponse()}
        </div>
      ) : (
        <div className="history-list">
          {history.length > 0 ? (
            <>
              <Title level={5}>历史记录</Title>
              <ul style={{ padding: 0, listStyle: 'none' }}>
                {history.slice(0, 5).map((item) => (
                  <li key={item.id} style={{ marginBottom: 8 }}>
                    <Text type={item.status === 'applied' ? 'success' : item.status === 'rejected' ? 'danger' : 'secondary'}>
                      {new Date(item.timestamp).toLocaleString()} - 
                      {item.actionType === EditorAIActionType.POLISH ? ' 润色' : 
                       item.actionType === EditorAIActionType.CONTINUE ? ' 续写' :
                       item.actionType === EditorAIActionType.EXTRACT_CHARACTER ? ' 提取角色' :
                       item.actionType === EditorAIActionType.EXTRACT_LOCATION ? ' 提取地点' :
                       item.actionType === EditorAIActionType.UPDATE_OUTLINE ? ' 更新大纲' :
                       item.actionType === EditorAIActionType.ADD_TIMELINE ? ' 添加时间线' : ' 未知操作'}
                      {item.status === 'applied' ? ' (已应用)' : 
                       item.status === 'rejected' ? ' (已拒绝)' : 
                       item.status === 'modified' ? ' (已修改)' : ' (待处理)'}
                    </Text>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Text type="secondary">暂无历史记录</Text>
          )}
        </div>
      )}
    </div>
  );
};

export default EditorAIPanel; 