FROM node:10.23.0

ENV RUNTIME nodejs10
ENV FUNC_NAME ""
ENV PROVIDER hcloud
ENV POLICY  simple

EXPOSE 50051
EXPOSE 40041

ADD src /env

WORKDIR /env

RUN npm install

ENTRYPOINT [ "node", "/env/index_mesh.js" ]
