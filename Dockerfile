FROM node:20-alpine

# Dépendances système pour sodium-native (crypto vocal Discord) et Opus
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    opus-dev \
    ffmpeg

WORKDIR /app

# Copie des fichiers de dépendances en premier (cache Docker)
COPY package*.json ./
COPY tsconfig.json ./

# Installation des dépendances
RUN npm ci --omit=dev || npm install

# Copie du source TypeScript et compilation
COPY src/ ./src/
RUN npm run build || npx tsc

# Dossier de données persistant (channel-map.json)
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Copie du fichier .env si présent (sinon les variables doivent être passées via Docker)
COPY .env* ./

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
