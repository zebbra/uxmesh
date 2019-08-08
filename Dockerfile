FROM node:10
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
#use server.js for first tests, because client.js doesn't work proper without a connecting backend
CMD [ "node", "server.js" ]
