# NovelAssist向量数据库服务

本目录包含NovelAssist的向量数据库服务，用于支持小说内容的向量化索引与检索，提供上下文增强、相似内容搜索等功能。

## 服务架构

- `chroma_server.py` - 向量数据库服务主程序，提供RESTful API
- `requirements.txt` - 依赖说明文件
- `install_deps.py` - 依赖安装脚本

## 依赖安装

### 先决条件

- Python 3.8 或更高版本
- pip 包管理器

### 自动安装

运行安装脚本：

```bash
# Windows
python install_deps.py

# Linux/Mac
python3 install_deps.py
```

### 手动安装

也可以手动安装依赖：

```bash
# Windows
pip install -r requirements.txt

# Linux/Mac
pip3 install -r requirements.txt
```

## 使用方法

### 独立启动服务

可以单独启动向量数据库服务进行测试：

```bash
# Windows
python chroma_server.py --host 127.0.0.1 --port 8765 --db-path ../resources/vector_db

# Linux/Mac
python3 chroma_server.py --host 127.0.0.1 --port 8765 --db-path ../resources/vector_db
```

参数说明：
- `--host` - 服务监听地址，默认为`127.0.0.1`
- `--port` - 服务监听端口，默认为`8000`
- `--db-path` - 向量数据库存储路径，默认为`../resources/vector_db`

### 通过应用启动（推荐）

正常情况下，向量数据库服务会随NovelAssist应用自动启动和关闭，无需手动操作。

## API说明

服务启动后，可以通过以下API进行调用：

- `GET /` - 服务状态检查
- `GET /health` - 健康检查
- `GET /collections` - 列出所有集合
- `POST /embed` - 创建单个文本的向量嵌入
- `POST /embed_batch` - 批量创建文本的向量嵌入
- `POST /query` - 查询相似向量
- `POST /delete` - 删除向量
- `DELETE /collection/{collection_name}` - 删除整个集合

## 故障排除

### 服务启动失败

1. 检查Python版本是否满足要求
2. 检查依赖是否安装成功
3. 检查端口是否被占用
4. 检查数据库路径是否存在且有写入权限

### 向量检索问题

1. 确保已正确创建和保存向量嵌入
2. 检查集合名称是否正确
3. 尝试使用更简单的查询文本
4. 检查错误日志了解详细信息

## 高级配置

### 环境变量

- `VECTOR_DB_PATH` - 设置向量数据库路径
- `OPENAI_API_KEY` - 设置OpenAI API密钥（用于OpenAI Embedding）

### 自定义Embedding函数

如需使用自定义Embedding函数，可修改`chroma_server.py`中的`default_ef`变量，实现自定义的文本向量化逻辑。 