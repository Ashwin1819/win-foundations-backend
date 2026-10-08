import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createPartnerSchema, updatePartnerSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/partners — public, active only
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const partners = await prisma.partner.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  });

  res.json(partners);
}));

// GET /api/partners/all — admin only, includes inactive
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const partners = await prisma.partner.findMany({
    orderBy: { order: 'asc' }
  });

  res.json(partners);
}));

// POST /api/partners — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createPartnerSchema.parse(req.body);

  const partner = await prisma.partner.create({ data });

  res.status(201).json(partner);
}));

// PUT /api/partners/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updatePartnerSchema.parse(req.body);

  const existing = await prisma.partner.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Partner not found' });
  }

  const partner = await prisma.partner.update({ where: { id }, data });

  res.json(partner);
}));

// DELETE /api/partners/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.partner.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Partner not found' });
  }

  await prisma.partner.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
