import Redis from 'ioredis';
import { config } from '../config/env';

export const redis = new Redis(config.redisUrl);

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

// Lobby queue operations
export const lobbyQueue = {
  async add(userId: string, eloRating: number): Promise<void> {
    await redis.zadd('lobby:queue', eloRating, userId);
  },

  async remove(userId: string): Promise<void> {
    await redis.zrem('lobby:queue', userId);
  },

  async getPosition(userId: string): Promise<number> {
    const rank = await redis.zrank('lobby:queue', userId);
    return rank !== null ? rank + 1 : -1;
  },

  async getQueueSize(): Promise<number> {
    return redis.zcard('lobby:queue');
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
