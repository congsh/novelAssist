import React from 'react';
import { Typography, Card, Alert, Row, Col } from 'antd';
import { ToolOutlined, TagOutlined, SoundOutlined, FileSearchOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/**
 * 辅助工具页面
 */
const ToolsPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>辅助工具</Title>
      <Paragraph>这里提供各种小说创作辅助工具</Paragraph>
      
      <Alert
        message="功能开发中"
        description="辅助工具功能正在开发中，敬请期待！"
        type="info"
        showIcon
        icon={<ToolOutlined />}
        style={{ marginBottom: 16 }}
      />
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card 
            title="命名生成器" 
            extra={<TagOutlined />}
            style={{ height: '100%' }}
          >
            <Paragraph>
              根据不同文化背景、风格自动生成人物、地点、物品等名称。
            </Paragraph>
            <div style={{ color: '#999', fontStyle: 'italic' }}>功能开发中...</div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8}>
          <Card 
            title="对白生成器" 
            extra={<SoundOutlined />}
            style={{ height: '100%' }}
          >
            <Paragraph>
              根据人物性格、场景氛围等生成符合角色特点的对话。
            </Paragraph>
            <div style={{ color: '#999', fontStyle: 'italic' }}>功能开发中...</div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8}>
          <Card 
            title="灵感收集器" 
            extra={<FileSearchOutlined />}
            style={{ height: '100%' }}
          >
            <Paragraph>
              收集和整理创作灵感，支持多种格式和来源。
            </Paragraph>
            <div style={{ color: '#999', fontStyle: 'italic' }}>功能开发中...</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ToolsPage; 