import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import { authRouter } from './auth/auth.router';
import { postsRouter } from './posts/posts.router';
import { storiesRouter } from './stories/stories.router';
import { reelsRouter } from './reels/reels.router';
import { usersRouter } from './users/users.router';
import { messagesRouter } from './messages/messages.router';
import { notificationsRouter } from './notifications/notifications.router';
import { searchRouter } from './search/search.router';
import { storageRouter } from './storage/storage.router';
import { adminRouter } from './admin/admin.router';
import { prisma } from './common/prisma';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 4000;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'socialx_super_secret_access_jwt_key_2026';

// Security & Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting (100 requests per 15 min per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests from this IP, please try again later' },
});
app.use('/api', limiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SocialX Core API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mounting Feature Routers
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/reels', reelsRouter);
app.use('/api/users', usersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/search', searchRouter);
app.use('/api/storage', storageRouter);
app.use('/api/admin', adminRouter);

// WebSocket / Socket.IO Real-time Connection
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) return next(new Error('Authentication token required for WebSocket'));

  jwt.verify(token as string, JWT_ACCESS_SECRET, (err: any, decoded: any) => {
    if (err) return next(new Error('Invalid token'));
    (socket as any).user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  const user = (socket as any).user;
  const userId = user.userId;

  // Join personal user room for direct alerts
  socket.join(`user:${userId}`);

  // Broadcast online status
  io.emit('user:online', { userId, status: 'ONLINE' });

  // Join Conversation Room
  socket.on('join:conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });

  // Typing Indicator
  socket.on('typing', ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
    socket.to(`conversation:${conversationId}`).emit('user:typing', {
      conversationId,
      userId,
      username: user.username,
      isTyping,
    });
  });

  // Real-time Chat Message Send
  socket.on('send:message', async (data: { conversationId: string; text?: string; mediaUrl?: string }) => {
    try {
      const msg = await prisma.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: userId,
          text: data.text,
          mediaUrl: data.mediaUrl,
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

      // Broadcast to members in conversation
      io.to(`conversation:${data.conversationId}`).emit('new:message', msg);
    } catch (err) {
      socket.emit('error', { message: 'Message could not be saved' });
    }
  });

  // Message Reactions
  socket.on('react:message', async (data: { messageId: string; emoji: string }) => {
    try {
      const reaction = await prisma.messageReaction.upsert({
        where: { messageId_userId_emoji: { messageId: data.messageId, userId, emoji: data.emoji } },
        update: {},
        create: { messageId: data.messageId, userId, emoji: data.emoji },
      });
      io.emit('message:reacted', reaction);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    io.emit('user:offline', { userId, status: 'OFFLINE', lastSeen: new Date() });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 SocialX Backend API server running on port ${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
});
