# Railway 后端部署 Dockerfile
# 当 Railway Root Directory 设置为 'backend' 时使用此文件

FROM node:18-alpine

WORKDIR /app

# 复制 package 文件并安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制所有源代码
COPY . .

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口（Railway 会自动提供 PORT 环境变量）
EXPOSE 3001

# 启动服务器
CMD ["npm", "start"]
