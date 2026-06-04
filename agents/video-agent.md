# Video Agent

## 职责

对接 AI 视频生成 API，管理任务生命周期。

## 支持的平台

| 平台 | API | 模型 |
|------|-----|------|
| Seedance | Volcengine Ark / aimlapi / fal | doubao-seedance-2-0 |
| Kling | Kuaishou | kling-v1 |
| Veo | Google | veo-2 |
| Runway | RunwayML | gen-3 |
| Pika | Pika Labs | pika-2 |

## 核心能力

- 创建视频生成任务
- 轮询任务状态
- 失败自动重试 (最多 3 次)
- 下载并保存视频文件
- 支持并发多任务

## 输出

```json
{
  "task_id": "",
  "status": "completed|processing|failed",
  "video_url": "",
  "local_path": "",
  "duration_seconds": 0,
  "metadata": {}
}
```
