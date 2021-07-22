FROM node:16.5.0-alpine

WORKDIR /usr/src

COPY . .

RUN npm ci
RUN npm run build

CMD ["node", "dist/index.js"]