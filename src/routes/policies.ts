import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { updatePolicyPageSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

const VALID_POLICY_TYPES = ['PRIVACY', 'TERMS', 'REFUND'] as const;
type PolicyTypeValue = (typeof VALID_POLICY_TYPES)[number];

function isValidPolicyType(value: string): value is PolicyTypeValue {
  return (VALID_POLICY_TYPES as readonly string[]).includes(value);
}

// GET /api/policies/:type — public
router.get('/:type', asyncHandler(async (req: Request, res: Response) => {
  const type = req.params.type.toUpperCase();

  // Prisma throws (500) if given a string that isn't a valid enum member —
  // reject unknown types cleanly before querying instead of crashing.
  if (!isValidPolicyType(type)) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  const policy = await prisma.policyPage.findUnique({
    where: { type }
  });

  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  res.json(policy);
}));

// PUT /api/policies/:type — admin only. Creates the row if it doesn't exist yet.
router.put('/:type', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const type = req.params.type.toUpperCase();

  if (!isValidPolicyType(type)) {
    return res.status(400).json({ error: `Invalid policy type. Must be one of: ${VALID_POLICY_TYPES.join(', ')}` });
  }

  const data = updatePolicyPageSchema.parse(req.body);

  const policy = await prisma.policyPage.upsert({
    where: { type },
    update: data,
    create: { type, content: data.content }
  });

  res.json(policy);
}));

export default router;
