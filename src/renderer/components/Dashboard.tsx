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
          
          // 获取写作活动数据，用于计算今日字数
          const activityResponse = await window.electron.invoke('get-writing-activity');
          let todayWords = 0;
          let totalWords = 0;
          
          if (activityResponse.success) {
            const activityData = activityResponse.data;
            // 获取今天的数据
            const today = new Date().toISOString().split('T')[0];
            const todayData = activityData.find((item: any) => item.date === today);
            todayWords = todayData ? todayData.wordCount : 0;
            
            // 获取总字数（从章节统计，更准确）
            const statsResponse = await window.electron.invoke('get-novels-statistics');
            if (statsResponse.success) {
              totalWords = statsResponse.data.reduce(
                (sum: number, novel: any) => sum + (novel.currentWordCount || 0), 
                0
              );
            } else {
              // 如果获取失败，使用小说表中的字数（可能不准确）
              totalWords = novels.reduce(
                (sum: number, novel: Novel) => sum + (novel.word_count || 0), 
                0
              );
            }
          } else {
            // 如果获取失败，使用小说表中的字数
            totalWords = novels.reduce(
              (sum: number, novel: Novel) => sum + (novel.word_count || 0), 
              0
            );
          }
          
          // 获取写作时间（如果有相关API）
          let writingTime = 0;
          try {
            const timeResponse = await window.electron.invoke('get-writing-time');
            if (timeResponse.success) {
              writingTime = timeResponse.data.totalMinutes || 0;
            }
          } catch (error) {
            console.log('获取写作时间功能未实现');
            writingTime = 0;
          }
          
          setStats({
            totalNovels,
            totalWords,
            todayWords,
            writingTime
          });
        } else {
          console.error('获取小说列表失败:', novelsResponse.error);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
        // 显示详细错误信息
        if (error instanceof Error) {
          console.error('错误详情:', error.message);
          console.error('错误堆栈:', error.stack);
        }
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