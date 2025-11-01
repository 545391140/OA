# ---------- Base image ----------
FROM node:18-alpine AS base
WORKDIR /app

# ---------- Copy backend code ----------
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

# ---------- Copy remaining source ----------
COPY backend /app/backend

# ---------- Expose port ----------
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# ---------- Start server ----------
CMD ["npm", "start"]
