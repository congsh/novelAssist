import React from 'react';
import { Typography, Card, Alert, Row, Col, Statistic } from 'antd';
import { BarChartOutlined, FileTextOutlined, ClockCircleOutlined, EditOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/**
 * 统计分析页面
 */
const StatisticsPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>统计分析</Title>
      <Paragraph>查看您的创作数据和进度统计</Paragraph>
      
      <Alert
        message="功能开发中"
        description="统计分析功能正在开发中，敬请期待！"
        type="info"
        showIcon
        icon={<BarChartOutlined />}
        style={{ marginBottom: 16 }}
      />
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总字数"
              value={0}
              suffix="字"
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="创作时间"
              value={0}
              suffix="小时"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="章节数量"
              value={0}
              prefix={<EditOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="完成进度"
              value={0}
              suffix="%"
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
      </Row>
      
      <Card style={{ marginTop: 16 }}>
        <div style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Paragraph style={{ color: '#999', fontStyle: 'italic' }}>
            图表数据加载中...
          </Paragraph>
        </div>
      </Card>
    </div>
  );
};

export default StatisticsPage; 