import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createFooterLinkSchema, updateFooterLinkSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/footer-links — public, active only, ordered
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const links = await prisma.footerLink.findMany({
    where: { isActive: true },
    orderBy: [{ section: 'asc' }, { order: 'asc' }]
  });

  res.json(links);
}));

// GET /api/footer-links/all — admin only, all links
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const links = await prisma.footerLink.findMany({
    orderBy: [{ section: 'asc' }, { order: 'asc' }]
  });

  res.json(links);
}));

// POST /api/footer-links — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createFooterLinkSchema.parse(req.body);

  const link = await prisma.footerLink.create({ data });

  res.status(201).json(link);
}));

// PUT /api/footer-links/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateFooterLinkSchema.parse(req.body);

  const existing = await prisma.footerLink.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Footer link not found' });
  }

  const link = await prisma.footerLink.update({ where: { id }, data });

  res.json(link);
}));

// DELETE /api/footer-links/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.footerLink.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Footer link not found' });
  }

  await prisma.footerLink.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
