import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { lobbyQueue, userSockets } from '../services/redis';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  UserPublic,
} from '@codeduel/shared';
import { findUserById } from '../services/auth.service';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function setupSocketIO(httpServer: HttpServer): Server {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket: TypedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwtAccessSecret) as { userId: string; username: string };
      const user = await findUserById(decoded.userId);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.userId = user.id;
      socket.data.user = {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatar_url,
        eloRating: user.elo_rating,
      };

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: TypedSocket) => {
    const user = socket.data.user;
    console.log(`User connected: ${user.username} (${socket.id})`);

    // Store socket mapping
    await userSockets.set(user.id, socket.id);

    // Join lobby (matchmaking queue)
    socket.on('join_lobby', async () => {
      try {
        await lobbyQueue.add(user.id, user.eloRating);
        const position = await lobbyQueue.getPosition(user.id);
        const queueSize = await lobbyQueue.getQueueSize();

        socket.emit('lobby_joined', {
          position,
          estimatedWait: Math.ceil(queueSize * 10), // Rough estimate in seconds
        });

        // Try to find a match
        const opponentId = await lobbyQueue.findMatch(user.id, user.eloRating);
        if (opponentId) {
          // Remove both from queue
          await lobbyQueue.remove(user.id);
          await lobbyQueue.remove(opponentId);

          // Get opponent socket
          const opponentSocketId = await userSockets.get(opponentId);
          if (opponentSocketId) {
            const opponentSocket = io.sockets.sockets.get(opponentSocketId);
            if (opponentSocket) {
              // TODO: Create match in database and notify both players
              // For now, just emit match_found with placeholder data
              console.log(`Match found: ${user.username} vs opponent ${opponentId}`);
            }
          }
        }
      } catch (error) {
        console.error('Join lobby error:', error);
        socket.emit('error', 'Failed to join lobby');
      }
    });

    // Leave lobby
    socket.on('leave_lobby', async () => {
      try {
        await lobbyQueue.remove(user.id);
        socket.emit('lobby_left');
      } catch (error) {
        console.error('Leave lobby error:', error);
        socket.emit('error', 'Failed to leave lobby');
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${user.username}`);
      await userSockets.remove(user.id);
      await lobbyQueue.remove(user.id);
    });
  });

  return io;
}
