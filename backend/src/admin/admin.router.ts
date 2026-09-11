import { Router, Response } from 'express';
import { prisma } from '../common/prisma';
import { authenticateToken, requireRole, AuthRequest } from '../common/auth.middleware';

export const adminRouter = Router();

// Require MODERATOR or ADMIN role
adminRouter.use(authenticateToken, requireRole(['MODERATOR', 'ADMIN']));

// Overview analytics
adminRouter.get('/analytics', async (_req: AuthRequest, res: Response) => {
  try {
    const [userCount, postCount, reelCount, reportCount, pendingReports] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.reel.count(),
      prisma.report.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
    ]);

    return res.json({
      metrics: {
        users: userCount,
        posts: postCount,
        reels: reelCount,
        totalReports: reportCount,
        pendingReports,
        serverUptime: process.uptime(),
        timestamp: new Date(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// List users for moderation
adminRouter.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { profile: true },
    });
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Suspend / Unsuspend user
adminRouter.patch('/users/:id/suspend', requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { isSuspended: !!isSuspended },
    });

    return res.json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reports list
adminRouter.get('/reports', async (_req: AuthRequest, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        reporter: { select: { id: true, username: true } },
        reported: { select: { id: true, username: true } },
      },
    });
    return res.json({ reports });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Resolve report
adminRouter.patch('/reports/:id/resolve', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "RESOLVED", "DISMISSED"

    const report = await prisma.report.update({
      where: { id },
      data: { status: status || 'RESOLVED' },
    });

    return res.json({ success: true, report });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
