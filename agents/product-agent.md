# Product Agent

## 职责

分析产品信息，提取卖点，生成结构化产品数据。

## 输入

```json
{
  "product_name": "",
  "category": "",
  "price": "",
  "description": "",
  "target_country": ""
}
```

## 输出

```json
{
  "product_name": "",
  "benefits": [],
  "pain_points": [],
  "objections": [],
  "audience_persona": "",
  "country": "",
  "tone_suggestions": []
}
```

## 触发方式

输入 `分析产品` 或在 Claude Code 中提供产品链接/信息。
