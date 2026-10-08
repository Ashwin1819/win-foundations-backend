import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { partnerApplicationSchema, updateApplicationStatusSchema } from '../types/validation';
import { formSubmissionLimiter } from '../middleware/rateLimiter';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// POST /api/partner-applications
router.post('/', formSubmissionLimiter, asyncHandler(async (req: Request, res: Response) => {
  const validatedData = partnerApplicationSchema.parse(req.body);

  // Anything beyond the core fields is an admin-added custom field (see
  // FormField) — captured as-is rather than requiring a migration per field.
  const knownKeys = Object.keys(partnerApplicationSchema.shape);
  const customFields = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => !knownKeys.includes(key))
  ) as Prisma.InputJsonValue;

  const application = await prisma.partnerApplication.create({
    data: {
      organization: validatedData.organization,
      contactName: validatedData.contactName,
      email: validatedData.email,
      phone: validatedData.phone,
      website: validatedData.website,
      partnershipType: validatedData.partnershipType,
      message: validatedData.message,
      customFields,
      status: 'NEW'
    }
  });

  res.status(201).json({
    success: true,
    application,
    message: 'Thank you for your interest in partnering with us. Our team will reach out soon.'
  });
}));

// GET /api/partner-applications — admin only
router.get('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const applications = await prisma.partnerApplication.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json(applications);
}));

// PUT /api/partner-applications/:id — admin only, status update
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateApplicationStatusSchema.parse(req.body);

  const existing = await prisma.partnerApplication.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const application = await prisma.partnerApplication.update({ where: { id }, data });

  res.json(application);
}));

// DELETE /api/partner-applications/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.partnerApplication.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Application not found' });
  }

  await prisma.partnerApplication.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
