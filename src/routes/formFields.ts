import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createFormFieldSchema, updateFormFieldSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/form-fields?formType=PARTNER — public, active only, ordered
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { formType } = req.query;

  if (!formType || typeof formType !== 'string') {
    return res.status(400).json({ error: 'formType query param is required' });
  }

  const fields = await prisma.formField.findMany({
    where: { formType: formType as 'PARTNER' | 'INTERNSHIP' | 'CV_BUILDING', isActive: true },
    orderBy: { order: 'asc' }
  });

  res.json(fields);
}));

// GET /api/form-fields/all?formType=PARTNER — admin only, includes inactive
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { formType } = req.query;

  const fields = await prisma.formField.findMany({
    where: formType && typeof formType === 'string' ? { formType: formType as 'PARTNER' | 'INTERNSHIP' | 'CV_BUILDING' } : undefined,
    orderBy: [{ formType: 'asc' }, { order: 'asc' }]
  });

  res.json(fields);
}));

// POST /api/form-fields — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createFormFieldSchema.parse(req.body);

  const field = await prisma.formField.create({ data });

  res.status(201).json(field);
}));

// PUT /api/form-fields/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateFormFieldSchema.parse(req.body);

  const existing = await prisma.formField.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Form field not found' });
  }

  const field = await prisma.formField.update({ where: { id }, data });

  res.json(field);
}));

// DELETE /api/form-fields/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.formField.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Form field not found' });
  }

  await prisma.formField.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
