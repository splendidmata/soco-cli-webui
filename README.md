# SonoRadio - Sonos 扬声器 Web 控制界面

![SonoRadio](https://github.com/splendidmata/soco-cli-webui/assets/xxx/xxx)

## 项目简介

SonoRadio 是一个基于 Flask 的 Sonos 扬声器 Web 控制界面，提供直观、现代化的用户界面来控制您的 Sonos 音响系统。

## 核心功能

### 🎵 播放控制
- **播放/暂停/停止**：完整的播放控制功能
- **上一曲/下一曲**：快速切换曲目
- **曲目信息显示**：实时显示当前播放的歌曲名称和艺术家
- **状态指示**：清晰的播放状态图标（播放中/已暂停/已停止）

### 🔊 音量控制
- **滑块调节**：精确的音量控制，带颗粒感反馈
- **按钮微调**：+/- 按钮精细调整音量（步进 1）
- **静音切换**：一键静音/取消静音
- **防抖优化**：连续点击音量按钮不会拉扯，体验流畅

### 📻 广播库管理
- **电台列表**：浏览和选择预设电台
- **添加电台**：自定义添加新电台（标题 + URL）
- **编辑电台**：修改已有电台信息
- **删除电台**：移除不需要的电台
- **自动刷新**：添加/删除后自动更新列表，无需手动刷新页面

### 🏠 多房间独立控制
- **扬声器选择器**：下拉菜单选择目标扬声器
- **全局同步**：所有播放操作都可指定目标扬声器
- **设备上下线处理**：按名称匹配设备，支持动态设备列表
- **独立控制**：每个房间可以独立播放不同内容

### ⏱️ 睡眠定时器
- **预设时间**：15分钟、30分钟、1小时、2小时快速设置
- **实时倒计时**：动态显示剩余时间
- **一键取消**：随时取消定时
- **本地倒计时**：避免频繁请求服务器，性能优化

### 🌙 主题切换
- **深色模式**：护眼的深色主题（默认）
- **浅色模式**：明亮的浅色主题
- **无感切换**：CSS 变量实现平滑过渡动画
- **偏好记忆**：自动保存用户主题偏好

### 📱 响应式设计
- **桌面端**：完整功能的桌面界面
- **移动端**：优化的触控体验
- **大按钮设计**：睡眠定时器按钮和音量控制针对触摸设备优化
- **PWA 支持**：可添加至手机桌面，类似原生应用

### 🔗 分享链接支持
- **自动识别**：智能判断是直接 URI 还是分享链接
- **Tidal/Spotify**：支持 Tidal 和 Spotify 分享链接
- **一键播放**：自动解析并播放分享内容

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
  splendidmata/sonoradio:master

# 访问192.168.xx.xx:5000

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

### 🖥️ 本地部署（非 Docker）

**环境要求：**
- Python 3.7+
- pip 包管理工具
- 局域网内有 Sonos 扬声器

#### ⚡ 一键安装脚本（推荐）

项目提供了一键安装脚本，自动完成所有配置，包括系统服务、开机自启和 mDNS：

```bash
# 下载安装脚本
curl -fsSL https://raw.githubusercontent.com/splendidmata/soco-cli-webui/master/install.sh -o install.sh
chmod +x install.sh

# 运行安装脚本（使用默认端口 8888）
sudo ./install.sh

# 或者指定自定义端口
sudo ./install.sh 8080
```

**一键脚本功能：**
- ✅ 自动检测操作系统（Debian/Ubuntu/OpenWRT/Armbian）
- ✅ 安装系统依赖（Python3、Git、Avahi）
- ✅ 克隆/更新项目到 `/opt/sonoradio`
- ✅ 创建 Python 虚拟环境并安装依赖
- ✅ 配置 systemd 系统服务（开机自启）
- ✅ 配置 avahi-daemon mDNS 服务
- ✅ 启动服务并设置开机自启

**安装后访问：**
```
http://<主机IP>:8888
http://sonoradio.local:8888
```

**服务管理命令：**
```bash
# 查看状态
sudo systemctl status sonoradio

# 查看日志
sudo journalctl -u sonoradio -f

# 重启服务
sudo systemctl restart sonoradio

# 停止服务
sudo systemctl stop sonoradio
```

#### 手动安装步骤

如果不想使用一键脚本，可以手动安装：

```bash
# 1. 克隆项目
git clone https://github.com/splendidmata/soco-cli-webui.git
cd soco-cli-webui

# 2. 创建虚拟环境（推荐）
python -m venv venv

# 3. 激活虚拟环境
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 4. 安装依赖
pip install -r requirements.txt

# 5. 启动服务
# 程序会自动创建数据库目录并初始化默认电台
python web_ui.py
```

**使用 Gunicorn 生产部署：**

```bash
# 安装 Gunicorn
pip install gunicorn

# 启动服务（后台运行）
gunicorn -w 4 -b 0.0.0.0:8888 web_ui:app &

# 或者使用 nohup 持久运行
nohup gunicorn -w 4 -b 0.0.0.0:8888 web_ui:app > sonoradio.log 2>&1 &
```

### 访问服务

启动后在浏览器中访问：

```
http://<您的主机IP>:8888
```

如果配置了 mDNS，可通过以下地址访问：

```
http://sonoradio.local:8888
```

## 网络配置说明

**⚠️ 重要：Sonos 设备发现依赖局域网广播（UDP），确保网络配置正确。**

### 推荐：host 模式（Linux / OpenWRT）

使用 `--network host` 模式，容器直接使用主机网络栈，能够完美发现局域网内的 Sonos 扬声器。

### 桥接模式（macOS / Windows）

macOS 和 Windows 的 Docker Desktop 使用虚拟机，host 模式可能无法正常工作。建议使用桥接模式并映射端口。

### mDNS 配置（可选）

配置后可通过 `sonoradio.local` 访问：

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install -y avahi-daemon avahi-discover

# OpenWRT
opkg update && opkg install avahi-daemon
echo 'sonoradio' > /etc/avahi/hosts
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 8888 | 服务端口 |
| `TZ` | UTC | 时区设置（如 Asia/Shanghai） |
| `DEBUG` | false | 是否启用调试模式 |

## 目录结构

```
soco-cli-webui/
├── web_ui.py              # Flask 主程序
├── requirements.txt       # 依赖列表
├── requirements-dev.txt   # 开发依赖
├── deploy_armbian.md      # Armbian 部署指南
├── deploy_docker.md       # Docker 部署指南
├── db/                    # 数据库目录
│   ├── radio_stations.db  # 电台数据库（运行时自动创建）
│   └── radio_stations_example.db  # 示例数据库
├── static/                # 静态资源
│   ├── css/
│   │   └── style.css      # 样式文件
│   ├── js/
│   │   └── main.js        # 脚本文件
│   ├── icon.svg           # 网站图标（SVG）
│   ├── icon-180.png       # 桌面图标（PNG，用于 Safari PWA）
│   ├── manifest.json      # PWA 配置文件
│   └── favicon.ico        # 网站图标
├── templates/             # HTML 模板
│   └── index.html         # 主页面
└── .github/workflows/
    └── docker-build.yml   # GitHub Actions CI/CD
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

### 自定义 URL 播放
```
POST /api/speaker/<speaker_name>/play_url
{"url": "http://example.com/stream.mp3"}
```
支持直接 URI 和 Tidal/Spotify 分享链接自动识别。

### 广播库管理
```
GET /api/radio_stations      # 获取所有电台
POST /api/radio_stations     # 添加新电台 {"title": "电台名称", "url": "http://..."}
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

### Linux 系统服务配置（Docker 方式）

创建 `/etc/systemd/system/sonoradio.service`：

```ini
[Unit]
Description=SonoRadio Sonos Web UI
After=network.target docker.service
Requires=docker.service

[Service]
User=root
ExecStart=/usr/bin/docker run --rm --name sonoradio --network host -v /opt/sonoradio/db:/app/db splendidmata/sonoradio
ExecStop=/usr/bin/docker stop sonoradio
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable sonoradio
systemctl start sonoradio

# 查看日志
journalctl -u sonoradio -f
```

### Linux 系统服务配置（本地部署方式）

**1. 安装项目到系统目录：**

```bash
# 下载项目（示例安装到 /opt/sonoradio）
sudo mkdir -p /opt/sonoradio
sudo chown $USER:$USER /opt/sonoradio
git clone https://github.com/splendidmata/soco-cli-webui.git /opt/sonoradio

cd /opt/sonoradio

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境并安装依赖
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# 创建数据库目录
mkdir -p db
```

**2. 创建系统服务文件：**

```bash
sudo nano /etc/systemd/system/sonoradio.service
```

内容如下：

```ini
[Unit]
Description=SonoRadio Sonos Web UI
After=network.target

[Service]
Type=notify
User=<您的用户名>          # 修改为您的用户名，如 pi、ubuntu、root 等
WorkingDirectory=/opt/sonoradio
Environment="PATH=/opt/sonoradio/venv/bin"
Environment="PORT=8888"
ExecStart=/opt/sonoradio/venv/bin/gunicorn -w 4 -b 0.0.0.0:8888 --access-logfile /var/log/sonoradio/access.log --error-logfile /var/log/sonoradio/error.log web_ui:app
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**3. 创建日志目录并设置权限：**

```bash
sudo mkdir -p /var/log/sonoradio
sudo chown $USER:$USER /var/log/sonoradio
```

**4. 启动服务：**

```bash
sudo systemctl daemon-reload
sudo systemctl enable sonoradio
sudo systemctl start sonoradio

# 查看服务状态
sudo systemctl status sonoradio

# 查看日志
sudo journalctl -u sonoradio -f
```

### mDNS 系统服务配置（可选）

mDNS 允许通过 `sonoradio.local` 访问服务，无需记忆 IP 地址。

**1. 安装 avahi-daemon：**

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install -y avahi-daemon avahi-utils

# OpenWRT
opkg update && opkg install avahi-daemon
```

**2. 创建 avahi 服务文件：**

```bash
sudo nano /etc/avahi/services/sonoradio.service
```

内容如下：

```xml
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">SonoRadio on %h</name>
  <service>
    <type>_http._tcp</type>
    <port>8888</port>
    <txt-record>path=/</txt-record>
  </service>
</service-group>
```

**3. 重启 avahi-daemon 服务：**

```bash
# Debian/Ubuntu
sudo systemctl restart avahi-daemon

# OpenWRT
/etc/init.d/avahi-daemon restart
```

**4. 验证 mDNS 服务：**

```bash
# 检查服务是否发布
avahi-browse -r _http._tcp

# 测试解析
avahi-resolve -n sonoradio.local
```

**5. 访问服务：**

在浏览器中访问：

```
http://sonoradio.local:8888
```

**提示**：如果 `sonoradio.local` 无法解析，可能是 `avahi-daemon` 服务未启动。执行 `sudo systemctl status avahi-daemon` 检查服务状态。

## 使用说明

### 播放控制
1. 在底部播放栏选择目标扬声器
2. 点击播放按钮开始播放
3. 使用音量滑块或加减按钮调整音量
4. 点击静音按钮切换静音状态

### 广播库管理
1. 在广播库面板选择电台
2. 选择目标扬声器后点击播放
3. 使用"添加新电台"按钮添加自定义电台
4. 使用编辑/删除按钮管理电台

### 睡眠定时器
1. 点击预设时间按钮设置定时关闭
2. 查看实时倒计时显示
3. 点击"取消定时"按钮取消定时

### 主题切换
点击右上角的 🌙/☀️ 按钮切换深色/浅色模式

## 常见问题

### Q: 无法发现 Sonos 扬声器？

**解决方案：**
- 使用 `--network host` 模式（Docker）
- 确保主机与扬声器在同一子网
- 检查防火墙是否阻止 UDP 端口 1900（SSDP）
- 尝试重启路由器和 Sonos 扬声器

### Q: 数据库数据丢失？

**解决方案：**
- Docker：启动容器时添加 `-v /path/to/db:/app/db` 挂载卷
- 本地部署：确保 `db` 目录存在且有写入权限

### Q: 服务无法访问？

**解决方案：**
- 检查端口是否被占用：`netstat -tlnp | grep 8888`
- 检查防火墙设置，确保 8888 端口开放
- 确认服务正在运行：`docker ps` 或 `systemctl status sonoradio`

### Q: 音量控制不流畅？

**解决方案：**
- 音量按钮已做防抖优化（300ms），连续点击会自动合并
- 建议使用滑块进行精确调节

### Q: 主题切换后显示异常？

**解决方案：**
- 刷新页面清除浏览器缓存
- 检查浏览器是否支持 CSS 变量（现代浏览器均支持）

## 更新维护

### 更新 Docker 镜像

```bash
docker stop sonoradio
docker rm sonoradio
docker pull splendidmata/sonoradio
docker run -d --name sonoradio --network host -v /opt/sonoradio/db:/app/db splendidmata/sonoradio
```

### 更新本地部署

```bash
cd soco-cli-webui
git pull origin master
source venv/bin/activate
pip install -r requirements.txt
systemctl restart sonoradio
```

## 从源码构建 Docker 镜像

```bash
git clone https://github.com/splendidmata/soco-cli-webui.git
cd soco-cli-webui
docker build -t sonoradio .
docker run -d --name sonoradio --network host -v $(pwd)/db:/app/db sonoradio
```

## 开发指南

### 开发环境设置

```bash
# 克隆项目
git clone https://github.com/splendidmata/soco-cli-webui.git
cd soco-cli-webui

# 创建虚拟环境
python -m venv venv
source venv/bin/activate

# 安装开发依赖
pip install -r requirements-dev.txt

# 启动开发服务器（自动重载）
FLASK_DEBUG=true python web_ui.py
```

### 项目结构说明

- `web_ui.py`：Flask 后端，包含所有 API 端点和业务逻辑
- `templates/index.html`：Jinja2 模板，前端页面结构
- `static/css/style.css`：所有样式定义，包括主题变量
- `static/js/main.js`：前端交互逻辑，包括 AJAX 请求和 DOM 操作

## 许可证

MIT License

## 资源

- [SoCo 库](https://github.com/SoCo/SoCo) - Sonos 控制的核心 Python 库
- [Flask](https://flask.palletsprojects.com/) - Web 框架
- [项目源码](https://github.com/splendidmata/soco-cli-webui)

---

**提示**：建议将服务主机设置为静态 IP，便于长期访问。如需远程访问，建议配置反向代理（如 Nginx）并启用 HTTPS。
