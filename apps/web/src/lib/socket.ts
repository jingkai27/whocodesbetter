import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents, CodeSubmission } from '@codeduel/shared';
import { api } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket | null {
  return socket;
}

export function connectSocket(): TypedSocket {
  if (socket?.connected) {
    return socket;
  }

  const token = api.getAccessToken();
  if (!token) {
    throw new Error('No access token available');
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinLobby(): void {
  socket?.emit('join_lobby');
}

export function leaveLobby(): void {
  socket?.emit('leave_lobby');
}

export function joinMatch(matchId: string): void {
  socket?.emit('join_match', matchId);
}

export function submitCode(submission: Omit<CodeSubmission, 'playerId'>): void {
  socket?.emit('submit_code', submission as CodeSubmission);
}

export function runCode(submission: Omit<CodeSubmission, 'playerId'>): void {
  socket?.emit('run_code', submission as CodeSubmission);
}

export function updateCode(matchId: string, code: string): void {
  socket?.emit('code_update', { matchId, code });
}

export function forfeitMatch(matchId: string): void {
  socket?.emit('forfeit_match', matchId);
}

// Chat methods
export function sendLobbyMessage(content: string): void {
  socket?.emit('send_lobby_message', content);
}

export function sendMatchMessage(matchId: string, content: string): void {
  socket?.emit('send_match_message', { matchId, content });
}

// Spectator methods
export function joinSpectator(matchId: string): void {
  socket?.emit('join_spectator', matchId);
}

export function leaveSpectator(matchId: string): void {
  socket?.emit('leave_spectator', matchId);
}

export function getActiveMatches(): void {
  socket?.emit('get_active_matches');
}
