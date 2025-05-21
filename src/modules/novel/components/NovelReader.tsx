import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Layout, 
  Button, 
  Spin, 
  message, 
  Typography, 
  Tooltip, 
  Space, 
  Drawer,
  List,
  Card,
  Divider,
  Menu,
  Dropdown,
  Pagination,
  Tabs,
  Input,
  Empty,
  Tag,
  App,
  Radio
} from 'antd';
import { 
  ArrowLeftOutlined, 
  FullscreenOutlined, 
  FullscreenExitOutlined,
  MenuOutlined,
  ReadOutlined,
  SettingOutlined,
  FontSizeOutlined,
  BgColorsOutlined,
  SearchOutlined,
  MessageOutlined,
  PictureOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { chapterVectorizationService } from '../services';

const { Header, Content, Sider } = Layout;
const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;

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
  author: string;
}

interface ContentChunk {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  index: number;
  type?: 'general' | 'scene' | 'dialogue';
}

/**
 * 小说阅读器组件
 */
const NovelReader: React.FC = () => {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const navigate = useNavigate();
  const { message: appMessage } = App.useApp();
  
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [theme, setTheme] = useState<string>('light');
  const [lineHeight, setLineHeight] = useState<number>(1.8);
  const [activeTabKey, setActiveTabKey] = useState<string>("chapters");
  const [scenes, setScenes] = useState<ContentChunk[]>([]);
  const [dialogues, setDialogues] = useState<ContentChunk[]>([]);
  const [scenesLoading, setScenesLoading] = useState<boolean>(false);
  const [dialoguesLoading, setDialoguesLoading] = useState<boolean>(false);
  const [similarContent, setSimilarContent] = useState<any[]>([]);
  const [similarContentLoading, setSimilarContentLoading] = useState<boolean>(false);
  const [searchType, setSearchType] = useState<'scene' | 'dialogue' | 'general'>('general');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // 加载小说和章节数据
  const loadData = useCallback(async () => {
    if (!novelId || !chapterId) return;
    
    setLoading(true);
    try {
      // 获取章节详情
      const chapterResponse = await window.electron.invoke('get-chapter', { id: chapterId });
      if (chapterResponse.success) {
        setChapter(chapterResponse.data);
        
        // 获取小说详情
        const novelResponse = await window.electron.invoke('get-novel', { id: chapterResponse.data.novel_id });
        if (novelResponse.success) {
          setNovel(novelResponse.data);
        }
        
        // 获取章节列表
        const chaptersResponse = await window.electron.invoke('get-chapters', { novelId: chapterResponse.data.novel_id });
        if (chaptersResponse.success) {
          setChapters(chaptersResponse.data.sort((a: Chapter, b: Chapter) => a.sort_order - b.sort_order));
        }
        
        // 加载场景和对话
        loadScenes(chapterId);
        loadDialogues(chapterId);
      } else {
        appMessage.error(chapterResponse.error || '获取章节详情失败');
        navigate(`/novels/${novelId}`);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      appMessage.error('加载数据失败');
      navigate(`/novels/${novelId}`);
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterId, navigate]);

  // 加载章节场景
  const loadScenes = async (id: string) => {
    setScenesLoading(true);
    try {
      const scenesData = await chapterVectorizationService.getChapterScenes(id);
      setScenes(scenesData);
    } catch (error) {
      console.error('加载场景失败:', error);
      appMessage.error('加载场景失败');
    } finally {
      setScenesLoading(false);
    }
  };

  // 加载章节对话
  const loadDialogues = async (id: string) => {
    setDialoguesLoading(true);
    try {
      const dialoguesData = await chapterVectorizationService.getChapterDialogues(id);
      setDialogues(dialoguesData);
    } catch (error) {
      console.error('加载对话失败:', error);
      appMessage.error('加载对话失败');
    } finally {
      setDialoguesLoading(false);
    }
  };

  // 搜索相似内容
  const handleSearch = async (query: string) => {
    if (!query.trim() || !chapterId) return;
    
    setSimilarContentLoading(true);
    setSimilarContent([]);
    setSearchQuery(query);
    
    try {
      let results;
      if (searchType === 'general') {
        results = await chapterVectorizationService.querySimilarContent(chapterId, query);
      } else {
        results = await chapterVectorizationService.querySimilarContentByType(chapterId, query, searchType);
      }
      setSimilarContent(results);
    } catch (error) {
      console.error('搜索相似内容失败:', error);
      appMessage.error('搜索相似内容失败');
    } finally {
      setSimilarContentLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 切换全屏模式
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 切换章节
  const changeChapter = (newChapterId: string) => {
    navigate(`/novels/${novelId}/read/${newChapterId}`);
  };

  // 获取当前章节索引
  const getCurrentChapterIndex = () => {
    return chapters.findIndex(c => c.id === chapterId);
  };

  // 前往上一章
  const goPreviousChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex > 0) {
      changeChapter(chapters[currentIndex - 1].id);
    } else {
      appMessage.info('已经是第一章了');
    }
  };

  // 前往下一章
  const goNextChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex < chapters.length - 1) {
      changeChapter(chapters[currentIndex + 1].id);
    } else {
      appMessage.info('已经是最后一章了');
    }
  };

  // 字体大小菜单
  const fontSizeMenu = (
    <Menu>
      <Menu.Item key="small" onClick={() => setFontSize(16)}>小</Menu.Item>
      <Menu.Item key="medium" onClick={() => setFontSize(18)}>中</Menu.Item>
      <Menu.Item key="large" onClick={() => setFontSize(20)}>大</Menu.Item>
      <Menu.Item key="xlarge" onClick={() => setFontSize(22)}>特大</Menu.Item>
    </Menu>
  );

  // 主题菜单
  const themeMenu = (
    <Menu>
      <Menu.Item key="light" onClick={() => setTheme('light')}>浅色</Menu.Item>
      <Menu.Item key="sepia" onClick={() => setTheme('sepia')}>护眼</Menu.Item>
      <Menu.Item key="dark" onClick={() => setTheme('dark')}>夜间</Menu.Item>
    </Menu>
  );

  // 获取主题样式
  const getThemeStyle = () => {
    switch (theme) {
      case 'light':
        return { backgroundColor: '#ffffff', color: '#333333' };
      case 'sepia':
        return { backgroundColor: '#f8f2e3', color: '#5b4636' };
      case 'dark':
        return { backgroundColor: '#2d2d2d', color: '#e0e0e0' };
      default:
        return { backgroundColor: '#ffffff', color: '#333333' };
    }
  };

  // 渲染场景列表
  const renderScenes = () => {
    if (scenesLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <div style={{ marginTop: 8 }}>加载场景中...</div>
        </div>
      );
    }

    if (scenes.length === 0) {
      return <Empty description="未找到场景" />;
    }

    return (
      <List
        dataSource={scenes}
        renderItem={(scene) => (
          <List.Item>
            <Card 
              size="small" 
              title={`场景 ${scene.index + 1}`}
              style={{ width: '100%' }}
              onClick={() => scrollToPosition(scene.startIndex)}
            >
              <div style={{ maxHeight: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {scene.text.substring(0, 150)}...
              </div>
            </Card>
          </List.Item>
        )}
      />
    );
  };

  // 渲染对话列表
  const renderDialogues = () => {
    if (dialoguesLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <div style={{ marginTop: 8 }}>加载对话中...</div>
        </div>
      );
    }

    if (dialogues.length === 0) {
      return <Empty description="未找到对话" />;
    }

    return (
      <List
        dataSource={dialogues}
        renderItem={(dialogue) => (
          <List.Item>
            <Card 
              size="small" 
              title={`对话 ${dialogue.index + 1}`}
              style={{ width: '100%' }}
              onClick={() => scrollToPosition(dialogue.startIndex)}
            >
              <div style={{ maxHeight: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {dialogue.text.substring(0, 150)}...
              </div>
            </Card>
          </List.Item>
        )}
      />
    );
  };

  // 渲染相似内容搜索结果
  const renderSimilarContent = () => {
    if (similarContentLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <div style={{ marginTop: 8 }}>搜索中...</div>
        </div>
      );
    }

    if (similarContent.length === 0 && searchQuery) {
      return <Empty description="未找到相似内容" />;
    }

    if (similarContent.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div>请输入关键词搜索相似内容</div>
        </div>
      );
    }

    return (
      <List
        dataSource={similarContent}
        renderItem={(item) => (
          <List.Item>
            <Card 
              size="small" 
              title={
                <div>
                  <div>{item.metadata?.title || '未知章节'}</div>
                  <div>
                    <Tag color={item.metadata?.additionalContext?.chunkType === 'scene' ? 'blue' : 
                          item.metadata?.additionalContext?.chunkType === 'dialogue' ? 'green' : 'default'}>
                      {item.metadata?.additionalContext?.chunkType === 'scene' ? '场景' : 
                       item.metadata?.additionalContext?.chunkType === 'dialogue' ? '对话' : '内容'}
                    </Tag>
                    <Tag color="purple">相似度: {(item.score * 100).toFixed(1)}%</Tag>
                  </div>
                </div>
              }
              style={{ width: '100%' }}
            >
              <div style={{ maxHeight: 150, overflow: 'hidden' }}>
                {item.text.substring(0, 200)}...
              </div>
              {item.metadata?.additionalContext?.chapterId === chapterId && (
                <Button 
                  type="link" 
                  size="small"
                  style={{ padding: 0, marginTop: 8 }}
                  onClick={() => scrollToPosition(item.metadata.additionalContext.startIndex)}
                >
                  跳转到此处
                </Button>
              )}
            </Card>
          </List.Item>
        )}
      />
    );
  };

  // 滚动到指定位置
  const scrollToPosition = (position: number) => {
    if (!chapter?.content) return;
    
    // 计算大致的滚动位置
    const contentElement = document.getElementById('chapter-content');
    if (contentElement) {
      const totalLength = chapter.content.length;
      const scrollRatio = position / totalLength;
      const scrollPosition = contentElement.scrollHeight * scrollRatio;
      
      contentElement.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
      
      // 高亮显示该位置的文本
      // 这里只是简单的实现，实际上需要更复杂的处理
      setTimeout(() => {
        appMessage.success('已跳转到相应位置');
      }, 500);
    }
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
    <Layout className={isFullscreen ? 'fullscreen-reader' : ''} style={{ height: '100%' }}>
      <Header style={{ 
        padding: '0 16px', 
        background: getThemeStyle().backgroundColor, 
        color: getThemeStyle().color,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(`/novels/${novelId}`)}
            style={{ marginRight: 8 }}
          >
            返回
          </Button>
          <Button 
            icon={<MenuOutlined />} 
            onClick={() => setDrawerVisible(true)}
            style={{ marginRight: 8 }}
          >
            目录
          </Button>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <Text strong style={{ fontSize: 16, color: getThemeStyle().color }}>
            {novel?.title} - {chapter?.title}
          </Text>
        </div>
        <div>
          <Dropdown overlay={fontSizeMenu} placement="bottomRight">
            <Button icon={<FontSizeOutlined />} style={{ marginRight: 8 }} />
          </Dropdown>
          <Dropdown overlay={themeMenu} placement="bottomRight">
            <Button icon={<BgColorsOutlined />} style={{ marginRight: 8 }} />
          </Dropdown>
          <Button 
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
            onClick={toggleFullscreen}
          />
        </div>
      </Header>
      
      <Layout style={{ background: getThemeStyle().backgroundColor }}>
        <Content 
          style={{ 
            padding: '20px 15%', 
            overflowY: 'auto', 
            background: getThemeStyle().backgroundColor,
            color: getThemeStyle().color,
            height: 'calc(100vh - 64px)'
          }}
          id="chapter-content"
        >
          <Title level={2} style={{ color: getThemeStyle().color, textAlign: 'center' }}>
            {chapter?.title}
          </Title>
          <Paragraph 
            style={{ 
              fontSize, 
              lineHeight, 
              color: getThemeStyle().color,
              whiteSpace: 'pre-wrap'
            }}
          >
            {chapter?.content}
          </Paragraph>
          
          <div style={{ textAlign: 'center', marginTop: 40, marginBottom: 20 }}>
            <Space>
              <Button onClick={goPreviousChapter}>上一章</Button>
              <Button onClick={goNextChapter}>下一章</Button>
            </Space>
          </div>
        </Content>
        
        <Drawer
          title="章节导航"
          placement="left"
          width={320}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
        >
          <Tabs activeKey={activeTabKey} onChange={setActiveTabKey}>
            <TabPane tab="目录" key="chapters">
              <List
                dataSource={chapters}
                renderItem={item => (
                  <List.Item 
                    onClick={() => {
                      changeChapter(item.id);
                      setDrawerVisible(false);
                    }}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: item.id === chapterId ? '#e6f7ff' : 'transparent'
                    }}
                  >
                    <div style={{ padding: '8px 0' }}>
                      {item.title}
                    </div>
                  </List.Item>
                )}
              />
            </TabPane>
            <TabPane tab={<span><PictureOutlined /> 场景</span>} key="scenes">
              {renderScenes()}
            </TabPane>
            <TabPane tab={<span><MessageOutlined /> 对话</span>} key="dialogues">
              {renderDialogues()}
            </TabPane>
            <TabPane tab={<span><SearchOutlined /> 搜索</span>} key="search">
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ marginRight: 8 }}>搜索类型:</span>
                  <Radio.Group 
                    value={searchType} 
                    onChange={e => setSearchType(e.target.value)}
                    size="small"
                  >
                    <Radio.Button value="general">全部</Radio.Button>
                    <Radio.Button value="scene">场景</Radio.Button>
                    <Radio.Button value="dialogue">对话</Radio.Button>
                  </Radio.Group>
                </div>
                <Search
                  placeholder="输入关键词搜索相似内容"
                  enterButton
                  loading={similarContentLoading}
                  onSearch={handleSearch}
                />
              </div>
              {renderSimilarContent()}
            </TabPane>
          </Tabs>
        </Drawer>
      </Layout>
    </Layout>
  );
};

export default NovelReader;