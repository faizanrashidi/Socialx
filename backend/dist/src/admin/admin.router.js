"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../common/prisma");
const auth_middleware_1 = require("../common/auth.middleware");
exports.adminRouter = (0, express_1.Router)();
// Require MODERATOR or ADMIN role
exports.adminRouter.use(auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireRole)(['MODERATOR', 'ADMIN']));
// Overview analytics
exports.adminRouter.get('/analytics', async (_req, res) => {
    try {
        const [userCount, postCount, reelCount, reportCount, pendingReports] = await Promise.all([
            prisma_1.prisma.user.count(),
            prisma_1.prisma.post.count(),
            prisma_1.prisma.reel.count(),
            prisma_1.prisma.report.count(),
            prisma_1.prisma.report.count({ where: { status: 'PENDING' } }),
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// List users for moderation
exports.adminRouter.get('/users', async (req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: { profile: true },
        });
        return res.json({ users });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Suspend / Unsuspend user
exports.adminRouter.patch('/users/:id/suspend', (0, auth_middleware_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const { isSuspended } = req.body;
        const user = await prisma_1.prisma.user.update({
            where: { id },
            data: { isSuspended: !!isSuspended },
        });
        return res.json({ success: true, user });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Reports list
exports.adminRouter.get('/reports', async (_req, res) => {
    try {
        const reports = await prisma_1.prisma.report.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                reporter: { select: { id: true, username: true } },
                reported: { select: { id: true, username: true } },
            },
        });
        return res.json({ reports });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Resolve report
exports.adminRouter.patch('/reports/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // "RESOLVED", "DISMISSED"
        const report = await prisma_1.prisma.report.update({
            where: { id },
            data: { status: status || 'RESOLVED' },
        });
        return res.json({ success: true, report });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
