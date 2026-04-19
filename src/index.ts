import 'dotenv/config';
import { Events } from 'discord.js';
import { discordBot } from './discord/client';
import { nerimityClient } from './nerimity/client';
import { syncBridge } from './bridge/syncBridge';
import { textBridge } from './bridge/textBridge';
import { voiceBridge } from './voice/voiceBridge';
import { config } from './config';
import { logger } from './utils/logger';
import { channelStore } from './utils/channelStore';

// ─────────────────────────────────────────────────────────────
//  Bootstrap
// ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  logger.info('🚀 Démarrage du bridge Nerimity ↔ Discord...');

  // ── 1. Connexion Discord ──────────────────────────────────
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timeout connexion Discord (30s)')),
      30_000
    );
    discordBot.once(Events.ClientReady, client => {
      clearTimeout(timer);
      logger.info(`✅ Discord connecté en tant que ${client.user.tag}`);
      resolve();
    });
    discordBot.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    discordBot.login(config.discord.token).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  // ── 2. Connexion Nerimity (non bloquante si timeout) ──────
  // On n'utilise plus reject() sur timeout — le bot reste actif
  // même si Nerimity met du temps à authentifier
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      logger.warn('⚠️  Nerimity: pas de réponse après 30s — on continue quand même');
      resolve(); // non-fatal : on continue sans Nerimity pour l'instant
    }, 30_000);

    nerimityClient.once('ready', () => {
      clearTimeout(timeout);
      logger.info('✅ Nerimity authentifié et prêt');
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
  logger.info(`   - Paires de salons : ${channelStore.getAll().length}`);
}

// ─────────────────────────────────────────────────────────────
//  Gestion des erreurs — le bot ne crashe JAMAIS
// ─────────────────────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  // Log mais ne crash pas
  logger.error('Erreur non gérée (promise)', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  // Log mais ne crash pas — sauf si vraiment critique
  logger.error('Exception non capturée', { message: err.message });
  // Ne pas appeler process.exit() ici pour éviter la boucle PM2
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
  logger.error('Erreur critique au démarrage', {
    message: err.message,
    stack: err.stack,
  });
  // On attend 5s avant de quitter pour que PM2 ne boucle pas trop vite
  setTimeout(() => process.exit(1), 5000);
});
