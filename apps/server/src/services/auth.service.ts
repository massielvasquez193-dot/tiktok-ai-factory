/**
 * Auth Service — Phase 1 Authentication Foundation
 *
 * Handles user registration, login, token verification, and profile management.
 * Uses bcryptjs for password hashing and jsonwebtoken for stateless JWT tokens.
 *
 * Imports prisma from the shared singleton (lib/prisma).
 */

import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

// ── Config ──────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  status: string;
  locale: string;
  timezone: string;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toAuthUser(row: { id: string; email: string; name: string; status: string; locale: string; timezone: string }): AuthUser {
  return { id: row.id, email: row.email, name: row.name, status: row.status, locale: row.locale, timezone: row.timezone };
}

function signToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, getJwtSecret(), { expiresIn: JWT_EXPIRY });
}

// ── Register ────────────────────────────────────────────────────────────────

/**
 * Register a new user. Returns the user + JWT token.
 * Throws if the email already exists.
 */
export async function register(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResult> {
  // Validate
  if (!email || !email.includes('@')) {
    throw new Error('A valid email is required');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check duplicate
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    throw new Error('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const userId = uuid();
  const token = signToken(userId, email);

  const user = await prisma.user.create({
    data: {
      id: userId,
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name || email.split('@')[0],
    },
  });

  // Create initial session
  await prisma.session.create({
    data: {
      id: uuid(),
      userId: user.id,
      token,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return { user: toAuthUser(user), token };
}

// ── Login ───────────────────────────────────────────────────────────────────

/**
 * Authenticate a user with email + password.
 * Returns user + JWT token on success. Throws on invalid credentials.
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (user.status !== 'active') {
    throw new Error('This account has been suspended. Please contact support.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const token = signToken(user.id, user.email);

  // Create session
  await prisma.session.create({
    data: {
      id: uuid(),
      userId: user.id,
      token,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { user: toAuthUser(user), token };
}

// ── Token Verification ──────────────────────────────────────────────────────

/**
 * Verify a JWT token and return the authenticated user.
 * Also checks that the session still exists (supports invalidation).
 * Returns null if the token is expired, invalid, or session deleted.
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    // 1. Decode JWT
    const payload = jwt.verify(token, getJwtSecret()) as { userId: string; email: string };

    // 2. Check session exists (session-based invalidation)
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expires < new Date()) {
      return null;
    }

    // 3. Fetch user
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.status !== 'active') {
      return null;
    }

    return toAuthUser(user);
  } catch {
    return null;
  }
}

// ── Logout ──────────────────────────────────────────────────────────────────

/**
 * Invalidate a session (logout). Idempotent — safe to call on already-deleted tokens.
 */
export async function logout(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

// ── Profile ─────────────────────────────────────────────────────────────────

/**
 * Get user profile by ID.
 */
export async function getMe(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== 'active') return null;
  return toAuthUser(user);
}

/**
 * Update user profile fields.
 */
export async function updateMe(
  userId: string,
  data: { name?: string; locale?: string; timezone?: string },
): Promise<AuthUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.locale !== undefined && { locale: data.locale }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
    },
  });
  return toAuthUser(user);
}

/**
 * Change password. Requires current password verification.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error('Current password is incorrect');

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

// ── Forgot Password ────────────────────────────────────────────────────────

/**
 * Generate a password reset token and store it as a session with extended expiry.
 * In production, this would send an email. For now, returns the token.
 */
export async function requestPasswordReset(email: string): Promise<{ resetToken: string }> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    // Return success anyway to prevent email enumeration
    return { resetToken: 'mock-reset-token-for-nonexistent-user' };
  }

  const resetToken = signToken(user.id, user.email);

  // Store as a special session (1 hour expiry)
  await prisma.session.create({
    data: {
      id: uuid(),
      userId: user.id,
      token: resetToken,
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  // Send email (mock=console, resend=API)
  const { sendEmail, passwordResetEmail } = await import('./email.service');
  const resetLink = `${process.env.APP_URL || 'https://ttvideoai.com'}/reset-password?token=${resetToken}`;
  const emailOpts = passwordResetEmail(resetLink);
  emailOpts.to = user.email;
  await sendEmail(emailOpts).catch((e: any) => console.warn('[Auth] Email send failed:', e.message));

  return { resetToken };
}

/**
 * Reset password using a valid reset token.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // Verify reset token
  const user = await verifyToken(token);
  if (!user) throw new Error('Invalid or expired reset token');

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Invalidate the reset token
  await prisma.session.deleteMany({ where: { token } });
}

// ── Email Verification ─────────────────────────────────────────────────────

/**
 * Generate email verification token.
 */
export async function requestEmailVerification(userId: string): Promise<{ verifyToken: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const verifyToken = signToken(user.id, user.email);

  // Send verification email
  const { sendEmail, verificationEmail } = await import('./email.service');
  const verifyLink = `${process.env.APP_URL || 'https://ttvideoai.com'}/verify-email?token=${verifyToken}`;
  const emailOpts = verificationEmail(verifyLink);
  emailOpts.to = user.email;
  await sendEmail(emailOpts).catch((e: any) => console.warn('[Auth] Verification email failed:', e.message));

  return { verifyToken };
}

/**
 * Verify email using token.
 */
export async function verifyEmail(token: string): Promise<void> {
  const user = await verifyToken(token);
  if (!user) throw new Error('Invalid or expired verification token');

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });
}

// ── Session Management ─────────────────────────────────────────────────────

export interface SessionInfo {
  id: string;
  expires: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/**
 * List all active sessions for a user.
 */
export async function listSessions(userId: string): Promise<SessionInfo[]> {
  const sessions = await prisma.session.findMany({
    where: { userId, expires: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  return sessions.map((s) => ({
    id: s.id,
    expires: s.expires.toISOString(),
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: s.createdAt.toISOString(),
  }));
}

/**
 * Revoke (delete) a specific session by ID.
 */
export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) throw new Error('Session not found');
  await prisma.session.delete({ where: { id: sessionId } });
}

// ── Avatar ─────────────────────────────────────────────────────────────────

/**
 * Update user avatar URL.
 */
export async function updateAvatar(userId: string, avatarUrl: string): Promise<AuthUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });
  return toAuthUser(user);
}
