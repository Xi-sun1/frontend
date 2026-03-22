# 情绪音乐推荐系统后端API文档

## 1. 接口概述

本文档定义了情绪音乐推荐系统所需的后端API接口，用于接收前端的情绪检测结果，并返回根据情绪推荐的音乐列表。

## 2. 接口详情

### 2.1 情绪音乐推荐接口

**接口路径**: `/api/music/recommend`

**请求方法**: `POST`

**功能描述**: 根据用户当前情绪状态推荐适合的音乐

**请求参数**:

| 参数名 | 类型 | 必填 | 描述 | 示例值 |
|--------|------|------|------|--------|
| emotion | string | 是 | 用户当前情绪状态，支持的情绪值：happy,excited（开心）、sad（悲伤）、calm（平静） | "happy,excited" |
| confidence | number | 是 | 情绪检测的置信度，范围0-1 | 0.85 |
| userId | string | 否 | 用户ID，用于个性化推荐 | "user123" |

**请求示例**:

```json
{
  "emotion": "happy,excited",
  "confidence": 0.85,
  "userId": "user123"
}
```

**其他情绪类型请求示例**:

```json
// 悲伤情绪
{
  "emotion": "sad",
  "confidence": 0.85,
  "userId": "user123"
}

// 平静情绪
{
  "emotion": "calm",
  "confidence": 0.85,
  "userId": "user123"
}
```

**响应参数**:

| 参数名 | 类型 | 描述 |
|--------|------|------|
| code | number | 响应状态码，200表示成功，其他表示失败 |
| message | string | 响应消息 |
| data | object | 响应数据 |
| data.recommendedSongs | array | 推荐的音乐列表 |
| data.recommendedSongs[].id | string | 音乐ID |
| data.recommendedSongs[].title | string | 音乐标题 |
| data.recommendedSongs[].artist | string | 音乐艺术家 |
| data.recommendedSongs[].cover | string | 音乐封面图片URL |
| data.recommendedSongs[].url | string | 音乐播放URL |
| data.recommendedSongs[].duration | number | 音乐时长（秒） |
| data.recommendedSongs[].emotion | string | 音乐适合的情绪 |

**响应示例**:

```json
{
  "code": 200,
  "message": "推荐成功",
  "data": {
    "recommendedSongs": [
      {
        "id": "song001",
        "title": "Happy Day",
        "artist": "John Doe",
        "cover": "https://example.com/covers/happy1.jpg",
        "url": "https://example.com/songs/happy1.mp3",
        "duration": 210,
        "emotion": "happy"
      },
      {
        "id": "song002",
        "title": "Sunshine",
        "artist": "Jane Smith",
        "cover": "https://example.com/covers/happy2.jpg",
        "url": "https://example.com/songs/happy2.mp3",
        "duration": 180,
        "emotion": "happy"
      }
    ]
  }
}
```

### 2.2 音乐详情接口

**接口路径**: `/api/music/{id}`

**请求方法**: `GET`

**功能描述**: 获取指定音乐的详细信息

**路径参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| id | string | 是 | 音乐ID |

**响应参数**:

| 参数名 | 类型 | 描述 |
|--------|------|------|
| code | number | 响应状态码，200表示成功，其他表示失败 |
| message | string | 响应消息 |
| data | object | 音乐详细信息 |
| data.id | string | 音乐ID |
| data.title | string | 音乐标题 |
| data.artist | string | 音乐艺术家 |
| data.cover | string | 音乐封面图片URL |
| data.url | string | 音乐播放URL |
| data.duration | number | 音乐时长（秒） |
| data.emotion | string | 音乐适合的情绪 |
| data.lyrics | string | 音乐歌词（可选） |

**响应示例**:

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "song001",
    "title": "Happy Day",
    "artist": "John Doe",
    "cover": "https://example.com/covers/happy1.jpg",
    "url": "https://example.com/songs/happy1.mp3",
    "duration": 210,
    "emotion": "happy",
    "lyrics": "It's a happy day, let's sing and play..."
  }
}
```

## 3. 情绪映射规则

后端应根据以下情绪映射规则进行音乐推荐：

| 前端情绪值 | 后端接收值 | 推荐音乐类型 |
|-----------|-----------|-------------|
| 😊 开心 | happy,excited | 欢快、积极的音乐，包括 happy 和 excited 类型 |
| 😢 悲伤 | sad | 舒缓、忧郁的音乐，sad 类型 |
| 😐 平静 | calm | 轻松、冥想的音乐，calm 类型 |

## 4. 错误处理

后端应返回适当的错误码和错误信息，以便前端进行相应的处理：

| 错误码 | 错误信息 | 描述 |
|--------|----------|------|
| 400 | 参数错误 | 请求参数不符合要求 |
| 404 | 未找到资源 | 请求的音乐不存在 |
| 500 | 服务器内部错误 | 服务器处理请求时发生错误 |

## 5. 性能要求

- 情绪推荐接口响应时间应在500ms以内
- 系统应支持并发请求
- 推荐算法应考虑用户的历史听歌记录（如果有）

## 6. 安全要求

- 接口应进行适当的参数验证，防止恶意请求
- 敏感操作应进行身份验证
- 应限制请求频率，防止滥用

## 7. 部署要求

- 后端服务应部署在可访问的服务器上
- 应提供API文档和测试工具
- 应支持版本控制，便于后续功能扩展
