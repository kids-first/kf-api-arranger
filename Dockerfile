FROM node:20-alpine3.18
WORKDIR /app
COPY . .
# ref: https://github.com/alpinelinux/docker-alpine/issues/352
# Alas, we must install devDep too. Would be nice to fix if possible.
RUN apk update && apk upgrade --no-cache libcrypto3 libssl3 && npm ci && npm run cleanAndBuild

CMD [ "node", "./dist/src/index.js" ]