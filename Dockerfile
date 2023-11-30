FROM node:20-alpine3.18 AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run cleanAndBuild

FROM node:20-alpine3.18 AS prod-image
WORKDIR /app
COPY --from=build ./app/dist ./dist
COPY package* ./
RUN apk update && apk upgrade --no-cache libcrypto3 libssl3 && npm ci --production
CMD [ "node", "./dist/src/index.js" ]