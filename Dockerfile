# Dockerfile for Railway deployment
# 当 Railway Root Directory 留空（项目根目录）时使用此文件
# 如果 Root Directory 设置为 'backend'，请使用 backend/Dockerfile

FROM node:18-alpine

WORKDIR /app/backend

# 复制 package 文件并安装依赖
COPY backend/package*.json ./
RUN npm ci --only=production

# 复制所有后端源代码
COPY backend/ ./

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口（Railway 会自动提供 PORT 环境变量）
EXPOSE 3001

# 启动服务器
CMD ["npm", "start"]
