import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {   Layout,   Button,   Input,   Spin,   Typography,   Tooltip,   Space,   Drawer,  Tabs,  List,  Card,  Divider,  Statistic,  Switch,  App} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined, 
  FullscreenOutlined, 
  FullscreenExitOutlined,
  RobotOutlined,
  EditOutlined,
  FieldTimeOutlined,
  HistoryOutlined,
  BgColorsOutlined,
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { Editor as DraftEditor } from 'react-draft-wysiwyg';
import { EditorState, ContentState, convertToRaw } from 'draft-js';
import htmlToDraft from 'html-to-draftjs';
import draftToHtml from 'draftjs-to-html';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import VersionHistory from './VersionHistory';
import ThemeSelector from './ThemeSelector';
import EditorSidebar from './EditorSidebar';
import VersionService from '../services/VersionService';
import ThemeService from '../services/ThemeService';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

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
  const { message } = App.useApp();
  
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
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);
  const [currentTheme, setCurrentTheme] = useState<string>(ThemeService.getCurrentThemeName());
  const [activeTabKey, setActiveTabKey] = useState<string>('info');
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  
  // 内容变更标记
  const contentChanged = useRef<boolean>(false);
  // 自动保存计时器
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 上次自动保存的内容
  const lastAutoSavedContent = useRef<string>('');

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
            
            // 记录初始内容，用于自动保存比较
            lastAutoSavedContent.current = chapterData.content;
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
  }, [novelId, chapterId, navigate, message]);

  // 初始加载
  useEffect(() => {
    loadChapterData();
    
    // 组件卸载时清除自动保存计时器
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
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

  // 自动保存功能
  useEffect(() => {
    // 如果启用了自动保存且内容已更改
    if (autoSaveEnabled && contentChanged.current) {
      // 清除之前的计时器
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // 设置新的自动保存计时器（5分钟）
      autoSaveTimerRef.current = setTimeout(async () => {
        if (contentChanged.current && !saving) {
          await handleAutoSave();
        }
      }, 5 * 60 * 1000); // 5分钟
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editorState, autoSaveEnabled]);

  // 编辑器内容变化处理
  const handleEditorChange = (state: EditorState) => {
    setEditorState(state);
    
    // 计算字数
    const contentText = state.getCurrentContent().getPlainText();
    setWordCount(contentText.length);
    
    // 标记内容已更改
    contentChanged.current = true;
  };

  // 自动保存处理
  const handleAutoSave = async () => {
    if (!novelId || !chapterId || !contentChanged.current) return;
    
    try {
      // 将编辑器内容转换为HTML
      const contentHtml = draftToHtml(convertToRaw(editorState.getCurrentContent()));
      
      // 如果内容没有变化，不执行自动保存
      if (contentHtml === lastAutoSavedContent.current) {
        return;
      }
      
      setSaving(true);
      
      // 更新章节
      const response = await window.electron.invoke('update-chapter', {
        id: chapterId,
        title,
        content: contentHtml
      });
      
      if (response.success) {
        // 保存版本历史
        await VersionService.saveVersion(chapterId, contentHtml, '自动保存');
        
        // 更新最后保存时间和内容
        setLastSavedAt(new Date());
        lastAutoSavedContent.current = contentHtml;
        setChapter(response.data);
        contentChanged.current = false;
        
        console.log('自动保存成功:', new Date().toLocaleString());
      } else {
        console.error('自动保存失败:', response.error);
      }
    } catch (error) {
      console.error('自动保存失败:', error);
    } finally {
      setSaving(false);
    }
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
        
        // 保存版本历史
        await VersionService.saveVersion(chapterId, contentHtml, '手动保存');
        
        // 更新最后自动保存的内容
        lastAutoSavedContent.current = contentHtml;
        contentChanged.current = false;
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

  // 处理主题变更
  const handleThemeChange = (themeName: string) => {
    setCurrentTheme(themeName);
  };

  // 处理版本恢复
  const handleRestoreVersion = (content: string) => {
    // 将HTML内容转换为EditorState
    const contentBlock = htmlToDraft(content);
    if (contentBlock) {
      const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
      setEditorState(EditorState.createWithContent(contentState));
      
      // 标记内容已更改
      contentChanged.current = true;
    }
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

  // 获取主题样式
  const themeStyles = ThemeService.generateThemeStyles();

  // 切换侧边栏显示状态
  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
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
    <App>
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Header style={{ 
          padding: '0 16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: ThemeService.getThemeColors(currentTheme).headerBg
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate(`/novels/${novelId}`)}
              style={{ color: ThemeService.getThemeColors(currentTheme).headerText }}
            />
            <Input 
              value={title} 
              onChange={e => {
                setTitle(e.target.value);
                contentChanged.current = true;
              }}
              placeholder="章节标题"
              bordered={false}
              style={{ 
                width: 300, 
                marginLeft: 16,
                color: ThemeService.getThemeColors(currentTheme).headerText,
                background: 'transparent'
              }}
            />
          </div>
          <Space>
            {lastSavedAt && (
              <span style={{ color: ThemeService.getThemeColors(currentTheme).headerText }}>
                最后保存: {lastSavedAt.toLocaleTimeString()}
              </span>
            )}
            <Tooltip title="显示/隐藏参考资料">
              <Button 
                type="text" 
                icon={sidebarVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />} 
                onClick={toggleSidebar}
                style={{ color: ThemeService.getThemeColors(currentTheme).headerText }}
              />
            </Tooltip>
            <Tooltip title="主题设置">
              <Button 
                type="text" 
                icon={<BgColorsOutlined />} 
                onClick={() => setDrawerVisible(true)}
                style={{ color: ThemeService.getThemeColors(currentTheme).headerText }}
              />
            </Tooltip>
            <Tooltip title="版本历史">
              <Button 
                type="text" 
                icon={<HistoryOutlined />} 
                onClick={() => setActiveTabKey('history')}
                style={{ color: ThemeService.getThemeColors(currentTheme).headerText }}
              />
            </Tooltip>
            <Tooltip title="AI助手">
              <Button 
                type="text" 
                icon={<RobotOutlined />} 
                onClick={() => setAiDrawerVisible(true)}
                style={{ color: ThemeService.getThemeColors(currentTheme).headerText }}
              />
            </Tooltip>
            <Tooltip title={isFullscreen ? "退出全屏" : "全屏编辑"}>
              <Button 
                type="text" 
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
                onClick={toggleFullscreen}
                style={{ color: ThemeService.getThemeColors(currentTheme).headerText }}
              />
            </Tooltip>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              loading={saving} 
              onClick={saveChapter}
            >
              保存
            </Button>
          </Space>
        </Header>
        <Layout>
          {sidebarVisible && (
            <Sider 
              width={300} 
              theme={ThemeService.getThemeColors(currentTheme).siderTheme}
              style={{ 
                background: ThemeService.getThemeColors(currentTheme).siderBg,
                borderRight: `1px solid ${ThemeService.getThemeColors(currentTheme).borderColor}`,
                overflow: 'auto'
              }}
            >
              <div style={{ padding: '16px 0' }}>
                <div style={{ 
                  padding: '0 16px', 
                  marginBottom: 16,
                  color: ThemeService.getThemeColors(currentTheme).siderText
                }}>
                  <Title level={5} style={{ color: ThemeService.getThemeColors(currentTheme).siderText }}>
                    <BookOutlined /> {novel?.title}
                  </Title>
                  <div>章节: {chapter?.title}</div>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <EditorSidebar novelId={novelId || ''} />
              </div>
            </Sider>
          )}
          <Content style={{ 
            padding: 24, 
            background: ThemeService.getThemeColors(currentTheme).contentBg,
            overflow: 'auto'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: ThemeService.getThemeColors(currentTheme).contentText }}>
                  加载中...
                </div>
              </div>
            ) : (
              <div 
                className={`editor-container ${isFullscreen ? 'fullscreen' : ''}`}
                style={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <DraftEditor
                    editorState={editorState}
                    onEditorStateChange={handleEditorChange}
                    wrapperClassName={`editor-wrapper theme-${currentTheme}`}
                    editorClassName={`editor-content theme-${currentTheme}`}
                    toolbar={{
                      options: ['inline', 'blockType', 'fontSize', 'list', 'textAlign', 'colorPicker', 'link', 'history'],
                      inline: { inDropdown: false },
                      list: { inDropdown: true },
                      textAlign: { inDropdown: true },
                      link: { inDropdown: true },
                      history: { inDropdown: false },
                    }}
                  />
                </div>
                <div style={{ 
                  marginTop: 16, 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  color: ThemeService.getThemeColors(currentTheme).contentText
                }}>
                  <div>
                    <Space>
                      <Statistic title="字数" value={wordCount} />
                      <Statistic title="写作时间" value={formatTime(writingTime)} />
                    </Space>
                  </div>
                  <div>
                    <Space>
                      <span>自动保存</span>
                      <Switch checked={autoSaveEnabled} onChange={setAutoSaveEnabled} />
                    </Space>
                  </div>
                </div>
              </div>
            )}
          </Content>
        </Layout>

        {/* 主题设置抽屉 */}
        <Drawer
          title="设置"
          placement="right"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={400}
        >
          <Tabs activeKey={activeTabKey} onChange={setActiveTabKey} items={[
            {
              key: "theme",
              label: "主题",
              children: (
                <ThemeSelector 
                  currentTheme={currentTheme} 
                  onThemeChange={handleThemeChange} 
                />
              )
            },
            {
              key: "history",
              label: "历史版本",
              children: (
                chapterId && (
                  <VersionHistory 
                    chapterId={chapterId} 
                    onRestore={handleRestoreVersion} 
                  />
                )
              )
            }
          ]} />
        </Drawer>

        {/* AI助手抽屉 */}
        <Drawer
          title="AI写作助手"
          placement="right"
          onClose={() => setAiDrawerVisible(false)}
          open={aiDrawerVisible}
          width={400}
        >
          <div style={{ padding: 16 }}>
            <p>AI写作助手功能即将推出，敬请期待！</p>
          </div>
        </Drawer>
      </Layout>
    </App>
  );
};

export default Editor; 