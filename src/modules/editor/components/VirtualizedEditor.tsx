import React, { useRef, useState, useEffect, useCallback } from 'react';
import { List, AutoSizer, CellMeasurer, CellMeasurerCache, ListRowProps } from 'react-virtualized';
import { EditorState, ContentBlock, SelectionState, convertToRaw } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import './VirtualizedEditor.css';

interface VirtualizedEditorProps {
  editorState: EditorState;
  onChange: (editorState: EditorState) => void;
  readOnly?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

interface CellMeasurerProps {
  measure: () => void;
  registerChild: (element: HTMLElement | null) => void;
}

/**
 * 虚拟化编辑器组件
 * 用于优化大文档编辑性能，通过虚拟滚动只渲染可见的内容
 */
const VirtualizedEditor: React.FC<VirtualizedEditorProps> = ({
  editorState,
  onChange,
  readOnly = false,
  placeholder,
  onFocus,
  onBlur
}) => {
  const editorRef = useRef<any>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // 内容块缓存，用于测量行高
  const cache = useRef(
    new CellMeasurerCache({
      defaultHeight: 24,
      fixedWidth: true,
      keyMapper: (index: number) => index,
    })
  );
  
  // 列表引用
  const listRef = useRef<List | null>(null);
  
  // 获取内容块数组
  const contentBlocks = editorState.getCurrentContent().getBlocksAsArray();
  
  // 当块内容变化时清除缓存
  useEffect(() => {
    cache.current.clearAll();
    if (listRef.current) {
      listRef.current.recomputeRowHeights();
    }
  }, [contentBlocks.length, convertToRaw(editorState.getCurrentContent())]);
  
  // 处理块点击事件
  const handleBlockClick = useCallback((blockKey: string, event: React.MouseEvent) => {
    // 阻止事件冒泡
    event.stopPropagation();
    
    // 创建选中该块的选择状态
    const block = contentBlocks.find(b => b.getKey() === blockKey);
    if (block) {
      const selection = SelectionState.createEmpty(blockKey);
      const newEditorState = EditorState.forceSelection(editorState, selection);
      onChange(newEditorState);
      
      // 聚焦编辑器
      if (editorRef.current) {
        editorRef.current.focusEditor();
      }
    }
  }, [contentBlocks, editorState, onChange]);
  
  // 处理滚动开始
  const handleScrollStart = useCallback(() => {
    setIsScrolling(true);
  }, []);
  
  // 处理滚动停止
  const handleScrollStop = useCallback(() => {
    setIsScrolling(false);
  }, []);
  
  // 处理聚焦事件
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (onFocus) {
      onFocus();
    }
  }, [onFocus]);
  
  // 处理失焦事件
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (onBlur) {
      onBlur();
    }
  }, [onBlur]);
  
  // 渲染行
  const rowRenderer = ({ index, key, parent, style }: ListRowProps) => {
    const block = contentBlocks[index];
    if (!block) return null;
    
    const blockKey = block.getKey();
    const text = block.getText();
    
    return (
      <CellMeasurer
        cache={cache.current}
        columnIndex={0}
        key={key}
        parent={parent}
        rowIndex={index}
      >
        {({ measure, registerChild }: CellMeasurerProps) => (
          <div
            ref={registerChild}
            style={{ ...style, padding: '4px 0' }}
            onClick={(e) => handleBlockClick(blockKey, e)}
            className={`virtual-editor-block ${isFocused ? 'is-focused' : ''}`}
          >
            <div className="virtual-editor-block-content">
              {text || <span className="virtual-editor-placeholder">{index === 0 && placeholder ? placeholder : ''}</span>}
            </div>
          </div>
        )}
      </CellMeasurer>
    );
  };
  
  // 如果正在滚动，使用简化的渲染来提高性能
  const optimizedRowRenderer = isScrolling 
    ? ({ index, key, style }: ListRowProps) => (
        <div key={key} style={style} className="virtual-editor-block-scrolling">
          {/* 滚动时的简化内容 */}
          <div className="virtual-editor-block-content-scrolling">
            {contentBlocks[index]?.getText().substr(0, 50)}
            {contentBlocks[index]?.getText().length > 50 ? '...' : ''}
          </div>
        </div>
      )
    : rowRenderer;
  
  return (
    <div className="virtualized-editor-container">
      {/* 隐藏的实际编辑器，用于保持状态和处理输入 */}
      <div style={{ height: 0, overflow: 'hidden' }}>
        <Editor
          ref={editorRef}
          editorState={editorState}
          onEditorStateChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          toolbarHidden={true}
          wrapperClassName="virtualized-editor-wrapper"
          editorClassName="virtualized-editor-input"
        />
      </div>
      
      <div className="virtualized-editor-content">
        <AutoSizer>
          {({ width, height }: { width: number; height: number }) => (
            <List
              ref={listRef}
              width={width}
              height={height}
              rowCount={contentBlocks.length}
              rowHeight={cache.current.rowHeight}
              deferredMeasurementCache={cache.current}
              rowRenderer={optimizedRowRenderer}
              overscanRowCount={10}
              onScroll={handleScrollStart}
              onScrollEnd={handleScrollStop}
              tabIndex={-1}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
};

export default VirtualizedEditor; 