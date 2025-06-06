# 变更日志

所有对项目的重要更改都将记录在此文件中。

## [未发布] - 2025-06-03

### 新增
- 根据项目设计文档重构AI模块架构
- 添加Agent系统基础架构
- 添加工作链系统基础架构
- 创建上下文处理框架
- 添加内容分析模块目录结构
- **完成实体向量化系统**：
  - 创建EntityVectorService实体向量化服务
  - 实现人物、地点、大纲和时间线的向量化处理
  - 添加批量向量化功能，支持实时进度跟踪
  - 实现实体向量的相似度查询和搜索功能
  - 创建EntityVectorManager管理界面组件
  - 添加向量数据清理和测试查询功能
  - 支持多种实体类型的统一向量化管理
- **实体向量化管理界面**：
  - 在AI助手页面添加"实体向量化"标签页
  - 提供直接向量化功能，支持按小说和实体类型批量处理
  - 实现向量化数据展示页面，包含状态统计和数据筛选
  - 支持查看向量化详情、重新向量化和删除操作
  - 添加向量化进度实时显示和错误处理
- **数据库支持**：
  - 创建vectorized_entities表存储向量化记录
  - 添加向量化相关IPC处理器支持数据操作
  - 实现批量保存和查询向量化实体数据
  - 支持按小说、实体类型和状态筛选向量化记录

### 修改
- 重构AI服务目录结构，按照新设计分类
- 更新向量嵌入服务，支持新的Agent系统
- 优化AI类型定义，增加Agent和工作链相关类型
- 更新AI服务索引文件，导出EntityVectorService

### 修复
- **修复了实体向量化系统模型选择问题**：
  - 解决了在用户已配置embedding模型的情况下，系统仍然下载本地模型的问题
  - 修复了VectorEmbeddingService在EntityVectorManager中未正确初始化的问题
  - 现在系统会优先使用用户配置的在线embedding模型（如BAAI/bge-m3）
  - 只有在无法获取配置或配置无效时才回退到本地all-MiniLM-L6-v2模型
  - 添加了详细的日志输出，帮助用户了解模型选择过程
- **完全解决了IPC处理器注册问题**：
  - 修复了删除handlers.js文件后导致的多个IPC处理器缺失问题
  - 更新index.js中的处理器导入路径，指向正确的文件名
  - 修复了函数名不匹配问题，使用正确的导出函数名：
    - `initOutlineHandlers` (outline-handler.js)
    - `initTimelineHandlers` (timeline-handler.js)  
    - `initStatisticsHandlers` (statistics-handler.js)
    - `initBackupHandlers` (backup-handler.js)
    - `initNovelAssociationHandlers` (novel-association-handler.js)
  - 删除了重复的处理器文件（character-handler.js、location-handler.js）
  - 移除了outline-handler.js中的自动函数调用，确保统一通过index.js控制
  - **清理了main.js中混乱的IPC处理器注册代码**：
    - 移除了对已删除文件的引用（如location-handler.js）
    - 删除了分散的处理器注册逻辑
    - 统一使用registerIpcHandlers()进行集中注册
    - 解决了"Cannot find module './ipc/location-handler'"错误
  - **深度调试和修复了处理器内部问题**：
    - 移除了novel-handler.js文件末尾的自动执行代码`registerNovelHandlers()`
    - 修复了ai-handler.js中重复调用registerVectorHandlers的问题
    - 修复了vector-handler.js的错误导入路径：`database-manager` → `db-manager`
    - 统一了vector-handler.js的数据库API调用，使用`dbManager.query()`和`dbManager.run()`
    - 解决了所有处理器文件的依赖和初始化问题
  - **修复了地点功能的数据库API调用错误**：
    - 修复了location-handlers.js中使用错误的`dbManager.all()`方法的问题
    - 将所有数据库查询调用统一为正确的`dbManager.query()`方法
    - 解决了"TypeError: dbManager.all is not a function"错误
    - 确保地点列表获取和地图数据获取功能正常工作
  - **创建了应用相关IPC处理器**：
    - 创建新的app-handler.js文件处理应用相关的IPC调用
    - 注册`dialog:show`处理器，支持在主进程中显示对话框
    - 注册`app:navigate`处理器，支持应用内导航功能
    - 添加`app:get-info`、`app:restart`、`app:quit`等应用管理功能
    - 解决了"No handler registered for 'dialog:show'"错误
    - 修复了AI服务配置提示对话框无法显示的问题
  - **添加了缺失的章节相关IPC处理器**：
    - 在novel-handler.js中添加`get-chapter-content`处理器，支持编辑器获取章节内容
    - 在novel-handler.js中添加`update-chapter-content`处理器，支持编辑器更新章节内容
    - 这些处理器专门为编辑器服务提供优化的数据格式和性能
    - 修复了编辑器服务中章节内容获取和更新功能
  - 修复了所有IPC处理器注册问题，解决了以下错误：
    - "No handler registered for 'get-novels'"
    - "No handler registered for 'settings:get'"
    - "No handler registered for 'get-characters'"
    - "No handler registered for 'get-locations'"
    - "No handler registered for 'get-outline-tree'"
    - "No handler registered for 'get-timeline-events'"
    - "No handler registered for 'get-overall-statistics'"
    - "No handler registered for 'get-writing-activity'"
    - "No handler registered for 'get-writing-time'"
    - "No handler registered for 'get-novel-characters'"
    - "No handler registered for 'get-novel-locations'"
    - "No handler registered for 'get-novel-outlines'"
    - "No handler registered for 'get-novel-timeline-events'"
    - "No handler registered for 'get-novel-statistics'"
- 修复了SiliconFlow API嵌入功能400错误，使用正确的嵌入模型名称'BAAI/bge-large-zh-v1.5'替代默认的'text-embedding-ada-002'
- 增加了SiliconFlow API请求的详细日志输出，便于调试
- 添加了encoding_format参数，确保与SiliconFlow API规范兼容
- 改进了错误响应处理，输出详细的错误信息便于问题定位
- 移除了硬编码的默认嵌入模型，现在要求用户在AI设置中配置嵌入模型
- 改进了嵌入模型查找逻辑，当没有配置嵌入模型时给出明确的配置指导
- 优化了向量嵌入服务的错误提示，指导用户到正确的配置页面
- 修复了向量嵌入服务中的类型检查问题，确保代码健壮性
- 修复了Chroma向量数据库元数据格式错误，添加元数据扁平化处理，确保所有元数据值都是基本类型
- 解决了向量保存时"Expected metadata value to be a str, int, float, bool, or None"错误
- **修复了向量数据库保存超时问题**：
  - 修复了向量嵌入服务未正确传递向量数据到Chroma数据库的问题
  - 在保存向量时现在会正确传递SiliconFlow API生成的embedding数据
  - 修改了VectorService.createEmbedding和createEmbeddingBatch方法，支持接收实际的向量数据
  - 更新了IPC处理器，确保向量数据能正确从渲染进程传递到主进程再到Python Chroma服务
  - 解决了"The read operation timed out in add"错误，现在向量保存速度大幅提升
- **修复了Chroma向量数据库元数据null值错误**：
  - 修复了元数据中包含null值导致的"'NoneType' object cannot be converted to 'PyBool'"等错误
  - 改进了flattenMetadata函数，完全过滤掉null和undefined值，只保留Chroma支持的基本类型
  - 在saveToVectorStore和saveToVectorStoreBatch方法中添加额外的元数据验证
  - 确保所有发送给Chroma的元数据值都是string、number或boolean类型
  - 为基础元数据字段提供有效的默认值，避免空值问题
- **修复了Chroma向量数据库查询条件格式错误**：
  - 修复了删除和查询操作中的"Expected where operator to be one of $gt, $gte, $lt, $lte, $ne, $eq, $in, $nin"错误
  - 更新所有查询方法使用正确的Chroma操作符格式（如{"field": {"$eq": "value"}}）
  - 修复了deleteChapterChunks、querySimilarContent等方法的查询条件
  - 适配元数据扁平化后的字段名格式（如"additionalContext_chapterId"）
  - 确保所有向量查询和删除操作符合Chroma数据库要求
- 修复了向量服务进程终止问题：改进了Python进程终止逻辑，避免进程残留导致的端口冲突
- 解决了Windows系统下日志乱码问题：使用正确的GBK/CP936编码处理Windows命令输出，避免中文字符显示为乱码
- 增强了进程管理的健壮性：添加进程存在性检查，避免尝试终止已经退出的进程
- 优化了端口占用检测和清理：使用buffer编码和正确的解码方式处理netstat和taskkill命令输出
- 改进了错误处理机制：对于"找不到进程"等常见错误提供更友好的日志输出

## [未发布] - 2025-06-02

### 新增
- 整合新的AI功能架构设计，包括Agent系统和工作链
- 添加AI基础服务模块设计，包括上下文处理框架
- 添加内容分析模块设计，包括文本向量化和内容特征提取
- 添加内容生成模块设计，包括差异比较引擎和续写服务
- 添加Agent系统模块设计，包括预设Agent和自定义Agent
- 添加创作辅助模块设计，包括内联编辑建议和灵感触发

### 修改
- 更新数据库设计，添加Agent配置、工作流模板和上下文模板等表结构
- 更新技术选型，将LevelDB替换为Chroma向量数据库
- 重构AI模块代码结构，优化服务组织
- 调整AI功能实现路径，分为三个阶段进行开发

## [未发布] - 2025-06-01

### 新增
- 基于新项目设计文档，更新了AI功能架构设计
- 添加Agent系统设计，包括基础框架、预设Agent和工作链系统
- 增强内容分析模块设计，添加风格分析和结构分析功能
- 扩展内容生成模块设计，增加多种生成策略和控制机制
- 设计上下文增强系统，提供智能上下文筛选和管理
- 添加一致性检查系统设计，支持角色和情节一致性检查

### 修改
- 更新数据库设计，添加Agent配置、工作流模板和上下文模板等新表
- 重构向量数据库设计，采用Chroma作为专用向量数据库
- 优化开发步骤文档，按照新的五阶段开发策略调整开发计划
- 更新AI模块接口设计，支持更丰富的AI功能和交互方式

## [未发布] - 2025-05-23

### 修改
- 改进了项目构建流程，完全使用TypeScript版本的向量数据库服务
- 修改了`tsconfig.electron.json`配置，确保TypeScript文件正确编译为JavaScript
- 优化了`package.json`中的构建脚本，添加了TypeScript编译步骤
- 在TypeScript文件中添加了CommonJS兼容的导出方式，确保在JavaScript环境中可以正确使用

### 修复
- 修复了删除`vector-service.js`后导致的模块导入错误
- 修复了TypeScript编译后的模块导出问题，解决了"VectorService is not a constructor"错误
- 解决了TypeScript文件编译后的导入问题
- 修复了向量数据库服务在开发环境下的启动问题
- 修复了向量嵌入处理时的`service.getProviderType is not a function`错误，为所有AI服务实现添加了getProviderType方法

## [未发布] - 2025-05-22

### 新增
- 在AI服务基础接口中添加createEmbedding方法支持
- 为OpenAI服务和OpenAI兼容服务实现embedding功能
- 支持使用OpenAI API生成文本嵌入向量
- 为AI模型添加嵌入模型标识，支持在UI中管理嵌入模型
- 自动为OpenAI和OpenAI兼容服务添加默认嵌入模型
- 优化向量嵌入服务，优先使用标记为嵌入模型的模型

### 修改
- 移除默认AI配置，当用户未配置AI时，使用空设置
- 添加AI配置检查机制，当需要使用AI功能但未配置时，自动提示用户进行配置
- 修改AI服务初始化流程，确保在AI服务未配置时不会尝试初始化
- 为各个使用AI功能的界面增加配置状态检查，提高用户体验
- 优化AI服务管理器，添加更严格的提供商ID有效性检查
- 统一向量数据库服务代码，删除重复的JavaScript文件，只保留TypeScript版本
- 完善TypeScript类型定义，修复所有类型错误，提高代码质量和可维护性

### 修复
- 修复了多处依赖default-openai配置的代码，彻底清除对默认OpenAI配置的依赖
- 改进了各组件的AI配置检查，确保所有组件在AI未配置时能正确提示用户
- 修复了AIEditorService、AIModelManager和AISettings组件中的初始化和测试连接逻辑
- 解决了AI服务管理器在未配置时仍尝试查找default-openai服务的问题
- 修复了AISettings组件中测试连接功能使用default-openai的问题
- 增强了AIAssistantPage的错误处理，在初始化失败时直接跳转到设置页面
- 修复了OpenAI兼容服务(openai_compatible)未正确注册到AI服务管理器的问题，导致找不到对应提供商服务实现
- 修复了AI场景设置(AIScenarioSettings)表单验证问题，现在未启用的场景不再要求填写提供商和模型
- 修复了OpenAI兼容服务API请求问题，正确处理baseURL和模型参数，解决400错误
- 增强了OpenAI兼容服务的错误处理和流式请求支持，添加了对siliconflow API的特殊处理
- 优化了OpenAI兼容服务的初始化逻辑，更精确地处理不同类型API的baseURL格式
- 添加了流式请求失败时自动回退到非流式请求的机制，提高了请求成功率
- 为siliconflow API添加了直接fetch请求方法，绕过OpenAI客户端库的限制，解决400错误问题
- 移除了可能导致URL参数错误的defaultQuery配置，确保请求URL格式正确
- 添加了模型ID映射功能，将本地UUID模型ID映射为标准模型名称，解决siliconflow API不识别UUID的问题
- 改进了向量数据库服务的进程管理，确保应用关闭时彻底清理Python进程
- 增强了stopPythonProcess方法，添加了端口占用检测和额外清理逻辑
- 修复了多个Python进程残留导致端口冲突的问题
- 修复了Windows平台下taskkill命令输出乱码问题
- 优化了进程终止逻辑，避免尝试终止系统关键进程(PID 0, 4等)
- 完善了端口占用检测和清理流程，提高了服务关闭的可靠性
- 彻底重构了进程终止逻辑，使用同步执行方式替代异步执行，解决乱码和进程查找问题
- 添加了更健壮的错误处理机制，能够正确处理"找不到进程"等常见错误情况
- 优化了端口占用检测逻辑，支持处理多个占用同一端口的进程
- 修复了AI助手聊天界面中的IPC处理器注册问题，确保调用registerAIHandlers函数
- 优化了聊天服务错误处理，当保存或获取聊天会话失败时不影响用户体验
- 增强了聊天界面的健壮性，当后端服务不可用时提供降级体验

## [未发布] - 2025-05-21

### 新增
- 添加命令行参数 `--dev-tools` 支持，允许在任何环境下通过命令行参数打开开发者工具

## [0.1.0] - 2023-05-13

### 新增
- 基本的Electron应用框架
- React前端界面
- SQLite数据库集成
- 小说管理基础功能
- 章节编辑基础功能

## [0.3.0] - 2023-08-15

### 新增
- 人物管理功能
- 地点管理功能
- 大纲管理功能
- 时间线管理功能

## [0.5.0] - 2023-08-30

### 新增
- 小说与人物、地点、大纲、时间线的关联功能
- 小说详情页关联内容标签页

## [0.7.0] - 2023-09-15

### 新增
- 人物关系图谱功能(D3.js可视化)
- 地点地图可视化功能

## [0.9.0] - 2023-11-30

### 新增
- AI服务架构设计
- 多API集成(OpenAI、DeepSeek、Ollama、LM Studio、OpenAI兼容API)
- 聊天会话管理
- 创作提示词系统
- AI场景配置与模型管理
- 数据备份与恢复功能

## [0.9.5] - 2024-05-20

### 新增
- 编辑器AI功能基础架构
- 编辑器AI服务
- 文本差异对比组件
- 编辑器AI面板组件

## [0.9.9] - 2024-06-01

### 新增
- 文本润色功能
- 文本续写功能
- 角色/地点创建功能
- 大纲修改功能
- 时间线添加功能

### 优化
- AI设置界面简化
- AI助手页面重新设计
- 编辑器AI面板简化
- 错误处理和操作反馈改进
- 按钮样式和交互模式统一

### 修复
- OpenAI兼容API设置中的重复默认模型字段问题
- 编辑器无法正确获取选中文本的问题
- 编辑器AI助手"AI服务未初始化"错误

## [0.1.0] - 2025-05-20

### 修复
- 修复了向量数据库服务依赖问题，移除了sentencepiece依赖
- 成功启动Chroma向量数据库服务，端口为8000
- 修复了主应用中vector-manager模块导入错误，重构为JavaScript版本

### 新增
- 初始化了向量数据库存储目录(resources/vector_db)
- 添加了向量数据库服务启动批处理脚本

## [0.1.0] - 2025-05-21

### 修复
- 修复了向量数据库服务依赖问题，移除了sentencepiece依赖
- 成功启动Chroma向量数据库服务，端口为8000
- 修复了主应用中vector-manager模块导入错误，重构为JavaScript版本
- 修复了 'get-novels' IPC处理器重复注册的问题
- 修复了统计相关IPC处理器未正确注册的问题，包括get-writing-activity和get-writing-time
- 优化了Dashboard组件，增加了错误处理以提高稳定性

### 新增
- 初始化了向量数据库存储目录(resources/vector_db)
- 添加了向量数据库服务启动批处理脚本
- 添加了写作时间估算功能

## [0.8.0] - 2023-11-15

### 新增
- 实现内容向量化系统
  - 创建向量化服务核心架构
  - 实现文本分块和处理策略
  - 集成词向量嵌入服务
  - 添加OpenAI/DeepSeek嵌入API支持
- 实现小说内容的向量化索引
  - 为每个章节创建向量化表示
  - 为章节中的场景和对话创建独立向量
  - 实现自动更新机制，在内容改变时更新向量
  - 创建向量缓存系统，提升查询性能
- 添加小说详情页中的"向量化章节"功能按钮

### 修改
- 优化向量嵌入服务，提升性能和稳定性
- 改进AI服务架构，支持向量化和检索功能

### 修复
- 修复AI设置中的服务初始化问题
- 解决向量数据库连接稳定性问题

## [未发布]

### 新增
- 向量化索引与上下文增强实现
  - 确定使用Chroma作为向量数据库
  - 开发Python Chroma服务，提供RESTful API
  - 实现向量数据库服务与Electron主进程集成
  - 完善VectorEmbeddingService，支持文本向量化及存储
  - 重构ContextSearchService，实现真实向量检索
- Embedding模型实现计划
- Agent架构实现计划

### 优化
- 富文本编辑器性能优化
- AI响应速度和稳定性优化
- 用户界面一致性与易用性改进
- 应用打包流程优化

### 修复
- 修复VectorEmbeddingService中的类型错误
  - 添加缺失的embedding字段，确保与vector字段保持一致
  - 修复元数据类型定义，使用Partial类型提高灵活性
  - 为必要的元数据字段提供默认值，确保类型安全
- 修复向量嵌入服务未初始化问题
  - 添加自动初始化功能，从服务管理器获取设置
  - 改进错误提示信息，提高调试便捷性
- 修复Python向量服务日志中文乱码问题
  - 设置stdout和stderr的编码为UTF-8
  - 优化日志处理器配置
- 修复Python向量服务端口冲突问题
  - 添加自动端口选择功能，当默认端口被占用时自动寻找可用端口
  - 改进端口检测机制，确保服务稳定启动
  - 优化服务启动流程，增强错误处理

## [0.3.1] - 2025-05-22

### 修改
- 改进了AI配置系统，不再使用默认的AI配置（default-openai）
- 修复了向量嵌入服务中的AI配置检查，确保用户先配置AI服务
- 修复了OpenAI兼容服务的嵌入请求处理，增加对特殊API的支持

### 修复
- 修复了向量数据库IPC处理器注册问题
- 修复了未配置AI服务时的错误提示

## [0.3.0] - 2025-05-15

## [2024-01-24] - 模型下载管理和用户体验改进

### 新增
- 添加了模型下载前的确认提示功能
- 创建了 ModelManager 组件用于管理AI嵌入模型
- 在AI设置页面添加了"嵌入模型"标签页
- 支持预下载模型以避免使用时的等待
- **智能embedding模型选择**：
  - 测试功能现在会自动检测用户配置的embedding模型
  - 优先使用在线API的embedding模型（如OpenAI、DeepSeek等）
  - 只有在未配置在线模型时才回退到本地模型下载
  - 在ModelManager中显示当前embedding模型配置状态

### 修改
- 改进了实体向量化测试的用户体验
- 为所有测试功能添加了明确的下载警告
- 优化了测试进度提示和错误处理
- 将对话模型和嵌入模型分开管理
- **优化了模型选择逻辑**：
  - 修改EntityVectorServiceTest以动态获取可用的embedding模型
  - 更新确认提示，说明可通过配置在线API避免下载
  - 改进模型配置检查，支持多种AI服务提供商

### 修复
- 解决了用户在不知情情况下被迫下载大文件的问题
- 改进了测试失败时的错误提示
- 修复了测试代码中硬编码OpenAI模型的问题
- 解决了AIProvider类型定义中models字段访问错误

## [2024-01-23] - 实体向量化系统完成