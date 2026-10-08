import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler';
import { comparePassword, hashPassword, generateAdminToken } from '../services/auth';
import { sendPasswordResetEmail } from '../services/email';
import { requireAdmin, AuthenticatedRequest } from '../middleware/requireAdmin';
import { formSubmissionLimiter } from '../middleware/rateLimiter';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// POST /api/auth/login
router.post('/login', formSubmissionLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const admin = await prisma.adminUser.findUnique({ where: { email } });

  // Same generic error whether the email doesn't exist or the password is wrong,
  // so a caller can't use this endpoint to discover which admin emails are valid.
  if (!admin || !(await comparePassword(password, admin.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLogin: new Date() },
  });

  const token = generateAdminToken({ id: admin.id, email: admin.email, role: admin.role });

  res.json({
    success: true,
    token,
    admin: { id: admin.id, email: admin.email, role: admin.role },
  });
}));

// GET /api/auth/me — lets the admin panel verify a stored token is still valid.
router.get('/me', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({ admin: req.admin });
});

// POST /api/auth/forgot-password — always returns the same generic message,
// whether or not the email matches an AdminUser, so this endpoint can't be used
// to discover which admin accounts exist.
router.post('/forgot-password', formSubmissionLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  const genericResponse = {
    success: true,
    message: 'If that email is registered, a password reset link has been sent.',
  };

  const admin = await prisma.adminUser.findUnique({ where: { email } });

  if (!admin) {
    return res.json(genericResponse);
  }

  const rawToken = crypto.randomBytes(32).toString('hex');

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      resetTokenHash: hashResetToken(rawToken),
      resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${process.env.ADMIN_PANEL_URL || 'http://localhost:3002'}/admin/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail(admin.email, resetUrl);
  } catch (error) {
    // Don't let an email-provider failure turn into a different response —
    // that would leak whether the account exists. Log it and move on.
    console.error('Failed to send password reset email:', error);
  }

  res.json(genericResponse);
}));

// POST /api/auth/reset-password
router.post('/reset-password', formSubmissionLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = resetPasswordSchema.parse(req.body);

  const admin = await prisma.adminUser.findFirst({
    where: {
      resetTokenHash: hashResetToken(token),
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!admin) {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      passwordHash: await hashPassword(password),
      resetTokenHash: null,
      resetTokenExpiry: null,
    },
  });

  res.json({ success: true });
}));

export default router;
