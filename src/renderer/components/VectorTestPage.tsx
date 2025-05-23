import React, { useState } from 'react';
import { Card, Button, Typography, Alert, List, Tag, Space, Divider } from 'antd';
import { BugOutlined, PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { runEntityVectorTests, EntityVectorServiceTest } from '../../modules/ai/services/entity-vector-service.test';
import { vectorEmbeddingService } from '../../modules/ai/services';

const { Title, Paragraph, Text } = Typography;

/**
 * 向量化测试页面
 */
export const VectorTestPage: React.FC = () => {
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testSummary, setTestSummary] = useState<{passed: number, total: number} | null>(null);

  /**
   * 运行完整测试套件
   */
  const handleRunTests = async () => {
    // 显示下载提示
    const confirmed = await new Promise((resolve) => {
      window.electron.invoke('dialog:show', {
        type: 'warning',
        title: '测试前确认',
        message: '运行向量化测试可能需要下载AI嵌入模型文件。\n\n如果您已在AI设置中配置了embedding模型（如OpenAI、DeepSeek等），将使用在线API，无需下载。\n\n如果未配置embedding模型，系统会下载本地 all-MiniLM-L6-v2 模型（约79MB）。\n\n建议：\n• 方案一：在AI设置中配置embedding模型\n• 方案二：确认下载本地模型\n• 调用AI API可能产生费用\n\n确认继续？',
        buttons: ['取消', '继续测试']
      }).then((result: any) => {
        resolve(result.response === 1);
      });
    });

    if (!confirmed) {
      console.log('用户取消了测试');
      return;
    }

    setTestRunning(true);
    setTestResults([]);
    setTestSummary(null);

    try {
      console.log('=== 开始运行实体向量化测试套件 ===');
      
      // 监听控制台输出来收集测试结果
      const originalConsoleLog = console.log;
      const results: any[] = [];
      
      console.log = (...args) => {
        originalConsoleLog(...args);
        const message = args.join(' ');
        
        if (message.includes('[测试]')) {
          if (message.includes('✅') || message.includes('❌')) {
            const passed = message.includes('✅');
            const testName = message.split(' - ')[0].replace('[测试] ✅ ', '').replace('[测试] ❌ ', '');
            results.push({
              name: testName,
              passed,
              message
            });
          } else if (message.includes('测试完成:')) {
            const match = message.match(/(\d+)\/(\d+)/);
            if (match) {
              setTestSummary({
                passed: parseInt(match[1]),
                total: parseInt(match[2])
              });
            }
          }
        }
      };

      await runEntityVectorTests(vectorEmbeddingService);
      
      // 恢复原始console.log
      console.log = originalConsoleLog;
      setTestResults(results);
      
    } catch (error) {
      console.error('测试运行失败:', error);
    } finally {
      setTestRunning(false);
    }
  };

  /**
   * 运行单个测试
   */
  const handleRunSingleTest = async (testType: string) => {
    // 显示下载提示
    const confirmed = await new Promise((resolve) => {
      window.electron.invoke('dialog:show', {
        type: 'info',
        title: '测试前确认',
        message: `运行 ${testType} 测试可能需要下载模型文件。\n\n如果您已配置embedding模型，将使用在线API。\n否则会下载本地 all-MiniLM-L6-v2 模型（约79MB）。\n\n确认继续？`,
        buttons: ['取消', '确认']
      }).then((result: any) => {
        resolve(result.response === 1);
      });
    });

    if (!confirmed) {
      console.log(`用户取消了 ${testType} 测试`);
      return;
    }

    setTestRunning(true);
    
    try {
      const tester = new EntityVectorServiceTest(vectorEmbeddingService);
      let result = false;
      
      switch (testType) {
        case 'character':
          result = await tester.testCharacterVectorization();
          break;
        case 'location':
          result = await tester.testLocationVectorization();
          break;
        case 'outline':
          result = await tester.testOutlineVectorization();
          break;
        case 'timeline':
          result = await tester.testTimelineVectorization();
          break;
        case 'query':
          result = await tester.testSimilarEntityQuery();
          break;
      }
      
      console.log(`单个测试 ${testType} 结果:`, result ? '通过' : '失败');
      
    } catch (error) {
      console.error(`单个测试 ${testType} 失败:`, error);
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <BugOutlined /> 实体向量化功能测试
      </Title>
      
      <Paragraph>
        这个页面用于测试实体向量化功能的各个组件。请确保已经配置好AI服务和嵌入模型。
      </Paragraph>

      <Alert
        message="测试前准备"
        description="请确保：1) 已配置AI服务和嵌入模型；2) 向量数据库服务正常运行；3) 网络连接正常"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card title="完整测试套件" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleRunTests}
            loading={testRunning}
            size="large"
          >
            运行所有测试
          </Button>
          
          {testSummary && (
            <Alert
              message={`测试完成：${testSummary.passed}/${testSummary.total} 通过`}
              type={testSummary.passed === testSummary.total ? 'success' : 'warning'}
              showIcon
            />
          )}
          
          {testResults.length > 0 && (
            <List
              dataSource={testResults}
              renderItem={(result) => (
                <List.Item>
                  <Space>
                    {result.passed ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    )}
                    <Text>{result.name}</Text>
                    <Tag color={result.passed ? 'green' : 'red'}>
                      {result.passed ? '通过' : '失败'}
                    </Tag>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </Space>
      </Card>

      <Card title="单项测试">
        <Space wrap>
          <Button
            onClick={() => handleRunSingleTest('character')}
            loading={testRunning}
          >
            测试人物向量化
          </Button>
          
          <Button
            onClick={() => handleRunSingleTest('location')}
            loading={testRunning}
          >
            测试地点向量化
          </Button>
          
          <Button
            onClick={() => handleRunSingleTest('outline')}
            loading={testRunning}
          >
            测试大纲向量化
          </Button>
          
          <Button
            onClick={() => handleRunSingleTest('timeline')}
            loading={testRunning}
          >
            测试时间线向量化
          </Button>
          
          <Button
            onClick={() => handleRunSingleTest('query')}
            loading={testRunning}
          >
            测试相似度查询
          </Button>
        </Space>
      </Card>

      <Divider />
      
      <Card title="测试说明">
        <Paragraph>
          <Text strong>测试内容：</Text>
        </Paragraph>
        <ul>
          <li><Text code>人物向量化</Text>：测试将人物信息转换为向量并保存</li>
          <li><Text code>地点向量化</Text>：测试将地点信息转换为向量并保存</li>
          <li><Text code>大纲向量化</Text>：测试将大纲项目转换为向量并保存</li>
          <li><Text code>时间线向量化</Text>：测试将时间线事件转换为向量并保存</li>
          <li><Text code>相似度查询</Text>：测试基于向量的相似度查询功能</li>
        </ul>
        
        <Paragraph style={{ marginTop: 16 }}>
          <Text strong>注意事项：</Text>
        </Paragraph>
        <ul>
          <li>测试会使用模拟数据，不会影响现有的小说数据</li>
          <li>测试过程中会调用AI API，可能产生少量费用</li>
          <li>建议在开发环境下运行测试</li>
          <li>如果测试失败，请检查控制台日志获取详细错误信息</li>
        </ul>
      </Card>
    </div>
  );
}; 