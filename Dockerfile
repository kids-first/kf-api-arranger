FROM node:20-alpine3.18
WORKDIR /app
COPY . .
# Alas, we must install devDep too. Would be nice to fix if possible.
RUN npm ci && npm run cleanAndBuild

CMD [ "node", "./dist/src/index.js" ]