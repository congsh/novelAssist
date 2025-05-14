import React from 'react';

interface ThemeConfig {
  name: string;
  backgroundColor: string;
  textColor: string;
  toolbarColor: string;
  borderColor: string;
  accentColor: string;
}

interface ThemeStyles {
  editorWrapper: React.CSSProperties;
  editorContent: React.CSSProperties;
  editorToolbar: React.CSSProperties;
}

interface ThemeColors {
  headerBg: string;
  headerText: string;
  siderBg: string;
  siderText: string;
  contentBg: string;
  contentText: string;
  borderColor: string;
  siderTheme: 'light' | 'dark';
}

/**
 * 编辑器主题服务
 * 用于处理编辑器主题的切换和保存
 */
class ThemeService {
  themes: Record<string, ThemeConfig>;
  currentTheme: string;

  constructor() {
    this.themes = {
      light: {
        name: '浅色',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        toolbarColor: '#f5f5f5',
        borderColor: '#e8e8e8',
        accentColor: '#1890ff'
      },
      dark: {
        name: '深色',
        backgroundColor: '#1e1e1e',
        textColor: '#e0e0e0',
        toolbarColor: '#2d2d2d',
        borderColor: '#3e3e3e',
        accentColor: '#177ddc'
      },
      sepia: {
        name: '护眼',
        backgroundColor: '#f8f2e3',
        textColor: '#5b4636',
        toolbarColor: '#eee4d2',
        borderColor: '#e0d6c2',
        accentColor: '#9c6f44'
      },
      blue: {
        name: '蓝色护眼',
        backgroundColor: '#eef6fb',
        textColor: '#333333',
        toolbarColor: '#d9ebf7',
        borderColor: '#c0ddf1',
        accentColor: '#1890ff'
      }
    };
    
    // 从本地存储加载主题设置
    this.currentTheme = localStorage.getItem('editorTheme') || 'light';
  }

  /**
   * 获取当前主题
   * @returns 当前主题配置
   */
  getCurrentTheme(): ThemeConfig {
    return this.themes[this.currentTheme];
  }

  /**
   * 获取当前主题名称
   * @returns 当前主题名称
   */
  getCurrentThemeName(): string {
    return this.currentTheme;
  }

  /**
   * 获取所有可用主题
   * @returns 所有主题配置
   */
  getAllThemes(): Record<string, ThemeConfig> {
    return this.themes;
  }

  /**
   * 设置当前主题
   * @param themeName - 主题名称
   * @returns 设置的主题配置
   */
  setTheme(themeName: string): ThemeConfig {
    if (this.themes[themeName]) {
      this.currentTheme = themeName;
      localStorage.setItem('editorTheme', themeName);
      return this.themes[themeName];
    }
    return this.themes[this.currentTheme];
  }

  /**
   * 获取主题颜色
   * @param themeName - 主题名称，不传则使用当前主题
   * @returns 主题颜色对象
   */
  getThemeColors(themeName?: string): ThemeColors {
    const theme = themeName ? this.themes[themeName] || this.getCurrentTheme() : this.getCurrentTheme();
    
    // 根据主题不同，返回不同的颜色配置
    switch (themeName || this.currentTheme) {
      case 'dark':
        return {
          headerBg: '#1e1e1e',
          headerText: '#e0e0e0',
          siderBg: '#2d2d2d',
          siderText: '#e0e0e0',
          contentBg: '#1e1e1e',
          contentText: '#e0e0e0',
          borderColor: '#3e3e3e',
          siderTheme: 'dark'
        };
      case 'sepia':
        return {
          headerBg: '#eee4d2',
          headerText: '#5b4636',
          siderBg: '#f8f2e3',
          siderText: '#5b4636',
          contentBg: '#f8f2e3',
          contentText: '#5b4636',
          borderColor: '#e0d6c2',
          siderTheme: 'light'
        };
      case 'blue':
        return {
          headerBg: '#d9ebf7',
          headerText: '#333333',
          siderBg: '#eef6fb',
          siderText: '#333333',
          contentBg: '#eef6fb',
          contentText: '#333333',
          borderColor: '#c0ddf1',
          siderTheme: 'light'
        };
      case 'light':
      default:
        return {
          headerBg: '#ffffff',
          headerText: '#333333',
          siderBg: '#f5f5f5',
          siderText: '#333333',
          contentBg: '#ffffff',
          contentText: '#333333',
          borderColor: '#e8e8e8',
          siderTheme: 'light'
        };
    }
  }

  /**
   * 生成主题CSS样式
   * @returns CSS样式对象
   */
  generateThemeStyles(): ThemeStyles {
    const theme = this.getCurrentTheme();
    
    return {
      editorWrapper: {
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        border: `1px solid ${theme.borderColor}`,
        transition: 'all 0.3s ease'
      },
      editorContent: {
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        padding: '20px',
        minHeight: '400px',
        transition: 'all 0.3s ease'
      },
      editorToolbar: {
        backgroundColor: theme.toolbarColor,
        border: `1px solid ${theme.borderColor}`,
        borderBottom: `1px solid ${theme.borderColor}`,
        transition: 'all 0.3s ease'
      }
    };
  }
}

export default new ThemeService(); 