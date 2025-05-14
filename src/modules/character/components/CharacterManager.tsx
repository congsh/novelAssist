import React, { useState } from 'react';
import { Tabs, Card, Drawer } from 'antd';
import CharacterList from './CharacterList';
import CharacterRelationGraph from './CharacterRelationGraph';
import CharacterForm from './CharacterForm';
import { Character } from '../../../shared/types/character';

const { TabPane } = Tabs;

interface CharacterManagerProps {
  novelId: string;
}

/**
 * 人物管理器组件
 */
const CharacterManager: React.FC<CharacterManagerProps> = ({ novelId }) => {
  const [activeKey, setActiveKey] = useState<string>('list');
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
    <Card>
      <Tabs activeKey={activeKey} onChange={setActiveKey}>
        <TabPane tab="人物列表" key="list">
          <CharacterList 
            novelId={novelId}
            onAddCharacter={handleAddCharacter}
            onEditCharacter={handleEditCharacter}
          />
        </TabPane>
        <TabPane tab="关系图谱" key="graph">
          <CharacterRelationGraph novelId={novelId} />
        </TabPane>
      </Tabs>
      
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
    </Card>
  );
};

export default CharacterManager; 