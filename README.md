# 🔗 Nerimity ↔ Discord Bridge

Bot passerelle bidirectionnel entre **Nerimity** et **Discord**.

## Fonctionnalités

| Feature | État |
|---|---|
| Messages texte Nerimity → Discord | ✅ |
| Messages texte Discord → Nerimity | ✅ |
| Sync création de salons (les deux sens) | ✅ |
| Sync renommage de salons (les deux sens) | ✅ |
| Sync suppression de salons (les deux sens) | ✅ |
| Bridge vocal Discord (réception PCM) | ✅ |
| Bridge vocal Nerimity (en attente de l'API officielle) | 🔜 |

---

## Prérequis

- Node.js 20+ (ou Docker)
- Un bot Discord avec les permissions `Send Messages`, `Manage Channels`, `Manage Webhooks`, `Connect`, `Speak`
- Un token de bot Nerimity (paramètres du compte → Bot)

---

## Installation

### Option A — Docker (recommandé pour Proxmox)

```bash
# 1. Clone ou copie le projet
git clone <ton-repo> nerimity-discord-bridge
cd nerimity-discord-bridge

# 2. Configure les variables d'environnement
cp .env.example .env
nano .env   # remplis les tokens et IDs

# 3. Lance le container
docker-compose up -d

# 4. Vérifier les logs
docker-compose logs -f
```

### Option B — LXC Proxmox (sans Docker)

```bash
# Dans ton LXC Ubuntu 22.04 :
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs ffmpeg libopus-dev python3 make g++

cd /opt
git clone <ton-repo> nerimity-discord-bridge
cd nerimity-discord-bridge
cp .env.example .env
nano .env

npm install
npm run build

# Démarrage avec PM2 (auto-restart)
npm install -g pm2
pm2 start dist/index.js --name bridge
pm2 save
pm2 startup
```

---

## Configuration (.env)

```env
# Bot Discord (discord.com/developers/applications)
DISCORD_TOKEN=ton_token_ici
DISCORD_GUILD_ID=ID_du_serveur_discord

# Bot Nerimity (paramètres compte → Bot)
NERIMITY_TOKEN=ton_token_ici
NERIMITY_SERVER_ID=ID_du_serveur_nerimity

# Format des messages bridgés
BRIDGE_PREFIX_DISCORD=[Discord]
BRIDGE_PREFIX_NERIMITY=[Nerimity]

# Activer le bridge vocal
VOICE_BRIDGE_ENABLED=true

# Logs
LOG_LEVEL=info
```

---

## Comment créer le bot Discord

1. Va sur [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → donne un nom
3. Onglet **Bot** → **Add Bot** → copie le token dans `.env`
4. Active les **Privileged Gateway Intents** : `GUILD_MEMBERS`, `MESSAGE_CONTENT`
5. Onglet **OAuth2 → URL Generator** :
   - Scopes : `bot`, `applications.commands`
   - Permissions : `Send Messages`, `Manage Channels`, `Manage Webhooks`, `Read Message History`, `Connect`, `Speak`
6. Copie l'URL générée et invite le bot sur ton serveur Discord

---

## Comment obtenir le token Nerimity

1. Connecte-toi sur [nerimity.com](https://nerimity.com)
2. Paramètres → **Bot** → Crée un bot → copie le token

Pour obtenir l'ID de ton serveur Nerimity :
- Va dans les paramètres du serveur ou regarde l'URL

---

## Architecture technique

```
src/
├── config/         Configuration (.env)
├── utils/
│   ├── logger.ts           Winston logger
│   └── channelStore.ts     Persistance de la map channel Nerimity↔Discord
├── nerimity/
│   ├── api.ts              Client REST Nerimity
│   └── client.ts           Client Socket.IO Nerimity (temps réel)
├── discord/
│   └── client.ts           Bot Discord (discord.js) + webhooks
├── bridge/
│   ├── textBridge.ts       Routage messages texte bidirectionnel
│   └── syncBridge.ts       Sync création/renommage/suppression de salons
├── voice/
│   └── voiceBridge.ts      Bridge audio PCM Discord ↔ Nerimity
└── index.ts                Point d'entrée + bootstrap
```

---

## Bridge vocal — état actuel

Le côté **Discord** est entièrement implémenté :
- Le bot rejoint automatiquement le vocal quand un utilisateur arrive
- Il reçoit l'audio PCM de tous les utilisateurs (via `@discordjs/voice`)
- Il mixe les flux dans un `PassThrough` prêt à être envoyé

Le côté **Nerimity** est en attente : Nerimity n'a pas encore d'API vocale publique documentée. Le code contient des hooks `TODO` clairs pour brancher le flux dès qu'elle sera disponible.

---

## Dépannage

**Le bot ne voit pas les messages Discord**
→ Vérifie que l'intent `MESSAGE_CONTENT` est activé dans le portail développeur Discord.

**Les channels ne se synchronisent pas**
→ Vérifie que le bot Discord a la permission `Manage Channels`.

**Erreur `sodium-native`**
→ Installe les dépendances build : `apt install python3 make g++` puis `npm install`.

**Les messages se doublent**
→ Normal si le bot écoute ses propres webhooks. Le système anti-boucle (`relayedMessages`) gère ça. Vérifie que le bot Discord ignore bien `msg.author.bot`.
