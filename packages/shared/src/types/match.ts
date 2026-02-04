import { UserPublic } from './user';
import { Problem } from './problem';

export type MatchStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  problemId: string;
  winnerId: string | null;
  status: MatchStatus;
  startedAt: Date | null;
  endedAt: Date | null;
}

export interface MatchWithDetails {
  id: string;
  player1: UserPublic;
  player2: UserPublic;
  problem: Problem;
  winnerId: string | null;
  status: MatchStatus;
  startedAt: Date | null;
  endedAt: Date | null;
}

export interface CodeSubmission {
  matchId: string;
  playerId: string;
  code: string;
  language: string;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error: string | null;
  executionTime: number;
  testsPassed: number;
  testsTotal: number;
}
