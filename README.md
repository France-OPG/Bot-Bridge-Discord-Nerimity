# 🔗 Nerimity ↔ Discord Bridge

> Bot passerelle bidirectionnel entre **[Nerimity](https://nerimity.com)** et **Discord** — messages texte en temps réel, synchronisation de la structure des salons et bridge vocal.

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript&logoColor=white)
![discord.js](https://img.shields.io/badge/discord.js-14-5865F2?logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-GPL--3.0-green)

---

## 📋 Fonctionnalités

| Feature | État |
|---|:---:|
| Messages texte **Nerimity → Discord** | ✅ |
| Messages texte **Discord → Nerimity** | ✅ |
| Affichage avec pseudo + avatar de l'expéditeur | ✅ |
| Système anti-boucle (pas de doublons) | ✅ |
| Sync **création** de salons (les deux sens) | ✅ |
| Sync **renommage** de salons (les deux sens) | ✅ |
| Sync **suppression** de salons (les deux sens) | ✅ |
| Persistance de la map salons (redémarrage safe) | ✅ |
| Bridge vocal — côté **Discord** (réception PCM) | ✅ |
| Bridge vocal — côté **Nerimity** (API non encore publique) | 🔜 |

---

## 🏗️ Architecture

```
src/
├── index.ts                    Point d'entrée, bootstrap, arrêt propre
├── config/
│   └── index.ts                Chargement et validation du fichier .env
├── utils/
│   ├── logger.ts               Logger Winston (couleurs + timestamps)
│   └── channelStore.ts         Persistance JSON de la map Nerimity ID ↔ Discord ID
├── nerimity/
│   ├── api.ts                  Client REST Nerimity (messages, channels)
│   └── client.ts               Client Socket.IO Nerimity (événements temps réel)
├── discord/
│   └── client.ts               Bot Discord.js + gestion des webhooks par salon
├── bridge/
│   ├── textBridge.ts           Routage bidirectionnel des messages texte
│   └── syncBridge.ts           Sync création / renommage / suppression de salons
└── voice/
    └── voiceBridge.ts          Bridge audio PCM Discord ↔ Nerimity
```

### Flux de données

```
 Nerimity                          Bot Bridge                         Discord
    │                                  │                                 │
    │── Socket.IO MESSAGE_CREATED ──►  │                                 │
    │                                  │──── Webhook (pseudo + avatar) ──►│
    │                                  │                                 │
    │◄── REST POST /messages ──────── │◄─── messageCreate event ────────│
    │                                  │                                 │
    │── CHANNEL_CREATED ────────────►  │──── guild.channels.create() ───►│
    │◄── POST /channels ────────────  │◄─── ChannelCreate event ────────│
```

---

## 🚀 Installation

### Prérequis

- **Node.js 20+** (ou Docker)
- Un **bot Discord** avec les bonnes permissions (voir ci-dessous)
- Un **token de bot Nerimity** (paramètres du compte → section Bot)

---

### Option A — Docker / Docker Compose *(recommandé pour Proxmox)*

```bash
# 1. Clone le repo
git clone https://github.com/France-OPG/bot-bridge-discord-nerimity.git
cd bot-bridge-discord-nerimity

# 2. Configure les variables d'environnement
cp .env.example .env
nano .env        # remplis les 4 valeurs obligatoires

# 3. Lance le container
docker-compose up -d

# 4. Vérifie les logs en direct
docker-compose logs -f
```

Pour arrêter :
```bash
docker-compose down
```

---

### Option B — LXC Proxmox (sans Docker)

```bash
# 1. Installe Node.js 20 + dépendances système
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs ffmpeg libopus-dev python3 make g++

# 2. Clone et configure
cd /opt
git clone https://github.com/France-OPG/bot-bridge-discord-nerimity.git
cd bot-bridge-discord-nerimity
cp .env.example .env
nano .env

# 3. Installe les dépendances et compile
npm install
npm run build

# 4. Lance avec PM2 (auto-restart au crash et au démarrage)
npm install -g pm2
pm2 start dist/index.js --name nerimity-bridge
pm2 save
pm2 startup     # suit les instructions affichées pour activer au boot
```

Commandes PM2 utiles :
```bash
pm2 logs nerimity-bridge      # logs en direct
pm2 restart nerimity-bridge   # redémarrage
pm2 stop nerimity-bridge      # arrêt
pm2 status                    # état de tous les process
```

---

### Option C — Développement local

```bash
git clone https://github.com/France-OPG/bot-bridge-discord-nerimity.git
cd bot-bridge-discord-nerimity
cp .env.example .env
nano .env

npm install
npm run dev          # ts-node (simple)
npm run dev:watch    # ts-node-dev (redémarre automatiquement)
```

---

## ⚙️ Configuration

Copie `.env.example` en `.env` et remplis les valeurs :

```env
# ── Discord ─────────────────────────────────────────────────
# Token du bot (discord.com/developers/applications → Bot → Token)
DISCORD_TOKEN=ton_token_discord_ici

# ID du serveur Discord à bridger (clic droit sur le serveur → Copier l'identifiant)
DISCORD_GUILD_ID=123456789012345678

# ── Nerimity ────────────────────────────────────────────────
# Token du bot Nerimity (nerimity.com → Paramètres → Bot → Créer un bot)
NERIMITY_TOKEN=ton_token_nerimity_ici

# ID du serveur Nerimity à bridger (paramètres du serveur ou URL)
NERIMITY_SERVER_ID=123456789012345678

# ── Bridge ──────────────────────────────────────────────────
# Préfixe visible dans les messages relayés
BRIDGE_PREFIX_DISCORD=[Discord]
BRIDGE_PREFIX_NERIMITY=[Nerimity]

# Activer le bridge vocal (true/false)
VOICE_BRIDGE_ENABLED=true

# ── Logs ────────────────────────────────────────────────────
# Niveau : error | warn | info | debug
LOG_LEVEL=info
```

---

## 🤖 Créer le bot Discord

1. Va sur [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → donne un nom (ex: `Nerimity Bridge`)
3. Onglet **Bot** → **Reset Token** → copie le token dans `.env`
4. Active les **Privileged Gateway Intents** :
   - ✅ `SERVER MEMBERS INTENT`
   - ✅ `MESSAGE CONTENT INTENT`
5. Onglet **OAuth2 → URL Generator** :
   - **Scopes** : `bot`
   - **Bot Permissions** :
     - `Read Messages / View Channels`
     - `Send Messages`
     - `Manage Channels`
     - `Manage Webhooks`
     - `Read Message History`
     - `Connect` *(vocal)*
     - `Speak` *(vocal)*
6. Copie l'URL générée et invite le bot sur ton serveur Discord

---

## 🟣 Créer le bot Nerimity

1. Connecte-toi sur [nerimity.com](https://nerimity.com)
2. Clique sur ton avatar → **Paramètres** → **Bot**
3. **Créer un bot** → copie le token dans `.env`
4. Invite le bot sur ton serveur Nerimity via son profil

Pour obtenir l'**ID du serveur Nerimity** : ouvre les paramètres du serveur, l'ID apparaît dans l'URL ou la section Info.

---

## 🔊 Bridge vocal — état actuel

### Ce qui fonctionne (Discord ✅)

- Le bot rejoint automatiquement un channel vocal dès qu'un utilisateur humain y entre
- Il reçoit l'audio PCM de chaque utilisateur via `@discordjs/voice` (décodage Opus)
- Les flux sont mixés dans un `PassThrough` stream unique
- Il quitte le vocal automatiquement quand le channel se vide
- Reconnexion automatique en cas de coupure réseau

### Ce qui est en attente (Nerimity 🔜)

Nerimity n'expose pas encore d'API vocale publique documentée. Le code de `voiceBridge.ts` contient des commentaires `TODO` précis indiquant exactement où brancher le flux audio dès que l'API sera disponible — côté émission (Discord → Nerimity) et réception (Nerimity → Discord).

---

## 🛠️ Dépannage

**Le bot ne reçoit pas les messages Discord**
→ Vérifie que l'intent `MESSAGE CONTENT` est activé dans le portail développeur Discord.

**Les salons ne se synchronisent pas**
→ Le bot Discord doit avoir la permission `Manage Channels` sur le serveur.

**Les messages se doublent**
→ Le système anti-boucle est actif (`relayedMessages` dans `textBridge.ts`). Vérifie que le bot Discord ignore bien les messages de bots (`msg.author.bot`).

**Erreur `sodium-native` ou `@discordjs/opus` à l'installation**
→ Ces packages nécessitent une compilation native. Installe les outils de build :
```bash
# Ubuntu / Debian
sudo apt install -y python3 make g++ libopus-dev

# Alpine (Docker)
apk add --no-cache python3 make g++ opus-dev
```

**Erreur de type TypeScript à la compilation**
→ Le projet utilise `"overrides": { "discord-api-types": "0.37.83" }` dans `package.json` pour résoudre le conflit de versions entre `discord.js` et `@discordjs/voice`. Si tu rencontres encore des erreurs, supprime `node_modules/` et relance `npm install`.

**Le `channel-map.json` est vide après redémarrage (Docker)**
→ Vérifie que le volume `./data:/app/data` est bien monté dans `docker-compose.yml`.

**Nerimity : événement de message non reçu**
→ Le client Socket.IO écoute `MESSAGE_CREATED` et `message:created` (fallback). Si ton instance Nerimity utilise un autre nom d'événement, inspecte le trafic WebSocket dans les DevTools de nerimity.com et adapte `src/nerimity/client.ts`.

---

## 📦 Stack technique

| Lib | Version | Rôle |
|---|---|---|
| `discord.js` | 14 | Bot Discord (texte, channels, webhooks) |
| `@discordjs/voice` | 0.17 | Connexion et réception audio Discord |
| `@discordjs/opus` | 0.9 | Encodage / décodage Opus |
| `socket.io-client` | 4.7 | Connexion WebSocket temps réel à Nerimity |
| `axios` | 1.6 | Appels REST API Nerimity |
| `winston` | 3.11 | Logger structuré avec niveaux et couleurs |
| `dotenv` | 16 | Chargement de la configuration `.env` |
| `sodium-native` | 4 | Chiffrement audio Discord (requis par voice) |
| `prism-media` | 1.3 | Transcodage PCM pour les streams audio |
| `typescript` | 5.3 | Typage statique, compilation |

---

## 📄 Licence

Ce projet est distribué sous licence **GPL-3.0**. Voir le fichier [LICENSE](LICENSE).