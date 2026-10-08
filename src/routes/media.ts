import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

const uploadsDir = path.join(process.cwd(), process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `media-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') }
});

function mediaTypeFromMimetype(mimetype: string): 'IMAGE' | 'VIDEO' | null {
  if (mimetype.startsWith('image/')) return 'IMAGE';
  if (mimetype.startsWith('video/')) return 'VIDEO';
  return null;
}

// POST /api/media/upload — admin only, multipart/form-data, field name "file".
// blogId/campLocationId are both optional — a standalone upload (neither
// provided) backs the admin's general media gallery; providing one attaches it
// to that Blog/CampLocation as before. Providing both is still rejected.
router.post('/upload', requireAdmin, upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  const { blogId, campLocationId, title, caption, order } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'A file is required' });
  }

  const hasBlogId = blogId !== undefined && blogId !== '';
  const hasCampLocationId = campLocationId !== undefined && campLocationId !== '';

  if (hasBlogId && hasCampLocationId) {
    // Clean up the file we just saved since the request is invalid.
    fs.unlink(file.path, () => {});
    return res.status(400).json({ error: 'Provide at most one of blogId or campLocationId' });
  }

  const type = mediaTypeFromMimetype(file.mimetype);
  if (!type) {
    fs.unlink(file.path, () => {});
    return res.status(400).json({ error: 'Only image or video files are supported' });
  }

  if (hasBlogId) {
    const blog = await prisma.blog.findUnique({ where: { id: parseInt(blogId) } });
    if (!blog) {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ error: 'Blog post not found' });
    }
  } else if (hasCampLocationId) {
    const campLocation = await prisma.campLocation.findUnique({ where: { id: parseInt(campLocationId) } });
    if (!campLocation) {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ error: 'Camp location not found' });
    }
  }

  const media = await prisma.media.create({
    data: {
      type,
      storagePath: file.path,
      url: `/uploads/${file.filename}`,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      title: title || undefined,
      caption: caption || undefined,
      order: order ? parseInt(order) : 0,
      blogId: hasBlogId ? parseInt(blogId) : undefined,
      campLocationId: hasCampLocationId ? parseInt(campLocationId) : undefined,
    }
  });

  res.status(201).json(media);
}));

// GET /api/media/all — admin only, every media row regardless of parent, newest first
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { sort } = req.query;

  const media = await prisma.media.findMany({
    orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' }
  });

  res.json(media);
}));

// PUT /api/media/:id — admin only, title/caption only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { title, caption } = req.body;

  const existing = await prisma.media.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Media not found' });
  }

  const media = await prisma.media.update({
    where: { id },
    data: {
      title: title !== undefined ? (title || null) : undefined,
      caption: caption !== undefined ? (caption || null) : undefined,
    }
  });

  res.json(media);
}));

// DELETE /api/media/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) {
    return res.status(404).json({ error: 'Media not found' });
  }

  fs.unlink(media.storagePath, (err) => {
    if (err) console.error('Failed to delete media file from disk:', err);
  });

  await prisma.media.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
