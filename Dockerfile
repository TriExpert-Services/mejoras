# Multi-stage build for React app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY vite-env.d.ts ./
COPY vite-env.d.ts ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY index.html ./

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

# Production stage
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]