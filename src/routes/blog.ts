import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import fs from 'fs';
import { asyncHandler } from '../utils/asyncHandler';
import { createBlogSchema, updateBlogSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/blogs?category=slug — public
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.query;

  const blogs = await prisma.blog.findMany({
    where: {
      isActive: true,
      ...(category ? { category: String(category) } : {})
    },
    orderBy: { publishedAt: 'desc' },
    include: { media: { orderBy: { order: 'asc' } } }
  });

  res.json(blogs);
}));

// GET /api/blogs/:slug — public
router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: { media: { orderBy: { order: 'asc' } } }
  });

  if (!blog || !blog.isActive) {
    return res.status(404).json({ error: 'Blog post not found' });
  }

  res.json(blog);
}));

// POST /api/blogs — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createBlogSchema.parse(req.body);

  const blog = await prisma.blog.create({ data });

  res.status(201).json(blog);
}));

// PUT /api/blogs/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateBlogSchema.parse(req.body);

  const existing = await prisma.blog.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Blog post not found' });
  }

  const blog = await prisma.blog.update({ where: { id }, data });

  res.json(blog);
}));

// DELETE /api/blogs/:id — admin only (cascades to its Media rows)
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.blog.findUnique({ where: { id }, include: { media: true } });
  if (!existing) {
    return res.status(404).json({ error: 'Blog post not found' });
  }

  for (const media of existing.media) {
    try {
      fs.unlinkSync(media.storagePath);
    } catch (err) {
      console.error('Failed to delete media file from disk:', err);
    }
  }

  await prisma.blog.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
