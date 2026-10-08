import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { createTeamMemberSchema, updateTeamMemberSchema } from '../types/validation';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/team — public, used by the Team page
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const members = await prisma.teamMember.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  });

  // Group by category
  const grouped = members.reduce((acc, member) => {
    if (!acc[member.category]) {
      acc[member.category] = [];
    }
    acc[member.category].push(member);
    return acc;
  }, {} as Record<string, any[]>);

  res.json(grouped);
}));

// GET /api/team/all — admin only. The public GET above only returns active
// members (grouped by category, for the public Team page) — the admin list
// needs to see and manage inactive ones too, so this is a flat, unfiltered list.
router.get('/all', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const members = await prisma.teamMember.findMany({
    orderBy: { order: 'asc' }
  });

  res.json(members);
}));

// POST /api/team — admin only
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = createTeamMemberSchema.parse(req.body);

  const member = await prisma.teamMember.create({
    data: {
      name: data.name,
      photo: data.photo,
      designation: data.designation,
      category: data.category,
      education: data.education,
      experience: data.experience,
      linkedinUrl: data.linkedinUrl || undefined,
      order: data.order ?? 0,
      isActive: data.isActive ?? true,
    }
  });

  res.status(201).json(member);
}));

// PUT /api/team/:id — admin only
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = updateTeamMemberSchema.parse(req.body);

  const existing = await prisma.teamMember.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Team member not found' });
  }

  const member = await prisma.teamMember.update({
    where: { id },
    data: {
      ...data,
      linkedinUrl: data.linkedinUrl === '' ? null : data.linkedinUrl,
    }
  });

  res.json(member);
}));

// DELETE /api/team/:id — admin only
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  const existing = await prisma.teamMember.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Team member not found' });
  }

  await prisma.teamMember.delete({ where: { id } });

  res.json({ success: true });
}));

export default router;
