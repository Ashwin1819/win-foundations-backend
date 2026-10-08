import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createCvRequestSchema, updateCvRequestStatusSchema, updateCvRequestNotesSchema } from '../types/validation';
import { formSubmissionLimiter } from '../middleware/rateLimiter';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// POST /api/cv-requests — public
router.post('/', formSubmissionLimiter, asyncHandler(async (req: Request, res: Response) => {
  const data = createCvRequestSchema.parse(req.body);

  const knownKeys = Object.keys(createCvRequestSchema.shape);
  const customFields = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => !knownKeys.includes(key))
  ) as Prisma.InputJsonValue;

  const cvRequest = await prisma.cVRequest.create({
    data: { ...data, customFields, status: 'PENDING' }
  });

  res.status(201).json(cvRequest);
}));

// GET /api/cv-requests/all — admin only, newest first
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const cvRequests = await prisma.cVRequest.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json(cvRequests);
}));

// PUT /api/cv-requests/:id/status — admin only
router.put('/:id/status', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateCvRequestStatusSchema.parse(req.body);

  const existing = await prisma.cVRequest.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'CV request not found' });
  }

  const cvRequest = await prisma.cVRequest.update({ where: { id }, data });

  res.json(cvRequest);
}));

// PUT /api/cv-requests/:id/notes — admin only
router.put('/:id/notes', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateCvRequestNotesSchema.parse(req.body);

  const existing = await prisma.cVRequest.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'CV request not found' });
  }

  const cvRequest = await prisma.cVRequest.update({ where: { id }, data });

  res.json(cvRequest);
}));

// DELETE /api/cv-requests/:id — admin only, hard delete
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.cVRequest.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'CV request not found' });
  }

  await prisma.cVRequest.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
