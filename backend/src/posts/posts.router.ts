import { Router, Response } from 'express';
import { prisma } from '../common/prisma';
import { authenticateToken, AuthRequest } from '../common/auth.middleware';

export const postsRouter = Router();

// Feed with pagination & following prioritization
postsRouter.get('/feed', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get following user IDs
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    followingIds.push(userId); // include self

    const posts = await prisma.post.findMany({
      where: {
        deletedAt: null,
        authorId: { in: followingIds },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        media: { orderBy: { order: 'asc' } },
        likes: { where: { userId } },
        savedIn: { where: { userId } },
      },
    });

    const formattedPosts = posts.map((p) => ({
      id: p.id,
      authorId: p.authorId,
      username: p.author.username,
      displayName: p.author.profile?.displayName || p.author.username,
      avatarUrl: p.author.profile?.avatarUrl,
      caption: p.caption,
      location: p.location,
      mediaType: p.mediaType,
      media: p.media,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      isLiked: p.likes.length > 0,
      isSaved: p.savedIn.length > 0,
      isFollowing: followingIds.includes(p.authorId),
      createdAt: p.createdAt,
    }));

    return res.json({ posts: formattedPosts, page, hasMore: posts.length === limit });
  } catch (error: any) {
    console.error('Feed error:', error);
    return res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Create Post
postsRouter.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { caption, location, mediaUrls, isPrivate } = req.body;

    if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
      return res.status(400).json({ error: 'At least one media item is required' });
    }

    // Extract hashtags and mentions
    const hashtags = (caption || '').match(/#[a-zA-Z0-9_]+/g) || [];
    const mentions = (caption || '').match(/@[a-zA-Z0-9_]+/g) || [];

    const post = await prisma.$transaction(async (tx) => {
      const createdPost = await tx.post.create({
        data: {
          authorId: userId,
          caption,
          location,
          mediaType: mediaUrls.length > 1 ? 'CAROUSEL' : 'IMAGE',
          isPrivate: !!isPrivate,
          media: {
            create: mediaUrls.map((url: string, index: number) => ({
              url,
              order: index,
            })),
          },
        },
        include: {
          media: true,
          author: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
        },
      });

      // Update user post count
      await tx.profile.update({
        where: { userId },
        data: { postCount: { increment: 1 } },
      });

      // Insert hashtags
      for (const rawTag of hashtags) {
        const tag = rawTag.substring(1).toLowerCase();
        const hashtag = await tx.hashtag.upsert({
          where: { name: tag },
          update: { postCount: { increment: 1 } },
          create: { name: tag, postCount: 1 },
        });
        await tx.postHashtag.create({
          data: { postId: createdPost.id, hashtagId: hashtag.id },
        });
      }

      // Insert mentions
      for (const rawMention of mentions) {
        const username = rawMention.substring(1).toLowerCase();
        await tx.mention.create({
          data: { postId: createdPost.id, username },
        });
      }

      return createdPost;
    });

    return res.status(201).json(post);
  } catch (error: any) {
    console.error('Create post error:', error);
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

// Like / Unlike Post
postsRouter.post('/:id/like', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const postId = req.params.id;

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existing.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return res.json({ liked: false });
    } else {
      const [, post] = await prisma.$transaction([
        prisma.like.create({ data: { userId, postId } }),
        prisma.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);

      // Notification
      if (post.authorId !== userId) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            actorId: userId,
            type: 'LIKE_POST',
            entityId: postId,
            message: 'liked your post',
          },
        });
      }

      return res.json({ liked: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Save / Bookmark Post
postsRouter.post('/:id/save', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const postId = req.params.id;

    const existing = await prisma.savedPost.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.savedPost.delete({ where: { id: existing.id } });
      return res.json({ saved: false });
    } else {
      await prisma.savedPost.create({ data: { userId, postId } });
      return res.json({ saved: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Comments for a post
postsRouter.get('/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    return res.json({ comments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Add comment
postsRouter.post('/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const postId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const [comment, post] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          postId,
          authorId: userId,
          content: content.trim(),
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
      }),
      prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    if (post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          actorId: userId,
          type: 'COMMENT',
          entityId: postId,
          message: 'commented on your post',
        },
      });
    }

    return res.status(201).json(comment);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete Post - owner only
postsRouter.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const postId = req.params.id;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        deletedAt: true,
        hashtags: {
          select: {
            hashtagId: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own post' });
    }

    if (post.deletedAt) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await prisma.$transaction(async (tx) => {
      // Delete post. Prisma Cascade removes:
      // media, likes, comments, saved posts, hashtags and mentions.
      await tx.post.delete({
        where: { id: postId },
      });

      // Keep profile post count accurate.
      await tx.profile.updateMany({
        where: {
          userId,
          postCount: { gt: 0 },
        },
        data: {
          postCount: { decrement: 1 },
        },
      });

      // Keep hashtag counters accurate.
      for (const item of post.hashtags) {
        await tx.hashtag.updateMany({
          where: {
            id: item.hashtagId,
            postCount: { gt: 0 },
          },
          data: {
            postCount: { decrement: 1 },
          },
        });
      }
    });

    return res.json({
      success: true,
      message: 'Post deleted successfully',
      postId,
    });
  } catch (error: any) {
    console.error('Delete post error:', error);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
});
