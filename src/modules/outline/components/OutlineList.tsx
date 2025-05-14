import React, { useEffect, useState } from 'react';
import { Tree, Button, Typography, Empty, Spin, Dropdown, Menu, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EllipsisOutlined, MoreOutlined } from '@ant-design/icons';
import { OutlineItem, OutlineTreeNode } from '../../../shared/types/outline';
import { outlineService } from '../services/outlineService';
import './OutlineStyles.css';

const { Title } = Typography;

interface OutlineListProps {
  novelId: string;
  onAddOutline: (parentId?: string | null) => void;
  onEditOutline: (outline: OutlineItem) => void;
  onViewOutline: (outline: OutlineItem) => void;
}

// 树节点数据类型
interface TreeDataNode {
  key: string;
  title: React.ReactNode;
  children?: TreeDataNode[];
}

/**
 * 大纲列表组件
 */
const OutlineList: React.FC<OutlineListProps> = ({
  novelId,
  onAddOutline,
  onEditOutline,
  onViewOutline
}) => {
  const [outlineTree, setOutlineTree] = useState<OutlineTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 获取大纲树结构
  const fetchOutlineTree = async () => {
    try {
      setLoading(true);
      
      // 获取所有大纲，包括关联和未关联到小说的
      const allOutlines = await outlineService.getOutlines();
      
      // 获取关联到小说的大纲树
      const novelOutlines = await outlineService.getOutlineTree(novelId);
      
      // 构建树结构函数
      const buildOutlineTree = (items: OutlineItem[], parentId: string | null = null): OutlineTreeNode[] => {
        return items
          .filter(item => item.parent_id === parentId)
          .map(item => ({
            ...item,
            children: buildOutlineTree(items, item.id)
          }));
      };
      
      // 构建所有大纲的树结构
      const allOutlinesTree = buildOutlineTree(allOutlines);
      
      // 使用所有大纲数据
      setOutlineTree(allOutlinesTree);
    } catch (error: any) {
      message.error(`获取大纲数据失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加载
  useEffect(() => {
    fetchOutlineTree();
  }, [novelId]);
  
  // 处理删除大纲
  const handleDeleteOutline = async (outline: OutlineTreeNode) => {
    try {
      // 检查是否有子项
      const hasChildren = outline.children && outline.children.length > 0;
      
      if (hasChildren) {
        const confirmed = window.confirm(
          '该大纲包含子项，删除将同时删除所有子项。确定要删除吗？'
        );
        
        if (!confirmed) {
          return;
        }
        
        await outlineService.deleteOutline(outline.id, true);
      } else {
        await outlineService.deleteOutline(outline.id);
      }
      
      message.success('大纲删除成功');
      fetchOutlineTree();
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`);
    }
  };
  
  // 转换大纲树为Ant Design Tree数据格式
  const convertToTreeData = (outlines: OutlineTreeNode[]): TreeDataNode[] => {
    return outlines.map(outline => ({
      key: outline.id,
      title: (
        <div className="outline-tree-node">
          <span 
            className="outline-title"
            onClick={() => onViewOutline(outline as OutlineItem)}
          >
            {outline.title}
          </span>
          <div className="outline-actions">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEditOutline(outline as OutlineItem);
              }}
            />
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item 
                    key="add-child" 
                    onClick={() => onAddOutline(outline.id)}
                  >
                    添加子项
                  </Menu.Item>
                  <Menu.Item 
                    key="delete" 
                    danger
                    onClick={() => handleDeleteOutline(outline)}
                  >
                    删除
                  </Menu.Item>
                </Menu>
              }
              trigger={['click']}
            >
              <Button 
                type="text" 
                icon={<MoreOutlined />} 
                size="small"
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </div>
        </div>
      ),
      children: outline.children && outline.children.length > 0 
        ? convertToTreeData(outline.children) 
        : undefined
    }));
  };
  
  return (
    <div className="outline-list">
      <div className="outline-header">
        <Title level={4}>大纲管理</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => onAddOutline()}
        >
          添加大纲
        </Button>
      </div>
      
      <div className="outline-content">
        {loading ? (
          <div className="outline-loading">
            <Spin tip="加载中..." />
          </div>
        ) : outlineTree.length > 0 ? (
          <Tree
            showLine={{ showLeafIcon: false }}
            defaultExpandAll
            treeData={convertToTreeData(outlineTree)}
          />
        ) : (
          <Empty description="暂无大纲" />
        )}
      </div>
    </div>
  );
};

export default OutlineList; 