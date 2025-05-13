import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme } from 'antd';

// 布局组件
import MainLayout from './layouts/MainLayout';

// 页面组件
import Dashboard from './components/Dashboard';
import NovelList from '@modules/novel/components/NovelList';
import NovelDetail from '@modules/novel/components/NovelDetail';
import Editor from '@modules/editor/components/Editor';

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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App; 