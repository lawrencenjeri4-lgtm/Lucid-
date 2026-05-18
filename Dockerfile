FROM node:18-alpine

RUN apk add --no-cache ffmpeg git

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN mkdir -p session

CMD ["node", "bot.js"]
