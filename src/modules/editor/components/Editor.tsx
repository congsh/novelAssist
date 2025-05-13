import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Layout, 
  Button, 
  Input, 
  Spin, 
  message, 
  Typography, 
  Tooltip, 
  Space, 
  Drawer,
  Tabs,
  List,
  Card,
  Divider,
  Statistic
} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined, 
  FullscreenOutlined, 
  FullscreenExitOutlined,
  RobotOutlined,
  EditOutlined,
  FieldTimeOutlined
} from '@ant-design/icons';
import { Editor as DraftEditor } from 'react-draft-wysiwyg';
import { EditorState, ContentState, convertToRaw } from 'draft-js';
import htmlToDraft from 'html-to-draftjs';
import draftToHtml from 'draftjs-to-html';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

interface Chapter {
  id: string;
  novel_id: string;
  title: string;
  content: string;
  sort_order: number;
  word_count: number;
  created_at: string;
  updated_at: string;
  status: string;
  parent_id: string | null;
}

interface Novel {
  id: string;
  title: string;
}

/**
 * 编辑器组件
 */
const Editor: React.FC = () => {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const navigate = useNavigate();
  
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [editorState, setEditorState] = useState<EditorState>(EditorState.createEmpty());
  const [title, setTitle] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState<number>(0);
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [aiDrawerVisible, setAiDrawerVisible] = useState<boolean>(false);
  const [writingTime, setWritingTime] = useState<number>(0);

  // 加载章节数据
  const loadChapterData = useCallback(async () => {
    if (!novelId || !chapterId) return;
    
    setLoading(true);
    try {
      // 获取章节详情
      const chapterResponse = await window.electron.invoke('get-chapter', { id: chapterId });
      if (chapterResponse.success) {
        const chapterData = chapterResponse.data;
        setChapter(chapterData);
        setTitle(chapterData.title);
        
        // 将HTML内容转换为EditorState
        if (chapterData.content) {
          const contentBlock = htmlToDraft(chapterData.content);
          if (contentBlock) {
            const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
            setEditorState(EditorState.createWithContent(contentState));
          }
        }
        
        // 获取小说详情
        const novelResponse = await window.electron.invoke('get-novel', { id: chapterData.novel_id });
        if (novelResponse.success) {
          setNovel(novelResponse.data);
        }
      } else {
        message.error(chapterResponse.error || '获取章节详情失败');
        navigate(`/novels/${novelId}`);
      }
    } catch (error) {
      console.error('加载章节数据失败:', error);
      message.error('加载章节数据失败');
      navigate(`/novels/${novelId}`);
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterId, navigate]);

  // 初始加载
  useEffect(() => {
    loadChapterData();
  }, [loadChapterData]);

  // 计时器，记录写作时间
  useEffect(() => {
    const timer = setInterval(() => {
      if (!loading && !saving) {
        setWritingTime(prev => prev + 1);
      }
    }, 60000); // 每分钟增加1
    
    return () => clearInterval(timer);
  }, [loading, saving]);

  // 编辑器内容变化处理
  const handleEditorChange = (state: EditorState) => {
    setEditorState(state);
    
    // 计算字数
    const contentText = state.getCurrentContent().getPlainText();
    setWordCount(contentText.length);
  };

  // 保存章节内容
  const saveChapter = async () => {
    if (!novelId || !chapterId) return;
    
    setSaving(true);
    try {
      // 将编辑器内容转换为HTML
      const contentHtml = draftToHtml(convertToRaw(editorState.getCurrentContent()));
      
      // 更新章节
      const response = await window.electron.invoke('update-chapter', {
        id: chapterId,
        title,
        content: contentHtml
      });
      
      if (response.success) {
        message.success('保存成功');
        setLastSavedAt(new Date());
        setChapter(response.data);
      } else {
        message.error(response.error || '保存失败');
      }
    } catch (error) {
      console.error('保存章节失败:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 切换全屏模式
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 格式化时间
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  // 返回加载中状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <Layout className={isFullscreen ? 'fullscreen-editor' : ''} style={{ height: '100%' }}>
      <Header style={{ 
        padding: '0 16px', 
        background: '#fff', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(`/novels/${novelId}`)}
            style={{ marginRight: 16 }}
          >
            返回
          </Button>
          
          <Input
            placeholder="章节标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: 300, marginRight: 16 }}
          />
        </div>
        
        <div>
          <Space>
            <Statistic 
              value={wordCount} 
              suffix="字" 
              style={{ marginRight: 16 }} 
            />
            
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              loading={saving}
              onClick={saveChapter}
              style={{ marginRight: 8 }}
            >
              保存
            </Button>
            
            <Tooltip title="AI助手">
              <Button 
                icon={<RobotOutlined />} 
                onClick={() => setAiDrawerVisible(true)}
                style={{ marginRight: 8 }}
              />
            </Tooltip>
            
            <Tooltip title="章节信息">
              <Button 
                icon={<EditOutlined />} 
                onClick={() => setDrawerVisible(true)}
                style={{ marginRight: 8 }}
              />
            </Tooltip>
            
            <Tooltip title={isFullscreen ? "退出全屏" : "全屏编辑"}>
              <Button 
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
                onClick={toggleFullscreen}
              />
            </Tooltip>
          </Space>
        </div>
      </Header>
      
      <Content style={{ padding: '16px', overflow: 'auto' }}>
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          minHeight: 500,
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <DraftEditor
            editorState={editorState}
            onEditorStateChange={handleEditorChange}
            wrapperClassName="editor-wrapper"
            editorClassName="editor-content"
            toolbarClassName="editor-toolbar"
            toolbar={{
              options: ['inline', 'blockType', 'fontSize', 'list', 'textAlign', 'history'],
              inline: {
                options: ['bold', 'italic', 'underline', 'strikethrough'],
              },
              blockType: {
                options: ['Normal', 'H1', 'H2', 'H3', 'H4', 'Blockquote'],
              },
              textAlign: {
                options: ['left', 'center', 'right', 'justify'],
              },
            }}
          />
        </div>
      </Content>
      
      {/* 章节信息抽屉 */}
      <Drawer
        title="章节信息"
        placement="right"
        width={400}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        <Tabs defaultActiveKey="info">
          <TabPane tab="基本信息" key="info">
            <Card>
              <Statistic 
                title="字数" 
                value={wordCount} 
                suffix="字"
                prefix={<EditOutlined />}
                style={{ marginBottom: 16 }}
              />
              
              <Statistic 
                title="写作时间" 
                value={writingTime} 
                suffix="分钟"
                prefix={<FieldTimeOutlined />}
                style={{ marginBottom: 16 }}
              />
              
              {lastSavedAt && (
                <div>
                  <Divider />
                  <p>上次保存: {lastSavedAt.toLocaleString()}</p>
                </div>
              )}
            </Card>
          </TabPane>
          
          <TabPane tab="大纲" key="outline">
            <p>此功能尚未实现</p>
          </TabPane>
          
          <TabPane tab="笔记" key="notes">
            <p>此功能尚未实现</p>
          </TabPane>
        </Tabs>
      </Drawer>
      
      {/* AI助手抽屉 */}
      <Drawer
        title="AI助手"
        placement="right"
        width={400}
        onClose={() => setAiDrawerVisible(false)}
        open={aiDrawerVisible}
      >
        <p>AI助手功能尚未实现</p>
      </Drawer>
    </Layout>
  );
};

export default Editor; 