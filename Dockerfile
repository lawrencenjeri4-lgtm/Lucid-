FROM node:18-alpine

RUN apk add --no-cache ffmpeg git python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN mkdir -p session

CMD ["node", "bot.js"]
