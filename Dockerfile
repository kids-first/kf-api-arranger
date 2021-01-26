FROM node:15.6.0-alpine3.10

WORKDIR /usr/src

COPY . .

RUN npm ci
RUN npm run build

CMD ["node", "dist/index.js"]