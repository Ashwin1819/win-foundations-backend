import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createTestimonialSchema, updateTestimonialSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/testimonials — public, active only
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const testimonials = await prisma.testimonial.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  });

  res.json(testimonials);
}));

// GET /api/testimonials/all — admin only, includes inactive
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const testimonials = await prisma.testimonial.findMany({
    orderBy: { order: 'asc' }
  });

  res.json(testimonials);
}));

// POST /api/testimonials — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createTestimonialSchema.parse(req.body);

  const testimonial = await prisma.testimonial.create({ data });

  res.status(201).json(testimonial);
}));

// PUT /api/testimonials/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateTestimonialSchema.parse(req.body);

  const existing = await prisma.testimonial.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Testimonial not found' });
  }

  const testimonial = await prisma.testimonial.update({ where: { id }, data });

  res.json(testimonial);
}));

// DELETE /api/testimonials/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.testimonial.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Testimonial not found' });
  }

  await prisma.testimonial.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
