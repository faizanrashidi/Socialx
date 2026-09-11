import { Router, Response } from 'express';
import { prisma } from '../common/prisma';
import { authenticateToken, AuthRequest } from '../common/auth.middleware';

export const messagesRouter = Router();

// Get list of conversations for current user
messagesRouter.get('/conversations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              where: { userId: { not: userId } },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    activityStatus: true,
                    profile: { select: { displayName: true, avatarUrl: true } },
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const conversations = memberships.map((m) => {
      const otherMember = m.conversation.members[0]?.user;
      const lastMsg = m.conversation.messages[0];
      return {
        id: m.conversation.id,
        isGroup: m.conversation.isGroup,
        title: m.conversation.title || otherMember?.profile?.displayName || otherMember?.username || 'Chat',
        avatarUrl: otherMember?.profile?.avatarUrl,
        otherUser: otherMember,
        lastMessage: lastMsg ? lastMsg.text || 'Sent media' : 'No messages yet',
        lastMessageTime: lastMsg ? lastMsg.createdAt : m.conversation.updatedAt,
        unreadCount: m.unreadCount,
      };
    });

    return res.json({ conversations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get or Create direct conversation with user
messagesRouter.post('/conversations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user!.userId;
    const { targetUserId } = req.body;

    if (!targetUserId) return res.status(400).json({ error: 'Target user ID required' });

    // Check existing 1-on-1 conversation
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: currentUserId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
    });

    if (existing) {
      return res.json({ conversationId: existing.id });
    }

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        members: {
          create: [
            { userId: currentUserId },
            { userId: targetUserId },
          ],
        },
      },
    });

    return res.status(201).json({ conversationId: conversation.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get messages for a conversation
messagesRouter.get('/conversations/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user!.userId;

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        reactions: true,
      },
    });

    // Reset unread count for current user in this conversation
    await prisma.conversationMember.updateMany({
      where: { conversationId, userId },
      data: { unreadCount: 0, lastReadAt: new Date() },
    });

    return res.json({ messages });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Send Message (REST endpoint, also mirrored in WebSocket)
messagesRouter.post('/conversations/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = req.params.id;
    const { text, mediaUrl, mediaType } = req.body;

    if (!text && !mediaUrl) {
      return res.status(400).json({ error: 'Text or media required' });
    }

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          text,
          mediaUrl,
          mediaType: mediaType || 'TEXT',
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // Increment unread count for other members
      await tx.conversationMember.updateMany({
        where: { conversationId, userId: { not: userId } },
        data: { unreadCount: { increment: 1 } },
      });

      return msg;
    });

    return res.status(201).json(message);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
