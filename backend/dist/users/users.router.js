"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../common/prisma");
const auth_middleware_1 = require("../common/auth.middleware");
exports.usersRouter = (0, express_1.Router)();
// Get User Profile by username
exports.usersRouter.get('/:username', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const username = req.params.username.toLowerCase();
        const user = await prisma_1.prisma.user.findUnique({
            where: { username },
            include: {
                profile: true,
                followers: { where: { followerId: currentUserId } },
                posts: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'desc' },
                    include: { media: true },
                },
                reels: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const isFollowing = user.followers.length > 0;
        const isSelf = user.id === currentUserId;
        // Check if blocked
        const isBlocked = await prisma_1.prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: currentUserId, blockedId: user.id },
                    { blockerId: user.id, blockedId: currentUserId },
                ],
            },
        });
        if (isBlocked) {
            return res.status(403).json({ error: 'User unavailable' });
        }
        return res.json({
            id: user.id,
            username: user.username,
            displayName: user.profile?.displayName || user.username,
            avatarUrl: user.profile?.avatarUrl,
            bio: user.profile?.bio,
            website: user.profile?.website,
            location: user.profile?.location,
            isPrivate: user.isPrivate,
            isFollowing,
            isSelf,
            postCount: user.profile?.postCount || user.posts.length,
            followerCount: user.profile?.followerCount || 0,
            followingCount: user.profile?.followingCount || 0,
            posts: user.posts,
            reels: user.reels,
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Follow / Unfollow User
exports.usersRouter.post('/:id/follow', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const targetUserId = req.params.id;
        if (currentUserId === targetUserId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }
        const targetUser = await prisma_1.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser)
            return res.status(404).json({ error: 'Target user not found' });
        const existingFollow = await prisma_1.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
        });
        if (existingFollow) {
            // Unfollow
            await prisma_1.prisma.$transaction([
                prisma_1.prisma.follow.delete({ where: { id: existingFollow.id } }),
                prisma_1.prisma.profile.update({
                    where: { userId: currentUserId },
                    data: { followingCount: { decrement: 1 } },
                }),
                prisma_1.prisma.profile.update({
                    where: { userId: targetUserId },
                    data: { followerCount: { decrement: 1 } },
                }),
            ]);
            return res.json({ following: false, requested: false });
        }
        // Check if account is private
        if (targetUser.isPrivate) {
            const existingReq = await prisma_1.prisma.followRequest.findUnique({
                where: { senderId_receiverId: { senderId: currentUserId, receiverId: targetUserId } },
            });
            if (existingReq) {
                await prisma_1.prisma.followRequest.delete({ where: { id: existingReq.id } });
                return res.json({ following: false, requested: false });
            }
            await prisma_1.prisma.followRequest.create({
                data: { senderId: currentUserId, receiverId: targetUserId },
            });
            await prisma_1.prisma.notification.create({
                data: {
                    userId: targetUserId,
                    actorId: currentUserId,
                    type: 'FOLLOW_REQUEST',
                    message: 'requested to follow you',
                },
            });
            return res.json({ following: false, requested: true });
        }
        // Public account -> Direct follow
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.follow.create({
                data: { followerId: currentUserId, followingId: targetUserId },
            }),
            prisma_1.prisma.profile.update({
                where: { userId: currentUserId },
                data: { followingCount: { increment: 1 } },
            }),
            prisma_1.prisma.profile.update({
                where: { userId: targetUserId },
                data: { followerCount: { increment: 1 } },
            }),
            prisma_1.prisma.notification.create({
                data: {
                    userId: targetUserId,
                    actorId: currentUserId,
                    type: 'FOLLOW',
                    message: 'started following you',
                },
            }),
        ]);
        return res.json({ following: true, requested: false });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Update Profile
exports.usersRouter.patch('/me/profile', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { displayName, bio, website, location, avatarUrl, isPrivate, activityStatus } = req.body;
        const [updatedUser, updatedProfile] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({
                where: { id: userId },
                data: {
                    isPrivate: isPrivate !== undefined ? isPrivate : undefined,
                    activityStatus: activityStatus !== undefined ? activityStatus : undefined,
                },
            }),
            prisma_1.prisma.profile.update({
                where: { userId },
                data: {
                    displayName,
                    bio,
                    website,
                    location,
                    avatarUrl,
                },
            }),
        ]);
        return res.json({ user: updatedUser, profile: updatedProfile });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
