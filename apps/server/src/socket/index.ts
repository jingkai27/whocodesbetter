import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import {
  lobbyQueue,
  userSockets,
  playerCode,
  matchTimer,
  matchPlayers,
  lobbyChat,
  matchChat,
  spectators,
  activeMatches,
  StoredChatMessage,
} from '../services/redis';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  UserPublic,
  CodeSubmission,
  ChatMessage,
  ActiveMatchSummary,
} from '@codeduel/shared';
import { findUserById } from '../services/auth.service';
import { matchService } from '../services/match.service';
import { addExecutionJob } from '../queues/execution.queue';
import { onJobCompleted } from '../workers/execution.worker';
import { ExecutionJobResult } from '../queues/execution.queue';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Store active Socket.IO server instance for use in callbacks
let ioInstance: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function setupSocketIO(httpServer: HttpServer): Server {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  ioInstance = io;

  // Set up job completion callback to emit results to clients
  onJobCompleted(handleJobCompleted);

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

    // Check if user has an active match they can rejoin
    const activeMatch = await matchService.getUserActiveMatch(user.id);
    if (activeMatch) {
      // Auto-rejoin match room
      socket.join(`match:${activeMatch.id}`);
      socket.emit('match_found', activeMatch);
    }

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

        // Try to find a match immediately
        await tryMatchmaking(user.id, user.eloRating, io);
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

    // Submit code for execution
    socket.on('submit_code', async (submission: CodeSubmission) => {
      try {
        // Validate submission
        if (!submission.code || !submission.matchId || !submission.language) {
          socket.emit('error', 'Invalid submission');
          return;
        }

        // Get match details
        const match = await matchService.getMatchById(submission.matchId);
        if (!match) {
          socket.emit('error', 'Match not found');
          return;
        }

        // Verify player is in this match
        if (match.player1.id !== user.id && match.player2.id !== user.id) {
          socket.emit('error', 'You are not in this match');
          return;
        }

        // Check if match is still active
        if (match.status !== 'IN_PROGRESS') {
          socket.emit('error', 'Match is not in progress');
          return;
        }

        console.log(`Code submitted by ${user.username} for match ${submission.matchId}`);

        // Add execution job to queue
        await addExecutionJob({
          matchId: submission.matchId,
          playerId: user.id,
          code: submission.code,
          language: submission.language,
          problemId: match.problem.id,
          testCases: match.problem.testCases,
          isRun: false,
        });
      } catch (error) {
        console.error('Submit code error:', error);
        socket.emit('error', 'Failed to submit code');
      }
    });

    // Run code against visible test cases only (doesn't end match)
    socket.on('run_code', async (submission: CodeSubmission) => {
      try {
        // Validate submission
        if (!submission.code || !submission.matchId || !submission.language) {
          socket.emit('error', 'Invalid submission');
          return;
        }

        // Get match details
        const match = await matchService.getMatchById(submission.matchId);
        if (!match) {
          socket.emit('error', 'Match not found');
          return;
        }

        // Verify player is in this match
        if (match.player1.id !== user.id && match.player2.id !== user.id) {
          socket.emit('error', 'You are not in this match');
          return;
        }

        // Check if match is still active
        if (match.status !== 'IN_PROGRESS') {
          socket.emit('error', 'Match is not in progress');
          return;
        }

        console.log(`Code run by ${user.username} for match ${submission.matchId}`);

        // Filter to visible test cases only
        const visibleTestCases = match.problem.testCases.filter((tc) => !tc.isHidden);

        // Add execution job to queue with isRun flag
        await addExecutionJob({
          matchId: submission.matchId,
          playerId: user.id,
          code: submission.code,
          language: submission.language,
          problemId: match.problem.id,
          testCases: visibleTestCases,
          isRun: true,
        });
      } catch (error) {
        console.error('Run code error:', error);
        socket.emit('error', 'Failed to run code');
      }
    });

    // Real-time code updates
    socket.on('code_update', async ({ matchId, code }) => {
      try {
        // Store code in Redis
        await playerCode.set(matchId, user.id, code);

        // Broadcast to opponent in the room (except sender)
        socket.to(`match:${matchId}`).emit('opponent_code_update', { code });

        // Also broadcast to spectators with player ID
        io.to(`match:${matchId}:spectators`).emit('player_code_update', {
          playerId: user.id,
          code,
        });
      } catch (error) {
        console.error('Code update error:', error);
      }
    });

    // Forfeit match
    socket.on('forfeit_match', async (matchId: string) => {
      try {
        const match = await matchService.getMatchById(matchId);
        if (!match) {
          socket.emit('error', 'Match not found');
          return;
        }

        // Verify player is in this match
        if (match.player1.id !== user.id && match.player2.id !== user.id) {
          socket.emit('error', 'You are not in this match');
          return;
        }

        // Determine winner (opponent wins)
        const winnerId = match.player1.id === user.id ? match.player2.id : match.player1.id;

        // End match with forfeit
        await matchService.endMatch(matchId, winnerId, 'FORFEIT');

        // Clean up Redis state
        await cleanupMatch(matchId, match.player1.id, match.player2.id);

        // Notify both players
        io.to(`match:${matchId}`).emit('match_ended', {
          winnerId,
          reason: 'FORFEIT',
        });

        console.log(`Match ${matchId} ended by forfeit. Winner: ${winnerId}`);
      } catch (error) {
        console.error('Forfeit match error:', error);
        socket.emit('error', 'Failed to forfeit match');
      }
    });

    // Join/rejoin a match room (for reconnection)
    socket.on('join_match', async (matchId: string) => {
      try {
        const match = await matchService.getMatchById(matchId);
        if (!match) {
          socket.emit('error', 'Match not found');
          return;
        }

        // Verify player is in this match
        if (match.player1.id !== user.id && match.player2.id !== user.id) {
          socket.emit('error', 'You are not in this match');
          return;
        }

        // Join room
        socket.join(`match:${matchId}`);

        // Send current match state
        socket.emit('match_started', match);

        // Send opponent's current code if available
        const opponentId = match.player1.id === user.id ? match.player2.id : match.player1.id;
        const opponentCode = await playerCode.get(matchId, opponentId);
        if (opponentCode) {
          socket.emit('opponent_code_update', { code: opponentCode });
        }

        console.log(`User ${user.username} joined match room ${matchId}`);
      } catch (error) {
        console.error('Join match error:', error);
        socket.emit('error', 'Failed to join match');
      }
    });

    // ==================== CHAT EVENTS ====================

    // Send message to global lobby chat
    socket.on('send_lobby_message', async (content: string) => {
      try {
        if (!content || content.trim().length === 0) return;
        if (content.length > 500) {
          socket.emit('error', 'Message too long (max 500 characters)');
          return;
        }

        const message: StoredChatMessage = {
          id: uuidv4(),
          userId: user.id,
          username: user.username,
          content: content.trim(),
          timestamp: new Date().toISOString(),
          type: 'user',
        };

        // Store in Redis
        await lobbyChat.addMessage(message);

        // Broadcast to all connected clients
        io.emit('lobby_message', {
          ...message,
          timestamp: new Date(message.timestamp),
        } as ChatMessage);
      } catch (error) {
        console.error('Send lobby message error:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    // Send message to match chat
    socket.on('send_match_message', async ({ matchId, content }) => {
      try {
        if (!content || content.trim().length === 0) return;
        if (content.length > 500) {
          socket.emit('error', 'Message too long (max 500 characters)');
          return;
        }

        const message: StoredChatMessage = {
          id: uuidv4(),
          userId: user.id,
          username: user.username,
          content: content.trim(),
          timestamp: new Date().toISOString(),
          type: 'user',
        };

        // Store in Redis
        await matchChat.addMessage(matchId, message);

        // Broadcast to match room (players + spectators)
        io.to(`match:${matchId}`).emit('match_message', {
          ...message,
          timestamp: new Date(message.timestamp),
        } as ChatMessage);
      } catch (error) {
        console.error('Send match message error:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    // ==================== SPECTATOR EVENTS ====================

    // Join as spectator
    socket.on('join_spectator', async (matchId: string) => {
      try {
        const match = await matchService.getMatchById(matchId);
        if (!match) {
          socket.emit('error', 'Match not found');
          return;
        }

        // Don't allow players to spectate their own match
        if (match.player1.id === user.id || match.player2.id === user.id) {
          socket.emit('error', 'Cannot spectate your own match');
          return;
        }

        // Join match room as spectator
        socket.join(`match:${matchId}`);
        socket.join(`match:${matchId}:spectators`);

        // Add to spectator list
        const count = await spectators.add(matchId, user.id);

        // Send current match state
        const [player1Code, player2Code] = await Promise.all([
          playerCode.get(matchId, match.player1.id),
          playerCode.get(matchId, match.player2.id),
        ]);

        socket.emit('spectator_state', {
          match,
          player1Code: player1Code || '',
          player2Code: player2Code || '',
        });

        // Send chat history
        const messages = await matchChat.getMessages(matchId);
        socket.emit('chat_history', messages.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })) as ChatMessage[]);

        // Notify room of new spectator count
        io.to(`match:${matchId}`).emit('spectator_joined', {
          matchId,
          spectatorCount: count,
        });

        console.log(`${user.username} started spectating match ${matchId}`);
      } catch (error) {
        console.error('Join spectator error:', error);
        socket.emit('error', 'Failed to join as spectator');
      }
    });

    // Leave spectating
    socket.on('leave_spectator', async (matchId: string) => {
      try {
        socket.leave(`match:${matchId}`);
        socket.leave(`match:${matchId}:spectators`);
        await spectators.remove(matchId, user.id);
        console.log(`${user.username} stopped spectating match ${matchId}`);
      } catch (error) {
        console.error('Leave spectator error:', error);
      }
    });

    // Get list of active matches for spectating
    socket.on('get_active_matches', async () => {
      try {
        const matchIds = await activeMatches.getAll();
        const matchSummaries: ActiveMatchSummary[] = [];

        for (const matchId of matchIds) {
          const match = await matchService.getMatchById(matchId);
          if (match && match.status === 'IN_PROGRESS') {
            const spectatorCount = await spectators.getCount(matchId);
            matchSummaries.push({
              id: match.id,
              player1: match.player1,
              player2: match.player2,
              problemTitle: match.problem.title,
              startedAt: match.startedAt!,
              spectatorCount,
            });
          }
        }

        socket.emit('active_matches', matchSummaries);
      } catch (error) {
        console.error('Get active matches error:', error);
        socket.emit('error', 'Failed to get active matches');
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${user.username}`);
      await userSockets.remove(user.id);
      await lobbyQueue.remove(user.id);
    });
  });

  // Start matchmaking loop
  startMatchmakingLoop(io);

  // Start expired matches checker
  startExpiredMatchesChecker(io);

  return io;
}

/**
 * Attempt to find a match for a user
 */
async function tryMatchmaking(
  userId: string,
  elo: number,
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): Promise<boolean> {
  const opponentId = await lobbyQueue.findMatchWithExpandingRange(userId, elo);

  if (!opponentId) {
    return false;
  }

  // Remove both from queue
  await lobbyQueue.remove(userId);
  await lobbyQueue.remove(opponentId);

  try {
    // Create match in database
    const match = await matchService.createMatch(userId, opponentId);

    // Store match players in Redis
    await matchPlayers.set(match.id, userId, opponentId);

    // Add to active matches for spectator browsing
    await activeMatches.add(match.id);

    // Set match end time
    const endTime = matchTimer.createEndTime(15);
    await matchTimer.setEndTime(match.id, endTime);

    // Get sockets for both players
    const [userSocketId, opponentSocketId] = await Promise.all([
      userSockets.get(userId),
      userSockets.get(opponentId),
    ]);

    // Join both players to match room and emit match_found
    if (userSocketId) {
      const userSocket = io.sockets.sockets.get(userSocketId);
      if (userSocket) {
        userSocket.join(`match:${match.id}`);
        userSocket.emit('match_found', match);
      }
    }

    if (opponentSocketId) {
      const opponentSocket = io.sockets.sockets.get(opponentSocketId);
      if (opponentSocket) {
        opponentSocket.join(`match:${match.id}`);
        opponentSocket.emit('match_found', match);
      }
    }

    console.log(`Match created: ${match.id} between ${userId} and ${opponentId}`);
    return true;
  } catch (error) {
    console.error('Failed to create match:', error);
    // Re-add both players to queue on failure
    await lobbyQueue.add(userId, elo);
    const opponent = await findUserById(opponentId);
    if (opponent) {
      await lobbyQueue.add(opponentId, opponent.elo_rating);
    }
    return false;
  }
}

/**
 * Matchmaking loop that runs every 2 seconds
 */
function startMatchmakingLoop(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): void {
  setInterval(async () => {
    try {
      const users = await lobbyQueue.getAllUsers();

      // Try to match each user (in order of queue position)
      for (const user of users) {
        // Check if user is still in queue (might have been matched already)
        const position = await lobbyQueue.getPosition(user.id);
        if (position === -1) continue;

        await tryMatchmaking(user.id, user.elo, io);
      }
    } catch (error) {
      console.error('Matchmaking loop error:', error);
    }
  }, 2000);
}

/**
 * Handle job completion from execution worker
 */
async function handleJobCompleted(result: ExecutionJobResult): Promise<void> {
  const { matchId, playerId, success, testsPassed, testsTotal, isRun } = result;

  // Emit result to the player - different event based on isRun
  const playerSocketId = await userSockets.get(playerId);
  if (playerSocketId && ioInstance) {
    const playerSocket = ioInstance.sockets.sockets.get(playerSocketId);
    if (playerSocket) {
      const eventName = isRun ? 'run_result' : 'submission_result';
      playerSocket.emit(eventName, {
        success,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        testsPassed,
        testsTotal,
      });
    }
  }

  // Only end match on submit (not run), when all tests passed
  if (!isRun && success && testsPassed === testsTotal) {
    try {
      const match = await matchService.getMatchById(matchId);
      if (match && match.status === 'IN_PROGRESS') {
        // End match with this player as winner
        await matchService.endMatch(matchId, playerId, 'SOLVED');

        // Clean up Redis state
        await cleanupMatch(matchId, match.player1.id, match.player2.id);

        // Notify both players
        ioInstance.to(`match:${matchId}`).emit('match_ended', {
          winnerId: playerId,
          reason: 'SOLVED',
        });

        console.log(`Match ${matchId} ended. Winner: ${playerId}`);
      }
    } catch (error) {
      console.error('Error ending match:', error);
    }
  }
}

/**
 * Clean up Redis state for a match
 */
async function cleanupMatch(matchId: string, player1Id: string, player2Id: string): Promise<void> {
  await Promise.all([
    playerCode.delete(matchId),
    matchTimer.delete(matchId),
    matchPlayers.delete(matchId, player1Id, player2Id),
    activeMatches.remove(matchId),
    spectators.delete(matchId),
    // Note: match chat is kept for a while (auto-expires via Redis TTL)
  ]);
}

/**
 * Check for expired matches and end them as timeout/draw
 */
async function checkExpiredMatches(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): Promise<void> {
  try {
    const matchIds = await activeMatches.getAll();

    for (const matchId of matchIds) {
      const endTime = await matchTimer.getEndTime(matchId);
      if (endTime && new Date() > endTime) {
        // Get match details
        const match = await matchService.getMatchById(matchId);
        if (match && match.status === 'IN_PROGRESS') {
          // End match as timeout/draw (no winner)
          await matchService.endMatch(matchId, null, 'TIMEOUT');

          // Clean up Redis state
          await cleanupMatch(matchId, match.player1.id, match.player2.id);

          // Notify both players and spectators
          io.to(`match:${matchId}`).emit('match_ended', {
            winnerId: '',
            reason: 'TIMEOUT',
          });

          console.log(`Match ${matchId} ended due to timeout`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking expired matches:', error);
  }
}

/**
 * Start the expired matches checker loop (runs every 5 seconds)
 */
function startExpiredMatchesChecker(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): void {
  setInterval(() => checkExpiredMatches(io), 5000);
  console.log('[Socket] Expired matches checker started');
}

export { ioInstance as io };
