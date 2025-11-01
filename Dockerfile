# 多阶段构建 Dockerfile
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端文件并构建
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# 后端服务
FROM node:18-alpine

WORKDIR /app

# 安装后端依赖
COPY backend/package*.json ./
RUN npm ci --only=production

# 复制后端代码
COPY backend/ ./

# 复制前端构建结果
COPY --from=frontend-builder /app/frontend/build ./public

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "server.js"]

