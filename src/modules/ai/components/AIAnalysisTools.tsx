import React, { useState } from 'react';
import { Card, Button, Input, Select, message, Spin, Typography, Tabs, Divider } from 'antd';
import { FileSearchOutlined, RobotOutlined, BarChartOutlined } from '@ant-design/icons';
import { chatService } from '../services/chat-service';
import { AIScenario } from '../types';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

/**
 * AI分析工具组件
 */
const AIAnalysisTools: React.FC = () => {
  const [content, setContent] = useState('');
  const [analysisType, setAnalysisType] = useState('structure');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  
  // 分析类型选项
  const analysisTypes = [
    { value: 'structure', label: '结构分析', description: '分析小说的结构、情节发展和叙事节奏' },
    { value: 'character', label: '人物分析', description: '分析小说中的人物形象、性格特点和发展变化' },
    { value: 'theme', label: '主题分析', description: '分析小说的主题、寓意和深层含义' },
    { value: 'style', label: '风格分析', description: '分析小说的写作风格、语言特点和表达方式' },
    { value: 'improvement', label: '改进建议', description: '提供改进小说的具体建议和方向' }
  ];
  
  // 生成分析提示词
  const generatePrompt = () => {
    const typeLabel = analysisTypes.find(t => t.value === analysisType)?.label || '结构分析';
    
    let prompt = `请对以下小说内容进行${typeLabel}：\n\n${content}\n\n`;
    
    switch (analysisType) {
      case 'structure':
        prompt += '请分析：\n1. 情节结构和发展\n2. 叙事节奏\n3. 故事弧线\n4. 情节安排的优缺点';
        break;
      case 'character':
        prompt += '请分析：\n1. 主要人物形象\n2. 人物性格特点\n3. 人物关系\n4. 人物发展变化\n5. 人物塑造的优缺点';
        break;
      case 'theme':
        prompt += '请分析：\n1. 小说的主题思想\n2. 隐含的寓意\n3. 作者可能想表达的观点\n4. 主题表达的深度和广度';
        break;
      case 'style':
        prompt += '请分析：\n1. 写作风格特点\n2. 语言运用\n3. 修辞手法\n4. 叙事视角\n5. 文风的优缺点';
        break;
      case 'improvement':
        prompt += '请提供具体的改进建议，包括：\n1. 情节发展\n2. 人物塑造\n3. 语言表达\n4. 结构安排\n5. 主题深化';
        break;
    }
    
    return prompt;
  };
  
  // 执行分析
  const runAnalysis = async () => {
    if (!content.trim()) {
      message.warning('请输入需要分析的小说内容');
      return;
    }
    
    setLoading(true);
    setResult('');
    
    try {
      const prompt = generatePrompt();
      
      // 使用小说分析场景
      await chatService.sendMessage(
        prompt,
        (partialResponse) => {
          setResult(prev => prev + partialResponse.content);
        },
        AIScenario.NOVEL_ANALYSIS
      );
      
    } catch (error) {
      console.error('分析失败:', error);
      message.error('分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <Card title={<><FileSearchOutlined /> AI小说分析工具</>} bordered={false}>
        <Tabs defaultActiveKey="input">
          <TabPane tab="输入内容" key="input">
            <div style={{ marginBottom: 16 }}>
              <Select 
                value={analysisType} 
                onChange={setAnalysisType}
                style={{ width: 200, marginBottom: 16 }}
              >
                {analysisTypes.map(type => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
              
              <Paragraph type="secondary">
                {analysisTypes.find(t => t.value === analysisType)?.description}
              </Paragraph>
              
              <TextArea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="请输入需要分析的小说内容..."
                rows={10}
                style={{ marginBottom: 16 }}
              />
              
              <Button 
                type="primary" 
                icon={<RobotOutlined />}
                onClick={runAnalysis}
                loading={loading}
                disabled={!content.trim()}
              >
                开始分析
              </Button>
            </div>
          </TabPane>
          
          <TabPane tab="分析结果" key="result">
            <div style={{ minHeight: 300 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 0' }}>
                  <Spin size="large" />
                  <p>AI正在分析中，请稍候...</p>
                </div>
              ) : result ? (
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  <Title level={4}>分析结果</Title>
                  <Divider />
                  {result}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '50px 0', color: '#999' }}>
                  <BarChartOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <p>请在"输入内容"标签页中输入小说内容并点击"开始分析"</p>
                </div>
              )}
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default AIAnalysisTools; 