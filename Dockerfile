FROM node:18-alpine

RUN apk --no-cache add curl

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app sources
COPY . .

# Download HandRanks.dat
RUN curl -LJO https://github.com/christophschmalhofer/poker/raw/master/XPokerEval/XPokerEval.TwoPlusTwo/HandRanks.dat
RUN mv -f HandRanks.dat ./src/app/

# Replace config with prod
RUN mv -f config-prod.js config.js

EXPOSE 8001

# define the command to run your app using CMD which defines your runtime
CMD [ "node", "holdem.js"]

