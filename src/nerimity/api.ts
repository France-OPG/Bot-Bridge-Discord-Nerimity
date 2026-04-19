import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface NerChannel {
  id: string;
  name: string;
  type: number; // 0 = texte, 2 = vocal (selon le serveur Nerimity)
  order?: number;
}

export interface NerMessage {
  id: string;
  content: string;
  createdBy: {
    id: string;
    username: string;
    tag: string;
    avatar?: string;
  };
  channelId: string;
}

export interface NerServer {
  id: string;
  name: string;
  channels: NerChannel[];
}

// Types Nerimity : 0 = TEXT, 1 = CATEGORY, 2 = VOICE (non officiel, à vérifier)
export const NER_CHANNEL_TYPE = {
  TEXT: 0,
  CATEGORY: 1,
  VOICE: 2,
} as const;

class NerimityApi {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: config.nerimity.apiBase,
      headers: {
        Authorization: config.nerimity.token,
        'Content-Type': 'application/json',
      },
    });

    // Log des erreurs HTTP
    this.http.interceptors.response.use(
      res => res,
      err => {
        logger.error('Nerimity API error', {
          status: err.response?.status,
          url: err.config?.url,
          data: err.response?.data,
        });
        return Promise.reject(err);
      }
    );
  }

  /** Récupère les infos du serveur Nerimity (channels inclus) */
  async getServer(): Promise<NerServer> {
    const res = await this.http.get(`/servers/${config.nerimity.serverId}`);
    return res.data;
  }

  /** Liste les channels du serveur */
  async getChannels(): Promise<NerChannel[]> {
    const server = await this.getServer();
    return server.channels ?? [];
  }

  /** Envoie un message dans un channel Nerimity */
  async sendMessage(channelId: string, content: string): Promise<NerMessage> {
    const res = await this.http.post(
      `/channels/${channelId}/messages`,
      { content }
    );
    return res.data;
  }

  /** Crée un channel texte dans le serveur Nerimity */
  async createTextChannel(name: string): Promise<NerChannel> {
    const res = await this.http.post(
      `/servers/${config.nerimity.serverId}/channels`,
      { name, type: NER_CHANNEL_TYPE.TEXT }
    );
    return res.data;
  }

  /** Crée un channel vocal dans le serveur Nerimity */
  async createVoiceChannel(name: string): Promise<NerChannel> {
    const res = await this.http.post(
      `/servers/${config.nerimity.serverId}/channels`,
      { name, type: NER_CHANNEL_TYPE.VOICE }
    );
    return res.data;
  }

  /** Supprime un channel Nerimity */
  async deleteChannel(channelId: string): Promise<void> {
    await this.http.delete(`/channels/${channelId}`);
  }

  /** Modifie le nom d'un channel Nerimity */
  async updateChannel(channelId: string, name: string): Promise<NerChannel> {
    const res = await this.http.patch(`/channels/${channelId}`, { name });
    return res.data;
  }
}

export const nerimityApi = new NerimityApi();
