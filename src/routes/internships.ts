import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { internshipApplicationSchema, updateApplicationStatusSchema } from '../types/validation';
import { formSubmissionLimiter } from '../middleware/rateLimiter';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// POST /api/internships
router.post('/', formSubmissionLimiter, asyncHandler(async (req: Request, res: Response) => {
  const validatedData = internshipApplicationSchema.parse(req.body);

  const knownKeys = Object.keys(internshipApplicationSchema.shape);
  const customFields = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => !knownKeys.includes(key))
  ) as Prisma.InputJsonValue;

  const application = await prisma.internshipApplication.create({
    data: {
      fullName: validatedData.fullName,
      email: validatedData.email,
      phone: validatedData.phone,
      city: validatedData.city,
      education: validatedData.education,
      areaOfInterest: validatedData.areaOfInterest,
      availability: validatedData.availability,
      message: validatedData.message,
      customFields,
      status: 'NEW'
    }
  });

  res.status(201).json({
    success: true,
    application,
    message: 'Thank you for applying. We will review your application and get back to you soon.'
  });
}));

// GET /api/internships — admin only
router.get('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const applications = await prisma.internshipApplication.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json(applications);
}));

// PUT /api/internships/:id — admin only, status update
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateApplicationStatusSchema.parse(req.body);

  const existing = await prisma.internshipApplication.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const application = await prisma.internshipApplication.update({ where: { id }, data });

  res.json(application);
}));

// DELETE /api/internships/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.internshipApplication.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Application not found' });
  }

  await prisma.internshipApplication.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
