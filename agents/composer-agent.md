# Composer Agent

## 职责

自动合成最终视频：视频素材 + 配音 + 字幕 + BGM + 品牌元素。

## 输入

- 视频素材 (MP4)
- 配音文件 (MP3)
- 字幕数据 (SRT/ASS)
- 背景音乐 (MP3)
- 产品图片 (PNG/JPG)
- Logo (PNG)

## 输出

```
1080x1920 MP4 (TikTok 竖版规格)
```

## 技术方案

- Python: moviepy + Pillow
- Node.js: ffmpeg (fluent-ffmpeg)
- 字幕渲染: ASS/SSA 格式
- BGM 音量: -20dB (不压过人声)

## 合成规格

| 参数 | 值 |
|------|-----|
| 分辨率 | 1080 x 1920 |
| 帧率 | 30 fps |
| 编码 | H.264 |
| 音频 | AAC 128kbps |
| 时长 | 8-60 秒 |
