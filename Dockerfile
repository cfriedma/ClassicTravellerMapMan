FROM node:22-bookworm AS build
WORKDIR /app
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx ng build --configuration=server

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --prefix server --omit=dev
COPY --from=build /app/dist/classic-traveller-map-man ./dist/classic-traveller-map-man
COPY server/index.js ./server/index.js
EXPOSE 8080
USER node
CMD ["node", "server/index.js"]
