import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NerMessage } from './api';

// ---- Types d'événements Socket.IO Nerimity ----

export interface NerSocketMessage extends NerMessage {}

export interface NerChannelCreated {
  id: string;
  name: string;
  type: number;
  serverId: string;
}

export interface NerChannelUpdated {
  channelId: string;
  updated: { name?: string };
}

export interface NerChannelDeleted {
  channelId: string;
  serverId: string;
}

// Événements que notre EventEmitter va émettre (côté bridge)
export interface NerimityClientEvents {
  message: (msg: NerSocketMessage) => void;
  channelCreated: (ch: NerChannelCreated) => void;
  channelUpdated: (ch: NerChannelUpdated) => void;
  channelDeleted: (ch: NerChannelDeleted) => void;
  ready: () => void;
  disconnect: () => void;
}

export class NerimityClient extends EventEmitter {
  private socket!: Socket;
  private reconnectTimer?: NodeJS.Timeout;

  connect(): void {
    logger.info('Connexion au WebSocket Nerimity...');

    this.socket = io(config.nerimity.socketUrl, {
      transports: ['websocket'],
      auth: { token: config.nerimity.token },
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => {
      logger.info('✅ Nerimity WebSocket connecté');
      this.emit('ready');
    });

    this.socket.on('disconnect', (reason: string) => {
      logger.warn(`⚠️  Nerimity WebSocket déconnecté : ${reason}`);
      this.emit('disconnect');
    });

    this.socket.on('connect_error', (err: Error) => {
      logger.error('Erreur connexion Nerimity WebSocket', { message: err.message });
    });

    // --- Réception de messages ---
    // L'event exact peut varier selon la version du serveur Nerimity
    // Événements possibles : 'MESSAGE_CREATED', 'message:created', etc.
    this.socket.on('MESSAGE_CREATED', (data: NerSocketMessage) => {
      logger.debug('Nerimity MESSAGE_CREATED', { channelId: data.channelId, user: data.createdBy?.username });
      this.emit('message', data);
    });

    // Fallback si le serveur utilise un autre nom d'event
    this.socket.on('message:created', (data: NerSocketMessage) => {
      logger.debug('Nerimity message:created (fallback)', { channelId: data.channelId });
      this.emit('message', data);
    });

    // --- Gestion des channels ---
    this.socket.on('CHANNEL_CREATED', (data: NerChannelCreated) => {
      logger.info(`Nerimity: nouveau channel créé — ${data.name}`);
      this.emit('channelCreated', data);
    });

    this.socket.on('CHANNEL_UPDATED', (data: NerChannelUpdated) => {
      logger.info(`Nerimity: channel mis à jour — ${data.channelId}`);
      this.emit('channelUpdated', data);
    });

    this.socket.on('CHANNEL_DELETED', (data: NerChannelDeleted) => {
      logger.info(`Nerimity: channel supprimé — ${data.channelId}`);
      this.emit('channelDeleted', data);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  /** Permet d'émettre un event côté Socket.IO (pour usage futur) */
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }
}

export const nerimityClient = new NerimityClient();
