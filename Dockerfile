FROM node:carbon-slim

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  net-tools \
  tcpdump \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

COPY . .
CMD npm run server

