import React from 'react';
import { Typography, Card, Alert, Row, Col, Button } from 'antd';
import { 
  ToolOutlined, 
  TagOutlined, 
  SoundOutlined, 
  FileSearchOutlined,
  EnvironmentOutlined,
  OrderedListOutlined,
  UserOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

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
        message="部分功能已完成"
        description="地点管理和大纲管理功能已完成开发，可以直接使用。其他辅助工具功能正在开发中，敬请期待！"
        type="info"
        showIcon
        icon={<ToolOutlined />}
        style={{ marginBottom: 16 }}
      />
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card 
            title="人物管理" 
            extra={<UserOutlined />}
            style={{ height: '100%' }}
          >
            <Paragraph>
              创建和管理小说中的人物角色，设置性格、背景故事等。
            </Paragraph>
            <div style={{ color: '#999', fontStyle: 'italic', marginBottom: 12 }}>功能开发中...</div>
            <Link to="/characters">
              <Button disabled>查看详情</Button>
            </Link>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8}>
          <Card 
            title="地点管理" 
            extra={<EnvironmentOutlined />}
            style={{ height: '100%' }}
            className="completed-feature"
          >
            <Paragraph>
              创建和管理小说中的地点场景，设置描述、重要性等。
            </Paragraph>
            <div style={{ color: '#52c41a', fontWeight: 'bold', marginBottom: 12 }}>功能已完成</div>
            <Link to="/locations">
              <Button type="primary">立即使用</Button>
            </Link>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8}>
          <Card 
            title="大纲管理" 
            extra={<OrderedListOutlined />}
            style={{ height: '100%' }}
            className="completed-feature"
          >
            <Paragraph>
              创建和管理故事大纲，树形结构组织情节和章节。
            </Paragraph>
            <div style={{ color: '#52c41a', fontWeight: 'bold', marginBottom: 12 }}>功能已完成</div>
            <Link to="/outlines">
              <Button type="primary">立即使用</Button>
            </Link>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={8}>
          <Card 
            title="命名生成器" 
            extra={<TagOutlined />}
            style={{ height: '100%' }}
          >
            <Paragraph>
              根据不同文化背景、风格自动生成人物、地点、物品等名称。
            </Paragraph>
            <div style={{ color: '#999', fontStyle: 'italic', marginBottom: 12 }}>功能开发中...</div>
            <Button disabled>查看详情</Button>
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
            <div style={{ color: '#999', fontStyle: 'italic', marginBottom: 12 }}>功能开发中...</div>
            <Button disabled>查看详情</Button>
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
            <div style={{ color: '#999', fontStyle: 'italic', marginBottom: 12 }}>功能开发中...</div>
            <Button disabled>查看详情</Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ToolsPage; 