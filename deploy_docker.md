# Docker 部署指南

## 环境要求

- Docker 20.10+
- 支持 IPv4 的局域网环境
- Sonos 扬声器与 Docker 主机在同一局域网

## 网络配置说明

**⚠️ 重要：Sonos 扬声器发现依赖局域网广播（UDP），因此 Docker 容器需要能够访问本地网络。**

### 推荐网络模式：host 模式（适用于 Linux）

使用 host 网络模式，容器直接使用主机的网络栈，能够完美发现局域网内的 Sonos 扬声器：

```bash
docker run -d \
  --name sonoradio \
  --network host \
  -v /path/to/db:/app/db \
  splendidmata/sonoradio
```

### 桥接网络模式（适用于 macOS/Windows）

macOS 和 Windows 的 Docker Desktop 使用虚拟机，host 模式可能无法正常工作。可以使用 `--network bridge` 并映射端口：

```bash
docker run -d \
  --name sonoradio \
  --network bridge \
  -p 8888:8888 \
  -v /path/to/db:/app/db \
  splendidmata/sonoradio
```

**注意：** 在桥接模式下，Sonos 设备发现可能不稳定。建议在 Linux 主机上使用 host 模式获得最佳体验。

## 运行容器

### 基础运行（使用示例数据库）

```bash
docker run -d \
  --name sonoradio \
  --network host \
  splendidmata/sonoradio
```

### 持久化数据库

挂载本地目录保存电台数据：

```bash
mkdir -p ./db
docker run -d \
  --name sonoradio \
  --network host \
  -v $(pwd)/db:/app/db \
  splendidmata/sonoradio
```

### 自定义端口

如果 host 模式下 8888 端口被占用，可以通过环境变量修改：

```bash
docker run -d \
  --name sonoradio \
  --network host \
  -e PORT=8889 \
  -v $(pwd)/db:/app/db \
  splendidmata/sonoradio
```

## 完整配置示例

```bash
docker run -d \
  --name sonoradio \
  --network host \
  --restart unless-stopped \
  -v /opt/sonoradio/db:/app/db \
  -e TZ=Asia/Shanghai \
  splendidmata/sonoradio
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 8888 | 服务端口 |
| `TZ` | UTC | 时区设置 |

## 访问服务

启动后在浏览器中访问：

```
http://<Docker主机IP>:8888
```

如果配置了 mDNS（见下文），可以使用：

```
http://sonoradio.local:8888
```

## 启用 mDNS（可选）

在 Docker 主机上安装 Avahi 以支持局域网域名：

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install -y avahi-daemon avahi-discover

# 配置 sonoradio.local
echo 'sonoradio' | sudo tee /etc/avahi/hosts
```

## 常见问题

### 1. 无法发现 Sonos 扬声器

**原因**：Docker 容器网络隔离导致无法接收广播包

**解决方案**：
- 使用 `--network host` 模式（推荐）
- 确保容器与扬声器在同一子网
- 检查防火墙是否阻止 UDP 端口 1900（SSDP）

### 2. 数据库数据丢失

**原因**：未挂载持久化卷

**解决方案**：启动容器时添加 `-v /path/to/db:/app/db`

### 3. 服务无法访问

**原因**：端口映射问题

**解决方案**：
- host 模式：直接访问主机 IP:8888
- 桥接模式：确保 `-p 8888:8888` 正确映射

### 4. 时区显示错误

**解决方案**：设置 `TZ` 环境变量

```bash
docker run -d \
  --name sonoradio \
  --network host \
  -e TZ=Asia/Shanghai \
  splendidmata/sonoradio
```

## 更新镜像

```bash
# 停止容器
docker stop sonoradio

# 删除容器
docker rm sonoradio

# 拉取最新镜像
docker pull splendidmata/sonoradio

# 重新启动
docker run -d \
  --name sonoradio \
  --network host \
  -v /path/to/db:/app/db \
  splendidmata/sonoradio
```

## 从源码构建

如果需要自定义构建：

```bash
git clone https://github.com/splendidmata/soco-cli-webui.git
cd soco-cli-webui
docker build -t sonoradio .

# 运行
docker run -d \
  --name sonoradio \
  --network host \
  -v $(pwd)/db:/app/db \
  sonoradio
```

## 目录结构

```
/
├── app/                    # 应用目录
│   ├── web_ui.py          # Flask 主程序
│   ├── db/                # 数据库目录（可挂载）
│   │   └── radio_stations.db
│   ├── static/            # 静态资源
│   └── templates/         # 模板文件
└── ...
```

## 权限说明

运行容器时，建议使用非 root 用户。可以在 Dockerfile 中添加用户配置，或在运行时指定：

```bash
docker run -d \
  --name sonoradio \
  --network host \
  --user 1000:1000 \
  -v /path/to/db:/app/db \
  splendidmata/sonoradio
```

---

**提示**：对于家庭局域网部署，建议将 Docker 主机设置为静态 IP，便于长期访问。