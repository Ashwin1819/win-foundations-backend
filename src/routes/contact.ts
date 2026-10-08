import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { contactMessageSchema, updateContactMessageStatusSchema } from '../types/validation';
import { formSubmissionLimiter } from '../middleware/rateLimiter';
import { sendContactConfirmation, notifyAdminNewMessage } from '../services/email';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// POST /api/contact
router.post('/', formSubmissionLimiter, asyncHandler(async (req: Request, res: Response) => {
  const validatedData = contactMessageSchema.parse(req.body);

  await prisma.contactMessage.create({
    data: {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      subject: validatedData.subject,
      message: validatedData.message,
      status: 'NEW'
    }
  });

  res.status(201).json({
    success: true,
    message: 'Thank you for contacting us. We will get back to you soon.'
  });

  // Send confirmation emails
  Promise.all([
    sendContactConfirmation(validatedData.email, validatedData.name),
    notifyAdminNewMessage(validatedData.name, validatedData.email, validatedData.subject)
  ]).catch(err => console.error('Email send failed:', err));
}));

// GET /api/contact/all — admin only, newest first
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json(messages);
}));

// PUT /api/contact/:id/status — admin only
router.put('/:id/status', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateContactMessageStatusSchema.parse(req.body);

  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Message not found' });
  }

  const message = await prisma.contactMessage.update({ where: { id }, data });

  res.json(message);
}));

// DELETE /api/contact/:id — admin only, hard delete
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Message not found' });
  }

  await prisma.contactMessage.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
