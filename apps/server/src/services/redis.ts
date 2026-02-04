import Redis from 'ioredis';
import { config } from '../config/env';

export const redis = new Redis(config.redisUrl);

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

// BullMQ requires maxRetriesPerRequest: null for blocking operations
export const bullMQConnection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

bullMQConnection.on('error', (err) => {
  console.error('BullMQ Redis connection error:', err);
});

// Match duration in minutes
const MATCH_DURATION_MINUTES = 15;

// Lobby queue operations
export const lobbyQueue = {
  async add(userId: string, eloRating: number): Promise<void> {
    await redis.zadd('lobby:queue', eloRating, userId);
    // Also store join time for range expansion
    await this.setJoinTime(userId);
  },

  async remove(userId: string): Promise<void> {
    await redis.zrem('lobby:queue', userId);
    await redis.del(`lobby:jointime:${userId}`);
  },

  async getPosition(userId: string): Promise<number> {
    const rank = await redis.zrank('lobby:queue', userId);
    return rank !== null ? rank + 1 : -1;
  },

  async getQueueSize(): Promise<number> {
    return redis.zcard('lobby:queue');
  },

  async setJoinTime(userId: string): Promise<void> {
    await redis.set(`lobby:jointime:${userId}`, Date.now().toString());
  },

  async getJoinTime(userId: string): Promise<number | null> {
    const time = await redis.get(`lobby:jointime:${userId}`);
    return time ? parseInt(time, 10) : null;
  },

  async findMatch(userId: string, eloRating: number, range: number = 200): Promise<string | null> {
    // Find players within ELO range
    const minElo = eloRating - range;
    const maxElo = eloRating + range;
    const candidates = await redis.zrangebyscore('lobby:queue', minElo, maxElo);

    // Filter out the requesting user
    const opponent = candidates.find((id) => id !== userId);
    return opponent || null;
  },

  /**
   * Find match with expanding ELO range based on wait time
   * Range: 200 base + 50 per 10 seconds waited, max 500
   */
  async findMatchWithExpandingRange(userId: string, eloRating: number): Promise<string | null> {
    const joinTime = await this.getJoinTime(userId);
    const now = Date.now();

    // Calculate expanded range based on wait time
    let range = 200; // Base range
    if (joinTime) {
      const waitSeconds = (now - joinTime) / 1000;
      const expansion = Math.floor(waitSeconds / 10) * 50;
      range = Math.min(200 + expansion, 500); // Max 500 ELO range
    }

    return this.findMatch(userId, eloRating, range);
  },

  /**
   * Get all users in the lobby with their ELO ratings
   */
  async getAllUsers(): Promise<Array<{ id: string; elo: number }>> {
    const users = await redis.zrange('lobby:queue', 0, -1, 'WITHSCORES');
    const result: Array<{ id: string; elo: number }> = [];

    for (let i = 0; i < users.length; i += 2) {
      result.push({
        id: users[i],
        elo: parseInt(users[i + 1], 10),
      });
    }

    return result;
  },
};

// User socket mapping
export const userSockets = {
  async set(userId: string, socketId: string): Promise<void> {
    await redis.set(`user:${userId}:socket`, socketId);
  },

  async get(userId: string): Promise<string | null> {
    return redis.get(`user:${userId}:socket`);
  },

  async remove(userId: string): Promise<void> {
    await redis.del(`user:${userId}:socket`);
  },
};

// Match state
export const matchState = {
  async set(matchId: string, state: Record<string, string>): Promise<void> {
    await redis.hset(`match:${matchId}:state`, state);
  },

  async get(matchId: string): Promise<Record<string, string>> {
    return redis.hgetall(`match:${matchId}:state`);
  },

  async delete(matchId: string): Promise<void> {
    await redis.del(`match:${matchId}:state`);
  },
};

// Player code state for real-time sync
export const playerCode = {
  async set(matchId: string, playerId: string, code: string): Promise<void> {
    await redis.hset(`match:${matchId}:code`, playerId, code);
  },

  async get(matchId: string, playerId: string): Promise<string | null> {
    return redis.hget(`match:${matchId}:code`, playerId);
  },

  async getAll(matchId: string): Promise<Record<string, string>> {
    return redis.hgetall(`match:${matchId}:code`);
  },

  async delete(matchId: string): Promise<void> {
    await redis.del(`match:${matchId}:code`);
  },
};

// Match timer operations
export const matchTimer = {
  async setEndTime(matchId: string, endTime: Date): Promise<void> {
    await redis.set(`match:${matchId}:endtime`, endTime.toISOString());
    // Auto-expire after match duration + buffer
    await redis.expire(`match:${matchId}:endtime`, (MATCH_DURATION_MINUTES + 5) * 60);
  },

  async getEndTime(matchId: string): Promise<Date | null> {
    const endTime = await redis.get(`match:${matchId}:endtime`);
    return endTime ? new Date(endTime) : null;
  },

  async delete(matchId: string): Promise<void> {
    await redis.del(`match:${matchId}:endtime`);
  },

  /**
   * Create end time from now + duration
   */
  createEndTime(durationMinutes: number = MATCH_DURATION_MINUTES): Date {
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);
    return endTime;
  },
};

// Match players mapping (for quick lookup)
export const matchPlayers = {
  async set(matchId: string, player1Id: string, player2Id: string): Promise<void> {
    await redis.hset(`match:${matchId}:players`, {
      player1: player1Id,
      player2: player2Id,
    });
    // Also set reverse mapping for quick match lookup by player
    await redis.set(`player:${player1Id}:match`, matchId);
    await redis.set(`player:${player2Id}:match`, matchId);
  },

  async get(matchId: string): Promise<{ player1: string; player2: string } | null> {
    const players = await redis.hgetall(`match:${matchId}:players`);
    if (!players.player1 || !players.player2) {
      return null;
    }
    return { player1: players.player1, player2: players.player2 };
  },

  async getMatchByPlayer(playerId: string): Promise<string | null> {
    return redis.get(`player:${playerId}:match`);
  },

  async delete(matchId: string, player1Id: string, player2Id: string): Promise<void> {
    await redis.del(`match:${matchId}:players`);
    await redis.del(`player:${player1Id}:match`);
    await redis.del(`player:${player2Id}:match`);
  },
};

// Chat message storage
const MAX_CHAT_MESSAGES = 50;

export interface StoredChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  type: 'user' | 'system';
}

export const lobbyChat = {
  async addMessage(message: StoredChatMessage): Promise<void> {
    await redis.lpush('chat:lobby', JSON.stringify(message));
    await redis.ltrim('chat:lobby', 0, MAX_CHAT_MESSAGES - 1);
  },

  async getMessages(limit: number = MAX_CHAT_MESSAGES): Promise<StoredChatMessage[]> {
    const messages = await redis.lrange('chat:lobby', 0, limit - 1);
    return messages.map((m) => JSON.parse(m)).reverse();
  },
};

export const matchChat = {
  async addMessage(matchId: string, message: StoredChatMessage): Promise<void> {
    await redis.lpush(`chat:match:${matchId}`, JSON.stringify(message));
    await redis.ltrim(`chat:match:${matchId}`, 0, MAX_CHAT_MESSAGES - 1);
    // Auto-expire match chat after 1 hour
    await redis.expire(`chat:match:${matchId}`, 3600);
  },

  async getMessages(matchId: string, limit: number = MAX_CHAT_MESSAGES): Promise<StoredChatMessage[]> {
    const messages = await redis.lrange(`chat:match:${matchId}`, 0, limit - 1);
    return messages.map((m) => JSON.parse(m)).reverse();
  },

  async delete(matchId: string): Promise<void> {
    await redis.del(`chat:match:${matchId}`);
  },
};

// Spectator tracking
export const spectators = {
  async add(matchId: string, userId: string): Promise<number> {
    await redis.sadd(`match:${matchId}:spectators`, userId);
    return this.getCount(matchId);
  },

  async remove(matchId: string, userId: string): Promise<number> {
    await redis.srem(`match:${matchId}:spectators`, userId);
    return this.getCount(matchId);
  },

  async getCount(matchId: string): Promise<number> {
    return redis.scard(`match:${matchId}:spectators`);
  },

  async getAll(matchId: string): Promise<string[]> {
    return redis.smembers(`match:${matchId}:spectators`);
  },

  async delete(matchId: string): Promise<void> {
    await redis.del(`match:${matchId}:spectators`);
  },
};

// Active matches tracking (for spectator browsing)
export const activeMatches = {
  async add(matchId: string): Promise<void> {
    await redis.sadd('matches:active', matchId);
  },

  async remove(matchId: string): Promise<void> {
    await redis.srem('matches:active', matchId);
  },

  async getAll(): Promise<string[]> {
    return redis.smembers('matches:active');
  },
};
