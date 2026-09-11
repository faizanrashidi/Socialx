import { Router, Response } from 'express';
import { prisma } from '../common/prisma';
import { authenticateToken, AuthRequest } from '../common/auth.middleware';

export const searchRouter = Router();

searchRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim().toLowerCase();

    if (!q) {
      // Return trending tags and recommended explore posts
      const trendingTags = await prisma.hashtag.findMany({
        orderBy: { postCount: 'desc' },
        take: 8,
      });

      const explorePosts = await prisma.post.findMany({
        where: { isPrivate: false, deletedAt: null },
        orderBy: { likeCount: 'desc' },
        take: 21,
        include: { media: true },
      });

      return res.json({
        users: [],
        hashtags: trendingTags,
        explorePosts,
      });
    }

    // Search users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { profile: { displayName: { contains: q, mode: 'insensitive' } } },
        ],
      },
      take: 10,
      include: { profile: true },
    });

    // Search hashtags
    const hashtags = await prisma.hashtag.findMany({
      where: {
        name: { contains: q.replace('#', ''), mode: 'insensitive' },
      },
      take: 10,
    });

    // Search posts
    const posts = await prisma.post.findMany({
      where: {
        caption: { contains: q, mode: 'insensitive' },
        isPrivate: false,
        deletedAt: null,
      },
      take: 15,
      include: { media: true },
    });

    return res.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.profile?.displayName || u.username,
        avatarUrl: u.profile?.avatarUrl,
        followerCount: u.profile?.followerCount || 0,
      })),
      hashtags,
      posts,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
