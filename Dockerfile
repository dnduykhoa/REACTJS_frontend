# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_J2EE_API_URL
ENV VITE_J2EE_API_URL=$VITE_J2EE_API_URL

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo "server {" > /etc/nginx/conf.d/default.conf && \
    echo "    listen 80;" >> /etc/nginx/conf.d/default.conf && \
    echo "    server_name _;" >> /etc/nginx/conf.d/default.conf && \
    echo "    root /usr/share/nginx/html;" >> /etc/nginx/conf.d/default.conf && \
    echo "    index index.html;" >> /etc/nginx/conf.d/default.conf && \
    echo "    location /api/ {" >> /etc/nginx/conf.d/default.conf && \
    echo "        proxy_pass http://backend:8080;" >> /etc/nginx/conf.d/default.conf && \
    echo "        proxy_http_version 1.1;" >> /etc/nginx/conf.d/default.conf && \
    echo "        proxy_set_header Host \$host;" >> /etc/nginx/conf.d/default.conf && \
    echo "        proxy_set_header X-Real-IP \$remote_addr;" >> /etc/nginx/conf.d/default.conf && \
    echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;" >> /etc/nginx/conf.d/default.conf && \
    echo "        proxy_set_header X-Forwarded-Proto \$scheme;" >> /etc/nginx/conf.d/default.conf && \
    echo "    }" >> /etc/nginx/conf.d/default.conf && \
    echo "    location /images/ {" >> /etc/nginx/conf.d/default.conf && \
    echo "        proxy_pass http://backend:8080;" >> /etc/nginx/conf.d/default.conf && \
    echo "        proxy_http_version 1.1;" >> /etc/nginx/conf.d/default.conf && \
    echo "        proxy_set_header Host \$host;" >> /etc/nginx/conf.d/default.conf && \
    echo "        proxy_set_header X-Real-IP \$remote_addr;" >> /etc/nginx/conf.d/default.conf && \
    echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;" >> /etc/nginx/conf.d/default.conf && \
    echo "        proxy_set_header X-Forwarded-Proto \$scheme;" >> /etc/nginx/conf.d/default.conf && \
    echo "    }" >> /etc/nginx/conf.d/default.conf && \
    echo "    location / {" >> /etc/nginx/conf.d/default.conf && \
    echo "        try_files \$uri \$uri/ /index.html;" >> /etc/nginx/conf.d/default.conf && \
    echo "    }" >> /etc/nginx/conf.d/default.conf && \
    echo "}" >> /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]