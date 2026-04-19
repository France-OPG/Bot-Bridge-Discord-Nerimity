import { Message, ChannelType } from 'discord.js';
import { discordBot } from '../discord/client';
import { nerimityApi, NerMessage } from '../nerimity/api';
import { nerimityClient } from '../nerimity/client';
import { channelStore } from '../utils/channelStore';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * TextBridge — gère le routage bidirectionnel des messages texte
 *
 * Nerimity → Discord : via WebhookClient (nom + avatar de l'utilisateur)
 * Discord  → Nerimity : via API REST Nerimity
 */
class TextBridge {
  // Ensemble des IDs de messages déjà relayés (évite les boucles)
  private relayedMessages = new Set<string>();
  private readonly RELAY_TTL_MS = 10_000; // on nettoie après 10s

  init(): void {
    this.listenNerimity();
    this.listenDiscord();
    logger.info('TextBridge initialisé');
  }

  // ─────────────────────────────────────────────
  //  NERIMITY → DISCORD
  // ─────────────────────────────────────────────

  private listenNerimity(): void {
    nerimityClient.on('message', async (msg: NerMessage) => {
      // Ignore les messages du bot lui-même
      if (this.isRelayed(msg.id)) return;

      const pair = channelStore.getByNerimity(msg.channelId);
      if (!pair || pair.type !== 'text') return;

      const username = msg.createdBy?.username ?? 'Inconnu';
      const avatarURL = msg.createdBy?.avatar
        ? `https://cdn.nerimity.com/avatars/${msg.createdBy.id}/${msg.createdBy.avatar}.webp`
        : undefined;

      logger.info(`Nerimity→Discord | #${pair.name} | ${username}: ${msg.content}`);

      this.markRelayed(msg.id);
      await discordBot.sendViaWebhook(
        pair.discordChannelId,
        msg.content,
        username,
        avatarURL
      );
    });
  }

  // ─────────────────────────────────────────────
  //  DISCORD → NERIMITY
  // ─────────────────────────────────────────────

  private listenDiscord(): void {
    discordBot.on('messageCreate', async (msg: Message) => {
      // Ignore les bots (dont les webhooks du bridge lui-même)
      if (msg.author.bot) return;
      if (msg.channel.type !== ChannelType.GuildText) return;
      if (this.isRelayed(msg.id)) return;

      const pair = channelStore.getByDiscord(msg.channel.id);
      if (!pair || pair.type !== 'text') return;

      const prefix = config.bridge.prefixDiscord;
      const content = `**${prefix} ${msg.author.username}** : ${msg.content}`;

      logger.info(`Discord→Nerimity | #${pair.name} | ${msg.author.username}: ${msg.content}`);

      this.markRelayed(msg.id);
      await nerimityApi.sendMessage(pair.nerimityChannelId, content);
    });
  }

  // ─────────────────────────────────────────────
  //  Anti-boucle
  // ─────────────────────────────────────────────

  private markRelayed(id: string): void {
    this.relayedMessages.add(id);
    setTimeout(() => this.relayedMessages.delete(id), this.RELAY_TTL_MS);
  }

  private isRelayed(id: string): boolean {
    return this.relayedMessages.has(id);
  }
}

export const textBridge = new TextBridge();
