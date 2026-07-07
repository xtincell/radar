FROM node:22-alpine

WORKDIR /app

# Dépendances d'abord (cache de couche) : pg pour le backend maison.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY briefs/ ./briefs/
COPY functions/ ./functions/
COPY server/ ./server/

RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /data \
    && chown -R app:app /app /data

USER app
ENV SQLITE_PATH=/data/dash-users.sqlite3
EXPOSE 3000
CMD ["node", "server/index.js"]
