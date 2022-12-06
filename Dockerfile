FROM node:18-alpine AS build

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
COPY . ./
RUN sed -i 's|"fe-app"|"fe-sudoku-edit"|' ./package.json
RUN npm install
RUN npm run build-edit
RUN sed -i 's|"fe-sudoku-edit"|"fe-sudoku-play"|' ./package.json
RUN npm install
RUN npm run build-play

FROM lipanski/docker-static-website:latest

COPY --from=build /app/dist-edit/ ./edit
COPY --from=build /app/dist-play/ ./play

CMD ["/busybox", "httpd", "-f", "-v", "-p", "3000", "-c", "httpd.conf"]