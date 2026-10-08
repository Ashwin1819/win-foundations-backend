import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createImpactCounterSchema, updateImpactCounterSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/impact-counters — public. No isActive field on this model, so there's
// nothing hidden from the public list — the admin list reuses this same endpoint.
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const counters = await prisma.impactCounter.findMany({
    orderBy: { order: 'asc' }
  });

  res.json(counters);
}));

// POST /api/impact-counters — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createImpactCounterSchema.parse(req.body);

  const counter = await prisma.impactCounter.create({ data });

  res.status(201).json(counter);
}));

// PUT /api/impact-counters/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateImpactCounterSchema.parse(req.body);

  const existing = await prisma.impactCounter.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Impact counter not found' });
  }

  const counter = await prisma.impactCounter.update({ where: { id }, data });

  res.json(counter);
}));

// DELETE /api/impact-counters/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.impactCounter.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Impact counter not found' });
  }

  await prisma.impactCounter.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
