FROM node:10.23.0

RUN npm install

ENV RUNTIME nodejs10
ENV FUNC_NAME ""
ENV PROVIDER hcloud
ENV POLICY  simple

EXPOSE 50051
EXPOSE 40041

ADD src /env
ADD proto /env/proto/

WORKDIR /env

ENTRYPOINT [ "node", "/env/index.js" ]
