import React, { useState, useEffect } from 'react';
import { 
  List, 
  Button, 
  Spin, 
  Typography, 
  Popconfirm, 
  message, 
  Empty, 
  Modal, 
  Divider,
  Space,
  Tooltip
} from 'antd';
import { 
  HistoryOutlined, 
  RollbackOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import VersionService from '../services/VersionService';

const { Text, Title } = Typography;

interface VersionHistoryProps {
  chapterId: string;
  onRestoreVersion: (content: string) => void;
}

interface Version {
  id: string;
  entity_id: string;
  entity_type: string;
  content: string;
  created_at: string;
  user_comment: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 版本历史组件
 * 用于显示和管理章节的历史版本
 */
const VersionHistory: React.FC<VersionHistoryProps> = ({ chapterId, onRestoreVersion }) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');

  // 加载版本历史
  const loadVersionHistory = async () => {
    if (!chapterId) return;
    
    setLoading(true);
    try {
      const response = await VersionService.getVersionHistory(chapterId) as ApiResponse;
      if (response.success) {
        setVersions(response.data || []);
      } else {
        message.error(response.error || '获取版本历史失败');
      }
    } catch (error) {
      console.error('加载版本历史失败:', error);
      message.error('加载版本历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadVersionHistory();
  }, [chapterId]);

  // 恢复版本
  const handleRestoreVersion = async (version: Version) => {
    try {
      const response = await VersionService.restoreVersion(version.id) as ApiResponse;
      if (response.success) {
        message.success('版本恢复成功');
        onRestoreVersion(version.content);
      } else {
        message.error(response.error || '版本恢复失败');
      }
    } catch (error) {
      console.error('恢复版本失败:', error);
      message.error('恢复版本失败');
    }
  };

  // 删除版本
  const handleDeleteVersion = async (versionId: string) => {
    try {
      const response = await VersionService.deleteVersion(versionId) as ApiResponse;
      if (response.success) {
        message.success('版本删除成功');
        loadVersionHistory();
      } else {
        message.error(response.error || '版本删除失败');
      }
    } catch (error) {
      console.error('删除版本失败:', error);
      message.error('删除版本失败');
    }
  };

  // 预览版本
  const handlePreviewVersion = (version: Version) => {
    setPreviewContent(version.content);
    setPreviewTitle(`版本预览 - ${formatDate(version.created_at)}`);
    setPreviewVisible(true);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 返回加载中状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin />
        <div>加载版本历史中...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5}><HistoryOutlined /> 版本历史</Title>
        <Button size="small" onClick={loadVersionHistory}>刷新</Button>
      </div>
      
      {versions.length === 0 ? (
        <Empty description="暂无版本历史记录" />
      ) : (
        <List
          size="small"
          bordered
          dataSource={versions}
          renderItem={(version) => (
            <List.Item
              actions={[
                <Tooltip title="预览">
                  <Button 
                    type="text" 
                    icon={<EyeOutlined />} 
                    onClick={() => handlePreviewVersion(version)} 
                  />
                </Tooltip>,
                <Tooltip title="恢复此版本">
                  <Popconfirm
                    title="确定要恢复到此版本吗？"
                    description="当前未保存的内容将会丢失。"
                    icon={<ExclamationCircleOutlined style={{ color: 'orange' }} />}
                    onConfirm={() => handleRestoreVersion(version)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="text" icon={<RollbackOutlined />} />
                  </Popconfirm>
                </Tooltip>,
                <Tooltip title="删除此版本">
                  <Popconfirm
                    title="确定要删除此版本吗？"
                    description="删除后将无法恢复。"
                    icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
                    onConfirm={() => handleDeleteVersion(version.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Tooltip>
              ]}
            >
              <div>
                <Text strong>{formatDate(version.created_at)}</Text>
                <br />
                <Text type="secondary">{version.user_comment}</Text>
              </div>
            </List.Item>
          )}
        />
      )}
      
      {/* 版本预览对话框 */}
      <Modal
        title={previewTitle}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="back" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        <div 
          style={{ 
            maxHeight: '500px', 
            overflow: 'auto', 
            border: '1px solid #e8e8e8',
            padding: '16px',
            backgroundColor: '#f9f9f9'
          }}
          dangerouslySetInnerHTML={{ __html: previewContent }}
        />
      </Modal>
    </div>
  );
};

export default VersionHistory; 