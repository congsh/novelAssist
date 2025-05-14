import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Typography,
  Popconfirm,
  Card,
  Row,
  Col,
  Radio
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ExclamationCircleOutlined,
  ImportOutlined
} from '@ant-design/icons';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Novel {
  id: string;
  title: string;
  author: string;
  description: string;
  genre: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  status: string;
}

/**
 * 小说列表组件
 */
const NovelList: React.FC = () => {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState<boolean>(false);
  const [importFormat, setImportFormat] = useState<string>('txt');
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // 加载小说列表
  const loadNovels = async () => {
    setLoading(true);
    try {
      const response = await window.electron.invoke('get-novels');
      if (response.success) {
        setNovels(response.data);
      } else {
        message.error(response.error || '获取小说列表失败');
      }
    } catch (error) {
      console.error('获取小说列表失败:', error);
      message.error('获取小说列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadNovels();
  }, []);

  // 打开新建小说对话框
  const showCreateModal = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  // 处理对话框确认
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      const response = await window.electron.invoke('create-novel', {
        title: values.title,
        author: values.author,
        description: values.description,
        genre: values.genre,
        status: values.status
      });
      
      if (response.success) {
        message.success('小说创建成功');
        setIsModalVisible(false);
        loadNovels();
        
        // 导航到新创建的小说详情页
        navigate(`/novels/${response.data.id}`);
      } else {
        message.error(response.error || '小说创建失败');
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理对话框取消
  const handleCancel = () => {
    setIsModalVisible(false);
  };

  // 处理删除小说
  const handleDelete = async (id: string) => {
    try {
      const response = await window.electron.invoke('delete-novel', { id });
      
      if (response.success) {
        message.success('小说删除成功');
        loadNovels();
      } else {
        message.error(response.error || '小说删除失败');
      }
    } catch (error) {
      console.error('删除小说失败:', error);
      message.error('删除小说失败');
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 打开导入小说对话框
  const showImportModal = () => {
    setImportFormat('txt');
    setIsImportModalVisible(true);
  };

  // 处理导入小说
  const handleImport = async () => {
    setImportLoading(true);
    try {
      const response = await window.electron.invoke('import-novel', { format: importFormat });
      
      if (response.success) {
        message.success('小说导入成功');
        setIsImportModalVisible(false);
        loadNovels();
        
        // 导航到导入的小说详情页
        navigate(`/novels/${response.data.id}`);
      } else {
        message.error(response.error || '小说导入失败');
      }
    } catch (error) {
      console.error('导入小说失败:', error);
      message.error('导入小说失败');
    } finally {
      setImportLoading(false);
    }
  };

  // 处理导入对话框取消
  const handleImportCancel = () => {
    setIsImportModalVisible(false);
  };

  // 表格列定义
  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Novel) => (
        <Link to={`/novels/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: '类型',
      dataIndex: 'genre',
      key: 'genre',
    },
    {
      title: '字数',
      dataIndex: 'word_count',
      key: 'word_count',
      render: (text: number) => `${text || 0} 字`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          'in_progress': { text: '进行中', color: 'blue' },
          'completed': { text: '已完成', color: 'green' },
          'planning': { text: '计划中', color: 'orange' },
          'abandoned': { text: '已放弃', color: 'red' },
        };
        
        const { text, color } = statusMap[status] || { text: '未知', color: 'default' };
        return <span style={{ color }}>{text}</span>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => formatDate(text),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text: string) => formatDate(text),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Novel) => (
        <Space size="middle">
          <Link to={`/novels/${record.id}`}>
            <Button type="primary" icon={<EditOutlined />} size="small">
              编辑
            </Button>
          </Link>
          <Popconfirm
            title="确定要删除这部小说吗？"
            description="删除后将无法恢复，包括所有章节内容。"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Title level={2}>小说管理</Title>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={showCreateModal}
            style={{ marginRight: 8 }}
          >
            新建小说
          </Button>
          <Button 
            icon={<ImportOutlined />} 
            onClick={showImportModal}
          >
            导入小说
          </Button>
        </Col>
      </Row>
      
      <Card>
        <Table 
          columns={columns} 
          dataSource={novels} 
          rowKey="id" 
          loading={loading}
          pagination={{ 
            defaultPageSize: 10, 
            showSizeChanger: true, 
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `共 ${total} 部小说` 
          }}
        />
      </Card>

      <Modal
        title="新建小说"
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入小说标题' }]}
          >
            <Input placeholder="请输入小说标题" />
          </Form.Item>
          
          <Form.Item
            name="author"
            label="作者"
            rules={[{ required: true, message: '请输入作者名称' }]}
          >
            <Input placeholder="请输入作者名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="简介"
          >
            <TextArea rows={4} placeholder="请输入小说简介" />
          </Form.Item>
          
          <Form.Item
            name="genre"
            label="类型"
          >
            <Select placeholder="请选择小说类型">
              <Option value="玄幻">玄幻</Option>
              <Option value="奇幻">奇幻</Option>
              <Option value="武侠">武侠</Option>
              <Option value="仙侠">仙侠</Option>
              <Option value="都市">都市</Option>
              <Option value="现实">现实</Option>
              <Option value="军事">军事</Option>
              <Option value="历史">历史</Option>
              <Option value="游戏">游戏</Option>
              <Option value="体育">体育</Option>
              <Option value="科幻">科幻</Option>
              <Option value="悬疑">悬疑</Option>
              <Option value="轻小说">轻小说</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="status"
            label="状态"
            initialValue="planning"
          >
            <Select>
              <Option value="planning">计划中</Option>
              <Option value="in_progress">进行中</Option>
              <Option value="completed">已完成</Option>
              <Option value="abandoned">已放弃</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入小说对话框 */}
      <Modal
        title="导入小说"
        open={isImportModalVisible}
        onOk={handleImport}
        onCancel={handleImportCancel}
        okText="导入"
        cancelText="取消"
        confirmLoading={importLoading}
      >
        <p>请选择导入文件的格式：</p>
        <Radio.Group 
          value={importFormat} 
          onChange={(e) => setImportFormat(e.target.value)}
        >
          <Radio value="txt">TXT文本文件</Radio>
          <Radio value="json">JSON格式文件</Radio>
        </Radio.Group>
        
        <div style={{ marginTop: 16 }}>
          <p>
            <strong>注意事项：</strong>
          </p>
          <ul>
            <li>TXT格式：将导入为单个章节，自动提取标题和作者信息</li>
            <li>JSON格式：需要符合特定结构，包含小说信息和章节内容</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default NovelList; 