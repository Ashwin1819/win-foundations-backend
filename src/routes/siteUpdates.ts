import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createSiteUpdateSchema, updateSiteUpdateSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/site-updates/all — admin only, newest first
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const updates = await prisma.siteUpdate.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json(updates);
}));

// GET /api/site-updates — public, active only, sorted by sortOrder
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const updates = await prisma.siteUpdate.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });

  res.json(updates);
}));

// POST /api/site-updates — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createSiteUpdateSchema.parse(req.body);

  const update = await prisma.siteUpdate.create({
    data: {
      ...data,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null
    }
  });

  res.status(201).json(update);
}));

// PUT /api/site-updates/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateSiteUpdateSchema.parse(req.body);

  const existing = await prisma.siteUpdate.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Update not found' });
  }

  const update = await prisma.siteUpdate.update({
    where: { id },
    data: {
      ...data,
      publishedAt: data.publishedAt !== undefined
        ? (data.publishedAt ? new Date(data.publishedAt) : null)
        : undefined
    }
  });

  res.json(update);
}));

// DELETE /api/site-updates/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.siteUpdate.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Update not found' });
  }

  await prisma.siteUpdate.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
