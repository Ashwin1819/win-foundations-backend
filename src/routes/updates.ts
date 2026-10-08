import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/updates?category=&limit=&offset=
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { category, limit = '10', offset = '0' } = req.query;
  const limitNum = Math.min(parseInt(limit as string) || 10, 100);
  const offsetNum = parseInt(offset as string) || 0;

  const where: any = { isActive: true };
  if (category) where.category = category;

  const [updates, total] = await Promise.all([
    prisma.update.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: limitNum,
      skip: offsetNum
    }),
    prisma.update.count({ where })
  ]);

  res.json({
    data: updates,
    pagination: {
      total,
      limit: limitNum,
      offset: offsetNum,
      hasMore: offsetNum + limitNum < total
    }
  });
}));

// GET /api/updates/:slug
router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const update = await prisma.update.findUnique({
    where: { slug }
  });

  if (!update || !update.isActive) {
    return res.status(404).json({ error: 'Update not found' });
  }

  res.json(update);
}));

export default router;
