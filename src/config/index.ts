import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Variable d'environnement manquante : ${key}`);
  return val;
}

export const config = {
  discord: {
    token: requireEnv('DISCORD_TOKEN'),
    guildId: requireEnv('DISCORD_GUILD_ID'),
  },
  nerimity: {
    token: requireEnv('NERIMITY_TOKEN'),
    serverId: requireEnv('NERIMITY_SERVER_ID'),
    apiBase: 'https://nerimity.com/api',
    socketUrl: 'https://nerimity.com',
  },
  bridge: {
    prefixDiscord: process.env.BRIDGE_PREFIX_DISCORD ?? '[Discord]',
    prefixNerimity: process.env.BRIDGE_PREFIX_NERIMITY ?? '[Nerimity]',
    voiceEnabled: process.env.VOICE_BRIDGE_ENABLED === 'true',
  },
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
