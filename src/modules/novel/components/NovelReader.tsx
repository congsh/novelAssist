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
  Pagination
} from 'antd';
import { 
  ArrowLeftOutlined, 
  FullscreenOutlined, 
  FullscreenExitOutlined,
  MenuOutlined,
  ReadOutlined,
  SettingOutlined,
  FontSizeOutlined,
  BgColorsOutlined
} from '@ant-design/icons';

const { Header, Content, Sider } = Layout;
const { Title, Paragraph, Text } = Typography;

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

/**
 * 小说阅读器组件
 */
const NovelReader: React.FC = () => {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const navigate = useNavigate();
  
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [theme, setTheme] = useState<string>('light');
  const [lineHeight, setLineHeight] = useState<number>(1.8);
  
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
      } else {
        message.error(chapterResponse.error || '获取章节详情失败');
        navigate(`/novels/${novelId}`);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
      navigate(`/novels/${novelId}`);
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterId, navigate]);

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
      message.info('已经是第一章了');
    }
  };

  // 前往下一章
  const goNextChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    if (currentIndex < chapters.length - 1) {
      changeChapter(chapters[currentIndex + 1].id);
    } else {
      message.info('已经是最后一章了');
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
            style={{ marginRight: 16 }}
          >
            返回
          </Button>
          
          {novel && <Text strong style={{ fontSize: 16, color: getThemeStyle().color }}>{novel.title}</Text>}
        </div>
        
        <div>
          <Space>
            <Tooltip title="目录">
              <Button 
                icon={<MenuOutlined />} 
                onClick={() => setDrawerVisible(true)}
                style={{ marginRight: 8 }}
              />
            </Tooltip>
            
            <Dropdown overlay={fontSizeMenu} placement="bottomRight">
              <Button 
                icon={<FontSizeOutlined />} 
                style={{ marginRight: 8 }}
              />
            </Dropdown>
            
            <Dropdown overlay={themeMenu} placement="bottomRight">
              <Button 
                icon={<BgColorsOutlined />} 
                style={{ marginRight: 8 }}
              />
            </Dropdown>
            
            <Tooltip title={isFullscreen ? "退出全屏" : "全屏阅读"}>
              <Button 
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
                onClick={toggleFullscreen}
              />
            </Tooltip>
          </Space>
        </div>
      </Header>
      
      <Content 
        style={{ 
          padding: '16px', 
          overflow: 'auto',
          ...getThemeStyle()
        }}
      >
        <div style={{ 
          maxWidth: 800, 
          margin: '0 auto', 
          padding: '20px',
          borderRadius: '4px',
        }}>
          {chapter && (
            <>
              <Title level={2} style={{ textAlign: 'center', color: getThemeStyle().color }}>
                {chapter.title}
              </Title>
              
              <div 
                className="chapter-content"
                style={{ fontSize: fontSize, lineHeight: lineHeight }}
                dangerouslySetInnerHTML={{ __html: chapter.content }}
              />
              
              <Divider />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <Button 
                  onClick={goPreviousChapter}
                  disabled={getCurrentChapterIndex() <= 0}
                >
                  上一章
                </Button>
                
                <Button 
                  onClick={goNextChapter}
                  disabled={getCurrentChapterIndex() >= chapters.length - 1}
                  type="primary"
                >
                  下一章
                </Button>
              </div>
            </>
          )}
        </div>
      </Content>
      
      {/* 目录抽屉 */}
      <Drawer
        title="目录"
        placement="left"
        width={300}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        <List
          itemLayout="horizontal"
          dataSource={chapters}
          renderItem={(item) => (
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
              <List.Item.Meta
                title={item.title}
                description={`${item.word_count || 0} 字`}
              />
            </List.Item>
          )}
        />
      </Drawer>
    </Layout>
  );
};

export default NovelReader; 