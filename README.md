# 小说辅助创作工具

一款专为作家和小说爱好者设计的创作辅助软件，帮助您更高效地进行小说创作和管理。

![版本](https://img.shields.io/badge/版本-1.0.0-blue)
![平台](https://img.shields.io/badge/平台-Windows-lightgrey)
![许可证](https://img.shields.io/badge/许可证-MIT-green)

## 功能特点

### 小说管理
- 创建、导入、导出和管理小说作品
- 支持多种导出格式（EPUB、PDF、DOCX、TXT）
- 章节树形结构管理，支持拖拽排序
- 分类和标签管理系统

### 富文本编辑器
- 舒适的写作环境，支持各种格式化功能
- 自动保存和版本历史记录
- 全屏专注写作模式
- 多种编辑器主题

### 创作辅助工具
- 人物管理：创建和管理小说中的角色
- 地点管理：记录和组织故事发生的场景
- 大纲管理：构建分层的故事结构
- 时间线工具：按时间顺序组织事件

### AI助手
- 多AI服务提供商支持（OpenAI、DeepSeek、Ollama等）
- 内容生成、润色和分析功能
- 创作提示词库
- AI场景配置系统

### 统计分析
- 小说进度跟踪
- 写作活动统计
- 可视化数据图表

## 安装说明

### 系统要求
- 操作系统：Windows 10/11
- 内存：至少4GB RAM
- 硬盘空间：至少200MB可用空间
- 网络连接：使用AI功能需要互联网连接

### 安装步骤
1. 从[发布页面](https://github.com/novelassist/releases)下载最新版本
2. 运行安装程序，按照向导指示完成安装
3. 首次启动时，软件会自动完成必要的初始化设置

## 快速入门

### 创建新小说
1. 点击侧边菜单中的"小说"
2. 点击"新建小说"按钮
3. 填写小说基本信息
4. 点击"创建"完成

### 编辑章节
1. 在小说详情页的章节列表中点击章节
2. 使用富文本编辑器编写内容
3. 内容会自动保存，也可点击保存按钮手动保存

### 使用AI助手
1. 配置AI服务（在"AI助手"页面的"设置"标签）
2. 在编辑器中选择文本并点击"AI助手"按钮
3. 选择所需的AI功能（润色、续写等）
4. 查看AI生成的内容，选择应用或拒绝

## 开发信息

### 技术栈
- 框架：Electron + React
- 状态管理：React Hooks
- UI组件：Ant Design
- 数据库：SQLite
- 编辑器：Draft.js
- 构建工具：Webpack

### 项目结构
```
novelAssist
  ├── config/         # 配置文件
  ├── docs/           # 文档
  ├── public/         # 静态资源
  ├── scripts/        # 脚本
  ├── src/            # 源代码
  │   ├── main/       # Electron主进程
  │   ├── modules/    # 功能模块
  │   ├── renderer/   # 渲染进程
  │   └── shared/     # 共享代码
  └── tests/          # 测试
```

### 开发环境设置
1. 克隆仓库：`git clone https://github.com/novelassist/novelassist.git`
2. 安装依赖：`yarn install`
3. 启动开发服务器：`yarn start`
4. 构建应用：`yarn build`
5. 打包应用：`yarn package`

## 许可证

本项目采用MIT许可证 - 详见[LICENSE](LICENSE)文件

## 更新日志

查看[CHANGELOG.md](CHANGELOG.md)了解版本更新历史 