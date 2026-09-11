"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../common/prisma");
const auth_middleware_1 = require("../common/auth.middleware");
exports.searchRouter = (0, express_1.Router)();
exports.searchRouter.get('/', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const q = (req.query.q || '').trim().toLowerCase();
        if (!q) {
            // Return trending tags and recommended explore posts
            const trendingTags = await prisma_1.prisma.hashtag.findMany({
                orderBy: { postCount: 'desc' },
                take: 8,
            });
            const explorePosts = await prisma_1.prisma.post.findMany({
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
        const users = await prisma_1.prisma.user.findMany({
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
        const hashtags = await prisma_1.prisma.hashtag.findMany({
            where: {
                name: { contains: q.replace('#', ''), mode: 'insensitive' },
            },
            take: 10,
        });
        // Search posts
        const posts = await prisma_1.prisma.post.findMany({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
