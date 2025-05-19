import React, { useEffect } from 'react';
import { Tree, Button, Space, Spin, Typography, Empty, Dropdown } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  MoreOutlined,
  DownOutlined
} from '@ant-design/icons';
import { useOutlineStore } from '../store/outlineStore';
import { OutlineTreeNode, OutlineStatus } from '../../../shared/types/outline';
import type { DataNode } from 'antd/es/tree';

const { Title, Text } = Typography;

interface OutlineTreeProps {
  novelId: string;
  onAddOutline: (parentId?: string | null) => void;
  onEditOutline: (outlineId: string) => void;
}

interface TreeDataNode extends DataNode {
  key: string;
  children?: TreeDataNode[];
  isLeaf?: boolean;
}

/**
 * 大纲树组件
 */
const OutlineTree: React.FC<OutlineTreeProps> = ({ 
  novelId, 
  onAddOutline, 
  onEditOutline 
}) => {
  const { 
    outlineTree, 
    loading, 
    error, 
    fetchOutlineTree, 
    deleteOutline,
    setCurrentOutline,
    fetchOutlineDetail
  } = useOutlineStore();
  
  // 加载大纲树
  useEffect(() => {
    if (novelId) {
      fetchOutlineTree(novelId);
    }
  }, [novelId, fetchOutlineTree]);
  
  // 处理添加大纲
  const handleAddOutline = (parentId?: string | null) => {
    onAddOutline(parentId);
  };
  
  // 处理编辑大纲
  const handleEditOutline = async (outlineId: string) => {
    await fetchOutlineDetail(outlineId);
    onEditOutline(outlineId);
  };
  
  // 处理删除大纲
  const handleDeleteOutline = async (outlineId: string) => {
    try {
      await deleteOutline(outlineId, true);
    } catch (error) {
      console.error('删除大纲失败:', error);
    }
  };
  
  // 将大纲树转换为Ant Design Tree需要的格式
  const convertToTreeData = (nodes: OutlineTreeNode[]): TreeDataNode[] => {
    return nodes.map(node => ({
      key: node.id,
      title: (
        <div className="outline-tree-node">
          <Space>
            <span 
              className="outline-tree-node-title"
              onClick={() => handleEditOutline(node.id)}
            >
              {node.title}
            </span>
            
            {node.status === OutlineStatus.COMPLETED && (
              <Text type="success" style={{ fontSize: '12px' }}>已完成</Text>
            )}
            
            {node.status === OutlineStatus.DRAFT && (
              <Text type="warning" style={{ fontSize: '12px' }}>草稿</Text>
            )}
            
            {node.status === OutlineStatus.ARCHIVED && (
              <Text type="secondary" style={{ fontSize: '12px' }}>已归档</Text>
            )}
          </Space>
          
          <div className="outline-tree-node-actions">
            <Space>
              <Button 
                type="text" 
                size="small" 
                icon={<PlusOutlined />} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddOutline(node.id);
                }}
                title="添加子项"
              />
              <Button 
                type="text" 
                size="small" 
                icon={<EditOutlined />} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditOutline(node.id);
                }}
                title="编辑"
              />
              <Button 
                type="text" 
                size="small" 
                danger
                icon={<DeleteOutlined />} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteOutline(node.id);
                }}
                title="删除"
              />
            </Space>
          </div>
        </div>
      ),
      children: node.children && node.children.length > 0 ? convertToTreeData(node.children) : undefined,
      isLeaf: !node.children || node.children.length === 0
    }));
  };
  
  const treeData = convertToTreeData(outlineTree);
  
  return (
    <div className="outline-tree">
      <div className="outline-tree-header">
        <Title level={4}>大纲结构</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => handleAddOutline(null)}
        >
          添加顶级大纲
        </Button>
      </div>
      
      <Spin spinning={loading}>
        {error && <Text type="danger">{error}</Text>}
        
        {!loading && (!outlineTree || outlineTree.length === 0) ? (
          <Empty description="暂无大纲数据" />
        ) : (
          <Tree
            className="outline-custom-tree"
            showLine={{ showLeafIcon: false }}
            showIcon={false}
            switcherIcon={<DownOutlined />}
            treeData={treeData}
            defaultExpandAll
            blockNode
          />
        )}
      </Spin>
    </div>
  );
};

export default OutlineTree; 