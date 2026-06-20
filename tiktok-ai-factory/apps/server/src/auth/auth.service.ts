import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../index';

const JWT_SECRET = process.env.JWT_SECRET || 'tiktok-vf-dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'tiktok-vf-refresh-secret-change-in-production';
const JWT_EXPIRES = 900; // 15 minutes in seconds
const JWT_REFRESH_EXPIRES = 604800; // 7 days in seconds
const BCRYPT_ROUNDS = 10;

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
}

export class AuthService {
  /** Hash a plaintext password */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /** Compare plaintext vs stored hash */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /** Generate an access token */
  static signAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES as any });
  }

  /** Generate a refresh token */
  static signRefreshToken(payload: { userId: string }): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES as any });
  }

  /** Verify an access token — throws if invalid */
  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  }

  /** Verify a refresh token — throws if invalid */
  static verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
  }

  /** Register a new user */
  static async register(email: string, password: string, name?: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('EMAIL_EXISTS', 'Email already registered', 409);

    const passwordHash = await this.hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: name || '' },
    });

    // Create a default tenant for the user
    const tenant = await prisma.tenant.create({
      data: {
        name: `${user.name || email}'s Workspace`,
        slug: `tenant-${user.id.slice(0, 8)}`,
        plan: 'free',
      },
    });

    // Add user as tenant owner
    await prisma.tenantMember.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
        permissions: JSON.stringify(['*']),
      },
    });

    // Initialize credit wallet with free tier credits
    await prisma.creditWallet.create({
      data: { userId: user.id, balance: 50, lifetime: 50 },
    });

    const accessToken = this.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
    });
    const refreshToken = this.signRefreshToken({ userId: user.id });

    // Store refresh token hash
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      accessToken,
      refreshToken,
    };
  }

  /** Login */
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);

    const valid = await this.comparePassword(password, user.passwordHash);
    if (!valid) throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);

    // Find the user's primary tenant
    const membership = await prisma.tenantMember.findFirst({
      where: { userId: user.id },
      include: { tenant: true },
    });

    const accessToken = this.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: membership?.tenantId,
    });
    const refreshToken = this.signRefreshToken({ userId: user.id });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, lastLoginAt: new Date() },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tenant: membership?.tenant || null,
      accessToken,
      refreshToken,
    };
  }

  /** Refresh access token */
  static async refreshAccessToken(refreshToken: string) {
    let payload: { userId: string };
    try {
      payload = this.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { memberships: { include: { tenant: true } } },
    });

    if (!user || user.refreshToken !== refreshToken) {
      throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token has been revoked', 401);
    }

    const primaryMembership = user.memberships[0];
    const accessToken = this.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: primaryMembership?.tenantId,
    });
    const newRefreshToken = this.signRefreshToken({ userId: user.id });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /** Logout — revoke refresh token */
  static async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  /** Create email verification token */
  static async createEmailVerificationToken(userId: string, type = 'email_verify') {
    const token = uuid();
    await prisma.emailVerificationToken.create({
      data: {
        token,
        userId,
        type,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });
    return token;
  }

  /** Verify email with token */
  static async verifyEmail(token: string) {
    const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
    if (!record) throw new AppError('INVALID_TOKEN', 'Invalid verification token', 400);
    if (record.expiresAt < new Date()) throw new AppError('TOKEN_EXPIRED', 'Verification token has expired', 400);
    if (record.usedAt) throw new AppError('TOKEN_USED', 'Token already used', 400);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  /** Get user profile */
  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true,
        emailVerified: true, avatarUrl: true, lastLoginAt: true,
        createdAt: true,
        memberships: { include: { tenant: { select: { id: true, name: true, slug: true, plan: true } } } },
        creditWallet: { select: { balance: true, lifetime: true, frozen: true } },
        subscription: {
          select: { plan: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
        },
      },
    });
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
    return user;
  }
}

/** Simple app-level error with status code */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
