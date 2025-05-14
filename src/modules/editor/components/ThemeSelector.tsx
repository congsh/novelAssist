import React, { useState, useEffect } from 'react';
import { Radio, Card, Typography } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';
import ThemeService from '../services/ThemeService';

const { Title } = Typography;

interface ThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (themeName: string) => void;
}

interface ThemeConfig {
  name: string;
  backgroundColor: string;
  textColor: string;
  toolbarColor: string;
  borderColor: string;
  accentColor: string;
}

interface ThemeMap {
  [key: string]: ThemeConfig;
}

/**
 * 主题选择器组件
 * 用于切换编辑器主题
 */
const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme: propCurrentTheme, onThemeChange }) => {
  const [currentTheme, setCurrentTheme] = useState<string>(propCurrentTheme || ThemeService.getCurrentThemeName());
  const themes = ThemeService.getAllThemes() as ThemeMap;

  // 当属性变化时更新状态
  useEffect(() => {
    if (propCurrentTheme && propCurrentTheme !== currentTheme) {
      setCurrentTheme(propCurrentTheme);
    }
  }, [propCurrentTheme]);

  // 处理主题变化
  const handleThemeChange = (e: RadioChangeEvent) => {
    const themeName = e.target.value;
    setCurrentTheme(themeName);
    ThemeService.setTheme(themeName);
    onThemeChange(themeName);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={5}><BgColorsOutlined /> 主题设置</Title>
      </div>
      
      <Radio.Group 
        value={currentTheme} 
        onChange={handleThemeChange}
        style={{ width: '100%' }}
      >
        {Object.entries(themes).map(([key, theme]) => (
          <Radio.Button 
            key={key} 
            value={key}
            style={{ 
              width: '50%', 
              textAlign: 'center',
              marginBottom: 8,
              backgroundColor: theme.backgroundColor,
              color: theme.textColor,
              borderColor: theme.borderColor
            }}
          >
            {theme.name}
          </Radio.Button>
        ))}
      </Radio.Group>
      
      <div style={{ marginTop: 16 }}>
        <Card 
          size="small" 
          title="预览" 
          style={{ 
            backgroundColor: themes[currentTheme].backgroundColor,
            color: themes[currentTheme].textColor,
            border: `1px solid ${themes[currentTheme].borderColor}`
          }}
          headStyle={{ 
            backgroundColor: themes[currentTheme].toolbarColor,
            color: themes[currentTheme].textColor,
            borderBottom: `1px solid ${themes[currentTheme].borderColor}`
          }}
        >
          <p>这是预览文本，展示当前主题的效果。</p>
          <p>不同的主题有不同的配色方案，可以根据个人喜好和环境光线选择合适的主题。</p>
        </Card>
      </div>
    </div>
  );
};

export default ThemeSelector; 