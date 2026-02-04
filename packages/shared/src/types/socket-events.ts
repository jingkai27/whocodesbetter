import { UserPublic } from './user';
import { MatchWithDetails, CodeSubmission, ExecutionResult } from './match';

// Chat message structure
export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'system';
}

// Active match summary for spectators
export interface ActiveMatchSummary {
  id: string;
  player1: UserPublic;
  player2: UserPublic;
  problemTitle: string;
  startedAt: Date;
  spectatorCount: number;
}

// Client -> Server events
export interface ClientToServerEvents {
  // Lobby & Matchmaking
  join_lobby: () => void;
  leave_lobby: () => void;

  // Match
  join_match: (matchId: string) => void;
  submit_code: (submission: CodeSubmission) => void;
  run_code: (submission: CodeSubmission) => void;
  code_update: (data: { matchId: string; code: string }) => void;
  forfeit_match: (matchId: string) => void;

  // Chat
  send_lobby_message: (content: string) => void;
  send_match_message: (data: { matchId: string; content: string }) => void;

  // Spectator
  join_spectator: (matchId: string) => void;
  leave_spectator: (matchId: string) => void;
  get_active_matches: () => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  // Lobby
  lobby_joined: (data: { position: number; estimatedWait: number }) => void;
  lobby_left: () => void;

  // Match
  match_found: (match: MatchWithDetails) => void;
  match_started: (match: MatchWithDetails) => void;
  opponent_code_update: (data: { code: string }) => void;
  submission_result: (result: ExecutionResult) => void;
  run_result: (result: ExecutionResult) => void;
  match_ended: (data: { winnerId: string; reason: string }) => void;

  // Chat
  lobby_message: (message: ChatMessage) => void;
  match_message: (message: ChatMessage) => void;
  chat_history: (messages: ChatMessage[]) => void;

  // Spectator
  spectator_joined: (data: { matchId: string; spectatorCount: number }) => void;
  spectator_state: (data: {
    match: MatchWithDetails;
    player1Code: string;
    player2Code: string;
  }) => void;
  active_matches: (matches: ActiveMatchSummary[]) => void;
  player_code_update: (data: { playerId: string; code: string }) => void;

  // Error
  error: (message: string) => void;
}

// Inter-server events (for scaling with Redis adapter)
export interface InterServerEvents {
  ping: () => void;
}

// Socket data attached to each connection
export interface SocketData {
  userId: string;
  user: UserPublic;
}
