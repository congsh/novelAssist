import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { characterService } from '../services/characterService';
import { Spin, Empty, Card } from 'antd';
import './CharacterStyles.css';

// 添加内联样式
const styles = {
  container: {
    width: '100%',
    height: '600px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  svg: {
    width: '100%',
    height: '100%'
  },
  loading: {
    width: '100%',
    height: '400px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  error: {
    width: '100%',
    textAlign: 'center' as 'center',
    padding: '20px'
  }
};

interface CharacterRelationGraphProps {
  novelId: string;
}

interface Node {
  id: string;
  name: string;
  role: string;
  group: string;
}

interface Link {
  source: string;
  target: string;
  type: string;
  description: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

/**
 * 人物关系图谱组件
 */
const CharacterRelationGraph: React.FC<CharacterRelationGraphProps> = ({ novelId }) => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await characterService.getCharacterRelationships(novelId);
        setGraphData(data);
        setError(null);
      } catch (err: any) {
        console.error('获取人物关系图谱数据失败:', err);
        setError(err.message || '获取人物关系图谱数据失败');
      } finally {
        setLoading(false);
      }
    };

    if (novelId) {
      fetchData();
    }
  }, [novelId]);

  // 绘制关系图
  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    // 清除之前的图形
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 800;
    const height = 600;
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height]);

    // 定义节点颜色
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // 创建力导向图布局
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force("link", d3.forceLink(graphData.links as any).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(0, 0))
      .force("collide", d3.forceCollide().radius(50));

    // 创建箭头标记
    svg.append("defs").selectAll("marker")
      .data(["arrow"])
      .join("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#999")
      .attr("d", "M0,-5L10,0L0,5");

    // 绘制连接线
    const link = svg.append("g")
      .selectAll("path")
      .data(graphData.links)
      .join("path")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5)
      .attr("fill", "none")
      .attr("marker-end", "url(#arrow-arrow)");

    // 绘制节点
    const node = svg.append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .call(drag(simulation) as any);

    // 添加节点圆形
    node.append("circle")
      .attr("r", 20)
      .attr("fill", (d: any) => color(d.group));

    // 添加节点文本
    node.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#fff")
      .style("font-size", "10px")
      .text((d: any) => d.name);

    // 添加连接线文本
    svg.append("g")
      .selectAll("text")
      .data(graphData.links)
      .join("text")
      .attr("font-size", 8)
      .attr("text-anchor", "middle")
      .text((d: any) => d.type);

    // 更新布局
    simulation.on("tick", () => {
      link.attr("d", linkArc as any);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      
      // 更新连接线文本位置
      svg.selectAll("text")
        .filter(function() {
          return !d3.select(this).datum() || (d3.select(this).datum() as any).source;
        })
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);
    });

    // 拖拽功能
    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    // 弧形连接线
    function linkArc(d: any) {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy);
      return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
    }

    // 清理函数
    return () => {
      simulation.stop();
    };
  }, [graphData]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <Spin tip="加载中..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card style={styles.error}>
        <p>加载失败: {error}</p>
      </Card>
    );
  }

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <Empty 
        description="暂无人物关系数据" 
        image={Empty.PRESENTED_IMAGE_SIMPLE} 
      />
    );
  }

  return (
    <div style={styles.container}>
      <svg ref={svgRef} style={styles.svg}></svg>
    </div>
  );
};

export default CharacterRelationGraph; 