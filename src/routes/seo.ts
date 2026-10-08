import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/seo/:page
router.get('/:page', asyncHandler(async (req: Request, res: Response) => {
  const { page } = req.params;

  const seo = await prisma.sEOMeta.findUnique({
    where: { page }
  });

  if (!seo) {
    return res.status(404).json({ error: 'SEO meta not found' });
  }

  res.json(seo);
}));

export default router;
