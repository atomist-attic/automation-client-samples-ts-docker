FROM node:8

ENV NPM_CONFIG_LOGLEVEL warn

# Create app directory
RUN mkdir -p /app
WORKDIR /app

# Install app dependencies
COPY package.json /app/
RUN npm install

# Bundle app source
COPY . /app

RUN  git config --global user.email "bot@atomist.com"
RUN  git config --global user.name "Atomist Bot"

ENV SUPPRESS_NO_CONFIG_WARNING true

EXPOSE 2866

CMD [ "npm", "start" ]

