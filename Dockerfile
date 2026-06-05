FROM node:24.16-alpine3.22 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24.16-alpine3.22 AS prod-image
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
ENV NODE_ENV=production
# Runs as root: the app binds privileged port 443 (PORT env), which a non-root
# user cannot do (listen EACCES on ports <1024). To run as `USER node`, move the
# container to a non-privileged port (e.g. 8080) and repoint the ALB target group.
# USER node
CMD ["node", "./dist/index.js"]
