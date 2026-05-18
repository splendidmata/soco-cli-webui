# SonoRadio - Sonos 扬声器 Web 控制界面

![SonoRadio](https://github.com/splendidmata/soco-cli-webui/assets/xxx/xxx)

## 项目简介

SonoRadio 是一个基于 Flask 的 Sonos 扬声器 Web 控制界面，提供直观的用户界面来控制您的 Sonos 音响系统。

**核心功能：**
- 🎵 播放控制（播放/暂停/上一曲/下一曲）
- 🔊 音量控制（滑块 + 按钮）
- 📻 广播库管理（增删改查电台）
- 🏠 多房间独立控制
- ⏱️ 睡眠定时器（15m/30m/1h/2h）
- 🌙 深色/浅色主题切换
- 📱 响应式设计（桌面 + 移动端）

## 快速开始

### 🐳 Docker 一键部署（推荐）

**OpenWRT / Linux 主机：**

```bash
# 创建数据目录
mkdir -p /opt/sonoradio/db

# 启动容器（host 网络模式，推荐）
docker run -d \
  --name sonoradio \
  --network host \
  --restart unless-stopped \
  -v /opt/sonoradio/db:/app/db \
  splendidmata/sonoradio
```

**macOS / Windows（桥接模式）：**

```bash
docker run -d \
  --name sonoradio \
  --restart unless-stopped \
  -p 8888:8888 \
  -v $(pwd)/db:/app/db \
  splendidmata/sonoradio
```

### 访问服务

启动后在浏览器中访问：

```
http://<您的主机IP>:8888
```

## 网络配置说明

**⚠️ 重要：Sonos 设备发现依赖局域网广播，Docker 容器需要访问本地网络。**

### 推荐：host 模式（Linux / OpenWRT）

使用 `--network host` 模式，容器直接使用主机网络栈，能够完美发现局域网内的 Sonos 扬声器。

### 桥接模式（macOS / Windows）

macOS 和 Windows 的 Docker Desktop 使用虚拟机，host 模式可能无法正常工作。建议使用桥接模式并映射端口。

### mDNS 配置（可选）

配置后可通过 `sonoradio.local` 访问：

```bash
# Debian/Ubuntu/OpenWRT
opkg update && opkg install avahi-daemon
echo 'sonoradio' > /etc/avahi/hosts
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 8888 | 服务端口 |
| `TZ` | UTC | 时区设置 |

## 手动安装运行

```bash
# 克隆项目
git clone https://github.com/splendidmata/soco-cli-webui.git
cd soco-cli-webui

# 安装依赖
pip install -r requirements.txt

# 创建数据库目录
mkdir -p db

# 启动服务
python web_ui.py
```

## 目录结构

```
soco-cli-webui/
├── web_ui.py              # Flask 主程序
├── db/                    # 数据库目录
│   └── radio_stations.db  # 电台数据库
├── static/                # 静态资源
│   ├── css/style.css      # 样式文件
│   └── js/main.js         # 脚本文件
├── templates/             # HTML 模板
│   └── index.html         # 主页面
└── requirements.txt       # 依赖列表
```

## API 接口

### 获取扬声器状态
```
GET /api/speakers
```

### 播放控制
```
POST /api/speaker/<speaker_name>/play
POST /api/speaker/<speaker_name>/pause
POST /api/speaker/<speaker_name>/stop
POST /api/speaker/<speaker_name>/next
POST /api/speaker/<speaker_name>/previous
```

### 音量控制
```
POST /api/speaker/<speaker_name>/volume/<level>
POST /api/speaker/<speaker_name>/mute
POST /api/speaker/<speaker_name>/unmute
```

### 睡眠定时器
```
GET /api/speaker/<speaker_name>/sleep_timer
POST /api/speaker/<speaker_name>/sleep_timer
{"action": "set", "duration": "30m"}
{"action": "cancel"}
```

### 广播库管理
```
GET /api/radio_stations      # 获取所有电台
POST /api/radio_stations     # 添加新电台
PUT /api/radio_stations/<id> # 更新电台
DELETE /api/radio_stations/<id> # 删除电台
```

## 部署指南

### OpenWRT 部署

```bash
# 安装 Docker
opkg update && opkg install docker luci-app-dockerman

# 启动 Docker 服务
/etc/init.d/docker start
/etc/init.d/docker enable

# 创建目录并启动容器
mkdir -p /opt/sonoradio/db
docker run -d --name sonoradio --network host --restart unless-stopped -v /opt/sonoradio/db:/app/db splendidmata/sonoradio
```

### Linux 系统服务配置

创建 `/etc/systemd/system/sonoradio.service`：

```ini
[Unit]
Description=SonoRadio Sonos Web UI
After=network.target

[Service]
User=root
ExecStart=/usr/bin/docker run --rm --name sonoradio --network host -v /opt/sonoradio/db:/app/db splendidmata/sonoradio
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable sonoradio
systemctl start sonoradio
```

## 常见问题

### Q: 无法发现 Sonos 扬声器？

**解决方案：**
- 使用 `--network host` 模式
- 确保容器与扬声器在同一子网
- 检查防火墙是否阻止 UDP 端口 1900

### Q: 数据库数据丢失？

**解决方案：启动容器时添加 `-v /path/to/db:/app/db` 挂载卷**

### Q: 服务无法访问？

**解决方案：**
- host 模式：检查端口是否被占用
- 桥接模式：确保端口映射正确 `-p 8888:8888`

## 更新镜像

```bash
docker stop sonoradio
docker rm sonoradio
docker pull splendidmata/sonoradio
docker run -d --name sonoradio --network host -v /opt/sonoradio/db:/app/db splendidmata/sonoradio
```

## 从源码构建

```bash
git clone https://github.com/splendidmata/soco-cli-webui.git
cd soco-cli-webui
docker build -t sonoradio .
docker run -d --name sonoradio --network host -v $(pwd)/db:/app/db sonoradio
```

## 许可证

MIT License

## 资源

- [SoCo 库](https://github.com/SoCo/SoCo)
- [项目源码](https://github.com/splendidmata/soco-cli-webui)

---

**提示**：建议将 Docker 主机设置为静态 IP，便于长期访问。