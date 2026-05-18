# SonoRadio Armbian 部署教程

本教程将指导您如何将 SonoRadio 部署为 Armbian 系统服务，实现开机自启和后台运行。

## 一、环境准备

### 1.1 系统要求
- Armbian 系统
- Python 3.7+
- 网络连接

### 1.2 更新系统并安装依赖

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-pip python3-venv -y
```

## 二、安装 SonoRadio

### 2.1 创建工作目录

```bash
sudo mkdir -p /opt/sonoradio
sudo chown $USER:$USER /opt/sonoradio
```

### 2.2 复制项目文件

将 SonoRadio 项目文件复制到 `/opt/sonoradio` 目录：

```bash
cp -r /path/to/soco-cli-master/* /opt/sonoradio/
```

### 2.3 创建虚拟环境

```bash
cd /opt/sonoradio
python3 -m venv venv
```

### 2.4 安装依赖

```bash
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

## 三、配置 Gunicorn

### 3.1 创建 Gunicorn 配置文件

```bash
nano /opt/sonoradio/gunicorn_config.py
```

### 3.2 配置文件内容

```python
bind = "0.0.0.0:8888"
workers = 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

daemon = False
pidfile = "/opt/sonoradio/gunicorn.pid"
errorlog = "/opt/sonoradio/logs/error.log"
accesslog = None
loglevel = "error"

raw_env = [
    "FLASK_ENV=production",
]
```

### 3.3 创建日志目录

```bash
mkdir -p /opt/sonoradio/logs
touch /opt/sonoradio/logs/error.log
```

## 四、配置 systemd 服务

### 4.1 创建服务文件

```bash
sudo nano /etc/systemd/system/sonoradio.service
```

### 4.2 服务配置内容

```ini
[Unit]
Description=SonoRadio - Sonos Speaker Control Web UI
After=network.target

[Service]
Type=notify
User=root
WorkingDirectory=/opt/sonoradio
Environment="PATH=/opt/sonoradio/venv/bin"
ExecStart=/opt/sonoradio/venv/bin/gunicorn -c /opt/sonoradio/gunicorn_config.py web_ui:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 4.3 配置说明

| 配置项 | 说明 |
|--------|------|
| `bind = "0.0.0.0:8888"` | 监听所有网卡 8888 端口 |
| `Type=notify` | Gunicorn 支持 systemd 通知协议 |
| `Restart=always` | 服务异常退出时自动重启 |

## 五、启动服务

### 5.1 重新加载 systemd 配置

```bash
sudo systemctl daemon-reload
```

### 5.2 启动服务

```bash
sudo systemctl start sonoradio
```

### 5.3 查看服务状态

```bash
sudo systemctl status sonoradio
```

### 5.4 设置开机自启

```bash
sudo systemctl enable sonoradio
```

## 六、配置 mDNS（局域网域名访问）

通过 mDNS 服务，可以使用 `sonoradio.local` 域名访问，无需记忆 IP 地址。

### 6.1 安装 Avahi

```bash
sudo apt install avahi-daemon -y
```

### 6.2 配置自定义主机名

```bash
sudo nano /etc/avahi/services/sonoradio.service
```

写入以下内容：

```xml
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
    <name replace-wildcards="yes">SonoRadio</name>
    <service>
        <type>_http._tcp</type>
        <port>8888</port>
    </service>
</service-group>
```

### 6.3 设置主机名（可选）

将系统主机名设为 `sonoradio`，确保 `sonoradio.local` 解析到本机：

```bash
sudo hostnamectl set-hostname sonoradio
```

编辑 `/etc/hosts`，添加：

```
127.0.0.1   localhost sonoradio
```

### 6.4 重启 Avahi

```bash
sudo systemctl restart avahi-daemon
sudo systemctl enable avahi-daemon
```

### 6.5 验证

在同局域网的其他设备上测试：

```bash
# macOS / Linux
ping sonoradio.local

# Windows PowerShell
ping sonoradio.local

# 浏览器访问
http://sonoradio.local:8888
```

## 七、访问服务

服务启动后，可通过以下方式访问：

- **本地访问**：`http://localhost:8888`
- **局域网域名**：`http://sonoradio.local:8888`
- **局域网 IP**：`http://<您的IP地址>:8888`

## 八、日志管理

### 7.1 Gunicorn 错误日志

```bash
# 实时查看错误日志
tail -f /opt/sonoradio/logs/error.log
```

### 7.2 systemd 日志

```bash
sudo journalctl -u sonoradio -f
```

### 7.3 日志自动清理（logrotate）

虽然当前配置仅记录错误日志，但长期运行仍会累积。建议配置 logrotate 自动轮转：

创建 logrotate 配置文件：

```bash
sudo nano /etc/logrotate.d/sonoradio
```

写入以下内容：

```
/opt/sonoradio/logs/error.log {
    daily
    rotate 7
    maxsize 10M
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
}
```

| 参数 | 说明 |
|------|------|
| `daily` | 每天轮转一次 |
| `rotate 7` | 保留最近 7 个归档 |
| `maxsize 10M` | 超过 10MB 立即轮转 |
| `compress` | 压缩旧日志（gzip） |
| `delaycompress` | 延迟一个周期再压缩，避免影响写入 |
| `copytruncate` | 复制后截断原文件，无需重启服务 |

验证配置是否生效：

```bash
sudo logrotate -d /etc/logrotate.d/sonoradio   # 调试模式预览
sudo logrotate -f /etc/logrotate.d/sonoradio   # 强制执行一次
```

## 九、服务管理命令

```bash
# 启动服务
sudo systemctl start sonoradio

# 停止服务
sudo systemctl stop sonoradio

# 重启服务
sudo systemctl restart sonoradio

# 查看状态
sudo systemctl status sonoradio

# 禁用开机自启
sudo systemctl disable sonoradio

# 查看日志
sudo journalctl -u sonoradio -f
```

## 十、常见问题

### 9.1 服务启动失败

检查 Gunicorn 错误日志：
```bash
cat /opt/sonoradio/logs/error.log
```

### 9.2 端口被占用

检查 8888 端口：
```bash
sudo lsof -i :8888
sudo netstat -tlnp | grep :8888
```

如果 8888 端口被占用，可以改用其他端口：
```python
bind = "0.0.0.0:8888"
```

### 9.3 权限问题

```bash
sudo chown -R root:root /opt/sonoradio
chmod -R 755 /opt/sonoradio
```

### 9.4 权限不足

8888 端口属于非特权端口（>1024），无需 root 权限即可绑定。

## 十一、更新服务

### 10.1 更新代码

```bash
sudo systemctl stop sonoradio
cd /opt/sonoradio
cp -r /path/to/new_version/* /opt/sonoradio/
```

### 10.2 更新依赖

```bash
source /opt/sonoradio/venv/bin/activate
pip install -r requirements.txt
deactivate
```

### 10.3 重启服务

```bash
sudo systemctl restart sonoradio
```

---

**完成！** SonoRadio 已成功部署，Gunicorn 在 8888 端口对局域网提供服务，开机后会自动启动。