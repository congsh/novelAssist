import React, { useState, useEffect } from 'react';
import { Tabs, List, Avatar, Empty, Spin, Collapse, Typography, App, Tree } from 'antd';
import { 
  UserOutlined, 
  EnvironmentOutlined, 
  OrderedListOutlined, 
  HistoryOutlined,
  DownOutlined
} from '@ant-design/icons';
import { novelAssociationService } from '../../novel/services/novelAssociationService';
import { Character } from '../../../shared/types/character';
import { Location } from '../../../shared/types/location';
import { TimelineEvent } from '../../../shared/types/timeline';
import { OutlineTreeNode } from '../../../shared/types/outline';
import './EditorStyles.css';

const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Text } = Typography;

interface EditorSidebarProps {
  novelId: string;
  onVersionHistoryClick?: () => void;
}

/**
 * 编辑器侧边栏组件，用于显示关联的人物、地点、时间线和大纲
 */
const EditorSidebar: React.FC<EditorSidebarProps> = ({ 
  novelId,
  onVersionHistoryClick 
}) => {
  const [activeTab, setActiveTab] = useState<string>('characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [outlines, setOutlines] = useState<OutlineTreeNode[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (novelId) {
      loadData();
    }
  }, [novelId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载所有数据
      const [charactersRes, locationsRes, outlinesRes, timelineRes] = await Promise.all([
        novelAssociationService.getNovelCharacters(novelId),
        novelAssociationService.getNovelLocations(novelId),
        novelAssociationService.getNovelOutlines(novelId),
        novelAssociationService.getNovelTimelineEvents(novelId)
      ]);

      setCharacters(charactersRes);
      setLocations(locationsRes);
      setOutlines(outlinesRes);
      setTimelineEvents(timelineRes);
    } catch (error) {
      console.error('加载关联数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCharacters = () => {
    if (characters.length === 0) {
      return <Empty description="暂无关联人物" />;
    }

    return (
      <List
        itemLayout="horizontal"
        dataSource={characters}
        renderItem={character => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar icon={<UserOutlined />} src={character.image_path} />}
              title={character.name}
              description={
                <>
                  <div><Text type="secondary">角色: {character.role}</Text></div>
                  {character.description && (
                    <div>{character.description.length > 50 
                      ? `${character.description.substring(0, 50)}...` 
                      : character.description}
                    </div>
                  )}
                </>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  const renderLocations = () => {
    if (locations.length === 0) {
      return <Empty description="暂无关联地点" />;
    }

    return (
      <List
        itemLayout="horizontal"
        dataSource={locations}
        renderItem={location => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar icon={<EnvironmentOutlined />} src={location.image_path} />}
              title={location.name}
              description={
                <>
                  <div><Text type="secondary">重要性: {location.importance || '一般'}</Text></div>
                  {location.description && (
                    <div>{location.description.length > 50 
                      ? `${location.description.substring(0, 50)}...` 
                      : location.description}
                    </div>
                  )}
                </>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  const renderOutlines = () => {
    if (outlines.length === 0) {
      return <Empty description="暂无大纲" />;
    }

    // 将大纲转换为Tree组件需要的格式
    const convertToTreeData = (nodes: OutlineTreeNode[]): { key: string; title: string; children?: any[] }[] => {
      return nodes.map(node => ({
        key: node.id,
        title: node.title,
        children: node.children && node.children.length > 0 ? convertToTreeData(node.children) : undefined,
      }));
    };

    const treeData = convertToTreeData(outlines);

    // 渲染大纲详情
    const renderOutlineDetail = (outline: OutlineTreeNode) => {
      return (
        <div style={{ padding: '8px 0' }}>
          <Text strong>{outline.title}</Text>
          <div style={{ marginTop: 4 }}>
            {outline.content || '无内容'}
          </div>
        </div>
      );
    };

    return (
      <div>
        <Tree
          showLine={{ showLeafIcon: false }}
          showIcon={false}
          switcherIcon={<DownOutlined />}
          treeData={treeData}
          defaultExpandAll
          onSelect={(selectedKeys, info) => {
            if (selectedKeys.length > 0) {
              // 找到选中的大纲
              const findOutline = (outlines: OutlineTreeNode[], id: string): OutlineTreeNode | undefined => {
                for (const outline of outlines) {
                  if (outline.id === id) {
                    return outline;
                  }
                  if (outline.children && outline.children.length > 0) {
                    const found = findOutline(outline.children, id);
                    if (found) return found;
                  }
                }
                return undefined;
              };
              
              const selectedOutline = findOutline(outlines, selectedKeys[0].toString());
              if (selectedOutline) {
                // 这里可以显示大纲详情，例如弹出抽屉或模态框
                console.log('选中大纲:', selectedOutline);
              }
            }
          }}
        />
        
        <Collapse defaultActiveKey={[]} ghost>
          {outlines.map(outline => (
            <Panel header={outline.title} key={outline.id}>
              <p>{outline.content || '无内容'}</p>
              {outline.children && outline.children.length > 0 && (
                <div style={{ marginLeft: 16 }}>
                  {outline.children.map((child: OutlineTreeNode) => renderOutlineDetail(child))}
                </div>
              )}
            </Panel>
          ))}
        </Collapse>
      </div>
    );
  };

  const renderTimelineEvents = () => {
    if (timelineEvents.length === 0) {
      return <Empty description="暂无时间线事件" />;
    }

    return (
      <List
        itemLayout="horizontal"
        dataSource={timelineEvents}
        renderItem={event => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar icon={<HistoryOutlined />} />}
              title={
                <div>
                  {event.title}
                  {event.event_date && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({event.event_date})
                    </Text>
                  )}
                </div>
              }
              description={event.description || '无描述'}
            />
          </List.Item>
        )}
      />
    );
  };

  // 在合适的位置添加版本历史按钮
  const renderAdditionalTools = () => {
    return (
      <div style={{ padding: '16px' }}>
        <List>
          <List.Item 
            onClick={onVersionHistoryClick}
            style={{ cursor: 'pointer' }}
          >
            <List.Item.Meta
              avatar={<Avatar icon={<HistoryOutlined />} />}
              title="版本历史"
              description="查看和恢复历史版本"
            />
          </List.Item>
        </List>
      </div>
    );
  };

  if (loading) {
    return (
      <App>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Spin />
          <div style={{ marginTop: 8 }}>加载中...</div>
        </div>
      </App>
    );
  }

  // 定义Tab项
  const tabItems = [
    {
      key: 'characters',
      label: <span><UserOutlined />人物</span>,
      children: (
        <div style={{ padding: '0 8px', height: 'calc(100% - 44px)', overflow: 'auto' }}>
          {renderCharacters()}
        </div>
      ),
    },
    {
      key: 'locations',
      label: <span><EnvironmentOutlined />地点</span>,
      children: (
        <div style={{ padding: '0 8px', height: 'calc(100% - 44px)', overflow: 'auto' }}>
          {renderLocations()}
        </div>
      ),
    },
    {
      key: 'outlines',
      label: <span><OrderedListOutlined />大纲</span>,
      children: (
        <div style={{ padding: '0 8px', height: 'calc(100% - 44px)', overflow: 'auto' }}>
          {renderOutlines()}
        </div>
      ),
    },
    {
      key: 'timeline',
      label: <span><HistoryOutlined />时间线</span>,
      children: (
        <div style={{ padding: '0 8px', height: 'calc(100% - 44px)', overflow: 'auto' }}>
          {renderTimelineEvents()}
        </div>
      ),
    },
    {
      key: 'tools',
      label: <span><HistoryOutlined />工具</span>,
      children: (
        <div style={{ padding: '0 8px', height: 'calc(100% - 44px)', overflow: 'auto' }}>
          {renderAdditionalTools()}
        </div>
      ),
    },
  ];

  return (
    <App>
      <div className="editor-sidebar">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="small"
          tabPosition="top"
          style={{ height: '100%' }}
          items={tabItems}
        />
      </div>
    </App>
  );
};

export default EditorSidebar; 