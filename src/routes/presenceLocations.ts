import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createPresenceLocationSchema, updatePresenceLocationSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/presence-locations — public, active only, ordered
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const locations = await prisma.presenceLocation.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  });

  res.json(locations);
}));

// GET /api/presence-locations/all — admin only, includes inactive
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const locations = await prisma.presenceLocation.findMany({
    orderBy: { order: 'asc' }
  });

  res.json(locations);
}));

// POST /api/presence-locations — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createPresenceLocationSchema.parse(req.body);

  const location = await prisma.presenceLocation.create({ data });

  res.status(201).json(location);
}));

// PUT /api/presence-locations/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updatePresenceLocationSchema.parse(req.body);

  const existing = await prisma.presenceLocation.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Presence location not found' });
  }

  const location = await prisma.presenceLocation.update({ where: { id }, data });

  res.json(location);
}));

// DELETE /api/presence-locations/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.presenceLocation.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Presence location not found' });
  }

  await prisma.presenceLocation.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
