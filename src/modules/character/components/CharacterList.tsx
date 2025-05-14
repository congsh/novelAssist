import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Button, Empty, Spin, Tag, Avatar, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Character, CharacterRole } from '../../../shared/types/character';
import { characterService } from '../services/characterService';
import './CharacterStyles.css';

const { Title, Paragraph } = Typography;

interface CharacterListProps {
  novelId: string;
  onAddCharacter: () => void;
  onEditCharacter: (character: Character) => void;
}

/**
 * 人物列表组件
 */
const CharacterList: React.FC<CharacterListProps> = ({
  novelId,
  onAddCharacter,
  onEditCharacter
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 获取人物列表
  const fetchCharacters = async () => {
    try {
      setLoading(true);
      const data = await characterService.getCharacters({ novel_id: novelId });
      setCharacters(data);
    } catch (error: any) {
      message.error(`获取人物列表失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加载
  useEffect(() => {
    fetchCharacters();
  }, [novelId]);
  
  // 处理删除人物
  const handleDeleteCharacter = async (id: string) => {
    try {
      await characterService.deleteCharacter(id);
      message.success('人物删除成功');
      fetchCharacters();
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`);
    }
  };
  
  // 获取角色标签颜色
  const getRoleTagColor = (role: string) => {
    switch (role) {
      case CharacterRole.PROTAGONIST:
        return 'green';
      case CharacterRole.ANTAGONIST:
        return 'red';
      case CharacterRole.SUPPORTING:
        return 'blue';
      case CharacterRole.MINOR:
        return 'default';
      default:
        return 'default';
    }
  };
  
  // 获取角色中文名称
  const getRoleName = (role: string) => {
    switch (role) {
      case CharacterRole.PROTAGONIST:
        return '主角';
      case CharacterRole.ANTAGONIST:
        return '反派';
      case CharacterRole.SUPPORTING:
        return '配角';
      case CharacterRole.MINOR:
        return '次要角色';
      default:
        return '其他';
    }
  };
  
  return (
    <div className="character-list">
      <div className="character-list-header">
        <Title level={4} className="character-list-title">人物列表</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={onAddCharacter}
        >
          添加人物
        </Button>
      </div>
      
      <Spin spinning={loading}>
        {characters.length > 0 ? (
          <Row gutter={[16, 16]}>
            {characters.map(character => (
              <Col xs={24} sm={12} md={8} lg={6} key={character.id}>
                <Card
                  className="character-card"
                  cover={
                    <div className="character-card-cover">
                      {character.image_path ? (
                        <img src={character.image_path} alt={character.name} />
                      ) : (
                        <Avatar icon={<UserOutlined />} size={64} />
                      )}
                    </div>
                  }
                  actions={[
                    <EditOutlined key="edit" onClick={() => onEditCharacter(character)} />,
                    <Popconfirm
                      title="确定要删除这个人物吗？"
                      description="删除后无法恢复"
                      icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                      onConfirm={() => handleDeleteCharacter(character.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <DeleteOutlined key="delete" />
                    </Popconfirm>
                  ]}
                >
                  <div className="character-card-content">
                    <Title level={5} className="character-card-title">{character.name}</Title>
                    <div className="character-card-role">
                      <Tag color={getRoleTagColor(character.role)}>
                        {getRoleName(character.role)}
                      </Tag>
                    </div>
                    <Paragraph className="character-card-description">
                      {character.description || '暂无描述'}
                    </Paragraph>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty 
            description="暂无人物，点击添加人物按钮创建" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Spin>
    </div>
  );
};

export default CharacterList; 