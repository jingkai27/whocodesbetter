import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db';
import {
  Match,
  MatchWithDetails,
  MatchStatus,
  Problem,
  Difficulty,
  UserPublic,
} from '@codeduel/shared';
import { calculateNewRatings } from '../utils/elo';

// Database row types
interface MatchRow {
  id: string;
  player1_id: string;
  player2_id: string;
  problem_id: string;
  winner_id: string | null;
  status: MatchStatus;
  started_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
}

interface ProblemRow {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  test_cases: string; // JSON string
  created_at: Date;
}

interface UserRow {
  id: string;
  username: string;
  avatar_url: string | null;
  elo_rating: number;
}

/**
 * Convert a database problem row to Problem type
 */
function toProblem(row: ProblemRow): Problem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty,
    testCases: typeof row.test_cases === 'string' ? JSON.parse(row.test_cases) : row.test_cases,
    createdAt: row.created_at,
  };
}

/**
 * Convert a database user row to UserPublic type
 */
function toUserPublic(row: UserRow): UserPublic {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
    eloRating: row.elo_rating,
  };
}

class MatchService {
  /**
   * Create a new match between two players with a random problem
   */
  async createMatch(player1Id: string, player2Id: string): Promise<MatchWithDetails> {
    const matchId = uuidv4();
    const problem = await this.getRandomProblem();

    // Create match in database
    await queryOne<MatchRow>(
      `INSERT INTO matches (id, player1_id, player2_id, problem_id, status, started_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [matchId, player1Id, player2Id, problem.id, 'IN_PROGRESS']
    );

    // Get player details
    const [player1, player2] = await Promise.all([
      queryOne<UserRow>('SELECT id, username, avatar_url, elo_rating FROM users WHERE id = $1', [
        player1Id,
      ]),
      queryOne<UserRow>('SELECT id, username, avatar_url, elo_rating FROM users WHERE id = $1', [
        player2Id,
      ]),
    ]);

    if (!player1 || !player2) {
      throw new Error('Player not found');
    }

    return {
      id: matchId,
      player1: toUserPublic(player1),
      player2: toUserPublic(player2),
      problem,
      winnerId: null,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      endedAt: null,
    };
  }

  /**
   * Get match by ID with all details
   */
  async getMatchById(matchId: string): Promise<MatchWithDetails | null> {
    const match = await queryOne<MatchRow>('SELECT * FROM matches WHERE id = $1', [matchId]);

    if (!match) {
      return null;
    }

    const [player1, player2, problem] = await Promise.all([
      queryOne<UserRow>('SELECT id, username, avatar_url, elo_rating FROM users WHERE id = $1', [
        match.player1_id,
      ]),
      queryOne<UserRow>('SELECT id, username, avatar_url, elo_rating FROM users WHERE id = $1', [
        match.player2_id,
      ]),
      queryOne<ProblemRow>('SELECT * FROM problems WHERE id = $1', [match.problem_id]),
    ]);

    if (!player1 || !player2 || !problem) {
      return null;
    }

    return {
      id: match.id,
      player1: toUserPublic(player1),
      player2: toUserPublic(player2),
      problem: toProblem(problem),
      winnerId: match.winner_id,
      status: match.status,
      startedAt: match.started_at,
      endedAt: match.ended_at,
    };
  }

  /**
   * End a match, set winner, and update ELO ratings
   */
  async endMatch(
    matchId: string,
    winnerId: string | null,
    reason: string
  ): Promise<{ winnerNewElo: number; loserNewElo: number } | null> {
    // Get match details
    const match = await queryOne<MatchRow>('SELECT * FROM matches WHERE id = $1', [matchId]);

    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status !== 'IN_PROGRESS') {
      throw new Error('Match is not in progress');
    }

    // Handle timeout/draw (no winner)
    if (!winnerId) {
      // Just update match status, no ELO changes
      await queryOne(
        `UPDATE matches SET winner_id = NULL, status = $1, ended_at = NOW() WHERE id = $2`,
        ['COMPLETED', matchId]
      );
      return null;
    }

    // Determine loser
    const loserId = match.player1_id === winnerId ? match.player2_id : match.player1_id;

    // Get current ELO ratings
    const [winner, loser] = await Promise.all([
      queryOne<UserRow>('SELECT id, username, avatar_url, elo_rating FROM users WHERE id = $1', [
        winnerId,
      ]),
      queryOne<UserRow>('SELECT id, username, avatar_url, elo_rating FROM users WHERE id = $1', [
        loserId,
      ]),
    ]);

    if (!winner || !loser) {
      throw new Error('Player not found');
    }

    // Calculate new ELO ratings
    const { newWinnerElo, newLoserElo } = calculateNewRatings(winner.elo_rating, loser.elo_rating);

    // Update match and ELO ratings in a transaction-like manner
    await Promise.all([
      // Update match
      queryOne(
        `UPDATE matches SET winner_id = $1, status = $2, ended_at = NOW() WHERE id = $3`,
        [winnerId, 'COMPLETED', matchId]
      ),
      // Update winner's ELO
      queryOne('UPDATE users SET elo_rating = $1 WHERE id = $2', [newWinnerElo, winnerId]),
      // Update loser's ELO
      queryOne('UPDATE users SET elo_rating = $1 WHERE id = $2', [newLoserElo, loserId]),
    ]);

    return {
      winnerNewElo: newWinnerElo,
      loserNewElo: newLoserElo,
    };
  }

  /**
   * Get a random problem, optionally filtered by difficulty
   */
  async getRandomProblem(difficulty?: Difficulty): Promise<Problem> {
    let sql = 'SELECT * FROM problems';
    const params: unknown[] = [];

    if (difficulty) {
      sql += ' WHERE difficulty = $1';
      params.push(difficulty);
    }

    sql += ' ORDER BY RANDOM() LIMIT 1';

    const problem = await queryOne<ProblemRow>(sql, params);

    if (!problem) {
      throw new Error('No problems available');
    }

    return toProblem(problem);
  }

  /**
   * Get user's match history
   */
  async getMatchHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<MatchWithDetails[]> {
    const matches = await query<MatchRow>(
      `SELECT * FROM matches
       WHERE (player1_id = $1 OR player2_id = $1) AND status = 'COMPLETED'
       ORDER BY ended_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const results = await Promise.all(
      matches.map(async (match) => {
        const [player1, player2, problem] = await Promise.all([
          queryOne<UserRow>('SELECT id, username, avatar_url, elo_rating FROM users WHERE id = $1', [
            match.player1_id,
          ]),
          queryOne<UserRow>('SELECT id, username, avatar_url, elo_rating FROM users WHERE id = $1', [
            match.player2_id,
          ]),
          queryOne<ProblemRow>('SELECT * FROM problems WHERE id = $1', [match.problem_id]),
        ]);

        if (!player1 || !player2 || !problem) {
          return null;
        }

        return {
          id: match.id,
          player1: toUserPublic(player1),
          player2: toUserPublic(player2),
          problem: toProblem(problem),
          winnerId: match.winner_id,
          status: match.status,
          startedAt: match.started_at,
          endedAt: match.ended_at,
        };
      })
    );

    return results.filter((m): m is MatchWithDetails => m !== null);
  }

  /**
   * Cancel a match (e.g., due to disconnect or timeout)
   */
  async cancelMatch(matchId: string): Promise<void> {
    await queryOne(
      `UPDATE matches SET status = $1, ended_at = NOW() WHERE id = $2`,
      ['CANCELLED', matchId]
    );
  }

  /**
   * Check if a user is currently in a match
   */
  async getUserActiveMatch(userId: string): Promise<MatchWithDetails | null> {
    const match = await queryOne<MatchRow>(
      `SELECT * FROM matches
       WHERE (player1_id = $1 OR player2_id = $1) AND status = 'IN_PROGRESS'
       ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );

    if (!match) {
      return null;
    }

    return this.getMatchById(match.id);
  }
}

export const matchService = new MatchService();
