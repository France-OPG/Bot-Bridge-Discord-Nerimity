import fs from 'fs';
import path from 'path';
import { logger } from './logger';

const MAP_FILE = path.resolve('./data/channel-map.json');

export interface ChannelPair {
  nerimityChannelId: string;
  discordChannelId: string;
  name: string;
  type: 'text' | 'voice';
}

class ChannelStore {
  private pairs: ChannelPair[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(MAP_FILE)) {
        const raw = fs.readFileSync(MAP_FILE, 'utf-8');
        this.pairs = JSON.parse(raw);
        logger.info(`Channel map chargée : ${this.pairs.length} paires`);
      }
    } catch (err) {
      logger.warn('Impossible de charger channel-map.json, on repart de zéro');
      this.pairs = [];
    }
  }

  save(): void {
    try {
      fs.mkdirSync(path.dirname(MAP_FILE), { recursive: true });
      fs.writeFileSync(MAP_FILE, JSON.stringify(this.pairs, null, 2));
    } catch (err) {
      logger.error('Erreur sauvegarde channel-map', { err });
    }
  }

  addPair(pair: ChannelPair): void {
    const existing = this.pairs.findIndex(
      p => p.nerimityChannelId === pair.nerimityChannelId
    );
    if (existing >= 0) {
      this.pairs[existing] = pair;
    } else {
      this.pairs.push(pair);
    }
    this.save();
  }

  removePairByNerimity(nerimityChannelId: string): void {
    this.pairs = this.pairs.filter(p => p.nerimityChannelId !== nerimityChannelId);
    this.save();
  }

  removePairByDiscord(discordChannelId: string): void {
    this.pairs = this.pairs.filter(p => p.discordChannelId !== discordChannelId);
    this.save();
  }

  getByNerimity(nerimityChannelId: string): ChannelPair | undefined {
    return this.pairs.find(p => p.nerimityChannelId === nerimityChannelId);
  }

  getByDiscord(discordChannelId: string): ChannelPair | undefined {
    return this.pairs.find(p => p.discordChannelId === discordChannelId);
  }

  getAll(): ChannelPair[] {
    return [...this.pairs];
  }

  getTextPairs(): ChannelPair[] {
    return this.pairs.filter(p => p.type === 'text');
  }

  getVoicePairs(): ChannelPair[] {
    return this.pairs.filter(p => p.type === 'voice');
  }

  updateDiscordId(nerimityChannelId: string, discordChannelId: string): void {
    const pair = this.pairs.find(p => p.nerimityChannelId === nerimityChannelId);
    if (pair) {
      pair.discordChannelId = discordChannelId;
      this.save();
    }
  }
}

export const channelStore = new ChannelStore();
