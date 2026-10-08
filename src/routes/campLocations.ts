import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import fs from 'fs';
import { asyncHandler } from '../utils/asyncHandler';
import { createCampLocationSchema, updateCampLocationSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/camp-locations?initiativeId=1 — public
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { initiativeId } = req.query;

  const locations = await prisma.campLocation.findMany({
    where: {
      isActive: true,
      ...(initiativeId ? { initiativeId: parseInt(String(initiativeId)) } : {})
    },
    orderBy: { order: 'asc' },
    include: { media: { orderBy: { order: 'asc' } } }
  });

  res.json(locations);
}));

// GET /api/camp-locations/:id — public
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const location = await prisma.campLocation.findUnique({
    where: { id },
    include: { media: { orderBy: { order: 'asc' } } }
  });

  if (!location || !location.isActive) {
    return res.status(404).json({ error: 'Camp location not found' });
  }

  res.json(location);
}));

// POST /api/camp-locations — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createCampLocationSchema.parse(req.body);

  const initiative = await prisma.initiative.findUnique({ where: { id: data.initiativeId } });
  if (!initiative) {
    return res.status(400).json({ error: 'Initiative not found' });
  }

  const location = await prisma.campLocation.create({ data });

  res.status(201).json(location);
}));

// PUT /api/camp-locations/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateCampLocationSchema.parse(req.body);

  const existing = await prisma.campLocation.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Camp location not found' });
  }

  if (data.initiativeId) {
    const initiative = await prisma.initiative.findUnique({ where: { id: data.initiativeId } });
    if (!initiative) {
      return res.status(400).json({ error: 'Initiative not found' });
    }
  }

  const location = await prisma.campLocation.update({ where: { id }, data });

  res.json(location);
}));

// DELETE /api/camp-locations/:id — admin only (cascades to its Media rows)
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.campLocation.findUnique({ where: { id }, include: { media: true } });
  if (!existing) {
    return res.status(404).json({ error: 'Camp location not found' });
  }

  for (const media of existing.media) {
    try {
      fs.unlinkSync(media.storagePath);
    } catch (err) {
      console.error('Failed to delete media file from disk:', err);
    }
  }

  await prisma.campLocation.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
