# Multi-stage Dockerfile for React + Vite app

# Development stage
FROM node:22-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json yarn.lock* ./

# Install dependencies with yarn
RUN yarn install

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start development server with hot reload
CMD ["yarn", "run", "dev", "--host", "0.0.0.0"]

# Production build stage (optional, for future use)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json yarn.lock* ./
RUN yarn install

COPY . .
RUN yarn build

# Production stage (optional, for future use)
FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-prod.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
