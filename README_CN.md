# SonoRadio - Sonos 扬声器 Web 控制界面

## 项目简介

SonoRadio 是一个基于 Flask 的 Web UI 界面，用于控制 Sonos 扬声器系统。它提供了直观的用户界面，允许您：

- 查看扬声器状态
- 控制播放（播放/暂停/上一曲/下一曲/停止）
- 调整音量和静音
- 管理自定义广播电台库
- 播放自定义 URL（支持 Tidal/Spotify 分享链接）
- 多房间独立控制
- 睡眠定时器功能
- 切换深色/浅色主题

## 功能特点

### 播放控制
- ▶ 播放/暂停切换
- ◀◀ 上一曲
- ▶▶ 下一曲
- ■ 停止播放
- 🔇/🔊 静音切换
- 扬声器选择器（多房间独立控制）

### 音量控制
- 滑块调节（带颗粒感）
- 加减按钮微调（步进1）
- 静音时自动禁用控件
- 自动同步音量状态显示
- 连续点击防抖优化

### 广播库管理
- 查看电台列表
- 添加新电台（标题和URL）
- 编辑已有电台
- 删除电台
- 快速选择播放（可指定目标扬声器）
- 添加/删除后自动刷新列表

### 自定义 URL 播放
- 支持直接 URI 播放
- 自动识别 Tidal/Spotify 分享链接
- 可选择目标扬声器

### 睡眠定时器
- ⏱️ 预设时间按钮（15分钟/30分钟/1小时/2小时）
- 实时倒计时显示
- 一键取消定时
- 本地倒计时优化（避免频繁请求）

### 主题切换
- 🌙 深色模式（默认）
- ☀️ 浅色模式
- 自动保存主题偏好
- 无感切换（CSS 变量过渡动画）

### 响应式设计
- 支持桌面端和移动端
- 移动端优化的触控体验（大按钮、细长滑块）
- 固定底部播放栏
- PWA 支持（可添加至桌面）

## 安装与运行

### 环境要求
- Python 3.7+
- Flask
- soco 库
- 其他依赖见 requirements.txt

### 安装依赖
```bash
pip install -r requirements.txt
```

### 启动服务
```bash
python web_ui.py
```

服务将在 `http://0.0.0.0:8888` 启动，允许局域网内的设备访问。

### mDNS 配置（可选）
配置 mDNS 后可通过 `sonoradio.local` 访问服务，无需记忆 IP 地址。详见 `deploy_armbian.md`。

## 使用说明

### 访问界面
在浏览器中打开 `http://<服务器IP>:8888` 或 `http://sonoradio.local:8888`（需配置 mDNS）

### 播放控制
1. 在底部播放栏选择目标扬声器
2. 点击控制按钮操作播放状态
3. 使用音量滑块或加减按钮调整音量
4. 点击静音按钮切换静音状态

### 多房间控制
1. 在播放控制区域、广播库或自定义 URL 弹窗中选择目标扬声器
2. 所有操作都会指定到所选扬声器
3. 设备上下线时自动重新匹配（按名称匹配）

### 广播库管理
1. 在广播库面板选择电台
2. 选择目标扬声器后点击播放
3. 使用"添加新电台"按钮添加自定义电台
4. 使用编辑/删除按钮管理电台（自动刷新）

### 睡眠定时器
1. 点击预设时间按钮设置定时关闭
2. 查看实时倒计时显示
3. 点击"取消定时"按钮取消定时

### 主题切换
点击右上角的 🌙/☀️ 按钮切换深色/浅色模式（平滑过渡）

## 文件结构

```
soco-cli-master/
├── web_ui.py              # Flask 应用主文件
├── db/
│   └── radio_stations.db  # SQLite 数据库（电台库）
├── deploy_armbian.md      # Armbian 部署指南
├── templates/
│   └── index.html         # Web UI 模板
├── static/
│   ├── css/
│   │   └── style.css      # 样式文件
│   ├── js/
│   │   └── main.js        # 脚本文件
│   ├── icon.svg           # 网站图标（SVG）
│   ├── icon-180.png       # 桌面图标（PNG，用于 Safari PWA）
│   └── manifest.json      # PWA 配置文件
└── requirements.txt       # 依赖列表
```

## API 接口

### 获取扬声器状态
```
GET /api/speakers
```

### 播放控制（支持多房间）
```
POST /api/speaker/<speaker_name>/play
POST /api/speaker/<speaker_name>/pause
POST /api/speaker/<speaker_name>/stop
POST /api/speaker/<speaker_name>/previous
POST /api/speaker/<speaker_name>/next
```

### 音量控制（支持多房间）
```
POST /api/speaker/<speaker_name>/volume/<level>
POST /api/speaker/<speaker_name>/mute
POST /api/speaker/<speaker_name>/unmute
```

### 播放自定义 URL（支持多房间）
```
POST /api/speaker/<speaker_name>/play_url
Content-Type: application/json
{"url": "http://example.com/stream.mp3"}
```
支持直接 URI 和 Tidal/Spotify 分享链接。

### 睡眠定时器（支持多房间）
```
GET /api/speaker/<speaker_name>/sleep_timer
POST /api/speaker/<speaker_name>/sleep_timer
{"action": "set", "duration": "15m"}  # 设置定时
{"action": "cancel"}                   # 取消定时
```

### 电台库管理
```
GET /api/radio_stations      # 获取所有电台
POST /api/radio_stations     # 添加新电台
PUT /api/radio_stations/<id> # 更新电台
DELETE /api/radio_stations/<id> # 删除电台
```

## 部署到 Armbian

如需将应用部署为系统服务，包括：
- Gunicorn 生产部署
- mDNS 配置（sonoradio.local）
- logrotate 日志自动轮转

请参考 `deploy_armbian.md` 文件。

## 许可证

MIT License

---

**注意**: 本项目是 SoCo-CLI 的 Web UI 扩展，用于控制本地网络中的 Sonos 扬声器系统。