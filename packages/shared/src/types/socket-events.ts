import { UserPublic } from './user';
import { MatchWithDetails, CodeSubmission, ExecutionResult } from './match';

// Client -> Server events
export interface ClientToServerEvents {
  join_lobby: () => void;
  leave_lobby: () => void;
  submit_code: (submission: CodeSubmission) => void;
  code_update: (data: { matchId: string; code: string }) => void;
  forfeit_match: (matchId: string) => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  lobby_joined: (data: { position: number; estimatedWait: number }) => void;
  lobby_left: () => void;
  match_found: (match: MatchWithDetails) => void;
  match_started: (match: MatchWithDetails) => void;
  opponent_code_update: (data: { code: string }) => void;
  submission_result: (result: ExecutionResult) => void;
  match_ended: (data: { winnerId: string; reason: string }) => void;
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
