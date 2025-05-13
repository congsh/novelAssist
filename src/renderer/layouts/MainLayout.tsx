import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
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

  // 侧边栏菜单项
  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页'
    },
    {
      key: '/novels',
      icon: <BookOutlined />,
      label: '小说管理'
    },
    {
      key: '/characters',
      icon: <UserOutlined />,
      label: '人物管理'
    },
    {
      key: '/locations',
      icon: <EnvironmentOutlined />,
      label: '地点管理'
    },
    {
      key: '/outlines',
      icon: <OrderedListOutlined />,
      label: '大纲管理'
    },
    {
      key: '/timeline',
      icon: <FieldTimeOutlined />,
      label: '时间线'
    },
    {
      key: '/tools',
      icon: <ToolOutlined />,
      label: '辅助工具'
    },
    {
      key: '/statistics',
      icon: <BarChartOutlined />,
      label: '统计分析'
    },
    {
      key: '/ai',
      icon: <RobotOutlined />,
      label: 'AI助手'
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
          defaultSelectedKeys={['/']}
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