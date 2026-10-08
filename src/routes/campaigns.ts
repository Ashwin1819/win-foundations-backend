import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createCampaignSchema,
  updateCampaignSchema,
  createCampaignProductSchema,
  updateCampaignProductSchema,
  upsertCampaignProjectSchema,
  createCampaignUpdateSchema,
  updateCampaignUpdateSchema,
  createCampaignPhotoSchema,
  createCampaignVideoSchema,
  updateCampaignVideoSchema,
} from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

const uploadsDir = path.join(process.cwd(), process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `campaign-photo-${unique}${ext}`);
  }
});

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') }
});

async function withBackersCount<T extends { id: number }>(campaign: T) {
  const backersCount = await prisma.donation.count({
    where: { campaignId: campaign.id, paymentStatus: 'SUCCESS' }
  });
  return { ...campaign, backersCount };
}

async function withRecentDonations<T extends { id: number }>(campaign: T) {
  const donations = await prisma.donation.findMany({
    where: { campaignId: campaign.id, paymentStatus: 'SUCCESS' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { donorName: true, amount: true, createdAt: true }
  });
  return { ...campaign, recentDonations: donations };
}

async function withSiteDefaults<T extends { presetAmounts?: unknown }>(campaign: T) {
  const settings = await prisma.siteSettings.findFirst({
    select: { tipPercentOptions: true, presetAmounts: true }
  });
  return {
    ...campaign,
    tipPercentOptions: settings?.tipPercentOptions ?? [10, 14, 16],
    // Per-campaign presetAmounts overrides the site default when set.
    presetAmounts: campaign.presetAmounts ?? settings?.presetAmounts ?? [1000, 5000, 10000]
  };
}

/* ===========================================================
   CAMPAIGNS
=========================================================== */

// GET /api/campaigns?category=slug — public, active only
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.query;

  const campaigns = await prisma.campaign.findMany({
    where: {
      isActive: true,
      ...(category ? { category: { slug: String(category) } } : {})
    },
    orderBy: { order: 'asc' },
    include: {
      photos: { orderBy: { order: 'asc' } },
      videos: { orderBy: { order: 'asc' } },
      category: true
    }
  });

  const withCounts = await Promise.all(campaigns.map(withBackersCount));

  res.json(withCounts);
}));

// GET /api/campaigns/all — admin only, includes inactive
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { order: 'asc' },
    include: {
      photos: { orderBy: { order: 'asc' } },
      videos: { orderBy: { order: 'asc' } },
      category: true
    }
  });

  const withCounts = await Promise.all(campaigns.map(withBackersCount));

  res.json(withCounts);
}));

// POST /api/campaigns — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createCampaignSchema.parse(req.body);

  const campaign = await prisma.campaign.create({ data });

  res.status(201).json(campaign);
}));

// PUT /api/campaigns/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateCampaignSchema.parse(req.body);

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const campaign = await prisma.campaign.update({ where: { id }, data });

  res.json(campaign);
}));

// DELETE /api/campaigns/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  await prisma.campaign.delete({ where: { id } });

  res.json({ success: true });
}));

/* ===========================================================
   CAMPAIGN PHOTOS (gallery)
=========================================================== */

// POST /api/campaigns/:id/photos — admin only, multipart/form-data, field name "file"
router.post('/:id/photos', requireAdmin, uploadPhoto.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const campaignId = parseInt(req.params.id);
  const file = req.file;
  const { caption, order } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'A file is required' });
  }

  if (!file.mimetype.startsWith('image/')) {
    fs.unlink(file.path, () => {});
    return res.status(400).json({ error: 'Only image files are supported' });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    fs.unlink(file.path, () => {});
    return res.status(400).json({ error: 'Campaign not found' });
  }

  const data = createCampaignPhotoSchema.parse({
    caption: caption || undefined,
    order: order ? parseInt(order) : undefined,
  });

  const photo = await prisma.campaignPhoto.create({
    data: {
      campaignId,
      image: `/uploads/${file.filename}`,
      caption: data.caption,
      order: data.order ?? 0,
    }
  });

  res.status(201).json(photo);
}));

// DELETE /api/campaigns/photos/:photoId — admin only
router.delete('/photos/:photoId', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const photoId = parseInt(req.params.photoId);

  const photo = await prisma.campaignPhoto.findUnique({ where: { id: photoId } });
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  try {
    fs.unlinkSync(path.join(uploadsDir, path.basename(photo.image)));
  } catch (err) {
    console.error('Failed to delete campaign photo file from disk:', err);
  }

  await prisma.campaignPhoto.delete({ where: { id: photoId } });

  res.json({ success: true });
}));

/* ===========================================================
   CAMPAIGN VIDEOS (gallery)
=========================================================== */

// POST /api/campaigns/:id/videos — admin only, JSON body { videoUrl, title?, order? }
router.post('/:id/videos', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const campaignId = parseInt(req.params.id);
  const data = createCampaignVideoSchema.parse(req.body);

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const video = await prisma.campaignVideo.create({
    data: { ...data, campaignId }
  });

  res.status(201).json(video);
}));

// PUT /api/campaigns/videos/:videoId — admin only
router.put('/videos/:videoId', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const videoId = parseInt(req.params.videoId);
  const data = updateCampaignVideoSchema.parse(req.body);

  const existing = await prisma.campaignVideo.findUnique({ where: { id: videoId } });
  if (!existing) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const video = await prisma.campaignVideo.update({ where: { id: videoId }, data });

  res.json(video);
}));

// DELETE /api/campaigns/videos/:videoId — admin only
router.delete('/videos/:videoId', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const videoId = parseInt(req.params.videoId);

  const existing = await prisma.campaignVideo.findUnique({ where: { id: videoId } });
  if (!existing) {
    return res.status(404).json({ error: 'Video not found' });
  }

  await prisma.campaignVideo.delete({ where: { id: videoId } });

  res.json({ success: true });
}));

/* ===========================================================
   CAMPAIGN PRODUCTS
=========================================================== */

// GET /api/campaigns/:id/products — admin only, includes inactive
router.get('/:id/products', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const campaignId = parseInt(req.params.id);

  const products = await prisma.campaignProduct.findMany({
    where: { campaignId },
    orderBy: { order: 'asc' }
  });

  res.json(products);
}));

// POST /api/campaigns/:id/products — admin only
router.post('/:id/products', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const campaignId = parseInt(req.params.id);
  const data = createCampaignProductSchema.omit({ campaignId: true }).parse(req.body);

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    return res.status(400).json({ error: 'Campaign not found' });
  }

  const product = await prisma.campaignProduct.create({ data: { ...data, campaignId } });

  res.status(201).json(product);
}));

// PUT /api/campaigns/products/:productId — admin only
router.put('/products/:productId', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.productId);
  const data = updateCampaignProductSchema.omit({ campaignId: true }).parse(req.body);

  const existing = await prisma.campaignProduct.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = await prisma.campaignProduct.update({ where: { id }, data });

  res.json(product);
}));

// DELETE /api/campaigns/products/:productId — admin only
router.delete('/products/:productId', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.productId);

  const existing = await prisma.campaignProduct.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Product not found' });
  }

  await prisma.campaignProduct.delete({ where: { id } });

  res.json({ success: true });
}));

/* ===========================================================
   CAMPAIGN PROJECT (one-to-one)
=========================================================== */

// GET /api/campaigns/:id/project — admin only
router.get('/:id/project', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const campaignId = parseInt(req.params.id);

  const project = await prisma.campaignProject.findUnique({ where: { campaignId } });

  res.json(project);
}));

// PUT /api/campaigns/:id/project — admin only, upsert (create or update)
router.put('/:id/project', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const campaignId = parseInt(req.params.id);
  const data = upsertCampaignProjectSchema.parse(req.body);

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    return res.status(400).json({ error: 'Campaign not found' });
  }

  const project = await prisma.campaignProject.upsert({
    where: { campaignId },
    create: { ...data, campaignId },
    update: data,
  });

  res.json(project);
}));

/* ===========================================================
   CAMPAIGN UPDATES
=========================================================== */

// GET /api/campaigns/:id/updates — admin only
router.get('/:id/updates', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const campaignId = parseInt(req.params.id);

  const updates = await prisma.campaignUpdate.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' }
  });

  res.json(updates);
}));

// POST /api/campaigns/:id/updates — admin only
router.post('/:id/updates', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const campaignId = parseInt(req.params.id);
  const data = createCampaignUpdateSchema.parse(req.body);

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    return res.status(400).json({ error: 'Campaign not found' });
  }

  const update = await prisma.campaignUpdate.create({ data: { ...data, campaignId } });

  res.status(201).json(update);
}));

// PUT /api/campaigns/updates/:updateId — admin only
router.put('/updates/:updateId', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.updateId);
  const data = updateCampaignUpdateSchema.parse(req.body);

  const existing = await prisma.campaignUpdate.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Update not found' });
  }

  const update = await prisma.campaignUpdate.update({ where: { id }, data });

  res.json(update);
}));

// DELETE /api/campaigns/updates/:updateId — admin only
router.delete('/updates/:updateId', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.updateId);

  const existing = await prisma.campaignUpdate.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Update not found' });
  }

  await prisma.campaignUpdate.delete({ where: { id } });

  res.json({ success: true });
}));

/* ===========================================================
   GET /api/campaigns/:slug — public (must stay last: catches any
   other single segment under /api/campaigns)
=========================================================== */

router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    include: {
      photos: { orderBy: { order: 'asc' } },
      videos: { orderBy: { order: 'asc' } },
      products: { where: { isActive: true }, orderBy: { order: 'asc' } },
      project: true,
      updates: { where: { isPublished: true }, orderBy: { createdAt: 'desc' } },
      category: true
    }
  });

  if (!campaign || !campaign.isActive) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const withCount = await withBackersCount(campaign);
  const withDonations = await withRecentDonations(withCount);
  const withDefaults = await withSiteDefaults(withDonations);

  res.json(withDefaults);
}));

export default router;
