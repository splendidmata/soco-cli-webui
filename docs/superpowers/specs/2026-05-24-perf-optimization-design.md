# SonoRadio 全面优化设计规格

日期: 2026-05-24
状态: 已批准

## 目标

对 SonoRadio Web UI 进行性能、代码质量和 UI/UX 全面优化，降低带宽消耗、提升响应速度、提高代码可维护性。

## 优化项

### P1: 轮询改轻量 JSON API

**现状:** 每秒 `fetch('/')` 拉完整 HTML（~14KB）→ DOMParser 解析 → 逐元素对比 DOM 更新。

**变更:**

1. 新增后端端点 `GET /api/poll`，返回 JSON:

```json
{
  "speakers": [{"name", "state", "track", "artist", "volume", "mute", "cross_fade", "sleep_timer"}],
  "sleep_timer": {"active", "seconds", "display"},
  "radio_count": 12
}
```

2. 前端新增 `pollState()` 函数，直接用 JSON 更新 DOM，替代 `refreshPagePartial()` 的 HTML 解析方式。
3. 页面首次加载仍用 `GET /` 返回完整 HTML，之后的轮询用 `/api/poll`。

**收益:** 带宽从 14KB/秒 → ~2KB/秒（降低 85%），消除 DOMParser 开销。

### P2: JS API 通用封装 + 防重复提交

**现状:** `toggleMute`、`toggleCrossfade`、`setSleepTimer` 等函数 fetch 结构几乎一样，各自独立实现。

**变更:**

1. 抽取通用 `apiCall(endpoint, method)` 函数，内置全局 `apiPending` 锁。
2. 轮询时检查 `apiPending`，API 请求进行中时跳过轮询。
3. 各操作函数简化为调用 `apiCall()` + 更新 UI 回调。

**收益:** 消除重复代码 ~200 行，防止并发操作冲突。

### P3: 后端扬声器发现缓存 5 秒

**现状:** 每次请求都 `discover()` 扬声器，耗时且对 Sonos 设备造成不必要的查询。

**变更:**

1. 新增 `_speaker_cache` 字典，包含 `timestamp` 和 `data`。
2. `get_cached_speakers()` 5 秒内复用缓存。
3. `/api/poll` 用缓存结果。

**收益:** Sonos 设备查询频率从 1 次/请求 → 1 次/5秒。

### P4: 静态资源 HTTP 缓存头

**现状:** CSS/JS 有 `?v=` 时间戳防缓存，但缺少 HTTP 缓存头。

**变更:**

1. `@app.after_request` 为 `/static/` 路径添加 `Cache-Control: public, max-age=86400`。
2. 配合已有的 `?v=` 版本号，浏览器可安全缓存 24 小时。

**收益:** CSS/JS 首次加载后 24 小时内无需重新传输。

### P5: CSS/JS 按功能模块拆分

**现状:** `style.css` 1053 行、`main.js` 776 行，全部阻塞首屏。

**变更:**

1. 提取关键 CSS（布局、头部、卡片、底部播放器基础样式）→ `critical.css` 内联到 `<head>`。
2. 完整 `style.css` 异步加载（`media="print" onload` 技巧）。
3. JS 拆分为 ES modules:
   - `core.js`: DOMContentLoaded、主题切换、轮询启动
   - `player.js`: 播放控制、音量、mute、crossfade
   - `radio.js`: 电台库、自定义 URL
   - `sleep-timer.js`: 睡眠定时器

**收益:** 首屏阻塞资源从 ~55KB → ~15KB，FCP 显著提升。

## 文件变更摘要

| 文件 | 操作 | 预计行数变化 |
|------|------|------------|
| `web_ui.py` | 新增 `/api/poll`、缓存、缓存头 | +60 |
| `static/css/critical.css` | 新建，从 style.css 提取 | +200 |
| `static/css/style.css` | 移除已提取的关键样式 | -200 |
| `static/js/core.js` | 新建，通用 API + 轮询逻辑 | +80 |
| `static/js/player.js` | 新建，播放控制逻辑 | +150 |
| `static/js/radio.js` | 新建，电台库逻辑 | +200 |
| `static/js/sleep-timer.js` | 新建，睡眠定时器逻辑 | +120 |
| `static/js/main.js` | 移除已拆分的逻辑 | -700 |
| `templates/index.html` | 更新 script/css 引用、内联 critical CSS | +10 |

## 不变的部分

- Flask 框架不变（不引入 Flask-SocketIO 等新依赖）
- 不引入前端构建工具（保持原生 JS）
- HTML 模板结构不变
- API 接口向后兼容

## 测试要点

- `/api/poll` 返回 JSON 格式正确
- 页面首次加载正常显示
- 轮询更新时 DOM 状态正确同步
- 防重复提交锁生效
- 静态资源缓存头正确
- 模块化 JS 无加载顺序问题
