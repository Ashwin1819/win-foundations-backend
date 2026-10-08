import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { updatePolicyPageSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/policies/:type — public
router.get('/:type', asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.params;

  const policy = await prisma.policyPage.findUnique({
    where: { type: type.toUpperCase() as any }
  });

  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  res.json(policy);
}));

// PUT /api/policies/:type — admin only. Creates the row if it doesn't exist yet.
router.put('/:type', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const type = req.params.type.toUpperCase() as any;
  const data = updatePolicyPageSchema.parse(req.body);

  const policy = await prisma.policyPage.upsert({
    where: { type },
    update: data,
    create: { type, content: data.content }
  });

  res.json(policy);
}));

export default router;
