import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { Problem, Difficulty, TestCase } from '@codeduel/shared';

const router = Router();

interface ProblemRow {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  test_cases: string;
  created_at: Date;
}

function toProblem(row: ProblemRow, hideTests: boolean = false): Problem {
  let testCases: TestCase[] = typeof row.test_cases === 'string'
    ? JSON.parse(row.test_cases)
    : row.test_cases;

  // For public API, only show non-hidden test cases
  if (hideTests) {
    testCases = testCases.filter((tc) => !tc.isHidden).map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: false,
    }));
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty,
    testCases,
    createdAt: row.created_at,
  };
}

/**
 * GET /api/problems
 * List all problems with optional filtering by difficulty
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { difficulty, limit = '20', offset = '0' } = req.query;
    const params: unknown[] = [];
    let sql = 'SELECT id, title, description, difficulty, test_cases, created_at FROM problems';

    if (difficulty && ['EASY', 'MEDIUM', 'HARD'].includes(difficulty as string)) {
      sql += ' WHERE difficulty = $1';
      params.push(difficulty);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

    const problems = await query<ProblemRow>(sql, params);

    // Hide test cases in list view
    const result = problems.map((p) => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      createdAt: p.created_at,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

/**
 * GET /api/problems/:id
 * Get a specific problem by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const problem = await queryOne<ProblemRow>(
      'SELECT id, title, description, difficulty, test_cases, created_at FROM problems WHERE id = $1',
      [id]
    );

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Only show non-hidden test cases in public API
    res.json(toProblem(problem, true));
  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

export default router;
