import React, { useState } from 'react';
import { Typography, Button, Card, Space, Divider, message, App, Alert, Row, Col } from 'antd';
import { CloudUploadOutlined, CloudDownloadOutlined, LoadingOutlined, SafetyOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/**
 * 数据备份与恢复页面组件
 */
const BackupPage: React.FC = () => {
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [restoreLoading, setRestoreLoading] = useState<boolean>(false);
  const { message: appMessage, modal } = App.useApp();

  /**
   * 创建数据备份
   */
  const handleCreateBackup = async () => {
    try {
      setBackupLoading(true);
      const result = await window.electron.invoke('create-backup');
      
      if (result.success) {
        appMessage.success(result.message);
      } else {
        appMessage.error(result.error || '创建备份失败');
      }
    } catch (error) {
      console.error('创建备份失败:', error);
      appMessage.error('创建备份失败，请稍后重试');
    } finally {
      setBackupLoading(false);
    }
  };

  /**
   * 恢复数据备份
   */
  const handleRestoreBackup = () => {
    modal.confirm({
      title: '确认恢复备份',
      content: '恢复备份将覆盖当前数据，此操作不可撤销。是否继续？',
      okText: '确认恢复',
      cancelText: '取消',
      onOk: async () => {
        try {
          setRestoreLoading(true);
          const result = await window.electron.invoke('restore-backup');
          
          if (result.success) {
            modal.success({
              title: '恢复成功',
              content: result.message,
              okText: '确定',
            });
          } else {
            appMessage.error(result.error || '恢复备份失败');
          }
        } catch (error) {
          console.error('恢复备份失败:', error);
          appMessage.error('恢复备份失败，请稍后重试');
        } finally {
          setRestoreLoading(false);
        }
      },
    });
  };

  return (
    <div>
      <Title level={2}>数据备份与恢复</Title>
      <Paragraph>备份您的创作数据，确保您的作品安全</Paragraph>
      
      <Alert
        message="数据安全提示"
        description="定期备份您的数据可以防止意外数据丢失。建议在进行重要更改前创建备份。"
        type="info"
        showIcon
        icon={<SafetyOutlined />}
        style={{ marginBottom: 24 }}
      />
      
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="创建备份" bordered={false}>
            <Paragraph>
              创建一个包含所有小说数据、图片和导出文件的备份。
              备份文件可以保存到您选择的位置。
            </Paragraph>
            <Button
              type="primary"
              icon={backupLoading ? <LoadingOutlined /> : <CloudUploadOutlined />}
              loading={backupLoading}
              onClick={handleCreateBackup}
              size="large"
              block
            >
              {backupLoading ? '正在创建备份...' : '创建备份'}
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="恢复备份" bordered={false}>
            <Paragraph>
              从之前创建的备份文件中恢复数据。
              注意：恢复操作将覆盖当前数据，请谨慎操作。
            </Paragraph>
            <Button
              type="default"
              danger
              icon={restoreLoading ? <LoadingOutlined /> : <CloudDownloadOutlined />}
              loading={restoreLoading}
              onClick={handleRestoreBackup}
              size="large"
              block
            >
              {restoreLoading ? '正在恢复备份...' : '恢复备份'}
            </Button>
          </Card>
        </Col>
      </Row>
      
      <Divider />
      
      <Card title="备份说明" style={{ marginTop: 16 }}>
        <Space direction="vertical">
          <Paragraph>
            <strong>备份内容包括：</strong>
          </Paragraph>
          <ul>
            <li>所有小说数据和章节内容</li>
            <li>人物、地点、大纲和时间线数据</li>
            <li>上传的图片和资源文件</li>
            <li>导出的文件</li>
          </ul>
          <Paragraph>
            <strong>备份提示：</strong>
          </Paragraph>
          <ul>
            <li>建议定期创建备份，特别是在进行重要更改前</li>
            <li>将备份文件保存在安全的位置，如云存储或外部硬盘</li>
            <li>恢复备份后需要重启应用才能完全生效</li>
          </ul>
        </Space>
      </Card>
    </div>
  );
};

export default BackupPage; 