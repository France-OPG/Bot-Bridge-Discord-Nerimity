import 'dotenv/config';
import { Events } from 'discord.js';
import { discordBot } from './discord/client';
import { nerimityClient } from './nerimity/client';
import { syncBridge } from './bridge/syncBridge';
import { textBridge } from './bridge/textBridge';
import { voiceBridge } from './voice/voiceBridge';
import { config } from './config';
import { logger } from './utils/logger';

// ─────────────────────────────────────────────────────────────
//  Bootstrap
// ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  logger.info('🚀 Démarrage du bridge Nerimity ↔ Discord...');

  // ── 1. Connexion Discord ──────────────────────────────────
  await new Promise<void>((resolve, reject) => {
    discordBot.once(Events.ClientReady, async client => {
      logger.info(`✅ Discord connecté en tant que ${client.user.tag}`);
      resolve();
    });
    discordBot.once('error', reject);
    discordBot.login(config.discord.token).catch(reject);
  });

  // ── 2. Connexion Nerimity ─────────────────────────────────
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timeout connexion Nerimity (15s)')),
      15_000
    );

    nerimityClient.once('ready', () => {
      clearTimeout(timeout);
      logger.info('✅ Nerimity connecté');
      resolve();
    });

    nerimityClient.connect();
  });

  // ── 3. Sync initiale des channels ─────────────────────────
  logger.info('🔄 Synchronisation initiale des channels...');
  await syncBridge.init();

  // ── 4. Démarrage des bridges ──────────────────────────────
  textBridge.init();
  voiceBridge.init();

  logger.info('✅ Bridge opérationnel !');
  logger.info(`   - Bridge texte   : actif`);
  logger.info(`   - Bridge vocal   : ${config.bridge.voiceEnabled ? 'actif' : 'désactivé'}`);
  logger.info(`   - Paires de salons : ${require('./utils/channelStore').channelStore.getAll().length}`);
}

// ─────────────────────────────────────────────────────────────
//  Gestion des erreurs critiques et arrêt propre
// ─────────────────────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  logger.error('Erreur non gérée (promise)', { reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Exception non capturée', { message: err.message, stack: err.stack });
  process.exit(1);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`Signal ${signal} reçu — arrêt propre...`);
  voiceBridge.closeAllSessions();
  nerimityClient.disconnect();
  discordBot.destroy();
  logger.info('Bridge arrêté. À bientôt !');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─────────────────────────────────────────────────────────────
//  Lancement
// ─────────────────────────────────────────────────────────────

main().catch(err => {
  logger.error('Erreur critique au démarrage', { message: err.message, stack: err.stack });
  process.exit(1);
});
