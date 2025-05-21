#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Chroma向量数据库服务
提供RESTful API接口，用于向量的插入、检索和删除操作
"""

import os
import json
import logging
import argparse
from typing import List, Dict, Any, Optional
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# 尝试导入Chroma相关依赖
try:
    import chromadb
    from chromadb.config import Settings
    from chromadb.utils import embedding_functions
except ImportError:
    print("请先安装chromadb: pip install chromadb")
    raise

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title="NovelAssist Vector Database API",
    description="小说辅助创作工具的向量数据库服务API",
    version="0.1.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 定义API数据模型
class EmbeddingItem(BaseModel):
    id: str
    text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    embedding: Optional[List[float]] = None

class EmbeddingBatchItem(BaseModel):
    ids: List[str]
    texts: List[str]
    metadatas: List[Dict[str, Any]] = None
    embeddings: Optional[List[List[float]]] = None

class QueryItem(BaseModel):
    query_text: str
    n_results: int = 5
    where: Dict[str, Any] = None
    embedding: Optional[List[float]] = None

class DeleteItem(BaseModel):
    ids: Optional[List[str]] = None
    where: Optional[Dict[str, Any]] = None

# 全局变量
VECTOR_DB_PATH = None
chroma_client = None
openai_ef = None
default_ef = None
collections = {}

@app.on_event("startup")
async def startup_db_client():
    """初始化chromadb客户端和embedding功能"""
    global VECTOR_DB_PATH, chroma_client, openai_ef, default_ef, collections
    
    # 设置向量数据库路径
    VECTOR_DB_PATH = os.environ.get("VECTOR_DB_PATH", os.path.abspath("../resources/vector_db"))
    logger.info(f"使用向量数据库路径: {VECTOR_DB_PATH}")
    
    # 创建目录（如果不存在）
    os.makedirs(VECTOR_DB_PATH, exist_ok=True)
    
    # 初始化chromadb客户端
    chroma_client = chromadb.PersistentClient(
        path=VECTOR_DB_PATH,
        settings=Settings(
            anonymized_telemetry=False
        )
    )
    
    # 初始化embedding函数
    # OpenAI embedding函数（需要API密钥）
    # 注意：实际使用时需要从环境变量或配置文件获取API密钥
    openai_api_key = os.environ.get("OPENAI_API_KEY", "")
    if openai_api_key:
        try:
            openai_ef = embedding_functions.OpenAIEmbeddingFunction(
                api_key=openai_api_key,
                model_name="text-embedding-ada-002"
            )
            logger.info("已初始化OpenAI embedding函数")
        except Exception as e:
            logger.warning(f"初始化OpenAI embedding函数失败: {e}")
            openai_ef = None
    
    # 默认的embedding函数（可替换为其他本地模型）
    default_ef = embedding_functions.DefaultEmbeddingFunction()
    logger.info("已初始化默认embedding函数")
    
    logger.info("Chroma向量数据库服务启动完成")

@app.on_event("shutdown")
async def shutdown_db_client():
    """关闭数据库连接"""
    global chroma_client, collections
    collections = {}
    chroma_client = None
    logger.info("Chroma向量数据库服务已关闭")

def get_collection(collection_name: str, embedding_function=None):
    """获取或创建一个collection"""
    global chroma_client, collections
    
    if collection_name not in collections:
        try:
            # 尝试获取已存在的collection
            collections[collection_name] = chroma_client.get_collection(
                name=collection_name,
                embedding_function=embedding_function or default_ef
            )
            logger.info(f"已获取collection: {collection_name}")
        except Exception as e:
            # 如果不存在则创建新的collection
            collections[collection_name] = chroma_client.create_collection(
                name=collection_name,
                embedding_function=embedding_function or default_ef
            )
            logger.info(f"已创建新的collection: {collection_name}")
    
    return collections[collection_name]

@app.get("/")
async def root():
    """API根路径"""
    return {"status": "ok", "message": "NovelAssist向量数据库服务运行中"}

@app.get("/collections")
async def list_collections():
    """列出所有collections"""
    collections_list = chroma_client.list_collections()
    return {"collections": [c.name for c in collections_list]}

@app.post("/embed")
async def create_embedding(item: EmbeddingItem, collection_name: str = "default"):
    """创建单个文本的向量嵌入并存储"""
    try:
        collection = get_collection(collection_name)
        
        # 如果没有提供embedding，则使用collection的embedding函数生成
        if not item.embedding:
            collection.add(
                ids=[item.id],
                documents=[item.text],
                metadatas=[item.metadata]
            )
        else:
            collection.add(
                ids=[item.id],
                embeddings=[item.embedding],
                documents=[item.text],
                metadatas=[item.metadata]
            )
        
        return {"status": "success", "message": f"已将文本向量化并添加到{collection_name}"}
    except Exception as e:
        logger.error(f"创建向量嵌入失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed_batch")
async def create_embeddings_batch(item: EmbeddingBatchItem, collection_name: str = "default"):
    """批量创建文本的向量嵌入并存储"""
    try:
        collection = get_collection(collection_name)
        
        # 检查输入数据长度是否一致
        if len(item.ids) != len(item.texts):
            raise HTTPException(status_code=400, detail="ids和texts的长度必须一致")
        
        # 如果没有提供metadata，则创建一个空列表
        metadatas = item.metadatas if item.metadatas else [{}] * len(item.ids)
        
        # 如果没有提供embeddings，则使用collection的embedding函数生成
        if not item.embeddings:
            collection.add(
                ids=item.ids,
                documents=item.texts,
                metadatas=metadatas
            )
        else:
            # 检查embeddings长度是否一致
            if len(item.embeddings) != len(item.ids):
                raise HTTPException(status_code=400, detail="embeddings和ids的长度必须一致")
            
            collection.add(
                ids=item.ids,
                embeddings=item.embeddings,
                documents=item.texts,
                metadatas=metadatas
            )
        
        return {"status": "success", "message": f"已批量添加{len(item.ids)}个向量到{collection_name}"}
    except Exception as e:
        logger.error(f"批量创建向量嵌入失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_similar(query: QueryItem, collection_name: str = "default"):
    """查询相似向量"""
    try:
        collection = get_collection(collection_name)
        
        # 查询参数
        query_params = {
            "n_results": query.n_results
        }
        
        # 添加过滤条件（如果有）
        if query.where:
            query_params["where"] = query.where
        
        # 如果提供了embedding则使用，否则使用文本查询
        if query.embedding:
            results = collection.query(
                query_embeddings=[query.embedding],
                **query_params
            )
        else:
            results = collection.query(
                query_texts=[query.query_text],
                **query_params
            )
        
        # 处理结果，将其转换为更易于前端使用的格式
        processed_results = []
        
        # 假设只有一组查询结果（因为我们只查询了一个文本/向量）
        for i in range(len(results["ids"][0])):
            item = {
                "id": results["ids"][0][i],
                "text": results["documents"][0][i] if results["documents"] and results["documents"][0] else None,
                "metadata": results["metadatas"][0][i] if results["metadatas"] and results["metadatas"][0] else {},
                "distance": results["distances"][0][i] if results["distances"] and results["distances"][0] else None
            }
            processed_results.append(item)
        
        return {
            "status": "success",
            "results": processed_results,
            "count": len(processed_results)
        }
    except Exception as e:
        logger.error(f"查询相似向量失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/delete")
async def delete_embeddings(delete_item: DeleteItem, collection_name: str = "default"):
    """删除向量"""
    try:
        collection = get_collection(collection_name)
        
        # 按ID删除
        if delete_item.ids:
            collection.delete(ids=delete_item.ids)
            return {"status": "success", "message": f"已从{collection_name}中删除{len(delete_item.ids)}个向量"}
        
        # 按条件删除
        elif delete_item.where:
            collection.delete(where=delete_item.where)
            return {"status": "success", "message": f"已从{collection_name}中删除符合条件的向量"}
        
        else:
            raise HTTPException(status_code=400, detail="必须提供ids或where参数")
    except Exception as e:
        logger.error(f"删除向量失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/collection/{collection_name}")
async def delete_collection(collection_name: str):
    """删除整个collection"""
    try:
        global collections
        
        chroma_client.delete_collection(name=collection_name)
        
        # 从缓存中移除
        if collection_name in collections:
            del collections[collection_name]
        
        return {"status": "success", "message": f"已删除collection: {collection_name}"}
    except Exception as e:
        logger.error(f"删除collection失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok"}

if __name__ == "__main__":
    # 命令行参数
    parser = argparse.ArgumentParser(description="启动NovelAssist向量数据库服务")
    parser.add_argument("--host", default="127.0.0.1", help="主机IP")
    parser.add_argument("--port", type=int, default=8000, help="端口号")
    parser.add_argument("--db-path", default=None, help="向量数据库路径")
    args = parser.parse_args()
    
    # 设置数据库路径环境变量
    if args.db_path:
        os.environ["VECTOR_DB_PATH"] = args.db_path
    
    # 启动服务
    uvicorn.run(app, host=args.host, port=args.port) 