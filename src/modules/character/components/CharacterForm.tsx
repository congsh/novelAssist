import React, { useState } from 'react';
import { Form, Input, Button, Select, Upload, message } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import { Character, CharacterRole } from '../../../shared/types/character';
import { characterService } from '../services/characterService';
import './CharacterStyles.css';

const { Option } = Select;
const { TextArea } = Input;

interface CharacterFormProps {
  novelId: string;
  character: Character | null;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * 人物表单组件
 */
const CharacterForm: React.FC<CharacterFormProps> = ({
  novelId,
  character,
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(character?.image_path || null);
  
  // 表单初始值
  const initialValues = character ? {
    name: character.name,
    role: character.role,
    description: character.description,
    background: character.background,
    personality: character.personality,
    appearance: character.appearance,
  } : {
    role: CharacterRole.SUPPORTING
  };
  
  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const params = {
        ...values,
        novel_id: novelId,
        image_path: imageUrl
      };
      
      if (character) {
        // 更新人物
        await characterService.updateCharacter({
          id: character.id,
          ...params
        });
        message.success('人物更新成功');
      } else {
        // 创建人物
        await characterService.createCharacter(params);
        message.success('人物创建成功');
      }
      
      onSuccess();
    } catch (error: any) {
      message.error(`操作失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 处理图片上传
  const handleImageUpload = (info: any) => {
    if (info.file.status === 'done') {
      // 这里应该实现实际的图片上传逻辑
      // 目前仅作为示例，使用一个假的URL
      setImageUrl(`/uploads/${info.file.name}`);
      message.success(`${info.file.name} 上传成功`);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} 上传失败`);
    }
  };
  
  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={handleSubmit}
    >
      <Form.Item
        name="name"
        label="人物名称"
        rules={[{ required: true, message: '请输入人物名称' }]}
        className="character-form-item"
      >
        <Input prefix={<UserOutlined />} placeholder="输入人物名称" />
      </Form.Item>
      
      <Form.Item
        name="role"
        label="人物角色"
        rules={[{ required: true, message: '请选择人物角色' }]}
        className="character-form-item"
      >
        <Select placeholder="选择人物角色">
          <Option value={CharacterRole.PROTAGONIST}>主角</Option>
          <Option value={CharacterRole.ANTAGONIST}>反派</Option>
          <Option value={CharacterRole.SUPPORTING}>配角</Option>
          <Option value={CharacterRole.MINOR}>次要角色</Option>
        </Select>
      </Form.Item>
      
      <Form.Item
        name="description"
        label="简介"
        className="character-form-item"
      >
        <TextArea rows={3} placeholder="输入人物简介" />
      </Form.Item>
      
      <Form.Item
        name="appearance"
        label="外貌描述"
        className="character-form-item"
      >
        <TextArea rows={3} placeholder="描述人物外貌特征" />
      </Form.Item>
      
      <Form.Item
        name="personality"
        label="性格特点"
        className="character-form-item"
      >
        <TextArea rows={3} placeholder="描述人物性格特点" />
      </Form.Item>
      
      <Form.Item
        name="background"
        label="背景故事"
        className="character-form-item"
      >
        <TextArea rows={4} placeholder="描述人物背景故事" />
      </Form.Item>
      
      <Form.Item
        label="人物形象"
        className="character-form-item"
      >
        <Upload
          name="image"
          listType="picture-card"
          showUploadList={false}
          onChange={handleImageUpload}
          beforeUpload={() => false} // 阻止自动上传
        >
          {imageUrl ? (
            <img src={imageUrl} alt="人物形象" style={{ width: '100%' }} />
          ) : (
            <div>
              <UploadOutlined />
              <div style={{ marginTop: 8 }}>上传图片</div>
            </div>
          )}
        </Upload>
      </Form.Item>
      
      <div className="character-form-buttons">
        <Button onClick={onCancel}>取消</Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          {character ? '更新' : '创建'}
        </Button>
      </div>
    </Form>
  );
};

export default CharacterForm; 