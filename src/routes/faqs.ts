import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createFaqSchema, updateFaqSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/faqs — public, active only
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const faqs = await prisma.fAQ.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  });

  res.json(faqs);
}));

// GET /api/faqs/all — admin only, includes inactive
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const faqs = await prisma.fAQ.findMany({
    orderBy: { order: 'asc' }
  });

  res.json(faqs);
}));

// POST /api/faqs — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createFaqSchema.parse(req.body);

  const faq = await prisma.fAQ.create({ data });

  res.status(201).json(faq);
}));

// PUT /api/faqs/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateFaqSchema.parse(req.body);

  const existing = await prisma.fAQ.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'FAQ not found' });
  }

  const faq = await prisma.fAQ.update({ where: { id }, data });

  res.json(faq);
}));

// DELETE /api/faqs/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.fAQ.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'FAQ not found' });
  }

  await prisma.fAQ.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
