import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Tabs, 
  Button, 
  Spin, 
  message, 
  Typography, 
  Descriptions, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select,
  List,
  Card,
  Divider,
  Popconfirm,
  Empty,
  Tooltip
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined, 
  ExclamationCircleOutlined,
  ArrowLeftOutlined,
  ReadOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;
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

interface Chapter {
  id: string;
  novel_id: string;
  title: string;
  sort_order: number;
  word_count: number;
  created_at: string;
  updated_at: string;
  status: string;
  parent_id: string | null;
}

/**
 * 小说详情组件
 */
const NovelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [isChapterModalVisible, setIsChapterModalVisible] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [chapterForm] = Form.useForm();

  // 加载小说详情
  const loadNovelData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // 获取小说详情
      const novelResponse = await window.electron.invoke('get-novel', { id });
      if (novelResponse.success) {
        setNovel(novelResponse.data);
      } else {
        message.error(novelResponse.error || '获取小说详情失败');
        navigate('/novels');
        return;
      }
      
      // 获取章节列表
      const chaptersResponse = await window.electron.invoke('get-chapters', { novelId: id });
      if (chaptersResponse.success) {
        setChapters(chaptersResponse.data);
      } else {
        message.error(chaptersResponse.error || '获取章节列表失败');
      }
    } catch (error) {
      console.error('加载小说数据失败:', error);
      message.error('加载小说数据失败');
      navigate('/novels');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadNovelData();
  }, [id]);

  // 打开编辑小说对话框
  const showEditModal = () => {
    if (!novel) return;
    
    form.setFieldsValue({
      title: novel.title,
      author: novel.author,
      description: novel.description,
      genre: novel.genre,
      status: novel.status
    });
    setIsEditModalVisible(true);
  };

  // 处理编辑对话框确认
  const handleEditOk = async () => {
    if (!id) return;
    
    try {
      const values = await form.validateFields();
      
      const response = await window.electron.invoke('update-novel', {
        id,
        ...values
      });
      
      if (response.success) {
        message.success('小说更新成功');
        setIsEditModalVisible(false);
        setNovel(response.data);
      } else {
        message.error(response.error || '小说更新失败');
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理编辑对话框取消
  const handleEditCancel = () => {
    setIsEditModalVisible(false);
  };

  // 打开新建章节对话框
  const showCreateChapterModal = () => {
    chapterForm.resetFields();
    setIsChapterModalVisible(true);
  };

  // 处理新建章节对话框确认
  const handleChapterOk = async () => {
    if (!id) return;
    
    try {
      const values = await chapterForm.validateFields();
      
      const response = await window.electron.invoke('create-chapter', {
        novel_id: id,
        title: values.title,
        parent_id: values.parent_id === 'none' ? null : values.parent_id
      });
      
      if (response.success) {
        message.success('章节创建成功');
        setIsChapterModalVisible(false);
        loadNovelData();
        
        // 导航到章节编辑页面
        navigate(`/novels/${id}/chapters/${response.data.id}`);
      } else {
        message.error(response.error || '章节创建失败');
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理新建章节对话框取消
  const handleChapterCancel = () => {
    setIsChapterModalVisible(false);
  };

  // 处理删除章节
  const handleDeleteChapter = async (chapterId: string) => {
    try {
      const response = await window.electron.invoke('delete-chapter', { id: chapterId });
      
      if (response.success) {
        message.success('章节删除成功');
        loadNovelData();
      } else {
        message.error(response.error || '章节删除失败');
      }
    } catch (error) {
      console.error('删除章节失败:', error);
      message.error('删除章节失败');
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

  // 获取状态显示文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      'in_progress': { text: '进行中', color: 'blue' },
      'completed': { text: '已完成', color: 'green' },
      'planning': { text: '计划中', color: 'orange' },
      'abandoned': { text: '已放弃', color: 'red' },
    };
    
    return statusMap[status]?.text || '未知';
  };

  // 返回加载中状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>加载中...</p>
      </div>
    );
  }

  // 如果小说不存在
  if (!novel) {
    return (
      <div>
        <Empty description="小说不存在或已被删除" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button type="primary" onClick={() => navigate('/novels')}>
            返回小说列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/novels')}
          style={{ marginRight: 16 }}
        >
          返回列表
        </Button>
        
        <Button 
          type="primary" 
          icon={<EditOutlined />} 
          onClick={showEditModal}
          style={{ marginRight: 8 }}
        >
          编辑小说
        </Button>
        
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={showCreateChapterModal}
        >
          新建章节
        </Button>
      </div>
      
      <Card>
        <Title level={2}>{novel.title}</Title>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="作者">{novel.author}</Descriptions.Item>
          <Descriptions.Item label="类型">{novel.genre || '未分类'}</Descriptions.Item>
          <Descriptions.Item label="状态">{getStatusText(novel.status)}</Descriptions.Item>
          <Descriptions.Item label="字数">{novel.word_count || 0} 字</Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDate(novel.created_at)}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{formatDate(novel.updated_at)}</Descriptions.Item>
        </Descriptions>
        
        {novel.description && (
          <>
            <Divider orientation="left">简介</Divider>
            <Paragraph>{novel.description}</Paragraph>
          </>
        )}
      </Card>
      
      <Divider orientation="left">章节列表</Divider>
      
      <Card>
        {chapters.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={chapters}
            renderItem={(chapter) => (
              <List.Item
                actions={[
                  <Link to={`/novels/${id}/read/${chapter.id}`} key="read">
                    <Tooltip title="阅读模式">
                      <ReadOutlined />
                    </Tooltip>
                  </Link>,
                  <Link to={`/novels/${id}/chapters/${chapter.id}`} key="edit">
                    <Tooltip title="编辑模式">
                      <EditOutlined />
                    </Tooltip>
                  </Link>,
                  <Popconfirm
                    key="delete"
                    title="确定要删除这个章节吗？"
                    description="删除后将无法恢复。"
                    icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
                    onConfirm={() => handleDeleteChapter(chapter.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <a>
                      <Tooltip title="删除">
                        <DeleteOutlined />
                      </Tooltip>
                    </a>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Link to={`/novels/${id}/read/${chapter.id}`}>
                      {chapter.title}
                    </Link>
                  }
                  description={`字数: ${chapter.word_count || 0} 字 | 更新时间: ${formatDate(chapter.updated_at)}`}
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description='暂无章节，点击"新建章节"按钮创建第一个章节' />
        )}
      </Card>

      {/* 编辑小说对话框 */}
      <Modal
        title="编辑小说"
        open={isEditModalVisible}
        onOk={handleEditOk}
        onCancel={handleEditCancel}
        okText="保存"
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

      {/* 新建章节对话框 */}
      <Modal
        title="新建章节"
        open={isChapterModalVisible}
        onOk={handleChapterOk}
        onCancel={handleChapterCancel}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={chapterForm}
          layout="vertical"
        >
          <Form.Item
            name="title"
            label="章节标题"
            rules={[{ required: true, message: '请输入章节标题' }]}
          >
            <Input placeholder="请输入章节标题" />
          </Form.Item>
          
          <Form.Item
            name="parent_id"
            label="父章节"
            initialValue="none"
          >
            <Select>
              <Option value="none">无 (顶级章节)</Option>
              {chapters.map(chapter => (
                <Option key={chapter.id} value={chapter.id}>{chapter.title}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NovelDetail; 