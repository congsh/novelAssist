# 向量服务进程终止和日志乱码问题修复

## 问题描述

在Windows系统下，向量数据库服务的Python进程在应用关闭时存在以下问题：

1. **进程无法正常终止**：taskkill命令执行失败，提示"找不到该进程"
2. **日志输出乱码**：Windows命令行输出的中文字符显示为乱码字符（如：����）

## 问题原因分析

### 1. 进程终止问题
- 原代码使用异步执行taskkill命令，但没有正确处理进程已自然退出的情况
- 缺少进程存在性检查，尝试终止已经退出的进程
- 错误处理不够完善，对于正常的"找不到进程"错误也显示为异常

### 2. 日志乱码问题
- Windows系统默认使用GBK/CP936编码，而代码中使用UTF-8编码解析命令输出
- execSync的encoding参数设置为'utf8'，无法正确处理中文字符
- 缺少适当的编码转换机制

## 解决方案

### 1. 改进进程终止逻辑

#### 分离进程检查和终止步骤
```typescript
private forceKillProcess(pid: number): void {
  // 首先检查进程是否还存在
  try {
    const checkResult = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { 
      encoding: 'buffer',
      windowsHide: true,
      timeout: 3000
    });
    
    const checkOutput = this.decodeWindowsOutput(checkResult);
    
    if (!checkOutput || checkOutput.includes('没有运行的任务匹配指定标准')) {
      logger.info(`进程 ${pid} 已经不存在，无需强制终止`);
      return;
    }
  } catch (checkError) {
    // 检查失败，继续尝试终止
  }
  
  // 执行强制终止
  // ...
}
```

#### 优化错误处理
```typescript
if (taskKillError.status === 128 || 
    errorOutput.includes('没有找到该进程') || 
    errorStderr.includes('没有找到该进程')) {
  logger.info(`进程 ${pid} 已经终止`);
} else {
  logger.warn(`强制终止进程失败: ${taskKillError.message}`);
}
```

### 2. 解决编码问题

#### 使用Buffer编码
将execSync的encoding参数从'utf8'改为'buffer'，然后使用专门的解码函数处理：

```typescript
const stdoutBuffer = execSync(`command`, { 
  encoding: 'buffer',
  windowsHide: true,
  timeout: 3000
});

const stdout = this.decodeWindowsOutput(stdoutBuffer);
```

#### 实现中文编码解码函数
```typescript
private decodeWindowsOutput(buffer: Buffer): string {
  if (!buffer || buffer.length === 0) return '';
  
  try {
    // 尝试使用 GBK 编码解码（Windows中文系统默认编码）
    const iconv = require('iconv-lite');
    if (iconv.encodingExists('gbk')) {
      return iconv.decode(buffer, 'gbk');
    }
  } catch (error) {
    // fallback到其他方法
  }
  
  // fallback机制
  return buffer.toString('utf8');
}
```

### 3. 增强进程管理健壮性

#### 添加等待时间
给进程自然退出预留足够时间：
```typescript
// 等待一段时间让进程自然退出
setTimeout(() => {
  this.forceKillProcess(pid);
}, 2000);
```

#### 延长清理检查时间
```typescript
setTimeout(() => {
  this.checkAndCleanPort(this.actualPort);
}, 3000);
```

## 修复效果

### 修复前
```
[1] 正在终止Python进程，PID: 17960
[1] 已发送终止信号到进程 17960
[1] ����: û���ҵ����� "17960"��
[1] taskkill执行出错: Command failed: taskkill /pid 17960 /f /t
[1] ����: û���ҵ����� "17960"��
```

### 修复后
```
[1] 正在终止Python进程，PID: 17960
[1] 已发送终止信号到进程 17960
[1] 进程 17960 已经不存在，无需强制终止
[1] 端口 8765 已释放
[1] 向量数据库服务已停止
```

## 依赖变更

添加了`iconv-lite`依赖来支持中文编码转换：

```json
{
  "dependencies": {
    "iconv-lite": "^0.6.3"
  }
}
```

## 测试验证

可以使用以下脚本验证修复效果：

```bash
node scripts/test-vector-service.js
```

该脚本会启动向量服务，等待5秒后停止，并检查进程清理和日志输出情况。

## 相关文件

修改的主要文件：
- `src/main/database/vector/vector-service.ts` - 核心修复代码
- `package.json` - 添加iconv-lite依赖
- `CHANGELOG.md` - 修复记录

## 注意事项

1. 该修复专门针对Windows系统，对其他平台无影响
2. 使用了iconv-lite库进行编码转换，如果该库不可用会fallback到默认方法
3. 增加了更多的错误处理和日志输出，便于问题定位
4. 修复后进程终止将更加可靠，减少端口冲突问题 