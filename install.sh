#!/bin/bash
# SonoRadio 一键安装脚本
# 用法: ./install.sh [端口号]
# 示例: ./install.sh 8080
# 默认端口: 8888

set -e

# 配置
DEFAULT_PORT=8888
INSTALL_DIR="/opt/sonoradio"
SERVICE_NAME="sonoradio"
LOG_DIR="/var/log/sonoradio"
PORT=${1:-$DEFAULT_PORT}
USER=$(whoami)

# 自动检测 CPU 核心数并计算 Gunicorn worker 数量
# 公式: workers = (CPU核心数 * 2) + 1
CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)
GUNICORN_WORKERS=$((CPU_CORES * 2 + 1))

# 限制最小和最大 worker 数量
if [ $GUNICORN_WORKERS -lt 3 ]; then
    GUNICORN_WORKERS=3
fi
if [ $GUNICORN_WORKERS -gt 16 ]; then
    GUNICORN_WORKERS=16
fi

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_step() {
    echo -e "${GREEN}[步骤]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

echo_error() {
    echo -e "${RED}[错误]${NC} $1"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo_warn "建议使用 root 用户运行，以获得最佳体验。"
        echo_warn "如果遇到权限问题，请使用: sudo $0 $PORT"
        echo ""
    fi
}

# 检测操作系统
detect_os() {
    if [ -f /etc/openwrt_release ]; then
        OS="openwrt"
    elif [ -f /etc/debian_version ]; then
        OS="debian"
    elif [ -f /etc/redhat-release ]; then
        OS="redhat"
    elif [ -f /etc/armbian-release ]; then
        OS="armbian"
    else
        OS="unknown"
    fi
    echo_step "检测到操作系统: $OS"
}

# 安装系统依赖
install_dependencies() {
    echo_step "安装系统依赖..."

    case $OS in
        openwrt)
            opkg update
            opkg install python3 python3-venv git git-http avahi-daemon logrotate
            ;;
        debian|armbian)
            export DEBIAN_FRONTEND=noninteractive
            apt-get update
            apt-get install -y python3 python3-venv git avahi-daemon avahi-utils logrotate
            ;;
        redhat)
            yum install -y python3 python3-pip git avahi-tools logrotate
            ;;
        *)
            echo_warn "未知的操作系统，请手动安装依赖: python3, python3-venv, git, avahi-daemon, logrotate"
            ;;
    esac
}

# 创建安装目录
create_directories() {
    echo_step "创建安装目录..."

    if [ ! -d "$INSTALL_DIR" ]; then
        mkdir -p "$INSTALL_DIR"
        echo "已创建目录: $INSTALL_DIR"
    fi

    if [ ! -d "$LOG_DIR" ]; then
        mkdir -p "$LOG_DIR"
        echo "已创建目录: $LOG_DIR"
    fi

    chown -R $USER:$USER "$INSTALL_DIR" "$LOG_DIR" 2>/dev/null || true
}

# 克隆或更新项目
clone_or_update_project() {
    echo_step "获取项目文件..."

    if [ -d "$INSTALL_DIR/.git" ]; then
        echo "项目已存在，正在更新..."
        cd "$INSTALL_DIR"
        git pull origin master
    else
        git clone https://github.com/splendidmata/soco-cli-webui.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi

    chown -R $USER:$USER "$INSTALL_DIR"
}

# 创建虚拟环境并安装依赖
setup_virtualenv() {
    echo_step "配置 Python 虚拟环境..."

    cd "$INSTALL_DIR"

    if [ ! -d "venv" ]; then
        python3 -m venv venv
        echo "已创建虚拟环境"
    fi

    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install gunicorn
    deactivate

    echo "依赖安装完成"
}

# 创建 systemd 服务文件
create_systemd_service() {
    echo_step "创建系统服务..."

    cat > /tmp/sonoradio.service << EOF
[Unit]
Description=SonoRadio Sonos Web UI
After=network.target

[Service]
Type=notify
User=$USER
WorkingDirectory=$INSTALL_DIR
Environment="PATH=$INSTALL_DIR/venv/bin"
Environment="PORT=$PORT"
ExecStart=$INSTALL_DIR/venv/bin/gunicorn -w $GUNICORN_WORKERS -b 0.0.0.0:$PORT --access-logfile $LOG_DIR/access.log --error-logfile $LOG_DIR/error.log web_ui:app
ExecReload=/bin/kill -s HUP \$MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    cp /tmp/sonoradio.service /etc/systemd/system/sonoradio.service
    chmod 644 /etc/systemd/system/sonoradio.service
    rm /tmp/sonoradio.service

    echo "已创建服务文件: /etc/systemd/system/sonoradio.service"
}

# 创建 avahi mDNS 服务文件
create_avahi_service() {
    echo_step "配置 mDNS 服务..."

    AVAHI_DIR="/etc/avahi/services"
    if [ ! -d "$AVAHI_DIR" ]; then
        mkdir -p "$AVAHI_DIR"
    fi

    cat > /tmp/sonoradio.service << EOF
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">SonoRadio on %h</name>
  <service>
    <type>_http._tcp</type>
    <port>$PORT</port>
    <txt-record>path=/</txt-record>
  </service>
</service-group>
EOF

    cp /tmp/sonoradio.service "$AVAHI_DIR/sonoradio.service"
    chmod 644 "$AVAHI_DIR/sonoradio.service"
    rm /tmp/sonoradio.service

    echo "已创建 mDNS 服务文件: $AVAHI_DIR/sonoradio.service"
}

# 创建日志轮转配置
create_logrotate_config() {
    echo_step "配置日志轮转..."

    cat > /tmp/sonoradio << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    sharedscripts
    postrotate
        systemctl reload sonoradio > /dev/null 2>&1 || true
    endscript
}
EOF

    cp /tmp/sonoradio /etc/logrotate.d/sonoradio
    chmod 644 /etc/logrotate.d/sonoradio
    rm /tmp/sonoradio

    echo "已创建日志轮转配置: /etc/logrotate.d/sonoradio"
}

# 启动服务
start_services() {
    echo_step "启动服务..."

    # 重载 systemd
    systemctl daemon-reload

    # 启用并启动 SonoRadio
    systemctl enable sonoradio
    systemctl restart sonoradio

    # 重启 avahi-daemon
    case $OS in
        openwrt)
            /etc/init.d/avahi-daemon enable 2>/dev/null || true
            /etc/init.d/avahi-daemon restart 2>/dev/null || true
            ;;
        debian|armbian|redhat)
            systemctl enable avahi-daemon 2>/dev/null || true
            systemctl restart avahi-daemon 2>/dev/null || true
            ;;
    esac

    echo ""
    echo_step "服务已启动！"
}

# 验证安装
verify_installation() {
    echo_step "验证安装..."

    sleep 2

    echo ""
    echo "=========================================="
    echo "  SonoRadio 安装完成!"
    echo "=========================================="
    echo ""
    echo "访问地址:"
    echo "  - IP访问: http://$(hostname -I | awk '{print $1}'):$PORT"
    echo "  - mDNS:   http://sonoradio.local:$PORT"
    echo ""
    echo "服务管理命令:"
    echo "  - 查看状态: systemctl status sonoradio"
    echo "  - 查看日志: journalctl -u sonoradio -f"
    echo "  - 重启服务: systemctl restart sonoradio"
    echo "  - 停止服务: systemctl stop sonoradio"
    echo ""
    echo "其他信息:"
    echo "  - 安装目录: $INSTALL_DIR"
    echo "  - 服务端口: $PORT"
    echo "  - 日志目录: $LOG_DIR"
    echo ""

    # 检查服务状态
    if systemctl is-active --quiet sonoradio; then
        echo -e "${GREEN}✓${NC} SonoRadio 服务运行正常"
    else
        echo_error "SonoRadio 服务未正常运行，请检查: journalctl -u sonoradio -e"
    fi
}

# 主函数
main() {
    echo "=========================================="
    echo "  SonoRadio 一键安装脚本"
    echo "=========================================="
    echo ""
    echo "配置信息:"
    echo "  - 安装目录: $INSTALL_DIR"
    echo "  - 服务端口: $PORT"
    echo "  - CPU 核心数: $CPU_CORES"
    echo "  - Gunicorn Workers: $GUNICORN_WORKERS"
    echo ""

    check_root
    detect_os
    install_dependencies
    create_directories
    clone_or_update_project
    setup_virtualenv
    create_systemd_service
    create_avahi_service
    create_logrotate_config
    start_services
    verify_installation
}

# 执行主函数
main
