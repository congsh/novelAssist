import React, { useState } from 'react';
import { Row, Col, Drawer } from 'antd';
import OutlineTree from './OutlineTree';
import OutlineForm from './OutlineForm';
import { useOutlineStore } from '../store/outlineStore';

interface OutlineManagerProps {
  novelId: string;
}

/**
 * 大纲管理页面组件
 */
const OutlineManager: React.FC<OutlineManagerProps> = ({ novelId }) => {
  const [formVisible, setFormVisible] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const { currentOutline } = useOutlineStore();
  
  // 处理添加大纲
  const handleAddOutline = (parentId?: string | null) => {
    setParentId(parentId || null);
    setFormVisible(true);
  };
  
  // 处理编辑大纲
  const handleEditOutline = (outlineId: string) => {
    setFormVisible(true);
  };
  
  // 处理表单成功提交
  const handleFormSuccess = () => {
    setFormVisible(false);
  };
  
  // 处理表单取消
  const handleFormCancel = () => {
    setFormVisible(false);
  };
  
  return (
    <div className="outline-manager">
      <Row>
        <Col span={24}>
          <OutlineTree 
            novelId={novelId}
            onAddOutline={handleAddOutline}
            onEditOutline={handleEditOutline}
          />
        </Col>
      </Row>
      
      <Drawer
        title={currentOutline ? '编辑大纲' : '添加大纲'}
        placement="right"
        width={520}
        onClose={handleFormCancel}
        open={formVisible}
        destroyOnClose
      >
        <OutlineForm
          novelId={novelId}
          outline={currentOutline}
          parentId={parentId}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Drawer>
    </div>
  );
};

export default OutlineManager; 