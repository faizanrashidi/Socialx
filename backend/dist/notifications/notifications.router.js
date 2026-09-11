"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../common/prisma");
const auth_middleware_1 = require("../common/auth.middleware");
exports.notificationsRouter = (0, express_1.Router)();
exports.notificationsRouter.get('/', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const notifications = await prisma_1.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                actor: {
                    select: {
                        id: true,
                        username: true,
                        profile: { select: { displayName: true, avatarUrl: true } },
                    },
                },
            },
        });
        return res.json({ notifications });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.notificationsRouter.patch('/:id/read', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.notificationsRouter.post('/read-all', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        await prisma_1.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
