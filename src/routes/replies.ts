import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createReplySchema, updateReplyStatusSchema } from '../types/validation';
import { formSubmissionLimiter } from '../middleware/rateLimiter';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// POST /api/replies — public
router.post('/', formSubmissionLimiter, asyncHandler(async (req: Request, res: Response) => {
  const data = createReplySchema.parse(req.body);

  const reply = await prisma.reply.create({
    data: { ...data, status: 'NEW' }
  });

  res.status(201).json(reply);
}));

// GET /api/replies/all — admin only, newest first
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const replies = await prisma.reply.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json(replies);
}));

// PUT /api/replies/:id/status — admin only
router.put('/:id/status', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateReplyStatusSchema.parse(req.body);

  const existing = await prisma.reply.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Reply not found' });
  }

  const reply = await prisma.reply.update({ where: { id }, data });

  res.json(reply);
}));

// DELETE /api/replies/:id — admin only, hard delete
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.reply.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Reply not found' });
  }

  await prisma.reply.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
