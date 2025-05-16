import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme } from 'antd';

// 布局组件
import MainLayout from './layouts/MainLayout';

// 页面组件
import Dashboard from './components/Dashboard';
import NovelList from '@modules/novel/components/NovelList';
import NovelDetail from '@modules/novel/components/NovelDetail';
import Editor from '@modules/editor/components/Editor';
import NovelReader from '@modules/novel/components/NovelReader';
import CharactersPage from './components/CharactersPage';
import LocationsPage from './components/LocationsPage';
import OutlinesPage from './components/OutlinesPage';
import TimelinePage from './components/TimelinePage';
import ToolsPage from './components/ToolsPage';
import StatisticsPage from './components/StatisticsPage';
import AIAssistantPage from './components/AIAssistantPage';
import TagCategoryManager from '@modules/novel/components/TagCategoryManager';
import BackupPage from './components/BackupPage';

// 主题配置
const { defaultAlgorithm, darkAlgorithm } = theme;

/**
 * 应用主组件
 */
const App: React.FC = () => {
  // 主题状态
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 切换主题
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <AntdApp>
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout toggleTheme={toggleTheme} isDarkMode={isDarkMode} />}>
              <Route index element={<Dashboard />} />
              <Route path="novels" element={<NovelList />} />
              <Route path="novels/:id" element={<NovelDetail />} />
              <Route path="novels/:novelId/chapters/:chapterId" element={<Editor />} />
              <Route path="novels/:novelId/read/:chapterId" element={<NovelReader />} />
              <Route path="characters" element={<CharactersPage />} />
              <Route path="locations" element={<LocationsPage />} />
              <Route path="outlines" element={<OutlinesPage />} />
              <Route path="timeline" element={<TimelinePage />} />
              <Route path="tools" element={<ToolsPage />} />
              <Route path="statistics" element={<StatisticsPage />} />
              <Route path="ai" element={<AIAssistantPage />} />
              <Route path="tag-category" element={<TagCategoryManager />} />
              <Route path="backup" element={<BackupPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App; 