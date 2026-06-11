FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG API_URL=/api
RUN if [ "$API_URL" != "/api" ]; then \
      printf 'export const environment = {\n  production: true,\n  apiUrl: '\''%s'\''\n};\n' "$API_URL" > src/environments/environment.prod.ts; \
    fi
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
