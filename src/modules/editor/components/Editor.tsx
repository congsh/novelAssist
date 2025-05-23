import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {   Layout,   Button,   Input,   Spin,   Typography,   Tooltip,   Space,   Drawer,  Tabs,  List,  Card,  Divider,  Statistic,  Switch,  App, notification} from 'antd';
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
import EditorAIPanel from '../../ai/components/EditorAIPanel';
import EditorHeader from './EditorHeader';
import EditorFooter from './EditorFooter';
import { EditorUtils } from '../utils/EditorUtils';
import { AutoSaveService } from '../services/AutoSaveService';

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
  
  // 自动保存服务
  const autoSaveServiceRef = useRef<AutoSaveService | null>(null);

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
          const editorState = EditorUtils.htmlToEditorState(chapterData.content);
          setEditorState(editorState);
          
          // 初始化自动保存服务
          autoSaveServiceRef.current = new AutoSaveService(
            chapterData.content,
            saveChapter,
            autoSaveEnabled
          );
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
  }, [novelId, chapterId, navigate, message, autoSaveEnabled]);

  // 初始加载
  useEffect(() => {
    loadChapterData();
    
    // 组件卸载时清理资源
    return () => {
      if (autoSaveServiceRef.current) {
        autoSaveServiceRef.current.dispose();
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

  // 自动保存设置变更处理
  useEffect(() => {
    if (autoSaveServiceRef.current) {
      autoSaveServiceRef.current.setAutoSaveEnabled(autoSaveEnabled);
    }
  }, [autoSaveEnabled]);

  // 编辑器内容变化处理
  const handleEditorChange = (state: EditorState) => {
    setEditorState(state);
    
    // 计算字数
    setWordCount(EditorUtils.calculateWordCount(state));
    
    // 标记内容已更改并设置自动保存定时器
    if (autoSaveServiceRef.current) {
      autoSaveServiceRef.current.handleEditorChange(state, title);
    }
  };

  // 保存章节
  const saveChapter = async (content?: string, chapterTitle?: string): Promise<boolean> => {
    if (!novelId || !chapterId) return false;
    
    try {
      setSaving(true);
      
      // 如果未提供内容，则使用当前编辑器内容
      const contentToSave = content || EditorUtils.editorStateToHtml(editorState);
      const titleToSave = chapterTitle || title;
      
      // 保存版本历史
      if (chapter && chapter.content) {
        await VersionService.saveVersion(chapterId, 'chapter', chapter.content);
      }
      
      // 更新章节
      const response = await window.electron.invoke('update-chapter', {
        id: chapterId,
        title: titleToSave,
        content: contentToSave,
        word_count: EditorUtils.calculateWordCount(editorState)
      });
      
      if (response.success) {
        setLastSavedAt(new Date());
        setChapter(prev => prev ? { ...prev, content: contentToSave, title: titleToSave } : null);
        
        // 更新自动保存服务的上次保存内容
        if (autoSaveServiceRef.current) {
          autoSaveServiceRef.current.updateLastSavedContent(contentToSave);
        }
        
        return true;
      } else {
        message.error(response.error || '保存失败');
        return false;
      }
    } catch (error) {
      console.error('保存章节失败:', error);
      message.error('保存章节失败');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // 手动保存处理
  const handleSave = async () => {
    await saveChapter();
  };

  // 返回按钮处理
  const handleBack = () => {
    navigate(`/novels/${novelId}`);
  };

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 切换主题
  const handleThemeChange = (themeName: string) => {
    ThemeService.setTheme(themeName);
    setCurrentTheme(themeName);
  };

  // 恢复版本
  const handleRestoreVersion = (content: string) => {
    // 将版本内容转换为EditorState
    const restoredEditorState = EditorUtils.htmlToEditorState(content);
    setEditorState(restoredEditorState);
    
    // 标记内容已更改
    if (autoSaveServiceRef.current) {
      autoSaveServiceRef.current.setContentChanged(true);
    }
    
    message.success('已恢复到选定的版本');
    setDrawerVisible(false);
  };

  // 切换侧边栏
  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  // 切换AI面板
  const toggleAIPanel = () => {
    setAiDrawerVisible(!aiDrawerVisible);
  };

  // 切换主题选择器
  const toggleThemeSelector = () => {
    setDrawerVisible(!drawerVisible);
    setActiveTabKey('theme');
  };

  // 切换版本历史
  const toggleVersionHistory = () => {
    setDrawerVisible(!drawerVisible);
    setActiveTabKey('version');
  };

  // 获取选中文本函数，用于AI面板
  const getSelectedText = (): string | undefined => {
    return EditorUtils.getSelectedText(editorState);
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载章节内容..." />
      </div>
    );
  }

  return (
    <Layout className={`editor-layout ${isFullscreen ? 'fullscreen' : ''}`} style={{ height: '100vh' }}>
      {/* 顶部工具栏 */}
      <EditorHeader
        title={title}
        setTitle={setTitle}
        saving={saving}
        isFullscreen={isFullscreen}
        sidebarVisible={sidebarVisible}
        onSave={handleSave}
        onBack={handleBack}
        onToggleFullscreen={toggleFullscreen}
        onToggleAIPanel={toggleAIPanel}
        onToggleTheme={toggleThemeSelector}
        onToggleSidebar={toggleSidebar}
        lastSavedAt={lastSavedAt}
      />
      
      <Layout>
        {/* 侧边栏 */}
        {sidebarVisible && (
          <Sider width={280} theme="light" style={{ overflowY: 'auto' }}>
            <EditorSidebar 
              novelId={novelId || ''} 
              onVersionHistoryClick={toggleVersionHistory}
            />
          </Sider>
        )}
        
        {/* 编辑器主区域 */}
        <Content style={{ overflow: 'auto', padding: '0 20px', backgroundColor: '#fff' }}>
          <DraftEditor
            editorState={editorState}
            onEditorStateChange={handleEditorChange}
            wrapperClassName="editor-wrapper"
            editorClassName="editor-content"
            toolbarClassName="editor-toolbar"
            toolbar={{
              options: ['inline', 'blockType', 'fontSize', 'fontFamily', 'list', 'textAlign', 'colorPicker', 'link', 'emoji', 'image', 'history'],
              inline: { inDropdown: false },
              list: { inDropdown: true },
              textAlign: { inDropdown: true },
              link: { inDropdown: true },
              history: { inDropdown: true },
            }}
          />
        </Content>
      </Layout>
      
      {/* 底部状态栏 */}
      <EditorFooter
        wordCount={wordCount}
        writingTime={writingTime}
        autoSaveEnabled={autoSaveEnabled}
        formatTime={EditorUtils.formatTime}
      />
      
      {/* 抽屉面板 - 版本历史和主题设置 */}
      <Drawer
        title="编辑器设置"
        placement="right"
        width={400}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        <Tabs activeKey={activeTabKey} onChange={setActiveTabKey}>
          <Tabs.TabPane tab="版本历史" key="version">
            <VersionHistory 
              chapterId={chapterId || ''}
              onRestore={handleRestoreVersion}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="主题设置" key="theme">
            <ThemeSelector 
              currentTheme={currentTheme}
              onThemeChange={handleThemeChange}
            />
          </Tabs.TabPane>
        </Tabs>
      </Drawer>
      
      {/* AI助手抽屉 */}
      <Drawer
        title="AI写作助手"
        placement="right"
        width={400}
        onClose={() => setAiDrawerVisible(false)}
        open={aiDrawerVisible}
      >
        <EditorAIPanel
          chapterId={chapterId || ''}
          novelId={novelId || ''}
          content={EditorUtils.editorStateToHtml(editorState)}
          selection={getSelectedText()}
          cursorPosition={editorState.getSelection().getStartOffset()}
          title={title}
          onApplyChanges={(newContent: string) => {
            // 创建新的EditorState，插入AI生成的文本
            const newEditorState = EditorUtils.htmlToEditorState(newContent);
            setEditorState(newEditorState);
            
            // 标记内容已更改
            if (autoSaveServiceRef.current) {
              autoSaveServiceRef.current.setContentChanged(true);
            }
          }}
        />
      </Drawer>
    </Layout>
  );
};

export default Editor; 