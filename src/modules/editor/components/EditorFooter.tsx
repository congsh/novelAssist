import React from 'react';
import { Layout, Statistic, Space, Row, Col } from 'antd';
import { EditOutlined, FieldTimeOutlined } from '@ant-design/icons';

const { Footer } = Layout;

interface EditorFooterProps {
  wordCount: number;
  writingTime: number;
  autoSaveEnabled: boolean;
  formatTime: (minutes: number) => string;
}

/**
 * 编辑器底部状态栏组件
 */
const EditorFooter: React.FC<EditorFooterProps> = ({
  wordCount,
  writingTime,
  autoSaveEnabled,
  formatTime
}) => {
  return (
    <Footer style={{ padding: '0 20px', height: '50px', display: 'flex', alignItems: 'center' }}>
      <Row style={{ width: '100%' }} justify="space-between" align="middle">
        <Col>
          <Space size="large">
            <Statistic 
              value={wordCount} 
              title="字数" 
              prefix={<EditOutlined />} 
              valueStyle={{ fontSize: '14px' }}
              style={{ marginRight: '20px' }} 
            />
            
            <Statistic 
              value={formatTime(writingTime)} 
              title="写作时间" 
              prefix={<FieldTimeOutlined />} 
              valueStyle={{ fontSize: '14px' }} 
            />
          </Space>
        </Col>

        <Col>
          <Space>
            {autoSaveEnabled && <span>自动保存已启用 (5分钟)</span>}
          </Space>
        </Col>
      </Row>
    </Footer>
  );
};

export default EditorFooter; 