import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db';
import { config } from '../config/env';
import { User, UserPublic, AuthTokens, CreateUserInput } from '@codeduel/shared';

const SALT_ROUNDS = 10;

interface DbUser {
  id: string;
  username: string;
  email: string;
  password_hash: string | null;
  avatar_url: string | null;
  elo_rating: number;
  created_at: Date;
  updated_at: Date;
}

interface DbRefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
}

function toUserPublic(dbUser: DbUser): UserPublic {
  return {
    id: dbUser.id,
    username: dbUser.username,
    avatarUrl: dbUser.avatar_url,
    eloRating: dbUser.elo_rating,
  };
}

export async function createUser(input: CreateUserInput): Promise<UserPublic> {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const result = await queryOne<DbUser>(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.username, input.email, passwordHash]
  );

  if (!result) {
    throw new Error('Failed to create user');
  }

  return toUserPublic(result);
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  return queryOne<DbUser>('SELECT * FROM users WHERE email = $1', [email]);
}

export async function findUserById(id: string): Promise<DbUser | null> {
  return queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [id]);
}

export async function findUserByUsername(username: string): Promise<DbUser | null> {
  return queryOne<DbUser>('SELECT * FROM users WHERE username = $1', [username]);
}

export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function generateAccessToken(user: UserPublic): string {
  return jwt.sign(
    { userId: user.id, username: user.username },
    config.jwtAccessSecret,
    { expiresIn: '15m' }
  );
}

export function generateRefreshToken(): string {
  return uuidv4();
}

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const tokenHash = await bcrypt.hash(token, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

export async function verifyRefreshToken(userId: string, token: string): Promise<boolean> {
  const tokens = await query<DbRefreshToken>(
    `SELECT * FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()`,
    [userId]
  );

  for (const dbToken of tokens) {
    const isValid = await bcrypt.compare(token, dbToken.token_hash);
    if (isValid) {
      return true;
    }
  }

  return false;
}

export async function deleteRefreshToken(userId: string, token: string): Promise<void> {
  const tokens = await query<DbRefreshToken>(
    `SELECT * FROM refresh_tokens WHERE user_id = $1`,
    [userId]
  );

  for (const dbToken of tokens) {
    const isMatch = await bcrypt.compare(token, dbToken.token_hash);
    if (isMatch) {
      await query('DELETE FROM refresh_tokens WHERE id = $1', [dbToken.id]);
      return;
    }
  }
}

export async function deleteAllRefreshTokens(userId: string): Promise<void> {
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

export async function createTokens(user: UserPublic): Promise<AuthTokens> {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken };
}

// OAuth helpers
export async function findOrCreateOAuthUser(
  provider: string,
  providerAccountId: string,
  profile: { username: string; email: string; avatarUrl?: string }
): Promise<UserPublic> {
  // Check if OAuth account exists
  const existingOAuth = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_account_id = $2`,
    [provider, providerAccountId]
  );

  if (existingOAuth) {
    const user = await findUserById(existingOAuth.user_id);
    if (user) {
      return toUserPublic(user);
    }
  }

  // Check if user with email exists
  let user = await findUserByEmail(profile.email);

  if (!user) {
    // Create new user
    const result = await queryOne<DbUser>(
      `INSERT INTO users (username, email, avatar_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [profile.username, profile.email, profile.avatarUrl || null]
    );
    user = result;
  }

  if (!user) {
    throw new Error('Failed to create OAuth user');
  }

  // Link OAuth account
  await query(
    `INSERT INTO oauth_accounts (user_id, provider, provider_account_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (provider, provider_account_id) DO NOTHING`,
    [user.id, provider, providerAccountId]
  );

  return toUserPublic(user);
}
