"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reelsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../common/prisma");
const auth_middleware_1 = require("../common/auth.middleware");
exports.reelsRouter = (0, express_1.Router)();
// Get reels with pagination
exports.reelsRouter.get('/', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const reels = await prisma_1.prisma.reel.findMany({
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
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch reels' });
    }
});
// Create Reel
exports.reelsRouter.post('/', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { videoUrl, thumbnailUrl, caption, audioTitle, audioArtist } = req.body;
        if (!videoUrl || !thumbnailUrl) {
            return res.status(400).json({ error: 'Video and thumbnail URLs are required' });
        }
        const reel = await prisma_1.prisma.reel.create({
            data: {
                authorId: userId,
                videoUrl,
                thumbnailUrl,
                caption,
                audioTitle: audioTitle || 'Original Sound - ' + req.user.username,
                audioArtist: audioArtist || req.user.username,
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
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to create reel' });
    }
});
// Like Reel
exports.reelsRouter.post('/:id/like', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const reelId = req.params.id;
        const existing = await prisma_1.prisma.like.findUnique({
            where: { userId_reelId: { userId, reelId } },
        });
        if (existing) {
            await prisma_1.prisma.$transaction([
                prisma_1.prisma.like.delete({ where: { id: existing.id } }),
                prisma_1.prisma.reel.update({
                    where: { id: reelId },
                    data: { likeCount: { decrement: 1 } },
                }),
            ]);
            return res.json({ liked: false });
        }
        else {
            const [, reel] = await prisma_1.prisma.$transaction([
                prisma_1.prisma.like.create({ data: { userId, reelId } }),
                prisma_1.prisma.reel.update({
                    where: { id: reelId },
                    data: { likeCount: { increment: 1 } },
                }),
            ]);
            if (reel.authorId !== userId) {
                await prisma_1.prisma.notification.create({
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
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
