import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import { config } from '../config/env';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  createTokens,
  verifyRefreshToken,
  deleteRefreshToken,
  findUserById,
  findOrCreateOAuthUser,
} from '../services/auth.service';
import { CreateUserInput, LoginInput } from '@codeduel/shared';

const router = Router();

// Configure GitHub OAuth
if (config.github.clientId && config.github.clientSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.github.clientId,
        clientSecret: config.github.clientSecret,
        callbackURL: config.github.callbackUrl,
        scope: ['user:email'],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: Express.User) => void
      ) => {
        try {
          const email = profile.emails?.[0]?.value || `${profile.id}@github.oauth`;
          const user = await findOrCreateOAuthUser('github', profile.id, {
            username: profile.username || profile.displayName || `user_${profile.id}`,
            email,
            avatarUrl: profile.photos?.[0]?.value,
          });
          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: Express.User, done) => {
  done(null, user);
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password }: CreateUserInput = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, and password are required' });
      return;
    }

    if (username.length < 3 || username.length > 30) {
      res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    // Check if user exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const user = await createUser({ username, email, password });
    const tokens = await createTokens(user);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({ user, accessToken: tokens.accessToken });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginInput = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user || !user.password_hash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const userPublic = {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar_url,
      eloRating: user.elo_rating,
    };

    const tokens = await createTokens(userPublic);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: userPublic, accessToken: tokens.accessToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const userId = req.body.userId;

    if (!refreshToken || !userId) {
      res.status(401).json({ error: 'Refresh token and user ID required' });
      return;
    }

    const isValid = await verifyRefreshToken(userId, refreshToken);
    if (!isValid) {
      res.status(403).json({ error: 'Invalid refresh token' });
      return;
    }

    const user = await findUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userPublic = {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar_url,
      eloRating: user.elo_rating,
    };

    // Rotate refresh token
    await deleteRefreshToken(userId, refreshToken);
    const tokens = await createTokens(userPublic);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const userId = (req as AuthRequest).user?.id;

    if (userId && refreshToken) {
      await deleteRefreshToken(userId, refreshToken);
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await findUserById(userId);
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

// GitHub OAuth routes
router.get('/github', passport.authenticate('github', { session: false }));

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${config.frontendUrl}/login?error=oauth_failed` }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as { id: string; username: string; avatarUrl: string | null; eloRating: number };
      const tokens = await createTokens(user);

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Redirect to frontend with access token
      res.redirect(`${config.frontendUrl}/auth/callback?token=${tokens.accessToken}`);
    } catch (error) {
      console.error('GitHub callback error:', error);
      res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
    }
  }
);

export default router;
