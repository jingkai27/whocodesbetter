import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { matchService } from '../services/match.service';

const router = Router();

/**
 * GET /api/matches/:id
 * Get match details by ID
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const match = await matchService.getMatchById(id);

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    // Optionally hide hidden test cases
    const sanitizedMatch = {
      ...match,
      problem: {
        ...match.problem,
        testCases: match.problem.testCases.filter((tc) => !tc.isHidden),
      },
    };

    res.json(sanitizedMatch);
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

/**
 * GET /api/matches/history
 * Get current user's match history
 */
router.get('/user/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const { limit = '10', offset = '0' } = req.query;

    const matches = await matchService.getMatchHistory(
      userId,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );

    // Sanitize test cases
    const sanitizedMatches = matches.map((match) => ({
      ...match,
      problem: {
        id: match.problem.id,
        title: match.problem.title,
        difficulty: match.problem.difficulty,
        // Don't include test cases in history
      },
    }));

    res.json(sanitizedMatches);
  } catch (error) {
    console.error('Get match history error:', error);
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
});

/**
 * GET /api/matches/active
 * Get user's current active match (if any)
 */
router.get('/user/active', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user!.id;

    const match = await matchService.getUserActiveMatch(userId);

    if (!match) {
      res.json(null);
      return;
    }

    // Sanitize hidden test cases
    const sanitizedMatch = {
      ...match,
      problem: {
        ...match.problem,
        testCases: match.problem.testCases.filter((tc) => !tc.isHidden),
      },
    };

    res.json(sanitizedMatch);
  } catch (error) {
    console.error('Get active match error:', error);
    res.status(500).json({ error: 'Failed to fetch active match' });
  }
});

export default router;
