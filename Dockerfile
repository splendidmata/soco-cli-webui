# 使用 Python 3.11 作为基础镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制 requirements.txt 并安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建 db 目录
RUN mkdir -p /app/db

# 复制示例数据库（可选，首次启动会自动创建）
RUN cp /app/db/radio_stations_example.db /app/db/radio_stations.db || true

# 暴露端口
EXPOSE 8888

# 设置启动命令
CMD ["python", "web_ui.py"]