import { Router, Response } from 'express';
import { prisma } from '../common/prisma';
import { authenticateToken, AuthRequest } from '../common/auth.middleware';

export const reelsRouter = Router();

// Get reels with pagination
reelsRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const reels = await prisma.reel.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
            followers: { where: { followerId: userId } },
          },
        },
        likes: { where: { userId } },
      },
    });

    const formattedReels = reels.map((r) => ({
      id: r.id,
      authorId: r.authorId,
      username: r.author.username,
      displayName: r.author.profile?.displayName || r.author.username,
      avatarUrl: r.author.profile?.avatarUrl,
      isFollowing: r.author.followers.length > 0,
      videoUrl: r.videoUrl,
      thumbnailUrl: r.thumbnailUrl,
      caption: r.caption,
      audioTitle: r.audioTitle,
      audioArtist: r.audioArtist,
      likeCount: r.likeCount,
      commentCount: r.commentCount,
      isLiked: r.likes.length > 0,
      createdAt: r.createdAt,
    }));

    return res.json({ reels: formattedReels, page, hasMore: reels.length === limit });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch reels' });
  }
});

// Create Reel
reelsRouter.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { videoUrl, thumbnailUrl, caption, audioTitle, audioArtist } = req.body;

    if (!videoUrl || !thumbnailUrl) {
      return res.status(400).json({ error: 'Video and thumbnail URLs are required' });
    }

    const reel = await prisma.reel.create({
      data: {
        authorId: userId,
        videoUrl,
        thumbnailUrl,
        caption,
        audioTitle: audioTitle || 'Original Sound - ' + req.user!.username,
        audioArtist: audioArtist || req.user!.username,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    return res.status(201).json(reel);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create reel' });
  }
});

// Like Reel
reelsRouter.post('/:id/like', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const reelId = req.params.id;

    const existing = await prisma.like.findUnique({
      where: { userId_reelId: { userId, reelId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existing.id } }),
        prisma.reel.update({
          where: { id: reelId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return res.json({ liked: false });
    } else {
      const [, reel] = await prisma.$transaction([
        prisma.like.create({ data: { userId, reelId } }),
        prisma.reel.update({
          where: { id: reelId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);

      if (reel.authorId !== userId) {
        await prisma.notification.create({
          data: {
            userId: reel.authorId,
            actorId: userId,
            type: 'LIKE_REEL',
            entityId: reelId,
            message: 'liked your reel',
          },
        });
      }

      return res.json({ liked: true });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});


// Get Reel Comments
reelsRouter.get('/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const reelId = req.params.id;

    const comments = await prisma.comment.findMany({
      where: { reelId },
      orderBy: { createdAt: 'desc' },
    });

    const userIds = [...new Set(comments.map((comment) => comment.authorId))];

    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        username: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    return res.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        likeCount: comment.likeCount,
        author: userMap.get(comment.authorId) || {
          id: comment.authorId,
          username: 'unknown',
          profile: null,
        },
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to fetch reel comments',
    });
  }
});

// Add Reel Comment
reelsRouter.post('/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const reelId = req.params.id;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        error: 'Comment content is required',
      });
    }

    const reel = await prisma.reel.findUnique({
      where: { id: reelId },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!reel) {
      return res.status(404).json({
        error: 'Reel not found',
      });
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          authorId: userId,
          reelId,
          content: content.trim(),
        },
      });

      await tx.reel.update({
        where: { id: reelId },
        data: {
          commentCount: {
            increment: 1,
          },
        },
      });

      return created;
    });

    const author = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return res.status(201).json({
      id: comment.id,
      content: comment.content,
      likeCount: comment.likeCount,
      author,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
    });
  }
});
