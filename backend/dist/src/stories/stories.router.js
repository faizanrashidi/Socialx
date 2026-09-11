"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storiesRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../common/prisma");
const auth_middleware_1 = require("../common/auth.middleware");
exports.storiesRouter = (0, express_1.Router)();
// Get active stories grouped by user (less than 24 hours old)
exports.storiesRouter.get('/', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const now = new Date();
        const stories = await prisma_1.prisma.story.findMany({
            where: {
                expiresAt: { gt: now },
            },
            orderBy: { createdAt: 'asc' },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        profile: { select: { displayName: true, avatarUrl: true } },
                    },
                },
                views: { where: { viewerId: userId } },
            },
        });
        // Group stories by user
        const groupedByUser = {};
        for (const story of stories) {
            const authorId = story.authorId;
            if (!groupedByUser[authorId]) {
                groupedByUser[authorId] = {
                    userId: authorId,
                    username: story.author.username,
                    displayName: story.author.profile?.displayName || story.author.username,
                    avatarUrl: story.author.profile?.avatarUrl,
                    hasUnseen: false,
                    stories: [],
                };
            }
            const isViewed = story.views.length > 0;
            if (!isViewed) {
                groupedByUser[authorId].hasUnseen = true;
            }
            groupedByUser[authorId].stories.push({
                id: story.id,
                mediaUrl: story.mediaUrl,
                type: story.type,
                textOverlay: story.textOverlay,
                bgColor: story.bgColor,
                isViewed,
                createdAt: story.createdAt,
                expiresAt: story.expiresAt,
            });
        }
        return res.json({ storyTrays: Object.values(groupedByUser) });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to fetch stories' });
    }
});
// Create Story (expires in 24 hours)
exports.storiesRouter.post('/', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { mediaUrl, type, textOverlay, bgColor } = req.body;
        if (!mediaUrl && !textOverlay) {
            return res.status(400).json({ error: 'Story media or text is required' });
        }
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const story = await prisma_1.prisma.story.create({
            data: {
                authorId: userId,
                mediaUrl: mediaUrl || '',
                type: type || 'PHOTO',
                textOverlay,
                bgColor: bgColor || '#7928CA',
                expiresAt,
            },
        });
        return res.status(201).json(story);
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to post story' });
    }
});
// Mark Story as Viewed
exports.storiesRouter.post('/:id/view', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const storyId = req.params.id;
        await prisma_1.prisma.storyView.upsert({
            where: { storyId_viewerId: { storyId, viewerId: userId } },
            update: { viewedAt: new Date() },
            create: { storyId, viewerId: userId },
        });
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// React to Story
exports.storiesRouter.post('/:id/react', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const storyId = req.params.id;
        const { reaction } = req.body;
        if (!reaction)
            return res.status(400).json({ error: 'Reaction emoji required' });
        const story = await prisma_1.prisma.story.findUnique({ where: { id: storyId } });
        if (!story)
            return res.status(404).json({ error: 'Story not found' });
        await prisma_1.prisma.storyReaction.upsert({
            where: { storyId_userId_reaction: { storyId, userId, reaction } },
            update: {},
            create: { storyId, userId, reaction },
        });
        if (story.authorId !== userId) {
            await prisma_1.prisma.notification.create({
                data: {
                    userId: story.authorId,
                    actorId: userId,
                    type: 'STORY_REACTION',
                    entityId: storyId,
                    message: `reacted ${reaction} to your story`,
                },
            });
        }
        return res.json({ success: true, reaction });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Delete Story - owner only
exports.storiesRouter.delete('/:id', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const storyId = req.params.id;
        const story = await prisma_1.prisma.story.findUnique({
            where: { id: storyId },
            select: {
                id: true,
                authorId: true,
            },
        });
        if (!story) {
            return res.status(404).json({ error: 'Story not found' });
        }
        if (story.authorId !== userId) {
            return res.status(403).json({ error: 'You can only delete your own story' });
        }
        await prisma_1.prisma.story.delete({
            where: { id: storyId },
        });
        // Prisma Cascade removes StoryView and StoryReaction records.
        return res.json({
            success: true,
            message: 'Story deleted successfully',
            storyId,
        });
    }
    catch (error) {
        console.error('Delete story error:', error);
        return res.status(500).json({ error: 'Failed to delete story' });
    }
});
