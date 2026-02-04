import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UserPublic } from '@codeduel/shared';

export interface AuthRequest extends Request {
  user?: UserPublic;
}

interface JwtPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

export const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret) as JwtPayload;
    (req as AuthRequest).user = {
      id: decoded.userId,
      username: decoded.username,
      avatarUrl: null,
      eloRating: 0,
    };
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtAccessSecret) as JwtPayload;
      (req as AuthRequest).user = {
        id: decoded.userId,
        username: decoded.username,
        avatarUrl: null,
        eloRating: 0,
      };
    } catch {
      // Invalid token, continue without user
    }
  }

  next();
};
