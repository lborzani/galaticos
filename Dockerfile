# Duas imagens a partir do mesmo repo:
#   app  = PocketBase (API, hooks, migrations) servindo o build do PWA
#   push = sidecar de Web Push
# docker build --target app .   |   docker build --target push .

FROM node:24-alpine AS web
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM alpine:3.22 AS app
RUN apk add --no-cache ca-certificates curl unzip tzdata
WORKDIR /pb
COPY pocketbase/install.sh ./
RUN sh install.sh && apk del curl unzip
COPY pocketbase/pb_migrations ./pb_migrations
COPY pocketbase/pb_hooks ./pb_hooks
COPY --from=web /src/pocketbase/pb_public ./pb_public
VOLUME /pb_data
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8090/api/health || exit 1
CMD ["./pocketbase", "serve", "--http", "0.0.0.0:8090", "--dir", "/pb_data", "--hooksDir", "pb_hooks", "--migrationsDir", "pb_migrations", "--publicDir", "pb_public", "--hooksWatch=false"]

FROM node:24-alpine AS push
WORKDIR /push
COPY package-lock.json /tmp/
# só a lib de push, na mesma versão do lockfile
RUN npm init -y >/dev/null && npm install --omit=dev web-push@$(node -p "require('/tmp/package-lock.json').packages['node_modules/web-push'].version") && rm /tmp/package-lock.json
COPY push/server.ts ./server.mts
USER node
ENV PUSH_HOST=0.0.0.0
EXPOSE 8098
CMD ["node", "server.mts"]
