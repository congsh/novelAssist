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
  Col,
  Avatar,
  App,
  Progress,
  Statistic
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
  FolderOutlined,
  UserOutlined,
  EnvironmentOutlined,
  OrderedListOutlined,
  HistoryOutlined,
  BarChartOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import { novelAssociationService } from '../services/novelAssociationService';
import { characterService } from '../../character/services/characterService';

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

// 添加Character接口
interface Character {
  id: string;
  novel_id: string;
  name: string;
  role: string;
  description?: string;
  background?: string;
  personality?: string;
  appearance?: string;
  image_path?: string;
}

// 添加Location接口
interface Location {
  id: string;
  novel_id: string;
  name: string;
  description?: string;
  importance?: string;
  image_path?: string;
  coordinates?: string;
}

// 添加TimelineEvent接口
interface TimelineEvent {
  id: string;
  novel_id: string;
  title: string;
  description?: string;
  event_date?: string;
  importance?: string;
  character_ids?: string;
  location_id?: string;
}

// 添加Outline接口
interface Outline {
  id: string;
  novel_id: string;
  title: string;
  content?: string;
  sort_order: number;
  parent_id?: string | null;
  status?: string;
  children?: Outline[];
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
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [outlines, setOutlines] = useState<Outline[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
  const [isCharacterModalVisible, setIsCharacterModalVisible] = useState<boolean>(false);
  const [isLocationModalVisible, setIsLocationModalVisible] = useState<boolean>(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [isOutlineModalVisible, setIsOutlineModalVisible] = useState<boolean>(false);
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState<boolean>(false);
  const [selectedOutlineId, setSelectedOutlineId] = useState<string>('');
  const [selectedTimelineEventId, setSelectedTimelineEventId] = useState<string>('');
  const [availableOutlines, setAvailableOutlines] = useState<Outline[]>([]);
  const [availableTimelineEvents, setAvailableTimelineEvents] = useState<TimelineEvent[]>([]);
  const { message: appMessage, modal } = App.useApp();
  const [statisticsLoading, setStatisticsLoading] = useState<boolean>(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [backupLoading, setBackupLoading] = useState<boolean>(false);

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
        
        // 获取小说关联的人物、地点、大纲和时间线
        loadNovelCharacters(novelResponse.data.id);
        loadNovelLocations(novelResponse.data.id);
        loadNovelOutlines(novelResponse.data.id);
        loadNovelTimelineEvents(novelResponse.data.id);
        
        // 加载小说统计数据
        loadNovelStatistics(novelResponse.data.id);
      } else {
        appMessage.error(novelResponse.error || '获取小说详情失败');
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
        appMessage.error(chaptersResponse.error || '获取章节列表失败');
      }
    } catch (error) {
      console.error('加载小说数据失败:', error);
      appMessage.error('加载小说数据失败');
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
        appMessage.error(response.error || '获取分类列表失败');
      }
    } catch (error) {
      console.error('获取分类列表失败:', error);
      appMessage.error('获取分类列表失败');
    }
  };

  // 加载所有标签
  const loadTags = async () => {
    try {
      const response = await window.electron.invoke('get-tags');
      if (response.success) {
        setTags(response.data);
      } else {
        appMessage.error(response.error || '获取标签列表失败');
      }
    } catch (error) {
      console.error('获取标签列表失败:', error);
      appMessage.error('获取标签列表失败');
    }
  };

  // 加载小说分类
  const loadNovelCategory = async (novelId: string) => {
    try {
      const response = await window.electron.invoke('get-novel-category', { novelId });
      if (response.success) {
        setCategory(response.data);
      } else {
        appMessage.error(response.error || '获取小说分类失败');
      }
    } catch (error) {
      console.error('获取小说分类失败:', error);
      appMessage.error('获取小说分类失败');
    }
  };

  // 加载小说标签
  const loadNovelTags = async (novelId: string) => {
    try {
      const response = await window.electron.invoke('get-novel-tags', { novelId });
      if (response.success) {
        setNovelTags(response.data);
      } else {
        appMessage.error(response.error || '获取小说标签失败');
      }
    } catch (error) {
      console.error('获取小说标签失败:', error);
      appMessage.error('获取小说标签失败');
    }
  };

  // 加载小说关联的人物
  const loadNovelCharacters = async (novelId: string) => {
    try {
      const response = await novelAssociationService.getNovelCharacters(novelId);
      setCharacters(response);
    } catch (error) {
      console.error('获取小说关联的人物失败:', error);
      appMessage.error('获取小说关联的人物失败');
    }
  };
  
  // 加载小说关联的地点
  const loadNovelLocations = async (novelId: string) => {
    try {
      const response = await novelAssociationService.getNovelLocations(novelId);
      setLocations(response);
    } catch (error) {
      console.error('获取小说关联的地点失败:', error);
      appMessage.error('获取小说关联的地点失败');
    }
  };
  
  // 加载小说关联的大纲
  const loadNovelOutlines = async (novelId: string) => {
    try {
      const response = await novelAssociationService.getNovelOutlines(novelId);
      // 大纲已经是树状结构，直接设置
      setOutlines(response);
    } catch (error) {
      console.error('获取小说关联的大纲失败:', error);
      appMessage.error('获取小说关联的大纲失败');
    }
  };
  
  // 加载小说关联的时间线事件
  const loadNovelTimelineEvents = async (novelId: string) => {
    try {
      const response = await novelAssociationService.getNovelTimelineEvents(novelId);
      setTimelineEvents(response);
    } catch (error) {
      console.error('获取小说关联的时间线事件失败:', error);
      appMessage.error('获取小说关联的时间线事件失败');
    }
  };
  
  // 加载可关联的人物
  const loadAvailableCharacters = async () => {
    try {
      const response = await characterService.getCharacters();
      // 过滤掉已关联的人物
      const characterIds = characters.map(c => c.id);
      const available = response.filter(c => !characterIds.includes(c.id));
      setAvailableCharacters(available);
    } catch (error) {
      console.error('获取可关联的人物失败:', error);
      appMessage.error('获取可关联的人物失败');
    }
  };

  // 加载可关联的地点
  const loadAvailableLocations = async () => {
    try {
      const response = await window.electron.invoke('get-locations');
      if (response.success) {
        // 过滤掉已关联的地点
        const locationIds = locations.map(l => l.id);
        const available = response.data.filter((l: Location) => !locationIds.includes(l.id));
        setAvailableLocations(available);
      } else {
        appMessage.error(response.error || '获取可关联的地点失败');
      }
    } catch (error) {
      console.error('获取可关联的地点失败:', error);
      appMessage.error('获取可关联的地点失败');
    }
  };

  // 加载可关联的大纲
  const loadAvailableOutlines = async () => {
    try {
      if (!id) return;
      const available = await novelAssociationService.getAvailableOutlines(id);
      setAvailableOutlines(available);
    } catch (error) {
      console.error('获取可关联的大纲失败:', error);
      appMessage.error('获取可关联的大纲失败');
    }
  };

  // 加载可关联的时间线事件
  const loadAvailableTimelineEvents = async () => {
    try {
      if (!id) return;
      const available = await novelAssociationService.getAvailableTimelineEvents(id);
      setAvailableTimelineEvents(available);
    } catch (error) {
      console.error('获取可关联的时间线事件失败:', error);
      appMessage.error('获取可关联的时间线事件失败');
    }
  };

  // 加载小说统计数据
  const loadNovelStatistics = async (novelId: string) => {
    if (!novelId) return;
    
    setStatisticsLoading(true);
    try {
      const result = await window.electron.invoke('get-novel-statistics', { novelId });
      if (result.success) {
        setStatistics(result.data);
      } else {
        appMessage.error(result.error || '获取小说统计数据失败');
      }
    } catch (error) {
      console.error('获取小说统计数据失败:', error);
      appMessage.error('获取小说统计数据失败');
    } finally {
      setStatisticsLoading(false);
    }
  };

  // 创建小说备份
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
        appMessage.error('更新章节排序失败');
        loadNovelData(); // 重新加载数据
      }
    } catch (error) {
      console.error('更新章节排序失败:', error);
      appMessage.error('更新章节排序失败');
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
        appMessage.success('小说更新成功');
        setIsEditModalVisible(false);
        setNovel(response.data);
      } else {
        appMessage.error(response.error || '小说更新失败');
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
        appMessage.success('章节创建成功');
        setIsChapterModalVisible(false);
        loadNovelData();
        
        // 导航到章节编辑页面
        navigate(`/novels/${id}/chapters/${response.data.id}`);
      } else {
        appMessage.error(response.error || '章节创建失败');
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
        appMessage.success('章节删除成功');
        loadNovelData();
      } else {
        appMessage.error(response.error || '章节删除失败');
      }
    } catch (error) {
      console.error('删除章节失败:', error);
      appMessage.error('删除章节失败');
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
        appMessage.success(`小说已成功导出至: ${response.filePath}`);
      } else {
        appMessage.error(response.error || '小说导出失败');
      }
    } catch (error) {
      console.error('导出小说失败:', error);
      appMessage.error('导出小说失败');
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
        appMessage.success('小说分类设置成功');
        setIsCategoryModalVisible(false);
        loadNovelCategory(id);
      } else {
        appMessage.error(response.error || '小说分类设置失败');
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
        appMessage.success('标签添加成功');
        loadNovelTags(id);
      } else {
        appMessage.error(response.error || '标签添加失败');
      }
    } catch (error) {
      console.error('添加标签失败:', error);
      appMessage.error('添加标签失败');
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
        appMessage.success('标签移除成功');
        loadNovelTags(id);
      } else {
        appMessage.error(response.error || '标签移除失败');
      }
    } catch (error) {
      console.error('移除标签失败:', error);
      appMessage.error('移除标签失败');
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
            style={{ marginBottom: 8, color: '#fff', fontWeight: 'bold' }}
            closable
            onClose={() => handleRemoveTag(tag.id)}
          >
            {tag.name}
          </Tag>
        ))}
      </div>
    );
  };

  // 显示关联人物模态框
  const showCharacterModal = () => {
    loadAvailableCharacters();
    setIsCharacterModalVisible(true);
  };
  
  // 处理关联人物
  const handleCharacterOk = async () => {
    if (!selectedCharacterId || !id) {
      appMessage.error('请选择要关联的人物');
      return;
    }
    
    try {
      await novelAssociationService.associateCharacter(id, selectedCharacterId);
      appMessage.success('关联人物成功');
      loadNovelCharacters(id);
      setIsCharacterModalVisible(false);
      setSelectedCharacterId('');
    } catch (error) {
      console.error('关联人物失败:', error);
      appMessage.error('关联人物失败');
    }
  };
  
  // 处理取消关联人物
  const handleCharacterCancel = () => {
    setIsCharacterModalVisible(false);
    setSelectedCharacterId('');
  };
  
  // 解除人物关联
  const handleDisassociateCharacter = async (characterId: string) => {
    if (!id) return;
    
    try {
      await novelAssociationService.disassociateCharacter(id, characterId);
      appMessage.success('解除人物关联成功');
      loadNovelCharacters(id);
    } catch (error) {
      console.error('解除人物关联失败:', error);
      appMessage.error('解除人物关联失败');
    }
  };
  
  // 渲染关联的人物列表
  const renderCharacters = () => {
    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Typography.Title level={4}>人物</Typography.Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={showCharacterModal}
          >
            关联人物
          </Button>
        </div>
        
        {characters.length > 0 ? (
          <List
            grid={{ gutter: 16, column: 3 }}
            dataSource={characters}
            renderItem={character => (
              <List.Item>
                <Card
                  actions={[
                    <Link to={`/characters/${character.id}`}>
                      <Button type="link" icon={<EditOutlined />}>查看</Button>
                    </Link>,
                    <Popconfirm
                      title="确定要解除此人物关联吗？"
                      onConfirm={() => handleDisassociateCharacter(character.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="link" danger icon={<DeleteOutlined />}>解除关联</Button>
                    </Popconfirm>
                  ]}
                >
                  <Card.Meta
                    avatar={
                      <Avatar 
                        icon={<UserOutlined />} 
                        src={character.image_path} 
                        size={64}
                      />
                    }
                    title={character.name}
                    description={
                      <>
                        <div><strong>角色:</strong> {character.role}</div>
                        <div>{character.description ? `${character.description.substring(0, 50)}${character.description.length > 50 ? '...' : ''}` : '无描述'}</div>
                      </>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无关联人物" />
        )}
        
        <Modal
          title="关联人物"
          open={isCharacterModalVisible}
          onOk={handleCharacterOk}
          onCancel={handleCharacterCancel}
          okText="确定"
          cancelText="取消"
        >
          <Form layout="vertical">
            <Form.Item label="选择人物" required>
              <Select
                placeholder="请选择要关联的人物"
                value={selectedCharacterId}
                onChange={value => setSelectedCharacterId(value)}
                style={{ width: '100%' }}
              >
                {availableCharacters.map(character => (
                  <Select.Option key={character.id} value={character.id}>
                    {character.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  };
  
  // 显示关联地点模态框
  const showLocationModal = () => {
    loadAvailableLocations();
    setIsLocationModalVisible(true);
  };

  // 处理关联地点
  const handleLocationOk = async () => {
    if (!selectedLocationId || !id) {
      appMessage.error('请选择要关联的地点');
      return;
    }
    
    try {
      await novelAssociationService.associateLocation(id, selectedLocationId);
      appMessage.success('关联地点成功');
      loadNovelLocations(id);
      setIsLocationModalVisible(false);
      setSelectedLocationId('');
    } catch (error) {
      console.error('关联地点失败:', error);
      appMessage.error('关联地点失败');
    }
  };

  // 处理取消关联地点
  const handleLocationCancel = () => {
    setIsLocationModalVisible(false);
    setSelectedLocationId('');
  };

  // 解除地点关联
  const handleDisassociateLocation = async (locationId: string) => {
    if (!id) return;
    
    try {
      await novelAssociationService.disassociateLocation(id, locationId);
      appMessage.success('解除地点关联成功');
      loadNovelLocations(id);
    } catch (error) {
      console.error('解除地点关联失败:', error);
      appMessage.error('解除地点关联失败');
    }
  };

  // 渲染关联的地点列表
  const renderLocations = () => {
    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Typography.Title level={4}>地点</Typography.Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={showLocationModal}
          >
            关联地点
          </Button>
        </div>
        
        {locations.length > 0 ? (
          <List
            grid={{ gutter: 16, column: 3 }}
            dataSource={locations}
            renderItem={location => (
              <List.Item>
                <Card
                  actions={[
                    <Link to={`/locations/${location.id}`}>
                      <Button type="link" icon={<EditOutlined />}>查看</Button>
                    </Link>,
                    <Popconfirm
                      title="确定要解除此地点关联吗？"
                      onConfirm={() => handleDisassociateLocation(location.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="link" danger icon={<DeleteOutlined />}>解除关联</Button>
                    </Popconfirm>
                  ]}
                >
                  <Card.Meta
                    avatar={
                      <Avatar 
                        icon={<EnvironmentOutlined />} 
                        src={location.image_path} 
                        size={64}
                      />
                    }
                    title={location.name}
                    description={
                      <>
                        <div><strong>重要性:</strong> {location.importance || '一般'}</div>
                        <div>{location.description ? `${location.description.substring(0, 50)}${location.description.length > 50 ? '...' : ''}` : '无描述'}</div>
                      </>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无关联地点" />
        )}

        <Modal
          title="关联地点"
          open={isLocationModalVisible}
          onOk={handleLocationOk}
          onCancel={handleLocationCancel}
          okText="确定"
          cancelText="取消"
        >
          <Form layout="vertical">
            <Form.Item label="选择地点" required>
              <Select
                placeholder="请选择要关联的地点"
                value={selectedLocationId}
                onChange={value => setSelectedLocationId(value)}
                style={{ width: '100%' }}
              >
                {availableLocations.map(location => (
                  <Select.Option key={location.id} value={location.id}>
                    {location.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  };
  
  // 渲染关联的大纲列表
  const renderOutlines = () => {
    // 将大纲树转换为Tree组件需要的格式
    const convertToTreeData = (nodes: Outline[]): DataNode[] => {
      return nodes.map(node => ({
        key: node.id,
        title: (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>{node.title}</span>
            <Space>
              <Link to={`/outlines/${node.id}`}>
                <Button type="link" size="small" icon={<EditOutlined />}>查看</Button>
              </Link>
              <Popconfirm
                title="确定要解除此大纲关联吗？"
                onConfirm={() => handleDisassociateOutline(node.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>解除关联</Button>
              </Popconfirm>
            </Space>
          </div>
        ),
        children: node.children && node.children.length > 0 ? convertToTreeData(node.children) : undefined,
      }));
    };

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Typography.Title level={4}>大纲</Typography.Title>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={showOutlineModal}
            >
              关联大纲
            </Button>
            <Link to={`/outlines?novelId=${id}`}>
              <Button type="default" icon={<OrderedListOutlined />}>
                查看全部
              </Button>
            </Link>
          </Space>
        </div>
        
        {outlines.length > 0 ? (
          <Tree
            showLine={{ showLeafIcon: false }}
            showIcon={false}
            switcherIcon={<DownOutlined />}
            treeData={convertToTreeData(outlines)}
            defaultExpandAll
            blockNode
            onSelect={(selectedKeys) => {
              if (selectedKeys.length > 0) {
                // 找到选中的大纲
                const findOutline = (outlines: Outline[], id: string): Outline | undefined => {
                  for (const outline of outlines) {
                    if (outline.id === id) {
                      return outline;
                    }
                    if (outline.children && outline.children.length > 0) {
                      const found = findOutline(outline.children, id);
                      if (found) return found;
                    }
                  }
                  return undefined;
                };
                
                const selectedOutline = findOutline(outlines, selectedKeys[0].toString());
                if (selectedOutline) {
                  // 显示大纲内容
                  modal.info({
                    title: selectedOutline.title,
                    content: (
                      <div>
                        <p>{selectedOutline.content || '无内容'}</p>
                      </div>
                    ),
                    width: 600,
                  });
                }
              }
            }}
          />
        ) : (
          <Empty description="暂无关联大纲" />
        )}

        <Modal
          title="关联大纲"
          open={isOutlineModalVisible}
          onOk={handleOutlineOk}
          onCancel={handleOutlineCancel}
          okText="确定"
          cancelText="取消"
        >
          <Form layout="vertical">
            <Form.Item label="选择大纲" required>
              <Select
                placeholder="请选择要关联的大纲"
                value={selectedOutlineId}
                onChange={value => setSelectedOutlineId(value)}
                style={{ width: '100%' }}
              >
                {availableOutlines.map(outline => (
                  <Select.Option key={outline.id} value={outline.id}>
                    {outline.title}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  };
  
  // 渲染关联的时间线事件列表
  const renderTimelineEvents = () => {
    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Typography.Title level={4}>时间线</Typography.Title>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={showTimelineModal}
            >
              关联时间线事件
            </Button>
            <Link to={`/timeline?novelId=${id}`}>
              <Button type="default" icon={<HistoryOutlined />}>
                查看全部
              </Button>
            </Link>
          </Space>
        </div>
        
        {timelineEvents.length > 0 ? (
          <List
            dataSource={timelineEvents}
            renderItem={event => (
              <List.Item
                actions={[
                  <Link to={`/timeline/${event.id}`}>
                    <Button type="link" icon={<EditOutlined />}>查看</Button>
                  </Link>,
                  <Popconfirm
                    title="确定要解除此时间线事件关联吗？"
                    onConfirm={() => handleDisassociateTimelineEvent(event.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="link" danger icon={<DeleteOutlined />}>解除关联</Button>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  title={
                    <div>
                      {event.title} 
                      {event.event_date && <span style={{ fontSize: '0.8em', marginLeft: 8 }}>({event.event_date})</span>}
                    </div>
                  }
                  description={event.description?.substring(0, 100) || '无描述'}
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无时间线事件" />
        )}
      </div>
    );
  };

  // 显示关联大纲模态框
  const showOutlineModal = () => {
    loadAvailableOutlines();
    setIsOutlineModalVisible(true);
  };

  // 处理关联大纲
  const handleOutlineOk = async () => {
    if (!selectedOutlineId || !id) {
      appMessage.error('请选择要关联的大纲');
      return;
    }
    
    try {
      await novelAssociationService.associateOutline(id, selectedOutlineId);
      appMessage.success('关联大纲成功');
      loadNovelOutlines(id);
      setIsOutlineModalVisible(false);
      setSelectedOutlineId('');
    } catch (error) {
      console.error('关联大纲失败:', error);
      appMessage.error('关联大纲失败');
    }
  };

  // 处理取消关联大纲
  const handleOutlineCancel = () => {
    setIsOutlineModalVisible(false);
    setSelectedOutlineId('');
  };

  // 处理解除大纲关联
  const handleDisassociateOutline = async (outlineId: string) => {
    if (!novel || !novel.id) return;
    
    try {
      await novelAssociationService.disassociateOutline(novel.id, outlineId);
      
      // 使用App组件的message方法，避免动态主题警告
      appMessage.success('已解除大纲关联');
      
      // 重新加载大纲列表
      loadNovelOutlines(novel.id);
    } catch (error) {
      console.error('解除大纲关联失败:', error);
      
      // 使用App组件的message方法，避免动态主题警告
      appMessage.error('解除大纲关联失败');
    }
  };

  // 显示关联时间线事件模态框
  const showTimelineModal = () => {
    loadAvailableTimelineEvents();
    setIsTimelineModalVisible(true);
  };

  // 处理关联时间线事件
  const handleTimelineOk = async () => {
    if (!selectedTimelineEventId || !id) {
      appMessage.error('请选择要关联的时间线事件');
      return;
    }
    
    try {
      await novelAssociationService.associateTimelineEvent(id, selectedTimelineEventId);
      appMessage.success('关联时间线事件成功');
      loadNovelTimelineEvents(id);
      setIsTimelineModalVisible(false);
      setSelectedTimelineEventId('');
    } catch (error) {
      console.error('关联时间线事件失败:', error);
      appMessage.error('关联时间线事件失败');
    }
  };

  // 处理取消关联时间线事件
  const handleTimelineCancel = () => {
    setIsTimelineModalVisible(false);
    setSelectedTimelineEventId('');
  };

  // 处理解除时间线事件关联
  const handleDisassociateTimelineEvent = async (timelineEventId: string) => {
    if (!novel || !novel.id) return;
    
    try {
      await novelAssociationService.disassociateTimelineEvent(novel.id, timelineEventId);
      
      // 使用App组件的message方法，避免动态主题警告
      appMessage.success('已解除时间线事件关联');
      
      // 重新加载时间线事件列表
      loadNovelTimelineEvents(novel.id);
    } catch (error) {
      console.error('解除时间线事件关联失败:', error);
      
      // 使用App组件的message方法，避免动态主题警告
      appMessage.error('解除时间线事件关联失败');
    }
  };

  // 渲染统计信息
  const renderStatistics = () => {
    if (!statistics) {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin spinning={statisticsLoading} />
          <Paragraph style={{ marginTop: 10 }}>加载统计数据中...</Paragraph>
        </div>
      );
    }
    
    const { statistics: stats } = statistics;
    
    return (
      <div>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Progress
              percent={stats.progressPercentage}
              status="active"
              format={percent => `${percent}% 完成`}
              style={{ marginBottom: 16 }}
            />
          </Col>
          
          <Col xs={24} sm={8}>
            <Statistic 
              title="当前字数" 
              value={stats.currentWordCount} 
              suffix="字" 
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          
          <Col xs={24} sm={8}>
            <Statistic 
              title="目标字数" 
              value={stats.targetWordCount} 
              suffix="字"
            />
          </Col>
          
          <Col xs={24} sm={8}>
            <Statistic 
              title="章节数量" 
              value={stats.chapterCount}
            />
          </Col>
          
          <Col xs={24} sm={8}>
            <Statistic 
              title="平均章节字数" 
              value={stats.avgWordsPerChapter} 
              suffix="字/章"
            />
          </Col>
          
          <Col xs={24} sm={8}>
            <Statistic 
              title="人物数量" 
              value={stats.characterCount}
            />
          </Col>
          
          <Col xs={24} sm={8}>
            <Statistic 
              title="地点数量" 
              value={stats.locationCount}
            />
          </Col>
        </Row>
        
        <Divider />
        
        <Row>
          <Col span={24} style={{ textAlign: 'center' }}>
            <Button 
              type="primary"
              icon={<BarChartOutlined />}
              onClick={() => navigate('/statistics')}
            >
              查看更多统计数据
            </Button>
          </Col>
        </Row>
      </div>
    );
  };

  // 修改Tab内容，添加关联内容标签页
  const items = [
    {
      key: 'info',
      label: '基本信息',
      children: (
        <div className="novel-info">
          <Card>
            <Title level={2}>{novel?.title}</Title>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="作者">{novel?.author}</Descriptions.Item>
              <Descriptions.Item label="类型">{novel?.genre || '未分类'}</Descriptions.Item>
              <Descriptions.Item label="状态">{getStatusText(novel?.status || '')}</Descriptions.Item>
              <Descriptions.Item label="字数">{novel?.word_count || 0} 字</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDate(novel?.created_at || '')}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{formatDate(novel?.updated_at || '')}</Descriptions.Item>
              <Descriptions.Item label="分类">
                {category ? (
                  <Tag color={category.color || '#1890ff'} style={{ color: '#fff', fontWeight: 'bold' }} icon={<FolderOutlined />}>
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
            
            {novel?.description && (
              <>
                <Divider orientation="left">简介</Divider>
                <Paragraph>{novel?.description}</Paragraph>
              </>
            )}
          </Card>
        </div>
      ),
    },
    {
      key: 'chapters',
      label: '章节管理',
      children: (
        <div className="novel-chapters">
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
        </div>
      ),
    },
    {
      key: 'related',
      label: '关联内容',
      children: (
        <div className="novel-related" style={{ height: 'calc(100vh - 250px)', overflowY: 'auto', padding: '0 10px' }}>
          <Row gutter={[24, 24]}>
            <Col span={24}>
              {renderCharacters()}
            </Col>
            <Col span={24}>
              <Divider />
            </Col>
            <Col span={24}>
              {renderLocations()}
            </Col>
            <Col span={24}>
              <Divider />
            </Col>
            <Col span={24}>
              {renderOutlines()}
            </Col>
            <Col span={24}>
              <Divider />
            </Col>
            <Col span={24}>
              {renderTimelineEvents()}
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'statistics',
      label: '统计分析',
      children: (
        <div className="novel-statistics" style={{ padding: '20px' }}>
          {renderStatistics()}
        </div>
      ),
    },
  ];

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
    <App>
      <div className="novel-detail">
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
                  key: 'epub',
                  label: '导出为EPUB',
                  onClick: () => handleExportNovel('epub'),
                },
                {
                  key: 'pdf',
                  label: '导出为PDF',
                  onClick: () => handleExportNovel('pdf'),
                },
                {
                  key: 'docx',
                  label: '导出为Word文档',
                  onClick: () => handleExportNovel('docx'),
                },
                {
                  key: 'txt',
                  label: '导出为纯文本',
                  onClick: () => handleExportNovel('txt'),
                },
              ],
            }}
          >
            <Button loading={exportLoading} icon={<ExportOutlined />} style={{ marginRight: 8 }}>
              导出 <DownOutlined />
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
            style={{ marginRight: 8 }}
          >
            管理标签
          </Button>
          
          <Button 
            icon={<CloudUploadOutlined />} 
            onClick={handleCreateBackup}
            loading={backupLoading}
          >
            备份小说
          </Button>
        </div>
        
        <Tabs defaultActiveKey="info" items={items} />

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
                <Option value="planning">规划中</Option>
                <Option value="writing">写作中</Option>
                <Option value="revising">修改中</Option>
                <Option value="completed">已完成</Option>
                <Option value="published">已发布</Option>
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

        {/* 关联时间线事件对话框 */}
        <Modal
          title="关联时间线事件"
          open={isTimelineModalVisible}
          onOk={handleTimelineOk}
          onCancel={handleTimelineCancel}
          okText="确定"
          cancelText="取消"
        >
          <Form layout="vertical">
            <Form.Item label="选择时间线事件" required>
              <Select
                placeholder="请选择要关联的时间线事件"
                value={selectedTimelineEventId}
                onChange={value => setSelectedTimelineEventId(value)}
                style={{ width: '100%' }}
              >
                {availableTimelineEvents.map(event => (
                  <Select.Option key={event.id} value={event.id}>
                    {event.title}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </App>
  );
};

// 删除不需要的组件
export default NovelDetail; 