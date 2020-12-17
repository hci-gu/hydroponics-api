FROM alpine

RUN apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

RUN curl ''

RUN brew install node v1.3.2

CMD npm start