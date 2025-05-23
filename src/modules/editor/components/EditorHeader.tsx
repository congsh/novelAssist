import React from 'react';
import { 
  Layout, 
  Button, 
  Input, 
  Tooltip, 
  Space, 
  Typography
} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined, 
  FullscreenOutlined, 
  FullscreenExitOutlined,
  RobotOutlined,
  BgColorsOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

interface EditorHeaderProps {
  title: string;
  setTitle: (title: string) => void;
  saving: boolean;
  isFullscreen: boolean;
  sidebarVisible: boolean;
  onSave: () => void;
  onBack: () => void;
  onToggleFullscreen: () => void;
  onToggleAIPanel: () => void;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  lastSavedAt: Date | null;
}

/**
 * 编辑器顶部工具栏组件
 */
const EditorHeader: React.FC<EditorHeaderProps> = ({
  title,
  setTitle,
  saving,
  isFullscreen,
  sidebarVisible,
  onSave,
  onBack,
  onToggleFullscreen,
  onToggleAIPanel,
  onToggleTheme,
  onToggleSidebar,
  lastSavedAt
}) => {
  // 格式化最后保存时间
  const formatLastSaved = () => {
    if (!lastSavedAt) return '尚未保存';
    return `最后保存于 ${lastSavedAt.toLocaleTimeString()}`;
  };

  return (
    <Header className="editor-header" style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Space>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={onBack}
            title="返回"
          />
          
          <Button 
            type="text" 
            icon={sidebarVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />} 
            onClick={onToggleSidebar}
            title={sidebarVisible ? "隐藏侧边栏" : "显示侧边栏"}
          />
          
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="章节标题"
            style={{ width: 200 }}
            onPressEnter={onSave}
          />
        </Space>
      </div>
      
      <div>
        <Space>
          <Tooltip title={formatLastSaved()}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={onSave}
              loading={saving}
            >
              保存
            </Button>
          </Tooltip>
          
          <Button
            type="text"
            icon={<RobotOutlined />}
            onClick={onToggleAIPanel}
            title="AI助手"
          />
          
          <Button
            type="text"
            icon={<BgColorsOutlined />}
            onClick={onToggleTheme}
            title="主题设置"
          />
          
          <Button
            type="text"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={onToggleFullscreen}
            title={isFullscreen ? "退出全屏" : "全屏编辑"}
          />
        </Space>
      </div>
    </Header>
  );
};

export default EditorHeader; 