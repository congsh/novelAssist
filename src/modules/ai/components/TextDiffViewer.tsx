import React from 'react';
import { Typography } from 'antd';
import { TextDiff } from '../types';

const { Text } = Typography;

interface TextDiffViewerProps {
  original: string;
  modified: string;
  diffs: TextDiff[];
}

// 样式定义
const styles = {
  textDiffViewer: {
    border: '1px solid #e8e8e8',
    borderRadius: '4px',
    marginBottom: '16px'
  },
  diffContainer: {
    padding: '8px'
  },
  diffHeader: {
    borderBottom: '1px solid #e8e8e8',
    paddingBottom: '8px',
    marginBottom: '8px'
  },
  diffTitle: {
    fontWeight: 'bold' as const
  },
  diffContent: {
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    lineHeight: 1.5
  }
};

/**
 * 文本差异对比组件
 * 用于显示原文本和修改后文本的差异
 */
const TextDiffViewer: React.FC<TextDiffViewerProps> = ({ original, modified, diffs }) => {
  // 如果没有差异，直接显示修改后的文本
  if (!diffs || diffs.length === 0) {
    return <div style={styles.diffContent}>{modified}</div>;
  }

  // 如果只有一个差异项且类型为equal，表示文本没有变化
  if (diffs.length === 1 && diffs[0].type === 'equal') {
    return <div style={styles.diffContent}>{modified}</div>;
  }

  // 渲染差异内容
  const renderDiffs = () => {
    return diffs.map((diff, index) => {
      switch (diff.type) {
        case 'insert':
          return (
            <Text key={`diff-${index}`} style={{ backgroundColor: '#d6f5d6' }} className="diff-insert">
              {diff.value}
            </Text>
          );
        case 'delete':
          return (
            <Text key={`diff-${index}`} style={{ backgroundColor: '#ffd6d6', textDecoration: 'line-through' }} className="diff-delete">
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
    <div style={styles.textDiffViewer} className="text-diff-viewer">
      <div style={styles.diffContainer} className="diff-container">
        <div style={styles.diffHeader} className="diff-header">
          <div style={styles.diffTitle} className="diff-title">差异对比</div>
        </div>
        <div style={styles.diffContent} className="diff-content">
          {renderDiffs()}
        </div>
      </div>
    </div>
  );
};

export default TextDiffViewer; 