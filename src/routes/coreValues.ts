import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createCoreValueSchema, updateCoreValueSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/core-values — public, active only, ordered
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const values = await prisma.coreValue.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  });

  res.json(values);
}));

// GET /api/core-values/all — admin only, includes inactive
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const values = await prisma.coreValue.findMany({
    orderBy: { order: 'asc' }
  });

  res.json(values);
}));

// POST /api/core-values — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createCoreValueSchema.parse(req.body);

  const value = await prisma.coreValue.create({ data });

  res.status(201).json(value);
}));

// PUT /api/core-values/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateCoreValueSchema.parse(req.body);

  const existing = await prisma.coreValue.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Core value not found' });
  }

  const value = await prisma.coreValue.update({ where: { id }, data });

  res.json(value);
}));

// DELETE /api/core-values/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.coreValue.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Core value not found' });
  }

  await prisma.coreValue.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
