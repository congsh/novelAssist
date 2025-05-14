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
  Tooltip,
  Dropdown,
  Tree,
  Tag,
  Row,
  Col
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined, 
  ExclamationCircleOutlined,
  ArrowLeftOutlined,
  ReadOutlined,
  ExportOutlined,
  DownOutlined,
  DragOutlined,
  MenuOutlined,
  TagOutlined,
  FolderOutlined
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { DirectoryTree } = Tree;

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
  category_id?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface TagItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
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

interface TreeNode extends DataNode {
  key: string;
  title: React.ReactNode;
  children?: TreeNode[];
  isLeaf?: boolean;
}

/**
 * 小说详情组件
 */
const NovelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [isChapterModalVisible, setIsChapterModalVisible] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [novelTags, setNovelTags] = useState<TagItem[]>([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState<boolean>(false);
  const [isTagModalVisible, setIsTagModalVisible] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [chapterForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  // 加载小说详情
  const loadNovelData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // 获取小说详情
      const novelResponse = await window.electron.invoke('get-novel', { id });
      if (novelResponse.success) {
        setNovel(novelResponse.data);
        
        // 获取小说分类
        loadNovelCategory(novelResponse.data.id);
        
        // 获取小说标签
        loadNovelTags(novelResponse.data.id);
      } else {
        message.error(novelResponse.error || '获取小说详情失败');
        navigate('/novels');
        return;
      }
      
      // 获取章节列表
      const chaptersResponse = await window.electron.invoke('get-chapters', { novelId: id });
      if (chaptersResponse.success) {
        setChapters(chaptersResponse.data);
        // 构建章节树形结构
        buildChapterTree(chaptersResponse.data);
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

  // 加载所有分类
  const loadCategories = async () => {
    try {
      const response = await window.electron.invoke('get-categories');
      if (response.success) {
        setCategories(response.data);
      } else {
        message.error(response.error || '获取分类列表失败');
      }
    } catch (error) {
      console.error('获取分类列表失败:', error);
      message.error('获取分类列表失败');
    }
  };

  // 加载所有标签
  const loadTags = async () => {
    try {
      const response = await window.electron.invoke('get-tags');
      if (response.success) {
        setTags(response.data);
      } else {
        message.error(response.error || '获取标签列表失败');
      }
    } catch (error) {
      console.error('获取标签列表失败:', error);
      message.error('获取标签列表失败');
    }
  };

  // 加载小说分类
  const loadNovelCategory = async (novelId: string) => {
    try {
      const response = await window.electron.invoke('get-novel-category', { novelId });
      if (response.success) {
        setCategory(response.data);
      } else {
        message.error(response.error || '获取小说分类失败');
      }
    } catch (error) {
      console.error('获取小说分类失败:', error);
      message.error('获取小说分类失败');
    }
  };

  // 加载小说标签
  const loadNovelTags = async (novelId: string) => {
    try {
      const response = await window.electron.invoke('get-novel-tags', { novelId });
      if (response.success) {
        setNovelTags(response.data);
      } else {
        message.error(response.error || '获取小说标签失败');
      }
    } catch (error) {
      console.error('获取小说标签失败:', error);
      message.error('获取小说标签失败');
    }
  };

  // 初始加载
  useEffect(() => {
    loadNovelData();
    loadCategories();
    loadTags();
  }, [id]);

  // 构建章节树形结构
  const buildChapterTree = (chapterList: Chapter[]) => {
    const chaptersMap = new Map<string, Chapter>();
    const tree: TreeNode[] = [];
    
    // 先将所有章节放入Map中，方便查找
    chapterList.forEach(chapter => {
      chaptersMap.set(chapter.id, chapter);
    });
    
    // 构建树形结构
    chapterList.forEach(chapter => {
      const node: TreeNode = {
        key: chapter.id,
        title: renderChapterTitle(chapter),
        isLeaf: true
      };
      
      if (chapter.parent_id === null) {
        // 顶级章节
        tree.push(node);
      } else {
        // 子章节
        const parentNode = findNodeById(tree, chapter.parent_id);
        if (parentNode) {
          if (!parentNode.children) {
            parentNode.children = [];
            parentNode.isLeaf = false;
          }
          parentNode.children.push(node);
        } else {
          // 如果找不到父节点，则作为顶级节点处理
          tree.push(node);
        }
      }
    });
    
    // 排序
    sortTreeNodes(tree);
    setTreeData(tree);
  };

  // 根据ID查找节点
  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.key === id) {
        return node;
      }
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  // 排序树节点
  const sortTreeNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const chapterA = chapters.find(c => c.id === a.key);
      const chapterB = chapters.find(c => c.id === b.key);
      if (chapterA && chapterB) {
        return chapterA.sort_order - chapterB.sort_order;
      }
      return 0;
    });
    
    nodes.forEach(node => {
      if (node.children) {
        sortTreeNodes(node.children);
      }
    });
  };

  // 渲染章节标题
  const renderChapterTitle = (chapter: Chapter) => {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div>{chapter.title}</div>
        <Space>
          <Link to={`/novels/${id}/read/${chapter.id}`}>
            <Tooltip title="阅读模式">
              <ReadOutlined />
            </Tooltip>
          </Link>
          <Link to={`/novels/${id}/chapters/${chapter.id}`}>
            <Tooltip title="编辑模式">
              <EditOutlined />
            </Tooltip>
          </Link>
          <Popconfirm
            title="确定要删除这个章节吗？"
            description="删除后将无法恢复。"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleDeleteChapter(chapter.id)}
            okText="确定"
            cancelText="取消"
          >
            <DeleteOutlined style={{ color: 'red', cursor: 'pointer' }} />
          </Popconfirm>
        </Space>
      </div>
    );
  };

  // 处理树节点拖拽
  const onTreeDrop: TreeProps['onDrop'] = async (info) => {
    const dropKey = info.node.key as string;
    const dragKey = info.dragNode.key as string;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
    
    // 复制一份树数据
    const data = [...treeData];
    
    // 查找被拖拽的节点
    let dragObj: TreeNode | null = null;
    let parentKey: string | null = null;
    
    // 递归查找并移除拖拽节点
    const loop = (
      data: TreeNode[],
      key: string,
      callback: (node: TreeNode, index: number, arr: TreeNode[], parentKey: string | null) => void,
      parent: string | null = null,
    ) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].key === key) {
          callback(data[i], i, data, parent);
          return;
        }
        if (data[i].children) {
          loop(data[i].children!, key, callback, data[i].key as string);
        }
      }
    };
    
    // 查找并移除拖拽节点
    loop(data, dragKey, (item, index, arr, pKey) => {
      arr.splice(index, 1);
      dragObj = item;
      parentKey = pKey;
    });
    
    if (!dragObj) {
      return;
    }
    
    // 确定放置位置
    if (!info.dropToGap) {
      // 放置在节点上，成为其子节点
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj!);
      });
    } else if (
      info.node.children && 
      info.node.children.length > 0 && 
      info.node.expanded && 
      dropPosition === 1
    ) {
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj!);
      });
    } else {
      let ar: TreeNode[] = [];
      let i: number;
      loop(data, dropKey, (item, index, arr) => {
        ar = arr;
        i = index;
      });
      
      if (dropPosition === -1) {
        // 放在目标节点之前
        ar.splice(i!, 0, dragObj!);
      } else {
        // 放在目标节点之后
        ar.splice(i! + 1, 0, dragObj!);
      }
    }
    
    // 更新树数据
    setTreeData(data);
    
    // 准备更新章节排序的数据
    const chapterOrders: Array<{id: string; order: number; parent_id: string | null}> = [];
    let order = 0;
    
    // 递归收集所有章节的排序信息
    const collectChapterOrders = (nodes: TreeNode[], parentId: string | null) => {
      nodes.forEach(node => {
        const chapter = chapters.find(c => c.id === node.key);
        if (chapter) {
          chapterOrders.push({
            id: chapter.id,
            order: order++,
            parent_id: parentId
          });
        }
        if (node.children) {
          collectChapterOrders(node.children, node.key as string);
        }
      });
    };
    
    collectChapterOrders(data, null);
    
    // 发送请求更新排序
    try {
      const response = await window.electron.invoke('reorder-chapters', {
        novelId: id,
        chapterOrders
      });
      
      if (!response.success) {
        message.error('更新章节排序失败');
        loadNovelData(); // 重新加载数据
      }
    } catch (error) {
      console.error('更新章节排序失败:', error);
      message.error('更新章节排序失败');
      loadNovelData(); // 重新加载数据
    }
  };

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

  // 处理导出小说
  const handleExportNovel = async (format: string) => {
    if (!id) return;
    
    setExportLoading(true);
    try {
      const response = await window.electron.invoke('export-novel', { id, format });
      
      if (response.success) {
        message.success(`小说已成功导出至: ${response.filePath}`);
      } else {
        message.error(response.error || '小说导出失败');
      }
    } catch (error) {
      console.error('导出小说失败:', error);
      message.error('导出小说失败');
    } finally {
      setExportLoading(false);
    }
  };

  // 打开分类选择对话框
  const showCategoryModal = () => {
    categoryForm.resetFields();
    if (category) {
      categoryForm.setFieldsValue({ categoryId: category.id });
    }
    setIsCategoryModalVisible(true);
  };

  // 处理分类选择对话框确认
  const handleCategoryOk = async () => {
    if (!id) return;
    
    try {
      const values = await categoryForm.validateFields();
      
      const response = await window.electron.invoke('set-novel-category', {
        novelId: id,
        categoryId: values.categoryId
      });
      
      if (response.success) {
        message.success('小说分类设置成功');
        setIsCategoryModalVisible(false);
        loadNovelCategory(id);
      } else {
        message.error(response.error || '小说分类设置失败');
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理分类选择对话框取消
  const handleCategoryCancel = () => {
    setIsCategoryModalVisible(false);
  };

  // 打开标签管理对话框
  const showTagModal = () => {
    setIsTagModalVisible(true);
  };

  // 处理标签管理对话框取消
  const handleTagCancel = () => {
    setIsTagModalVisible(false);
  };

  // 添加标签
  const handleAddTag = async (tagId: string) => {
    if (!id) return;
    
    try {
      const response = await window.electron.invoke('add-novel-tag', {
        novelId: id,
        tagId
      });
      
      if (response.success) {
        message.success('标签添加成功');
        loadNovelTags(id);
      } else {
        message.error(response.error || '标签添加失败');
      }
    } catch (error) {
      console.error('添加标签失败:', error);
      message.error('添加标签失败');
    }
  };

  // 移除标签
  const handleRemoveTag = async (tagId: string) => {
    if (!id) return;
    
    try {
      const response = await window.electron.invoke('remove-novel-tag', {
        novelId: id,
        tagId
      });
      
      if (response.success) {
        message.success('标签移除成功');
        loadNovelTags(id);
      } else {
        message.error(response.error || '标签移除失败');
      }
    } catch (error) {
      console.error('移除标签失败:', error);
      message.error('移除标签失败');
    }
  };

  // 渲染标签
  const renderTags = () => {
    if (novelTags.length === 0) {
      return <span style={{ color: '#999' }}>暂无标签</span>;
    }
    
    return (
      <div>
        {novelTags.map(tag => (
          <Tag 
            key={tag.id} 
            color={tag.color || '#1890ff'}
            style={{ marginBottom: 8 }}
            closable
            onClose={() => handleRemoveTag(tag.id)}
          >
            {tag.name}
          </Tag>
        ))}
      </div>
    );
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
          style={{ marginRight: 8 }}
        >
          新建章节
        </Button>
        
        <Dropdown
          menu={{
            items: [
              {
                key: 'txt',
                label: '导出为TXT文本',
                onClick: () => handleExportNovel('txt')
              },
              {
                key: 'json',
                label: '导出为JSON格式',
                onClick: () => handleExportNovel('json')
              }
            ]
          }}
        >
          <Button icon={<ExportOutlined />} loading={exportLoading} style={{ marginRight: 8 }}>
            导出小说 <DownOutlined />
          </Button>
        </Dropdown>

        <Button 
          icon={<FolderOutlined />} 
          onClick={showCategoryModal}
          style={{ marginRight: 8 }}
        >
          设置分类
        </Button>

        <Button 
          icon={<TagOutlined />} 
          onClick={showTagModal}
        >
          管理标签
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
          <Descriptions.Item label="分类">
            {category ? (
              <Tag color={category.color || '#1890ff'} icon={<FolderOutlined />}>
                {category.name}
              </Tag>
            ) : (
              <span style={{ color: '#999' }}>未分类</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="标签">
            {renderTags()}
          </Descriptions.Item>
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
          <DirectoryTree
            treeData={treeData}
            defaultExpandAll
            blockNode
            draggable
            onDrop={onTreeDrop}
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

      {/* 分类选择对话框 */}
      <Modal
        title="设置小说分类"
        open={isCategoryModalVisible}
        onOk={handleCategoryOk}
        onCancel={handleCategoryCancel}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={categoryForm}
          layout="vertical"
        >
          <Form.Item
            name="categoryId"
            label="选择分类"
          >
            <Select placeholder="请选择分类" allowClear>
              {categories.map(cat => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 标签管理对话框 */}
      <Modal
        title="管理小说标签"
        open={isTagModalVisible}
        onCancel={handleTagCancel}
        footer={[
          <Button key="close" onClick={handleTagCancel}>
            关闭
          </Button>
        ]}
        width={700}
      >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="已添加的标签" size="small">
              {novelTags.length > 0 ? (
                <div>
                  {novelTags.map(tag => (
                    <Tag 
                      key={tag.id} 
                      color={tag.color || '#1890ff'}
                      style={{ marginBottom: 8 }}
                      closable
                      onClose={() => handleRemoveTag(tag.id)}
                    >
                      {tag.name}
                    </Tag>
                  ))}
                </div>
              ) : (
                <Empty description="暂无标签" />
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="可用标签" size="small">
              {tags.filter(tag => !novelTags.some(nt => nt.id === tag.id)).map(tag => (
                <Tag 
                  key={tag.id} 
                  color={tag.color || '#1890ff'}
                  style={{ marginBottom: 8, cursor: 'pointer' }}
                  onClick={() => handleAddTag(tag.id)}
                >
                  <PlusOutlined /> {tag.name}
                </Tag>
              ))}
              {tags.length === 0 && <Empty description="暂无可用标签" />}
            </Card>
          </Col>
        </Row>
      </Modal>
    </div>
  );
};

export default NovelDetail; 