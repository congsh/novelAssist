import React, { useState } from 'react';
import { Row, Col, Drawer } from 'antd';
import CharacterList from './CharacterList';
import CharacterForm from './CharacterForm';
import { Character } from '../../../shared/types/character';

interface CharacterManagerProps {
  novelId: string;
}

/**
 * 人物管理页面组件
 */
const CharacterManager: React.FC<CharacterManagerProps> = ({ novelId }) => {
  const [formVisible, setFormVisible] = useState(false);
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  
  // 处理添加人物
  const handleAddCharacter = () => {
    setCurrentCharacter(null);
    setFormVisible(true);
  };
  
  // 处理编辑人物
  const handleEditCharacter = (character: Character) => {
    setCurrentCharacter(character);
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
    <div className="character-manager">
      <Row>
        <Col span={24}>
          <CharacterList 
            novelId={novelId}
            onAddCharacter={handleAddCharacter}
            onEditCharacter={handleEditCharacter}
          />
        </Col>
      </Row>
      
      <Drawer
        title={currentCharacter ? '编辑人物' : '添加人物'}
        placement="right"
        width={520}
        onClose={handleFormCancel}
        open={formVisible}
        destroyOnClose
      >
        <CharacterForm
          novelId={novelId}
          character={currentCharacter}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Drawer>
    </div>
  );
};

export default CharacterManager; 