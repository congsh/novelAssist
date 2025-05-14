# 修改日志

本文件记录小说辅助创作工具项目的所有重要变更。

## [未发布]

### 新增
- 创建项目设计文档
- 创建数据库设计文档
- 创建项目结构文档
- 创建UI设计文档
- 创建开发步骤文档，用于跟踪项目开发进度
- 创建项目进度报告，总结当前项目状态和下一步建议
- 添加Cursor规则文件
- 添加.npmrc配置文件，设置国内镜像源
- 添加富文本编辑器相关依赖
- 添加Immutable.js依赖
- 添加Electron IPC通信的TypeScript类型定义
- 添加数据库初始化状态检查机制
- 添加数据库表存在性检查功能
- 创建人物管理页面占位组件
- 创建地点管理页面占位组件
- 创建大纲管理页面占位组件
- 创建时间线页面占位组件
- 创建辅助工具页面占位组件
- 创建统计分析页面占位组件
- 创建AI助手页面占位组件
- 实现地点管理模块，包括地点列表、添加/编辑表单和详情页
- 实现大纲管理模块，包括树形结构展示、添加/编辑表单
- 创建地点和大纲的IPC处理器，实现CRUD操作
- 创建地点和大纲的类型定义和服务层
- 实现地点和大纲的状态管理
- 创建创作工具页面，整合地点和大纲管理功能
- 实现人物管理模块，包括人物列表、添加/编辑表单和详情页
- 实现时间线管理模块，包括事件列表、添加/编辑表单
- 创建人物和时间线的IPC处理器，实现CRUD操作
- 创建人物和时间线的类型定义和服务层
- 更新CharactersPage和TimelinePage，集成人物管理和时间线管理功能

### 修改
- 将OpenAI依赖版本从^6.0.0更新为^4.24.1
- 将react-flow-renderer依赖更改为reactflow
- 切换为使用Yarn管理依赖
- 配置网络设置以解决依赖安装问题
- 启用Electron的contextIsolation并配置正确的预加载脚本
- 更新webpack开发服务器配置，支持热重载
- 完善Content Security Policy配置，使用中间件动态设置
- 优化webpack配置，使用source-map提升开发体验
- 改进开发服务器日志和错误提示配置
- 更新TypeScript配置，添加类型定义路径
- 改进数据库管理器，添加初始化状态跟踪
- 优化IPC处理器，确保数据库操作前等待初始化完成
- 更新App.tsx，添加所有页面的路由配置
- 更新MainLayout.tsx，实现菜单导航功能
- 优化地点管理UI，使用卡片式布局展示地点列表
- 优化大纲管理UI，使用树形结构展示大纲层级关系
- 改进表单组件，添加验证和提示信息
- 更新LocationsPage组件，直接集成LocationManager功能
- 更新OutlinesPage组件，直接集成OutlineManager功能
- 更新ToolsPage组件，显示已完成功能的状态，添加地点管理和大纲管理的功能卡片
- 在main.js中添加地点和大纲的IPC处理器导入，解决IPC通信问题
- 在main.js中添加人物和时间线的IPC处理器导入和初始化，解决IPC通信问题

### 修复
- 修复依赖安装过程中的网络连接问题
- 解决证书验证错误
- 修复contextBridge API使用问题
- 解决开发环境下的CSP限制问题
- 修复webpack-dev-server的WebSocket连接问题
- 修复CSP配置不一致导致的unsafe-eval错误
- 修复缺失的编辑器依赖问题
- 修复NovelDetail组件中的中文引号问题
- 修复window.electron类型定义缺失问题
- 修复HTML页面为空的问题，调整CSP配置允许unsafe-eval
- 修复React应用不加载的问题，添加加载提示
- 修复数据库表不存在错误，实现表结构检查和自动创建
- 修复数据库查询前未等待初始化完成的问题
- 修复大纲树形结构的递归删除问题
- 修复webpack构建错误，添加Node.js核心模块的polyfill
- 修复服务层中直接导入electron模块的问题，改用window.electron
- 修复"Error invoking remote method"错误，添加缺失的IPC处理器导入
- 修复大纲创建时的SQL参数错误（SQLITE_RANGE: column index out of range），优化参数处理逻辑
- 修复timeline_events表结构问题，添加缺失的importance列，并将related_characters和related_locations列名更新为character_ids和location_id
- 修复updateTimelineEventsTable方法中的回调函数处理，确保在表结构更新后正确调用createIndexes并传递回调

### 删除
- 无

## [0.1.0] - 2023-05-13

### 新增
- 实现基本的Electron应用框架
- 添加React前端界面
- 集成SQLite数据库
- 实现小说管理基础功能
- 实现章节编辑基础功能

## [1.2.0] - 2023-06-15

### 新增
- 添加小说阅读模式功能
- 阅读模式支持字体大小调整
- 阅读模式支持主题切换（浅色、护眼、夜间）
- 阅读模式支持全屏阅读

### 修改
- 优化章节列表界面，添加阅读模式入口
- 章节标题点击默认进入阅读模式而非编辑模式

## 版本规范

本项目遵循[语义化版本控制](https://semver.org/lang/zh-CN/)规范：

- 主版本号：不兼容的API变更
- 次版本号：向后兼容的功能性新增
- 修订号：向后兼容的问题修正 