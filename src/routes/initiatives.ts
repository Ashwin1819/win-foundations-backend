import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../utils/asyncHandler';
import { createInitiativeSchema, updateInitiativeSchema, createInitiativeVideoSchema, updateInitiativeVideoSchema } from '../types/validation';
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
    cb(null, `initiative-photo-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') }
});

// GET /api/initiatives — public, active only
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const initiatives = await prisma.initiative.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    include: {
      photos: {
        orderBy: { order: 'asc' }
      },
      videos: {
        orderBy: { order: 'asc' }
      }
    }
  });

  res.json(initiatives);
}));

// GET /api/initiatives/all — admin only, includes inactive
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const initiatives = await prisma.initiative.findMany({
    orderBy: { order: 'asc' },
    include: {
      photos: {
        orderBy: { order: 'asc' }
      },
      videos: {
        orderBy: { order: 'asc' }
      }
    }
  });

  res.json(initiatives);
}));

// POST /api/initiatives — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createInitiativeSchema.parse(req.body);

  const initiative = await prisma.initiative.create({
    data: {
      ...data,
      keyFeatures: data.keyFeatures ?? [],
      keyActivities: data.keyActivities ?? [],
      howItWorks: data.howItWorks ?? [],
      impactNumbers: data.impactNumbers ?? [],
      impactPoints: data.impactPoints ?? [],
    },
  });

  res.status(201).json(initiative);
}));

// PUT /api/initiatives/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateInitiativeSchema.parse(req.body);

  const existing = await prisma.initiative.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Initiative not found' });
  }

  const initiative = await prisma.initiative.update({ where: { id }, data });

  res.json(initiative);
}));

// DELETE /api/initiatives/:id — admin only (cascades to its InitiativePhoto rows)
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.initiative.findUnique({ where: { id }, include: { photos: true } });
  if (!existing) {
    return res.status(404).json({ error: 'Initiative not found' });
  }

  for (const photo of existing.photos) {
    try {
      fs.unlinkSync(path.join(uploadsDir, path.basename(photo.image)));
    } catch (err) {
      console.error('Failed to delete initiative photo file from disk:', err);
    }
  }

  await prisma.initiative.delete({ where: { id } });

  res.json({ success: true });
}));

// POST /api/initiatives/:id/photos — admin only, multipart/form-data, field name "file"
router.post('/:id/photos', requireAdmin, upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const initiativeId = parseInt(req.params.id);
  const file = req.file;
  const { caption, order } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'A file is required' });
  }

  if (!file.mimetype.startsWith('image/')) {
    fs.unlink(file.path, () => {});
    return res.status(400).json({ error: 'Only image files are supported' });
  }

  const initiative = await prisma.initiative.findUnique({ where: { id: initiativeId } });
  if (!initiative) {
    fs.unlink(file.path, () => {});
    return res.status(400).json({ error: 'Initiative not found' });
  }

  const photo = await prisma.initiativePhoto.create({
    data: {
      initiativeId,
      image: `/uploads/${file.filename}`,
      caption: caption || undefined,
      order: order ? parseInt(order) : 0,
    }
  });

  res.status(201).json(photo);
}));

// DELETE /api/initiatives/photos/:photoId — admin only
router.delete('/photos/:photoId', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const photoId = parseInt(req.params.photoId);

  const photo = await prisma.initiativePhoto.findUnique({ where: { id: photoId } });
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  try {
    fs.unlinkSync(path.join(uploadsDir, path.basename(photo.image)));
  } catch (err) {
    console.error('Failed to delete initiative photo file from disk:', err);
  }

  await prisma.initiativePhoto.delete({ where: { id: photoId } });

  res.json({ success: true });
}));

// POST /api/initiatives/:id/videos — admin only, JSON body { title, youtubeUrl, order? }
router.post('/:id/videos', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const initiativeId = parseInt(req.params.id);
  const data = createInitiativeVideoSchema.parse(req.body);

  const initiative = await prisma.initiative.findUnique({ where: { id: initiativeId } });
  if (!initiative) {
    return res.status(404).json({ error: 'Initiative not found' });
  }

  const video = await prisma.initiativeVideo.create({
    data: { ...data, initiativeId }
  });

  res.status(201).json(video);
}));

// PUT /api/initiatives/videos/:videoId — admin only
router.put('/videos/:videoId', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const videoId = parseInt(req.params.videoId);
  const data = updateInitiativeVideoSchema.parse(req.body);

  const existing = await prisma.initiativeVideo.findUnique({ where: { id: videoId } });
  if (!existing) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const video = await prisma.initiativeVideo.update({ where: { id: videoId }, data });

  res.json(video);
}));

// DELETE /api/initiatives/videos/:videoId — admin only
router.delete('/videos/:videoId', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const videoId = parseInt(req.params.videoId);

  const existing = await prisma.initiativeVideo.findUnique({ where: { id: videoId } });
  if (!existing) {
    return res.status(404).json({ error: 'Video not found' });
  }

  await prisma.initiativeVideo.delete({ where: { id: videoId } });

  res.json({ success: true });
}));

// GET /api/initiatives/:slug — public (must stay last: catches any other single segment)
router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const initiative = await prisma.initiative.findUnique({
    where: { slug },
    include: {
      photos: {
        orderBy: { order: 'asc' }
      },
      videos: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!initiative || !initiative.isActive) {
    return res.status(404).json({ error: 'Initiative not found' });
  }

  res.json(initiative);
}));

export default router;
