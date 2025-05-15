import React, { useState, useEffect } from 'react';
import { Button, message, Space, Tooltip, Modal, Input } from 'antd';
import { 
  SaveOutlined, 
  UndoOutlined, 
  RedoOutlined, 
  BoldOutlined, 
  ItalicOutlined, 
  UnderlineOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  RobotOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { chapterService } from '../services/chapter-service';
import { Chapter } from '../types';
import { AIScenario } from '../../ai/types';
import { chatService } from '../../ai/services/chat-service';
import { TextArea } from 'antd/lib/input';

interface NovelEditorProps {
  chapter: Chapter;
  onSave?: () => void;
}

/**
 * 小说编辑器组件
 */
const NovelEditor: React.FC<NovelEditorProps> = ({ chapter, onSave }) => {
  const [editorState, setEditorState] = useState(() => {
    if (chapter.content) {
      try {
        const contentState = convertFromRaw(JSON.parse(chapter.content));
        return EditorState.createWithContent(contentState);
      } catch (e) {
        console.error('解析章节内容失败:', e);
        return EditorState.createEmpty();
      }
    }
    return EditorState.createEmpty();
  });
  
  const [saving, setSaving] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState<'generate' | 'edit' | 'enhance'>('generate');
  
  // 保存章节内容
  const saveContent = async () => {
    try {
      setSaving(true);
      
      const contentState = editorState.getCurrentContent();
      const rawContent = convertToRaw(contentState);
      
      await chapterService.updateChapter(chapter.id, {
        ...chapter,
        content: JSON.stringify(rawContent),
        updatedAt: Date.now()
      });
      
      message.success('保存成功');
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('保存章节失败:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };
  
  // 处理快捷键
  const handleKeyCommand = (command: string, editorState: EditorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    
    return 'not-handled';
  };
  
  // 应用内联样式
  const toggleInlineStyle = (style: string) => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, style));
  };
  
  // 应用块级样式
  const toggleBlockType = (blockType: string) => {
    setEditorState(RichUtils.toggleBlockType(editorState, blockType));
  };
  
  // 打开AI助手对话框
  const openAiModal = (mode: 'generate' | 'edit' | 'enhance') => {
    setAiMode(mode);
    
    // 根据模式设置不同的提示词
    let defaultPrompt = '';
    switch (mode) {
      case 'generate':
        defaultPrompt = `请基于以下背景为我的小说《${chapter.title}》生成内容：\n\n`;
        break;
      case 'edit':
        // 获取当前选中的文本
        const selection = editorState.getSelection();
        const currentContent = editorState.getCurrentContent();
        const selectedText = getSelectedText(editorState);
        
        defaultPrompt = `请修改以下文本，提升其质量和表现力：\n\n${selectedText}`;
        break;
      case 'enhance':
        defaultPrompt = `请为我的小说章节《${chapter.title}》增加更丰富的细节描写和情感表达：\n\n`;
        break;
    }
    
    setAiPrompt(defaultPrompt);
    setAiResponse('');
    setAiModalVisible(true);
  };
  
  // 获取选中的文本
  const getSelectedText = (editorState: EditorState): string => {
    const selection = editorState.getSelection();
    const currentContent = editorState.getCurrentContent();
    
    if (selection.isCollapsed()) {
      return '';
    }
    
    const startKey = selection.getStartKey();
    const endKey = selection.getEndKey();
    const startOffset = selection.getStartOffset();
    const endOffset = selection.getEndOffset();
    
    if (startKey === endKey) {
      return currentContent.getBlockForKey(startKey).getText().slice(startOffset, endOffset);
    }
    
    let selectedText = '';
    let blockMap = currentContent.getBlockMap();
    let isWithinSelection = false;
    
    blockMap.forEach((block) => {
      if (!block) return;
      
      const key = block.getKey();
      
      if (key === startKey) {
        isWithinSelection = true;
        selectedText += block.getText().slice(startOffset) + '\n';
      } else if (key === endKey) {
        isWithinSelection = false;
        selectedText += block.getText().slice(0, endOffset);
      } else if (isWithinSelection) {
        selectedText += block.getText() + '\n';
      }
    });
    
    return selectedText;
  };
  
  // 向AI发送请求
  const sendToAI = async () => {
    if (!aiPrompt.trim()) {
      message.warning('请输入提示词');
      return;
    }
    
    setAiLoading(true);
    setAiResponse('');
    
    try {
      // 根据不同的模式使用不同的AI场景
      let scenario: AIScenario;
      
      switch (aiMode) {
        case 'generate':
          scenario = AIScenario.NOVEL_COLLABORATION;
          break;
        case 'edit':
          scenario = AIScenario.NOVEL_COLLABORATION;
          break;
        case 'enhance':
          scenario = AIScenario.CONTEXT_ENHANCEMENT;
          break;
        default:
          scenario = AIScenario.NOVEL_COLLABORATION;
      }
      
      // 发送消息到AI并获取响应
      const response = await chatService.sendMessage(
        aiPrompt,
        (partialResponse) => {
          setAiResponse(prev => prev + partialResponse.content);
        },
        scenario
      );
      
      if (!response) {
        throw new Error('AI响应为空');
      }
      
    } catch (error) {
      console.error('AI请求失败:', error);
      message.error('AI请求失败');
    } finally {
      setAiLoading(false);
    }
  };
  
  // 使用AI生成的内容
  const useAiContent = () => {
    if (!aiResponse.trim()) {
      message.warning('没有可用的AI生成内容');
      return;
    }
    
    // 获取当前的编辑器状态
    let currentState = editorState;
    const selection = currentState.getSelection();
    
    // 根据不同的模式处理内容
    if (aiMode === 'edit' && !selection.isCollapsed()) {
      // 替换选中的文本
      const contentState = currentState.getCurrentContent();
      const contentWithReplacedText = contentState.createEntity(
        'AI_GENERATED',
        'MUTABLE',
        { content: aiResponse }
      );
      
      // 替换选中的文本
      const newContentState = contentState.merge({
        selectionBefore: selection,
        selectionAfter: selection,
      });
      
      // 创建新的编辑器状态
      const newEditorState = EditorState.push(
        currentState,
        newContentState,
        'insert-characters'
      );
      
      setEditorState(newEditorState);
    } else {
      // 在光标位置插入文本
      const contentState = currentState.getCurrentContent();
      const contentStateWithEntity = contentState.createEntity(
        'AI_GENERATED',
        'MUTABLE',
        { content: aiResponse }
      );
      
      const newContentState = contentState.merge({
        selectionBefore: selection,
        selectionAfter: selection,
      });
      
      // 创建新的编辑器状态
      const newEditorState = EditorState.push(
        currentState,
        newContentState,
        'insert-characters'
      );
      
      setEditorState(newEditorState);
    }
    
    // 关闭对话框
    setAiModalVisible(false);
    message.success('AI内容已添加');
  };
  
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Tooltip title="保存">
            <Button 
              icon={<SaveOutlined />} 
              onClick={saveContent}
              loading={saving}
            />
          </Tooltip>
          <Tooltip title="撤销">
            <Button 
              icon={<UndoOutlined />} 
              onClick={() => setEditorState(EditorState.undo(editorState))}
              disabled={editorState.getUndoStack().size === 0}
            />
          </Tooltip>
          <Tooltip title="重做">
            <Button 
              icon={<RedoOutlined />} 
              onClick={() => setEditorState(EditorState.redo(editorState))}
              disabled={editorState.getRedoStack().size === 0}
            />
          </Tooltip>
          <Tooltip title="加粗">
            <Button 
              icon={<BoldOutlined />} 
              onClick={() => toggleInlineStyle('BOLD')}
            />
          </Tooltip>
          <Tooltip title="斜体">
            <Button 
              icon={<ItalicOutlined />} 
              onClick={() => toggleInlineStyle('ITALIC')}
            />
          </Tooltip>
          <Tooltip title="下划线">
            <Button 
              icon={<UnderlineOutlined />} 
              onClick={() => toggleInlineStyle('UNDERLINE')}
            />
          </Tooltip>
          <Tooltip title="有序列表">
            <Button 
              icon={<OrderedListOutlined />} 
              onClick={() => toggleBlockType('ordered-list-item')}
            />
          </Tooltip>
          <Tooltip title="无序列表">
            <Button 
              icon={<UnorderedListOutlined />} 
              onClick={() => toggleBlockType('unordered-list-item')}
            />
          </Tooltip>
          <Tooltip title="左对齐">
            <Button 
              icon={<AlignLeftOutlined />} 
              onClick={() => toggleBlockType('left')}
            />
          </Tooltip>
          <Tooltip title="居中对齐">
            <Button 
              icon={<AlignCenterOutlined />} 
              onClick={() => toggleBlockType('center')}
            />
          </Tooltip>
          <Tooltip title="右对齐">
            <Button 
              icon={<AlignRightOutlined />} 
              onClick={() => toggleBlockType('right')}
            />
          </Tooltip>
          <Tooltip title="AI生成内容">
            <Button 
              icon={<RobotOutlined />} 
              onClick={() => openAiModal('generate')}
              type="primary"
              ghost
            >
              AI生成
            </Button>
          </Tooltip>
          <Tooltip title="AI编辑选中内容">
            <Button 
              icon={<RobotOutlined />} 
              onClick={() => openAiModal('edit')}
              disabled={editorState.getSelection().isCollapsed()}
              type="primary"
              ghost
            >
              AI编辑
            </Button>
          </Tooltip>
          <Tooltip title="AI增强内容">
            <Button 
              icon={<RobotOutlined />} 
              onClick={() => openAiModal('enhance')}
              type="primary"
              ghost
            >
              AI增强
            </Button>
          </Tooltip>
        </Space>
      </div>
      
      <div 
        style={{ 
          border: '1px solid #d9d9d9', 
          borderRadius: 4, 
          padding: 16, 
          minHeight: 400 
        }}
      >
        <Editor
          editorState={editorState}
          onChange={setEditorState}
          handleKeyCommand={handleKeyCommand}
          placeholder="开始创作..."
        />
      </div>
      
      <Modal
        title={
          aiMode === 'generate' ? 'AI生成内容' : 
          aiMode === 'edit' ? 'AI编辑内容' : 
          'AI增强内容'
        }
        open={aiModalVisible}
        onCancel={() => setAiModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setAiModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="generate" 
            type="primary" 
            onClick={sendToAI}
            loading={aiLoading}
            disabled={!aiPrompt.trim()}
          >
            {aiLoading ? '生成中...' : '生成'}
          </Button>,
          <Button 
            key="use" 
            type="primary" 
            onClick={useAiContent}
            disabled={!aiResponse.trim() || aiLoading}
          >
            使用内容
          </Button>
        ]}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <label>提示词：</label>
          <TextArea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={4}
            placeholder="输入提示词，告诉AI你想要什么样的内容..."
            disabled={aiLoading}
          />
        </div>
        
        <div>
          <label>AI响应：</label>
          <div 
            style={{ 
              border: '1px solid #d9d9d9', 
              borderRadius: 4, 
              padding: 16, 
              minHeight: 200,
              maxHeight: 400,
              overflowY: 'auto',
              background: '#f9f9f9'
            }}
          >
            {aiLoading && !aiResponse ? (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <LoadingOutlined style={{ fontSize: 24 }} />
                <p>AI正在生成内容...</p>
              </div>
            ) : aiResponse ? (
              <div style={{ whiteSpace: 'pre-wrap' }}>{aiResponse}</div>
            ) : (
              <div style={{ color: '#999', textAlign: 'center', padding: '50px 0' }}>
                点击"生成"按钮获取AI响应
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NovelEditor; 