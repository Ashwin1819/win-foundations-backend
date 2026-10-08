import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { volunteerApplicationSchema, updateApplicationStatusSchema } from '../types/validation';
import { formSubmissionLimiter } from '../middleware/rateLimiter';
import { sendVolunteerConfirmation, notifyAdminNewVolunteer } from '../services/email';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// POST /api/volunteers
router.post('/', formSubmissionLimiter, asyncHandler(async (req: Request, res: Response) => {
  const validatedData = volunteerApplicationSchema.parse(req.body);

  const application = await prisma.volunteerApplication.create({
    data: {
      fullName: validatedData.fullName,
      email: validatedData.email,
      phone: validatedData.phone,
      city: validatedData.city,
      age: validatedData.age,
      occupation: validatedData.occupation,
      skills: validatedData.skills,
      areaOfInterest: validatedData.areaOfInterest,
      availability: validatedData.availability,
      message: validatedData.message,
      status: 'NEW'
    }
  });

  res.status(201).json({
    success: true,
    application,
    message: 'Thank you for your interest. We will review your application and get back to you soon.'
  });

  // Send confirmation emails
  Promise.all([
    sendVolunteerConfirmation(validatedData.email, validatedData.fullName),
    notifyAdminNewVolunteer(validatedData.fullName, validatedData.email)
  ]).catch(err => console.error('Email send failed:', err));
}));

// GET /api/volunteers — admin only
router.get('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const applications = await prisma.volunteerApplication.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json(applications);
}));

// PUT /api/volunteers/:id — admin only, status update
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateApplicationStatusSchema.parse(req.body);

  const existing = await prisma.volunteerApplication.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const application = await prisma.volunteerApplication.update({ where: { id }, data });

  res.json(application);
}));

// DELETE /api/volunteers/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.volunteerApplication.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Application not found' });
  }

  await prisma.volunteerApplication.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
