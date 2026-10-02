# syntax=docker/dockerfile:1
FROM node:24.12.0-bookworm-slim@sha256:7326fb2dbdce998edd72140946851be64ef4a643e8715e138ca467e8e9d92c99 AS manifests
WORKDIR /app
COPY package.json yarn.lock ./
COPY packages/api/package.json packages/api/package.json
COPY packages/graphql/package.json packages/graphql/package.json
COPY packages/web/package.json packages/web/package.json

FROM manifests AS test-dependencies
RUN apt-get update && apt-get install -y --no-install-recommends redis-server openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn yarn install --frozen-lockfile --non-interactive --ignore-scripts

FROM test-dependencies AS verified
COPY packages/api packages/api
COPY packages/graphql packages/graphql
COPY packages/web packages/web
COPY scripts scripts
RUN yarn build && yarn test && yarn test:deploy

FROM manifests AS production-dependencies
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn yarn install --production --frozen-lockfile --non-interactive --ignore-scripts
RUN node -e "require('secure-password')()"

FROM production-dependencies AS runtime
COPY packages/api packages/api
COPY packages/graphql packages/graphql
COPY packages/web packages/web
COPY --from=verified /app/packages/graphql/src/generated packages/graphql/src/generated
ENV NODE_ENV=production HOST=0.0.0.0
ARG REVISION
LABEL org.opencontainers.image.revision=$REVISION org.opencontainers.image.title=taskmoto
USER node

FROM runtime AS api
WORKDIR /app/packages/api
CMD ["node", "--import", "tsx", "src/index.ts"]

FROM runtime AS web
WORKDIR /app/packages/web
CMD ["node", "--import", "remix/node-tsx", "server.ts"]
