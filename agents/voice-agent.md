# Voice Agent

## 职责

生成多语言 TTS 配音，支持多种 TTS 引擎。

## 支持的引擎

| 引擎 | 语言支持 | 特点 |
|------|---------|------|
| ElevenLabs | EN, ES | 最自然，多音色 |
| OpenAI TTS | EN, ES, MS | 性价比高 |
| Azure TTS | EN, MS, TH, FIL, ES | 亚洲语言最佳 |

## 输出格式

- MP3 / WAV
- 可调语速
- 支持 SSML 标记

## 配置

```json
{
  "engine": "azure",
  "language": "en",
  "voice_id": "en-US-JennyNeural",
  "speed": 1.0,
  "output_format": "mp3"
}
```
