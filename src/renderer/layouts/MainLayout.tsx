import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, theme } from 'antd';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  HomeOutlined,
  BookOutlined,
  UserOutlined,
  EnvironmentOutlined,
  OrderedListOutlined,
  FieldTimeOutlined,
  ToolOutlined,
  BarChartOutlined,
  RobotOutlined,
  BulbOutlined,
  BulbFilled
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

/**
 * 主布局组件
 */
const MainLayout: React.FC<MainLayoutProps> = ({ toggleTheme, isDarkMode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();

  // 当前选中的菜单项
  const [selectedKey, setSelectedKey] = useState('/');

  // 监听路由变化，更新选中的菜单项
  useEffect(() => {
    const path = location.pathname;
    // 获取路径的第一级，如 /novels/123 => /novels
    const mainPath = '/' + path.split('/')[1];
    setSelectedKey(mainPath || '/');
  }, [location.pathname]);

  // 处理菜单项点击
  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  // 侧边栏菜单项
  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
      onClick: () => handleMenuClick('/')
    },
    {
      key: '/novels',
      icon: <BookOutlined />,
      label: '小说管理',
      onClick: () => handleMenuClick('/novels')
    },
    {
      key: '/characters',
      icon: <UserOutlined />,
      label: '人物管理',
      onClick: () => handleMenuClick('/characters')
    },
    {
      key: '/locations',
      icon: <EnvironmentOutlined />,
      label: '地点管理',
      onClick: () => handleMenuClick('/locations')
    },
    {
      key: '/outlines',
      icon: <OrderedListOutlined />,
      label: '大纲管理',
      onClick: () => handleMenuClick('/outlines')
    },
    {
      key: '/timeline',
      icon: <FieldTimeOutlined />,
      label: '时间线',
      onClick: () => handleMenuClick('/timeline')
    },
    {
      key: '/tools',
      icon: <ToolOutlined />,
      label: '辅助工具',
      onClick: () => handleMenuClick('/tools')
    },
    {
      key: '/statistics',
      icon: <BarChartOutlined />,
      label: '统计分析',
      onClick: () => handleMenuClick('/statistics')
    },
    {
      key: '/ai',
      icon: <RobotOutlined />,
      label: 'AI助手',
      onClick: () => handleMenuClick('/ai')
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme={isDarkMode ? 'dark' : 'light'}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div style={{ 
          height: '64px', 
          margin: '16px', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start'
        }}>
          <h2 style={{ 
            color: token.colorPrimary, 
            margin: 0,
            fontSize: collapsed ? '20px' : '24px',
            whiteSpace: 'nowrap'
          }}>
            {collapsed ? '📝' : '小说创作助手'}
          </h2>
        </div>
        <Menu
          theme={isDarkMode ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
        <Header style={{ 
          padding: '0 16px', 
          background: isDarkMode ? token.colorBgContainer : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Button
            type="text"
            icon={isDarkMode ? <BulbFilled /> : <BulbOutlined />}
            onClick={toggleTheme}
          />
        </Header>
        <Content style={{ 
          margin: '24px 16px', 
          padding: 24, 
          minHeight: 280,
          background: isDarkMode ? token.colorBgContainer : '#fff',
          borderRadius: token.borderRadius,
          overflow: 'auto'
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout; 