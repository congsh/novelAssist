#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Python依赖安装脚本
用于安装向量数据库服务所需的依赖
"""

import os
import sys
import subprocess
import platform

def get_pip_cmd():
    """获取合适的pip命令"""
    if os.name == 'nt':  # Windows
        return 'pip'
    else:  # Linux/Mac
        return 'pip3'

def install_dependencies():
    """安装向量数据库服务所需的依赖"""
    print("开始安装依赖...")
    
    pip_cmd = get_pip_cmd()
    
    # 获取当前脚本目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    requirements_path = os.path.join(script_dir, 'requirements.txt')
    
    # 检查requirements.txt是否存在
    if not os.path.exists(requirements_path):
        print(f"错误: 找不到依赖文件 {requirements_path}")
        return False
    
    try:
        # 执行pip安装命令
        cmd = [pip_cmd, 'install', '-r', requirements_path]
        print(f"执行命令: {' '.join(cmd)}")
        
        process = subprocess.run(cmd, check=True, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        
        # 输出安装结果
        print(process.stdout)
        
        print("依赖安装完成!")
        return True
    
    except subprocess.CalledProcessError as e:
        print(f"安装依赖失败: {e}")
        print(f"错误信息: {e.stderr}")
        return False

def check_python_version():
    """检查Python版本"""
    required_major = 3
    required_minor = 8
    
    current_major = sys.version_info.major
    current_minor = sys.version_info.minor
    
    if current_major < required_major or (current_major == required_major and current_minor < required_minor):
        print(f"错误: 需要Python {required_major}.{required_minor}或更高版本")
        print(f"当前Python版本: {sys.version}")
        return False
    
    print(f"Python版本检查通过: {sys.version}")
    return True

def main():
    """主函数"""
    print("=" * 60)
    print("NovelAssist向量数据库服务依赖安装")
    print("=" * 60)
    
    print(f"操作系统: {platform.system()} {platform.release()}")
    
    # 检查Python版本
    if not check_python_version():
        sys.exit(1)
    
    # 安装依赖
    if not install_dependencies():
        sys.exit(1)
    
    print("\n依赖安装成功!")
    print("你现在可以运行 chroma_server.py 来启动向量数据库服务")
    print("=" * 60)

if __name__ == "__main__":
    main() 