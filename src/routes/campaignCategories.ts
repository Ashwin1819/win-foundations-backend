import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createCampaignCategorySchema, updateCampaignCategorySchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/campaign-categories — public (no isActive field on this model, nothing hidden)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const categories = await prisma.campaignCategory.findMany({
    orderBy: { order: 'asc' }
  });

  res.json(categories);
}));

// POST /api/campaign-categories — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createCampaignCategorySchema.parse(req.body);

  const category = await prisma.campaignCategory.create({ data });

  res.status(201).json(category);
}));

// PUT /api/campaign-categories/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateCampaignCategorySchema.parse(req.body);

  const existing = await prisma.campaignCategory.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const category = await prisma.campaignCategory.update({ where: { id }, data });

  res.json(category);
}));

// DELETE /api/campaign-categories/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.campaignCategory.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Category not found' });
  }

  await prisma.campaignCategory.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
