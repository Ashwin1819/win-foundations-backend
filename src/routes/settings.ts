import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { updateSiteSettingsSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/settings — public
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const settings = await prisma.siteSettings.findFirst();

  if (!settings) {
    return res.status(404).json({ error: 'Site settings not found' });
  }

  res.json(settings);
}));

// PUT /api/settings — admin only. Updates the singleton row (creating it if it
// somehow doesn't exist yet). socialLinks is merged shallowly, not replaced, so
// a partial update doesn't wipe out the other social links.
router.put('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = updateSiteSettingsSchema.parse(req.body);
  const existing = await prisma.siteSettings.findFirst();

  const { socialLinks, ...rest } = data;
  const mergedSocialLinks = socialLinks
    ? { ...(existing?.socialLinks as object | undefined || {}), ...socialLinks }
    : undefined;

  const settings = existing
    ? await prisma.siteSettings.update({
        where: { id: existing.id },
        data: { ...rest, ...(mergedSocialLinks ? { socialLinks: mergedSocialLinks } : {}) }
      })
    : await prisma.siteSettings.create({
        data: { ...rest, ...(mergedSocialLinks ? { socialLinks: mergedSocialLinks } : {}) }
      });

  res.json(settings);
}));

export default router;
