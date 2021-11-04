# First image to compile typescript to javascript
FROM node:16.10.0-alpine AS build-image
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run clean
RUN npm run build

# Second image, that creates an image for production
FROM nikolaik/python-nodejs:python3.9-nodejs16-alpine AS prod-image
WORKDIR /app
COPY --from=build-image ./app/dist ./dist
COPY package* ./
COPY ./resource ./resource
RUN npm ci --production
RUN pip3 install -r resource/py/requirements.txt

CMD [ "node", "./dist/src/index.js" ]