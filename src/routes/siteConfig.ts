import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { siteConfigSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/site-config — public, returns all rows as a flat { key: value } object
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const rows = await prisma.siteConfig.findMany();

  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }

  res.json(config);
}));

// PUT /api/site-config — admin only. Body is { key: value, ... }; upserts each key.
router.put('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = siteConfigSchema.parse(req.body);

  await prisma.$transaction(
    Object.entries(data).map(([key, value]) =>
      prisma.siteConfig.upsert({
        where: { key },
        create: { key, value },
        update: { value }
      })
    )
  );

  const rows = await prisma.siteConfig.findMany();
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }

  res.json(config);
}));

export default router;
