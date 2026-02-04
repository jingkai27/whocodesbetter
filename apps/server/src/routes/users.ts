import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { query, queryOne } from '../db';
import { UserPublic } from '@codeduel/shared';

const router = Router();

interface DbUser {
  id: string;
  username: string;
  avatar_url: string | null;
  elo_rating: number;
}

// GET /api/users/leaderboard - Must be before /:id to avoid conflict
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await query<DbUser>(
      'SELECT id, username, avatar_url, elo_rating FROM users ORDER BY elo_rating DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const leaderboard: UserPublic[] = users.map((user) => ({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar_url,
      eloRating: user.elo_rating,
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await queryOne<DbUser>(
      'SELECT id, username, avatar_url, elo_rating FROM users WHERE id = $1',
      [id]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar_url,
      eloRating: user.elo_rating,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { username, avatarUrl } = req.body;

    if (username && (username.length < 3 || username.length > 30)) {
      res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (username) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }

    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(avatarUrl);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No updates provided' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const user = await queryOne<DbUser>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, avatar_url, elo_rating`,
      values
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar_url,
      eloRating: user.elo_rating,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
