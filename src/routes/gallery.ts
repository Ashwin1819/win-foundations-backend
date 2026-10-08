import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createGalleryAlbumSchema,
  updateGalleryAlbumSchema,
  createGalleryVideoSchema,
  updateGalleryVideoSchema,
} from '../types/validation';
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
    cb(null, `gallery-photo-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') }
});

/* ===========================================================
   ALBUMS
=========================================================== */

// GET /api/gallery/albums — public, active only
router.get('/albums', asyncHandler(async (req: Request, res: Response) => {
  const albums = await prisma.galleryAlbum.findMany({
    where: { isActive: true },
    include: {
      photos: {
        orderBy: { order: 'asc' }
      }
    },
    orderBy: { eventDate: 'desc' }
  });

  res.json(albums);
}));

// GET /api/gallery/albums/all — admin only, includes inactive
router.get('/albums/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const albums = await prisma.galleryAlbum.findMany({
    include: {
      photos: {
        orderBy: { order: 'asc' }
      }
    },
    orderBy: { eventDate: 'desc' }
  });

  res.json(albums);
}));

// GET /api/gallery/albums/:id — public (kept after /all so that literal path wins)
router.get('/albums/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const album = await prisma.galleryAlbum.findUnique({
    where: { id: parseInt(id) },
    include: {
      photos: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!album || !album.isActive) {
    return res.status(404).json({ error: 'Album not found' });
  }

  res.json(album);
}));

// POST /api/gallery/albums — admin only
router.post('/albums', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createGalleryAlbumSchema.parse(req.body);

  const album = await prisma.galleryAlbum.create({ data });

  res.status(201).json(album);
}));

// PUT /api/gallery/albums/:id — admin only
router.put('/albums/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateGalleryAlbumSchema.parse(req.body);

  const existing = await prisma.galleryAlbum.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Album not found' });
  }

  const album = await prisma.galleryAlbum.update({ where: { id }, data });

  res.json(album);
}));

// DELETE /api/gallery/albums/:id — admin only (cascades to its GalleryPhoto rows)
router.delete('/albums/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.galleryAlbum.findUnique({ where: { id }, include: { photos: true } });
  if (!existing) {
    return res.status(404).json({ error: 'Album not found' });
  }

  for (const photo of existing.photos) {
    try {
      fs.unlinkSync(path.join(uploadsDir, path.basename(photo.image)));
    } catch (err) {
      console.error('Failed to delete gallery photo file from disk:', err);
    }
  }

  await prisma.galleryAlbum.delete({ where: { id } });

  res.json({ success: true });
}));

/* ===========================================================
   ALBUM PHOTOS
=========================================================== */

// POST /api/gallery/albums/:id/photos — admin only, multipart/form-data, field "file"
router.post('/albums/:id/photos', requireAdmin, upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const albumId = parseInt(req.params.id);
  const file = req.file;
  const { caption, order } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'A file is required' });
  }

  if (!file.mimetype.startsWith('image/')) {
    fs.unlink(file.path, () => {});
    return res.status(400).json({ error: 'Only image files are supported' });
  }

  const album = await prisma.galleryAlbum.findUnique({ where: { id: albumId } });
  if (!album) {
    fs.unlink(file.path, () => {});
    return res.status(400).json({ error: 'Album not found' });
  }

  const photo = await prisma.galleryPhoto.create({
    data: {
      albumId,
      image: `/uploads/${file.filename}`,
      caption: caption || undefined,
      order: order ? parseInt(order) : 0,
    }
  });

  res.status(201).json(photo);
}));

// DELETE /api/gallery/photos/:photoId — admin only
router.delete('/photos/:photoId', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const photoId = parseInt(req.params.photoId);

  const photo = await prisma.galleryPhoto.findUnique({ where: { id: photoId } });
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  try {
    fs.unlinkSync(path.join(uploadsDir, path.basename(photo.image)));
  } catch (err) {
    console.error('Failed to delete gallery photo file from disk:', err);
  }

  await prisma.galleryPhoto.delete({ where: { id: photoId } });

  res.json({ success: true });
}));

/* ===========================================================
   VIDEOS
=========================================================== */

// GET /api/gallery/videos — public, active only
router.get('/videos', asyncHandler(async (req: Request, res: Response) => {
  const videos = await prisma.galleryVideo.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  res.json(videos);
}));

// GET /api/gallery/videos/all — admin only, includes inactive
router.get('/videos/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const videos = await prisma.galleryVideo.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json(videos);
}));

// POST /api/gallery/videos — admin only
router.post('/videos', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createGalleryVideoSchema.parse(req.body);

  const video = await prisma.galleryVideo.create({ data });

  res.status(201).json(video);
}));

// PUT /api/gallery/videos/:id — admin only
router.put('/videos/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateGalleryVideoSchema.parse(req.body);

  const existing = await prisma.galleryVideo.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const video = await prisma.galleryVideo.update({ where: { id }, data });

  res.json(video);
}));

// DELETE /api/gallery/videos/:id — admin only
router.delete('/videos/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.galleryVideo.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Video not found' });
  }

  await prisma.galleryVideo.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
