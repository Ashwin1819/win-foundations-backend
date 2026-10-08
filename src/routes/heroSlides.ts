import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createHeroSlideSchema, updateHeroSlideSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/hero-slides — public, active only
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const slides = await prisma.heroSlide.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  });

  res.json(slides);
}));

// GET /api/hero-slides/all — admin only, includes inactive
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const slides = await prisma.heroSlide.findMany({
    orderBy: { order: 'asc' }
  });

  res.json(slides);
}));

// POST /api/hero-slides — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createHeroSlideSchema.parse(req.body);

  const slide = await prisma.heroSlide.create({ data });

  res.status(201).json(slide);
}));

// PUT /api/hero-slides/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateHeroSlideSchema.parse(req.body);

  const existing = await prisma.heroSlide.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Hero slide not found' });
  }

  const slide = await prisma.heroSlide.update({ where: { id }, data });

  res.json(slide);
}));

// DELETE /api/hero-slides/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.heroSlide.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Hero slide not found' });
  }

  await prisma.heroSlide.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
