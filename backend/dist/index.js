"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_router_1 = require("./auth/auth.router");
const posts_router_1 = require("./posts/posts.router");
const stories_router_1 = require("./stories/stories.router");
const reels_router_1 = require("./reels/reels.router");
const users_router_1 = require("./users/users.router");
const messages_router_1 = require("./messages/messages.router");
const notifications_router_1 = require("./notifications/notifications.router");
const search_router_1 = require("./search/search.router");
const storage_router_1 = require("./storage/storage.router");
const admin_router_1 = require("./admin/admin.router");
const prisma_1 = require("./common/prisma");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
const PORT = process.env.PORT || 4000;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'socialx_super_secret_access_jwt_key_2026';
// Security & Middleware
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// Rate limiting (100 requests per 15 min per IP)
const limiter = (0, express_rate_limit_1.default)({
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
app.use('/api/auth', auth_router_1.authRouter);
app.use('/api/posts', posts_router_1.postsRouter);
app.use('/api/stories', stories_router_1.storiesRouter);
app.use('/api/reels', reels_router_1.reelsRouter);
app.use('/api/users', users_router_1.usersRouter);
app.use('/api/messages', messages_router_1.messagesRouter);
app.use('/api/notifications', notifications_router_1.notificationsRouter);
app.use('/api/search', search_router_1.searchRouter);
app.use('/api/storage', storage_router_1.storageRouter);
app.use('/api/admin', admin_router_1.adminRouter);
// WebSocket / Socket.IO Real-time Connection
io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token)
        return next(new Error('Authentication token required for WebSocket'));
    jsonwebtoken_1.default.verify(token, JWT_ACCESS_SECRET, (err, decoded) => {
        if (err)
            return next(new Error('Invalid token'));
        socket.user = decoded;
        next();
    });
});
io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user.userId;
    // Join personal user room for direct alerts
    socket.join(`user:${userId}`);
    // Broadcast online status
    io.emit('user:online', { userId, status: 'ONLINE' });
    // Join Conversation Room
    socket.on('join:conversation', (conversationId) => {
        socket.join(`conversation:${conversationId}`);
    });
    // Typing Indicator
    socket.on('typing', ({ conversationId, isTyping }) => {
        socket.to(`conversation:${conversationId}`).emit('user:typing', {
            conversationId,
            userId,
            username: user.username,
            isTyping,
        });
    });
    // Real-time Chat Message Send
    socket.on('send:message', async (data) => {
        try {
            const msg = await prisma_1.prisma.message.create({
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
        }
        catch (err) {
            socket.emit('error', { message: 'Message could not be saved' });
        }
    });
    // Message Reactions
    socket.on('react:message', async (data) => {
        try {
            const reaction = await prisma_1.prisma.messageReaction.upsert({
                where: { messageId_userId_emoji: { messageId: data.messageId, userId, emoji: data.emoji } },
                update: {},
                create: { messageId: data.messageId, userId, emoji: data.emoji },
            });
            io.emit('message:reacted', reaction);
        }
        catch (err) {
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
