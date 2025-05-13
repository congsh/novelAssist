import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Button, List, Typography, Statistic, Empty } from 'antd';
import { PlusOutlined, BookOutlined, EditOutlined, FieldTimeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface Novel {
  id: string;
  title: string;
  author: string;
  updated_at: string;
  word_count: number;
}

/**
 * 仪表盘组件
 */
const Dashboard: React.FC = () => {
  const [recentNovels, setRecentNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    totalNovels: 0,
    totalWords: 0,
    todayWords: 0,
    writingTime: 0
  });

  // 加载数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取小说列表
        const novelsResponse = await window.electron.invoke('get-novels');
        
        if (novelsResponse.success) {
          const novels = novelsResponse.data;
          setRecentNovels(novels.slice(0, 5));
          
          // 计算统计数据
          const totalNovels = novels.length;
          const totalWords = novels.reduce((sum: number, novel: Novel) => sum + (novel.word_count || 0), 0);
          
          setStats({
            totalNovels,
            totalWords,
            todayWords: 0, // 暂时没有实现统计今日字数
            writingTime: 0 // 暂时没有实现统计写作时间
          });
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Title level={2}>欢迎使用小说辅助创作工具</Title>
          <Text type="secondary">在这里管理您的创作项目，跟踪写作进度，获取AI辅助</Text>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="作品总数" 
              value={stats.totalNovels} 
              prefix={<BookOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="总字数" 
              value={stats.totalWords} 
              suffix="字"
              prefix={<EditOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="今日新增" 
              value={stats.todayWords} 
              suffix="字"
              prefix={<EditOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="写作时间" 
              value={stats.writingTime} 
              suffix="分钟"
              prefix={<FieldTimeOutlined />}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card 
            title="最近作品" 
            extra={
              <Button type="primary" icon={<PlusOutlined />}>
                <Link to="/novels">新建小说</Link>
              </Button>
            }
          >
            {recentNovels.length > 0 ? (
              <List
                loading={loading}
                itemLayout="horizontal"
                dataSource={recentNovels}
                renderItem={(novel: Novel) => (
                  <List.Item
                    actions={[
                      <Link to={`/novels/${novel.id}`} key="view">查看</Link>
                    ]}
                  >
                    <List.Item.Meta
                      title={<Link to={`/novels/${novel.id}`}>{novel.title}</Link>}
                      description={`作者: ${novel.author} | 更新时间: ${formatDate(novel.updated_at)} | 字数: ${novel.word_count || 0}字`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description={loading ? "加载中..." : "暂无小说，开始创建您的第一部作品吧！"} 
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 