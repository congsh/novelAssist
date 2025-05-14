import React, { useState } from 'react';
import { Typography } from 'antd';
import CharacterManager from '../../modules/character/components/CharacterManager';

const { Title, Paragraph } = Typography;

/**
 * 人物管理页面
 */
const CharactersPage: React.FC = () => {
  const [activeNovelId, setActiveNovelId] = useState<string>('default-novel-id'); // 实际应从全局状态或路由参数获取
  
  return (
    <div>
      <Title level={2}>人物管理</Title>
      <Paragraph>在这里管理您小说中的所有人物角色</Paragraph>
      
      <CharacterManager novelId={activeNovelId} />
    </div>
  );
};

export default CharactersPage; 