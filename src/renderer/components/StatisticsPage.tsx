import React, { useState, useEffect } from 'react';
import { Typography, Card, Alert, Row, Col, Statistic, Spin, Table, Progress, Empty, Tabs, Select, App, Divider } from 'antd';
import { BarChartOutlined, FileTextOutlined, ClockCircleOutlined, EditOutlined, BookOutlined, TeamOutlined, EnvironmentOutlined, OrderedListOutlined, HistoryOutlined } from '@ant-design/icons';
import { Line, Bar } from '@ant-design/charts';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface OverallStatistics {
  novelCount: number;
  chapterCount: number;
  totalWordCount: number;
  characterCount: number;
  locationCount: number;
  outlineCount: number;
  timelineCount: number;
}

interface NovelProgress {
  id: string;
  title: string;
  targetWordCount: number;
  currentWordCount: number;
  chapterCount: number;
  status: string;
  progressPercentage: number;
}

interface WritingActivity {
  date: string;
  wordCount: number;
}

interface NovelStatistics {
  novel: {
    id: string;
    title: string;
    author: string;
    genre: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  statistics: {
    targetWordCount: number;
    currentWordCount: number;
    progressPercentage: number;
    chapterCount: number;
    avgWordsPerChapter: number;
    maxChapterWords: number;
    minChapterWords: number;
    characterCount: number;
    locationCount: number;
    outlineCount: number;
    timelineCount: number;
  };
}

/**
 * 统计分析页面
 */
const StatisticsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [overallStats, setOverallStats] = useState<OverallStatistics | null>(null);
  const [novelProgress, setNovelProgress] = useState<NovelProgress[]>([]);
  const [writingActivity, setWritingActivity] = useState<WritingActivity[]>([]);
  const [selectedNovelId, setSelectedNovelId] = useState<string>('');
  const [novelStats, setNovelStats] = useState<NovelStatistics | null>(null);
  const [novelStatsLoading, setNovelStatsLoading] = useState<boolean>(false);
  const { message } = App.useApp();

  // 加载统计数据
  useEffect(() => {
    loadStatistics();
  }, []);

  // 加载所有统计数据
  const loadStatistics = async () => {
    setLoading(true);
    try {
      // 获取总体统计
      const overallResult = await window.electron.invoke('get-overall-statistics');
      if (overallResult.success) {
        setOverallStats(overallResult.data);
      } else {
        message.error(overallResult.error || '获取统计数据失败');
      }
      
      // 加载小说进度
      const progressResult = await window.electron.invoke('get-novels-statistics');
      if (progressResult.success) {
        setNovelProgress(progressResult.data);
        
        // 如果有小说，默认选择第一个
        if (progressResult.data.length > 0) {
          setSelectedNovelId(progressResult.data[0].id);
          loadNovelStatistics(progressResult.data[0].id);
        }
      } else {
        message.error(progressResult.error || '获取小说进度失败');
      }
      
      // 加载写作活动
      const activityResult = await window.electron.invoke('get-writing-activity');
      if (activityResult.success) {
        setWritingActivity(activityResult.data);
      } else {
        message.error(activityResult.error || '获取写作活动数据失败');
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
      message.error('加载统计数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载单个小说的统计数据
  const loadNovelStatistics = async (novelId: string) => {
    if (!novelId) return;
    
    setNovelStatsLoading(true);
    try {
      const result = await window.electron.invoke('get-novel-statistics', { novelId });
      if (result.success) {
        setNovelStats(result.data);
      } else {
        message.error(result.error || '获取小说统计数据失败');
      }
    } catch (error) {
      console.error('获取小说统计数据失败:', error);
      message.error('获取小说统计数据失败，请稍后重试');
    } finally {
      setNovelStatsLoading(false);
    }
  };

  // 处理小说选择变化
  const handleNovelChange = (value: string) => {
    setSelectedNovelId(value);
    loadNovelStatistics(value);
  };

  // 获取小说状态文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'planning': '规划中',
      'writing': '写作中',
      'revising': '修改中',
      'completed': '已完成',
      'published': '已发布',
      'abandoned': '已放弃'
    };
    return statusMap[status] || status;
  };

  // 渲染总体统计卡片
  const renderOverallStats = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="总字数"
            value={overallStats?.totalWordCount || 0}
            suffix="字"
            prefix={<FileTextOutlined />}
          />
        </Card>
      </Col>
      
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="小说数量"
            value={overallStats?.novelCount || 0}
            prefix={<BookOutlined />}
          />
        </Card>
      </Col>
      
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="章节数量"
            value={overallStats?.chapterCount || 0}
            prefix={<EditOutlined />}
          />
        </Card>
      </Col>
      
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="人物数量"
            value={overallStats?.characterCount || 0}
            prefix={<TeamOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );

  // 渲染小说进度表格
  const renderNovelProgressTable = () => {
    const columns = [
      {
        title: '小说名称',
        dataIndex: 'title',
        key: 'title',
      },
      {
        title: '章节数',
        dataIndex: 'chapterCount',
        key: 'chapterCount',
        sorter: (a: NovelProgress, b: NovelProgress) => a.chapterCount - b.chapterCount,
      },
      {
        title: '当前字数',
        dataIndex: 'currentWordCount',
        key: 'currentWordCount',
        sorter: (a: NovelProgress, b: NovelProgress) => a.currentWordCount - b.currentWordCount,
        render: (text: number) => `${text.toLocaleString()} 字`,
      },
      {
        title: '目标字数',
        dataIndex: 'targetWordCount',
        key: 'targetWordCount',
        render: (text: number) => `${text.toLocaleString()} 字`,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (text: string) => getStatusText(text),
      },
      {
        title: '完成进度',
        dataIndex: 'progressPercentage',
        key: 'progressPercentage',
        sorter: (a: NovelProgress, b: NovelProgress) => a.progressPercentage - b.progressPercentage,
        render: (text: number) => (
          <Progress percent={text} size="small" />
        ),
      },
    ];
    
    return (
      <Table 
        dataSource={novelProgress} 
        columns={columns} 
        rowKey="id"
        pagination={false}
        size="middle"
      />
    );
  };

  // 渲染写作活动图表
  const renderActivityChart = () => {
    // 过滤掉字数为0的日期
    const filteredActivity = writingActivity.filter(item => item.wordCount > 0);
    
    if (filteredActivity.length === 0) {
      return <Empty description="暂无写作数据" />;
    }
    
    const config = {
      data: filteredActivity,
      xField: 'date',
      yField: 'wordCount',
      point: {
        size: 5,
        shape: 'diamond',
      },
      label: {
        style: {
          fill: '#aaa',
        },
      },
      meta: {
        date: { alias: '日期' },
        wordCount: { alias: '字数' },
      },
    };
    
    return <Line {...config} />;
  };

  // 渲染小说详细统计
  const renderNovelDetailStats = () => {
    if (!novelStats) {
      return <Empty description="请选择一部小说查看详细统计" />;
    }
    
    const { novel, statistics } = novelStats;
    
    // 小说元素分布数据
    const elementData = [
      { type: '章节', value: statistics.chapterCount },
      { type: '人物', value: statistics.characterCount },
      { type: '地点', value: statistics.locationCount },
      { type: '大纲项', value: statistics.outlineCount },
      { type: '时间线事件', value: statistics.timelineCount },
    ];
    
    const barConfig = {
      data: elementData,
      xField: 'value',
      yField: 'type',
      seriesField: 'type',
      legend: { position: 'top' as const },
    };
    
    return (
      <Spin spinning={novelStatsLoading}>
        <Card title={novel.title} extra={getStatusText(novel.status)}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Progress
                percent={statistics.progressPercentage}
                status="active"
                format={percent => `${percent}% 完成`}
              />
            </Col>
            
            <Col xs={24} sm={12}>
              <Statistic
                title="当前字数"
                value={statistics.currentWordCount}
                suffix={`/ ${statistics.targetWordCount.toLocaleString()} 字`}
              />
            </Col>
            
            <Col xs={24} sm={12}>
              <Statistic
                title="平均章节字数"
                value={statistics.avgWordsPerChapter}
                suffix="字 / 章"
              />
            </Col>
            
            <Col xs={24} sm={8}>
              <Statistic title="章节数量" value={statistics.chapterCount} />
            </Col>
            
            <Col xs={24} sm={8}>
              <Statistic title="最长章节" value={statistics.maxChapterWords} suffix="字" />
            </Col>
            
            <Col xs={24} sm={8}>
              <Statistic title="最短章节" value={statistics.minChapterWords} suffix="字" />
            </Col>
          </Row>
          
          <Divider>小说元素分布</Divider>
          
          <div style={{ height: 200 }}>
            <Bar {...barConfig} />
          </div>
        </Card>
      </Spin>
    );
  };

  // 定义Tab项
  const tabItems = [
    {
      key: '1',
      label: '小说进度',
      children: (
        <Card>
          {renderNovelProgressTable()}
        </Card>
      )
    },
    {
      key: '2',
      label: '写作活动',
      children: (
        <Card title="近30天写作活动">
          <div style={{ height: 300 }}>
            {renderActivityChart()}
          </div>
        </Card>
      )
    },
    {
      key: '3',
      label: '小说详情',
      children: (
        <Card 
          title="小说详细统计" 
          extra={
            <Select
              style={{ width: 200 }}
              placeholder="选择小说"
              value={selectedNovelId}
              onChange={handleNovelChange}
            >
              {novelProgress.map(novel => (
                <Option key={novel.id} value={novel.id}>{novel.title}</Option>
              ))}
            </Select>
          }
        >
          {renderNovelDetailStats()}
        </Card>
      )
    }
  ];

  return (
    <div>
      <Title level={2}>统计分析</Title>
      <Paragraph>查看您的创作数据和进度统计</Paragraph>
      
      <Spin spinning={loading}>
        {renderOverallStats()}
        
        <Tabs defaultActiveKey="1" style={{ marginTop: 16 }} items={tabItems} />
      </Spin>
    </div>
  );
};

export default StatisticsPage; 