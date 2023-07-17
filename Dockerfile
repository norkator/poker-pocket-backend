FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app sources
COPY . .

# Replace config with prod
RUN mv -f config-prod.js config.js

EXPOSE 8001

# define the command to run your app using CMD which defines your runtime
CMD [ "node", "holdem.js"]

