import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createQuoteSchema, updateQuoteSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/quotes — public, active only, ordered
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const quotes = await prisma.quote.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  });

  res.json(quotes);
}));

// GET /api/quotes/all — admin only, includes inactive
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const quotes = await prisma.quote.findMany({
    orderBy: { order: 'asc' }
  });

  res.json(quotes);
}));

// POST /api/quotes — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createQuoteSchema.parse(req.body);

  const quote = await prisma.quote.create({ data });

  res.status(201).json(quote);
}));

// PUT /api/quotes/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateQuoteSchema.parse(req.body);

  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Quote not found' });
  }

  const quote = await prisma.quote.update({ where: { id }, data });

  res.json(quote);
}));

// DELETE /api/quotes/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Quote not found' });
  }

  await prisma.quote.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
