# 使用官方 Node.js Alpine 镜像作为基础镜像（更小更安全）
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 复制package.json和package-lock.json（如果存在）
COPY package*.json ./

# 安装项目依赖（仅生产环境依赖）
RUN npm ci --only=production && npm cache clean --force

# 复制项目文件
COPY --chown=nodejs:nodejs . .

# 创建logs目录并设置权限
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# 切换到非root用户
USER nodejs

# 设置环境变量
ENV NODE_ENV=production

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# 默认启动脚本为 bitmart_hotcoin_ws.js，可通过环境变量指定
ENV MONITOR_SCRIPT=bitmart_hotcoin_ws.js

# 启动项目
CMD ["sh", "-c", "node src/$MONITOR_SCRIPT"]
