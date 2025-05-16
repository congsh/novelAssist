import React from 'react';
import { Typography, Divider, Badge, Empty, Card } from 'antd';
import { TextDiff } from '../types';

const { Text, Paragraph } = Typography;

interface TextDiffViewerProps {
  original: string;
  modified: string;
  diffs: TextDiff[];
}

// 样式定义
const styles = {
  textDiffViewer: {
    borderRadius: '8px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  diffContainer: {
    padding: '16px'
  },
  diffHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  diffTitle: {
    fontWeight: 'bold' as const,
    fontSize: '16px'
  },
  diffStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px'
  },
  diffContent: {
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    lineHeight: 1.8,
    fontSize: '15px',
    backgroundColor: '#fff',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #f0f0f0',
    maxHeight: '400px',
    overflow: 'auto'
  },
  insertStyle: {
    backgroundColor: '#e6f7ff',
    borderBottom: '2px solid #1890ff',
    padding: '0 2px',
    borderRadius: '2px'
  },
  deleteStyle: {
    backgroundColor: '#fff1f0',
    textDecoration: 'line-through',
    color: '#ff4d4f',
    padding: '0 2px',
    borderRadius: '2px'
  },
  summaryBox: {
    marginTop: '12px',
    padding: '8px 12px',
    backgroundColor: '#f6f6f6',
    borderRadius: '4px',
    fontSize: '14px'
  },
  emptyContainer: {
    padding: '40px 0',
    textAlign: 'center' as const
  }
};

/**
 * 文本差异对比组件 - 增强版
 * 用于显示原文本和修改后文本的差异，提供更清晰的视觉效果和差异统计
 */
const TextDiffViewer: React.FC<TextDiffViewerProps> = ({ original, modified, diffs }) => {
  // 如果没有提供文本，显示空状态
  if (!original && !modified) {
    return (
      <Card style={styles.textDiffViewer}>
        <div style={styles.emptyContainer}>
          <Empty description="暂无文本差异" />
        </div>
      </Card>
    );
  }
  
  // 如果没有差异，直接显示修改后的文本
  if (!diffs || diffs.length === 0) {
    return (
      <Card style={styles.textDiffViewer} title="文本内容">
        <div style={styles.diffContainer}>
          <div style={styles.diffContent}>{modified || original}</div>
        </div>
      </Card>
    );
  }

  // 如果只有一个差异项且类型为equal，表示文本没有变化
  if (diffs.length === 1 && diffs[0].type === 'equal') {
    return (
      <Card style={styles.textDiffViewer} title="文本内容">
        <div style={styles.diffContainer}>
          <div style={styles.diffHeader}>
            <div style={styles.diffTitle}>文本未发生变化</div>
          </div>
          <div style={styles.diffContent}>{modified}</div>
        </div>
      </Card>
    );
  }

  // 计算差异统计信息
  const diffStats = diffs.reduce(
    (acc, diff) => {
      if (diff.type === 'insert') {
        acc.insertions += diff.value.length;
        acc.insertCount += 1;
      } else if (diff.type === 'delete') {
        acc.deletions += diff.value.length;
        acc.deleteCount += 1;
      }
      return acc;
    },
    { insertions: 0, deletions: 0, insertCount: 0, deleteCount: 0 }
  );

  // 计算变化百分比
  const totalOriginalChars = original ? original.length : 0;
  const changePercentage = totalOriginalChars > 0 
    ? Math.round(((diffStats.insertions - diffStats.deletions) / totalOriginalChars) * 100)
    : 0;
  
  const changeDirection = changePercentage > 0 ? '增加' : (changePercentage < 0 ? '减少' : '无变化');
  const absChangePercentage = Math.abs(changePercentage);

  // 渲染差异内容
  const renderDiffs = () => {
    return diffs.map((diff, index) => {
      switch (diff.type) {
        case 'insert':
          return (
            <Text key={`diff-${index}`} style={styles.insertStyle} className="diff-insert">
              {diff.value}
            </Text>
          );
        case 'delete':
          return (
            <Text key={`diff-${index}`} style={styles.deleteStyle} className="diff-delete">
              {diff.value}
            </Text>
          );
        case 'equal':
          return (
            <Text key={`diff-${index}`} className="diff-equal">
              {diff.value}
            </Text>
          );
        default:
          return null;
      }
    });
  };

  return (
    <Card 
      style={styles.textDiffViewer} 
      className="text-diff-viewer"
      title="文本差异对比"
    >
      <div style={styles.diffContainer} className="diff-container">
        <div style={styles.diffHeader} className="diff-header">
          <div style={styles.diffStats}>
            <Badge color="#1890ff" text={`新增: ${diffStats.insertions} 字符 (${diffStats.insertCount} 处)`} />
            <Badge color="#ff4d4f" text={`删除: ${diffStats.deletions} 字符 (${diffStats.deleteCount} 处)`} />
            <Badge color="#52c41a" text={`变化: ${changeDirection} ${absChangePercentage}%`} />
          </div>
        </div>
        <div style={styles.diffContent} className="diff-content">
          {renderDiffs()}
        </div>
        
        <div style={styles.summaryBox}>
          <Text type="secondary">
            总结: 文本{changeDirection === '无变化' ? '内容相同' : `${changeDirection}了 ${absChangePercentage}% 的内容`}，
            共有 {diffStats.insertCount} 处新增和 {diffStats.deleteCount} 处删除
          </Text>
        </div>
      </div>
    </Card>
  );
};

export default TextDiffViewer; 